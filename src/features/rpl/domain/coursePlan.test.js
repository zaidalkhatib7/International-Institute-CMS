import { describe, expect, it } from 'vitest'
import {
  COURSE_PLAN_COPY,
  COURSE_PLAN_LIMITS,
  COURSE_PLAN_MINIMUMS_COPY,
  COURSE_PLAN_MINIMUMS_KEY,
  COURSE_PLAN_PERMISSIONS,
  activePlanItems,
  applyCoursePlanWrite,
  changeCoursePlanMinimum,
  coursePlanCopy,
  coursePlanLocale,
  coursePlanMinimumsCopy,
  coursePlanMinimumsFieldErrors,
  coursePlanMinimumsPayload,
  isCoursePlanMinimumValid,
  isCoursePlanMinimumsReady,
  isCoursePlanReadOnly,
  isCoursePlanReasonValid,
  isCoursePlanStateRefusal,
  isItemRemovable,
  isMinimumSettingMissing,
  isStaleConflict,
  minimumLevelLabel,
  minimumLevels,
  minimumsText,
  readCoursePlanMinimumsSetting,
  removedPlanItems,
  topUpsWithoutMinimum,
} from './coursePlan'
import { PROFESSIONAL_LEVELS } from './rpl'

/*
 * THE GOVERNED COURSE PLAN (owner flow of 12 Oct 2026, P5).
 *
 * Pinned here: Arabic and English only, the 409 the editor must recognise, which
 * items can be removed, and the minimums setting, which is governed with no
 * default (the owner's 5 / 7 / 10 are never prefilled) and, once written, always
 * carries every level as a whole number from 0 to 50 (D13(b)).
 */

const TABLES = { COURSE_PLAN_COPY, COURSE_PLAN_MINIMUMS_COPY }

function paths(block, prefix = '') {
  return Object.entries(block).flatMap(([key, value]) =>
    value && typeof value === 'object' && !Array.isArray(value) ? paths(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  )
}

const LEVELS = [
  { id: 1, code: 'practitioner', rank: 1, name: { ar: 'ممارس', en: 'Practitioner' } },
  { id: 2, code: 'advanced_practitioner', rank: 2, name: { ar: 'ممارس متقدم', en: 'Advanced practitioner' } },
  { id: 3, code: 'expert', rank: 3, name: { ar: 'خبير', en: 'Expert' } },
]

describe('the copy', () => {
  it.each(Object.entries(TABLES))('%s has Arabic and English only, with the same keys', (_, table) => {
    // Dutch was removed from the platform (owner, 13 Oct 2026).
    expect(Object.keys(table).sort()).toEqual(['ar', 'en'])
    expect(paths(table.ar).sort()).toEqual(paths(table.en).sort())
    for (const language of ['ar', 'en']) {
      for (const key of paths(table[language])) {
        const value = key.split('.').reduce((node, part) => node[part], table[language])
        expect(typeof value === 'string' && value.trim() !== '').toBe(true)
      }
    }
  })

  it('falls back to English for any other language, Dutch included', () => {
    expect(coursePlanCopy('nl')).toBe(COURSE_PLAN_COPY.en)
    expect(coursePlanCopy(undefined)).toBe(COURSE_PLAN_COPY.en)
    expect(coursePlanCopy('ar')).toBe(COURSE_PLAN_COPY.ar)
    expect(coursePlanMinimumsCopy('nl')).toBe(COURSE_PLAN_MINIMUMS_COPY.en)
    expect(coursePlanMinimumsCopy('ar')).toBe(COURSE_PLAN_MINIMUMS_COPY.ar)
  })

  it('names every refusal, cause and purpose the API sends', () => {
    expect(Object.keys(COURSE_PLAN_COPY.en.blocked).sort()).toEqual([
      'case_status',
      'entry_quiz_ambiguous',
      'entry_quiz_not_scored',
      'entry_quiz_referred',
      'minimum_setting_missing',
      'no_entry_quiz',
      'plan_exists',
    ])
    expect(Object.keys(COURSE_PLAN_COPY.en.below).sort()).toEqual(['catalogue_shortfall', 'model_reported_shortfall', 'model_returned_fewer', 'staff_removed'])
    expect(Object.keys(COURSE_PLAN_COPY.en.purpose).sort()).toEqual(['gap_closure', 'minimum_completion', 'staff_added'])
    expect(Object.keys(COURSE_PLAN_COPY.en.planStatus).sort()).toEqual(['approved', 'discarded', 'draft', 'superseded'])
  })

  it('says a failed quiz gets no minimum and no certificate, and never calls it a decline (7.1 D11)', () => {
    expect(COURSE_PLAN_COPY.en.quizFailed).toMatch(/no certificate/)
    expect(COURSE_PLAN_COPY.en.quizFailed).toMatch(/no minimum number of courses/)
    expect(COURSE_PLAN_COPY.en.noMinimum).toMatch(/No minimum applies/)
    expect(`${COURSE_PLAN_COPY.en.quizFailed} ${COURSE_PLAN_COPY.en.noMinimum}`).not.toMatch(/declin|reject/i)
  })

  it('states the reason rule as fixed, with no switch (D13(b))', () => {
    expect(COURSE_PLAN_MINIMUMS_COPY.en.reasonRule).toBe('Approving a plan below the minimum always needs a written reason.')
    expect(COURSE_PLAN_MINIMUMS_COPY.en.ownerValues).toMatch(/practitioner 5, advanced practitioner 7, expert 10/)
  })
})

describe('the permissions and limits', () => {
  it('reads with rpl.applications.view and writes with rpl.course_plans.manage', () => {
    expect(COURSE_PLAN_PERMISSIONS).toEqual({ view: 'rpl.applications.view', manage: 'rpl.course_plans.manage' })
    expect(COURSE_PLAN_LIMITS).toEqual({ reasonMin: 10, reasonMax: 2000 })
  })

  it('accepts a reason of 10 to 2000 characters after trimming', () => {
    expect(isCoursePlanReasonValid('  too short ')).toBe(false)
    expect(isCoursePlanReasonValid('Ten chars!')).toBe(true)
    expect(isCoursePlanReasonValid('x'.repeat(2000))).toBe(true)
    expect(isCoursePlanReasonValid('x'.repeat(2001))).toBe(false)
    expect(isCoursePlanReasonValid(null)).toBe(false)
  })
})

describe('isStaleConflict', () => {
  it('matches only a 409 carrying the plan code', () => {
    expect(isStaleConflict({ response: { status: 409, data: { code: 'rpl_course_plan_stale' } } })).toBe(true)
    expect(isStaleConflict({ response: { status: 409, data: { code: 'something_else' } } })).toBe(false)
    expect(isStaleConflict({ response: { status: 409, data: {} } })).toBe(false)
    expect(isStaleConflict({ response: { status: 422, data: { code: 'rpl_course_plan_stale' } } })).toBe(false)
    expect(isStaleConflict(new Error('Network Error'))).toBe(false)
  })
})

describe('isCoursePlanStateRefusal', () => {
  it('matches a 422 whose key says the screen is out of date, and nothing else', () => {
    const refusal = (key, status = 422) => ({ response: { status, data: { message: 'x', errors: { [key]: ['x'] } } } })
    for (const key of ['case_status', 'plan_exists', 'plan_not_editable', 'regenerate', 'minimum_changed']) {
      expect(isCoursePlanStateRefusal(refusal(key))).toBe(true)
    }
    // A wrong input is the writer's to fix, not a reason to reload.
    for (const key of ['reason', 'program_id', 'item', 'below_minimum_reason', 'items', 'lock_version']) {
      expect(isCoursePlanStateRefusal(refusal(key))).toBe(false)
    }
    expect(isCoursePlanStateRefusal(refusal('plan_not_editable', 409))).toBe(false)
    expect(isCoursePlanStateRefusal({ response: { status: 422, data: { message: 'x' } } })).toBe(false)
    expect(isCoursePlanStateRefusal(undefined)).toBe(false)
  })
})

describe('topUpsWithoutMinimum', () => {
  const plan = (minimum, purposes) => ({ minimum_required: minimum, items: purposes.map(([purpose, status = 'proposed'], id) => ({ id, purpose, status })) })

  it('counts the active top-ups on a plan with no minimum (F1, ZERO)', () => {
    expect(topUpsWithoutMinimum(plan(0, [['gap_closure'], ['minimum_completion'], ['minimum_completion', 'approved']]))).toBe(2)
    // A removed top-up is no longer on the plan.
    expect(topUpsWithoutMinimum(plan(0, [['minimum_completion', 'removed']]))).toBe(0)
  })

  it('counts none where a minimum applies, or where it is unknown', () => {
    expect(topUpsWithoutMinimum(plan(5, [['minimum_completion']]))).toBe(0)
    expect(topUpsWithoutMinimum(plan(null, [['minimum_completion']]))).toBe(0)
    expect(topUpsWithoutMinimum(null)).toBe(0)
  })
})

describe('isMinimumSettingMissing and the locale', () => {
  it('reads the 503 rpl_setting_missing as a setting to fix, never as any other 503', () => {
    expect(isMinimumSettingMissing({ response: { status: 503, data: { code: 'rpl_setting_missing', setting: 'rpl_course_plan_minimums' } } })).toBe(true)
    expect(isMinimumSettingMissing({ response: { status: 503, data: {} } })).toBe(false)
    expect(isMinimumSettingMissing({ response: { status: 422, data: { code: 'rpl_setting_missing' } } })).toBe(false)
  })

  it('sends ar or en, and English for anything else', () => {
    expect(coursePlanLocale('ar')).toBe('ar')
    expect(coursePlanLocale('en')).toBe('en')
    expect(coursePlanLocale('nl')).toBe('en')
    expect(coursePlanLocale(undefined)).toBe('en')
  })
})

describe('isItemRemovable', () => {
  it('is true only for a proposed item on an editable draft', () => {
    expect(isItemRemovable({ status: 'proposed' }, true)).toBe(true)
    expect(isItemRemovable({ status: 'proposed' }, false)).toBe(false)
  })

  it.each(['approved', 'purchased', 'completed', 'removed', 'refunded'])('is false for a %s item', (status) => {
    expect(isItemRemovable({ status }, true)).toBe(false)
  })
})

describe('the case statuses', () => {
  it('is read-only from quality review onwards and on a closed case', () => {
    for (const status of ['assessment_in_progress', 'course_plan_review', 'course_plan_active']) expect(isCoursePlanReadOnly(status)).toBe(false)
    for (const status of ['quality_review', 'committee_review', 'decision_issued', 'completed', 'rejected', 'withdrawn']) expect(isCoursePlanReadOnly(status)).toBe(true)
    expect(isCoursePlanReadOnly('')).toBe(false)
  })
})

describe('the plan items and a write', () => {
  const plan = {
    public_id: 'plan-2',
    items: [
      { id: 1, status: 'proposed' },
      { id: 2, status: 'approved' },
      { id: 3, status: 'removed' },
      { id: 4, status: 'purchased' },
    ],
  }

  it('splits active from removed items', () => {
    expect(activePlanItems(plan).map((item) => item.id)).toEqual([1, 2, 4])
    expect(removedPlanItems(plan).map((item) => item.id)).toEqual([3])
    expect(activePlanItems(null)).toEqual([])
  })

  it('puts the returned plan in its slot and takes the server status', () => {
    const overview = { application: { status: 'assessment_in_progress' }, draft: null, approved: null }
    const draft = { public_id: 'plan-1', status: 'draft', is_live: true, version: 1 }
    const afterGenerate = applyCoursePlanWrite(overview, draft, 'course_plan_review')
    expect(afterGenerate.draft).toBe(draft)
    expect(afterGenerate.application.status).toBe('course_plan_review')

    const approvedPlan = { ...draft, status: 'approved' }
    const afterApprove = applyCoursePlanWrite(afterGenerate, approvedPlan, 'course_plan_active')
    expect(afterApprove.approved).toBe(approvedPlan)
    expect(afterApprove.draft).toBeNull()

    const discarded = { ...draft, status: 'discarded', is_live: false }
    const afterDiscard = applyCoursePlanWrite(afterGenerate, discarded, 'assessment_in_progress')
    expect(afterDiscard.draft).toBeNull()
    expect(afterDiscard.application.status).toBe('assessment_in_progress')
  })

  it('reads the minimums snapshot as one line', () => {
    expect(minimumsText({ practitioner: 5, advanced_practitioner: 7, expert: 10 })).toBe('practitioner 5 · advanced_practitioner 7 · expert 10')
    expect(minimumsText(null)).toBe('')
  })
})

describe('the minimums setting', () => {
  it('lists each level code once, by rank', () => {
    const repeated = [LEVELS[2], { ...LEVELS[0], id: 9 }, LEVELS[1], LEVELS[0], { ...LEVELS[2], id: 10, rank: 3 }]
    expect(minimumLevels(repeated).map((level) => level.code)).toEqual(['practitioner', 'advanced_practitioner', 'expert'])
    expect(minimumLevels(undefined)).toEqual([])
  })

  it('labels a level from the reference data, then the platform labels, then the code', () => {
    expect(minimumLevelLabel(LEVELS[0], 'en')).toBe('Practitioner')
    expect(minimumLevelLabel(LEVELS[0], 'ar')).toBe('ممارس')
    expect(minimumLevelLabel({ code: 'expert' }, 'en')).toBe(PROFESSIONAL_LEVELS[2].labels.en)
    expect(minimumLevelLabel('mystery_level', 'en')).toBe('mystery_level')
  })

  it('invents nothing when the server holds no key: nothing written, nothing prefilled', () => {
    const state = readCoursePlanMinimumsSetting({}, minimumLevels(LEVELS))
    expect(state.include).toBe(false)
    expect(state.codes).toEqual(['practitioner', 'advanced_practitioner', 'expert'])
    expect(state.values).toEqual({ practitioner: '', advanced_practitioner: '', expert: '' })
    expect(isCoursePlanMinimumsReady(state)).toBe(true)
    expect(coursePlanMinimumsPayload(state)).toEqual({})
  })

  it('writes the whole map, as integers, once the server holds it', () => {
    const state = readCoursePlanMinimumsSetting({ [COURSE_PLAN_MINIMUMS_KEY]: { expert: 10, practitioner: 5, advanced_practitioner: 7 } }, minimumLevels(LEVELS))
    expect(state.include).toBe(true)
    expect(coursePlanMinimumsPayload(state)).toEqual({ [COURSE_PLAN_MINIMUMS_KEY]: { practitioner: 5, advanced_practitioner: 7, expert: 10 } })
    expect(Object.keys(coursePlanMinimumsPayload(state)[COURSE_PLAN_MINIMUMS_KEY])).toEqual(['practitioner', 'advanced_practitioner', 'expert'])
  })

  it('writes once someone types, and then needs every level', () => {
    let state = readCoursePlanMinimumsSetting({}, minimumLevels(LEVELS))
    state = changeCoursePlanMinimum(state, 'practitioner', '5')
    expect(state.include).toBe(true)
    expect(isCoursePlanMinimumsReady(state)).toBe(false)
    state = changeCoursePlanMinimum(state, 'advanced_practitioner', '7')
    state = changeCoursePlanMinimum(state, 'expert', '0')
    expect(isCoursePlanMinimumsReady(state)).toBe(true)
    expect(coursePlanMinimumsPayload(state)).toEqual({ [COURSE_PLAN_MINIMUMS_KEY]: { practitioner: 5, advanced_practitioner: 7, expert: 0 } })
  })

  it('reads the stored codes when no reference level loaded, in level order', () => {
    const state = readCoursePlanMinimumsSetting({ [COURSE_PLAN_MINIMUMS_KEY]: '{"expert":10,"practitioner":5,"advanced_practitioner":7}' }, [])
    expect(state.codes).toEqual(['practitioner', 'advanced_practitioner', 'expert'])
    expect(state.values.expert).toBe('10')
  })

  it.each([
    ['0', true],
    ['50', true],
    ['5', true],
    ['51', false],
    ['-1', false],
    ['5.5', false],
    ['', false],
    ['abc', false],
    ['100', false],
  ])('a minimum of %j is valid: %s', (value, valid) => {
    expect(isCoursePlanMinimumValid(value)).toBe(valid)
  })

  it('is not ready when written with no level to carry', () => {
    expect(isCoursePlanMinimumsReady({ codes: [], values: {}, include: true })).toBe(false)
  })

  it('puts the 422 lines under the map and under each level code', () => {
    const errors = coursePlanMinimumsFieldErrors({
      response: {
        status: 422,
        data: {
          errors: {
            rpl_course_plan_minimums: ['The rpl course plan minimums field must contain entries for: expert.'],
            'rpl_course_plan_minimums.practitioner': ['The practitioner minimum must not be greater than 50.'],
            'rpl_course_plan_minimums.expert': ['The expert minimum must be an integer.', 'The expert minimum must be an integer.'],
            rpl_quiz_pass_mark_percent: ['Unrelated.'],
          },
        },
      },
    })
    expect(errors.general).toBe('The rpl course plan minimums field must contain entries for: expert.')
    expect(errors.levels).toEqual({
      practitioner: 'The practitioner minimum must not be greater than 50.',
      expert: 'The expert minimum must be an integer.',
    })
    expect(coursePlanMinimumsFieldErrors(new Error('x'))).toEqual({ general: '', levels: {} })
  })

  it('clears a level\'s server line when it is edited', () => {
    const state = { codes: ['practitioner'], values: { practitioner: '60' }, include: true, errors: { general: 'Map line.', levels: { practitioner: 'Too big.' } } }
    const next = changeCoursePlanMinimum(state, 'practitioner', '6')
    expect(next.errors).toEqual({ general: '', levels: {} })
  })
})
