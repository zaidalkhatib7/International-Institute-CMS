import { describe, expect, it } from 'vitest'
import {
  CASE_DECISION_COPY,
  DECLINE_COPY,
  INTERVIEW_COPY,
  applicantLanguage,
  canRecordLegacyOutcome,
  caseDecisionCopy,
  currentInterview,
  fromDateTimeLocalValue,
  interviewStatus,
  isActiveInterview,
  isCancelReasonValid,
  isHttpsUrl,
  isRationaleValid,
  officeAddressIn,
  overrideReasonRequest,
  screeningDecisionPayload,
  screeningDecisionProblems,
  snapshotFigureText,
  toDateTimeLocalValue,
} from './caseDecision'
import { SCREENING_COPY, fill } from './documentScreening'

/*
 * THE RULES BEHIND THE DECISION CARD AND THE INTERVIEW PANEL
 * (owner flow of 12 Oct 2026, P3).
 *
 * Pure functions, so each rule is pinned once here and the components only
 * have to prove they use them: what each decision sends, when the override
 * reason goes out, when an offer has expired, and which interview is current.
 */

const NOW = Date.parse('2026-10-14T12:00:00Z')

describe('the status an interview is shown and acted on with', () => {
  it('reads an offer past its answer date as expired before the server has written it', () => {
    expect(interviewStatus({ status: 'offered', response_due_at: '2026-10-14T11:59:59Z' }, NOW)).toBe('expired')
    expect(isActiveInterview({ status: 'offered', response_due_at: '2026-10-14T11:59:59Z' }, NOW)).toBe(false)
  })

  it('keeps an offer inside its answer date offered, and never expires any other status', () => {
    expect(interviewStatus({ status: 'offered', response_due_at: '2026-10-21T12:00:00Z' }, NOW)).toBe('offered')
    expect(interviewStatus({ status: 'scheduled', response_due_at: '2026-10-01T12:00:00Z' }, NOW)).toBe('scheduled')
    expect(interviewStatus({ status: 'expired' }, NOW)).toBe('expired')
    expect(isActiveInterview({ status: 'mode_chosen' }, NOW)).toBe(true)
    expect(isActiveInterview({ status: 'completed' }, NOW)).toBe(false)
  })

  it('takes the active case interview as current, never a legacy row, else the newest case row', () => {
    const legacy = { id: 1, kind: 'legacy_assessment', status: 'scheduled' }
    const done = { id: 2, kind: 'case', status: 'completed' }
    const active = { id: 3, kind: 'case', status: 'scheduled' }

    expect(currentInterview([legacy, done, active], NOW)).toBe(active)
    expect(currentInterview([legacy, done], NOW)).toBe(done)
    expect(currentInterview([legacy], NOW)).toBeNull()
    expect(currentInterview(null, NOW)).toBeNull()
  })
})

describe('the screening decision body', () => {
  const base = { decision: '', rationale: '', override_reason: '', offered_modes: [], offer_message: '', decline_category: '' }

  it('sends only the decision and the trimmed rationale for a pass to quiz', () => {
    expect(screeningDecisionPayload({ ...base, decision: 'pass_to_quiz', rationale: '  Documents verified in person.  ', offered_modes: ['online'], decline_category: 'documents_not_verified' }))
      .toEqual({ decision: 'pass_to_quiz', rationale: 'Documents verified in person.' })
  })

  it('sends the offered modes in a fixed order, and the message only when there is one', () => {
    expect(screeningDecisionPayload({ ...base, decision: 'interview_required', rationale: 'Experience letter needs a conversation.', offered_modes: ['in_person', 'online'], offer_message: '  Please choose.  ' }))
      .toEqual({ decision: 'interview_required', rationale: 'Experience letter needs a conversation.', offered_modes: ['online', 'in_person'], offer_message: 'Please choose.' })
    expect(screeningDecisionPayload({ ...base, decision: 'interview_required', rationale: 'Experience letter needs a conversation.', offered_modes: ['online'], offer_message: '   ' }))
      .toEqual({ decision: 'interview_required', rationale: 'Experience letter needs a conversation.', offered_modes: ['online'] })
  })

  it('sends the category for a decline', () => {
    expect(screeningDecisionPayload({ ...base, decision: 'decline', rationale: 'The employer letter could not be verified.', decline_category: 'documents_not_verified' }))
      .toEqual({ decision: 'decline', rationale: 'The employer letter could not be verified.', decline_category: 'documents_not_verified' })
  })

  it('sends the override reason only once the server has asked for it', () => {
    const form = { ...base, decision: 'pass_to_quiz', rationale: 'Documents verified in person.', override_reason: 'Screening worker was down for two days.' }
    expect(screeningDecisionPayload(form)).not.toHaveProperty('override_reason')
    expect(screeningDecisionPayload(form, { overrideRequested: true })).toMatchObject({ override_reason: 'Screening worker was down for two days.' })
  })

  it('holds the form until the decision has everything it needs', () => {
    expect(screeningDecisionProblems(base)).toMatchObject({ decision: true, rationale: true })
    expect(screeningDecisionProblems({ ...base, decision: 'decline', rationale: 'A valid rationale.' })).toEqual({ decline_category: true })
    expect(screeningDecisionProblems({ ...base, decision: 'interview_required', rationale: 'A valid rationale.' })).toEqual({ offered_modes: true })
    expect(screeningDecisionProblems({ ...base, decision: 'interview_required', rationale: 'A valid rationale.', offered_modes: ['online'], offer_message: 'x'.repeat(2001) })).toEqual({ offer_message: true })
    expect(screeningDecisionProblems({ ...base, decision: 'pass_to_quiz', rationale: 'A valid rationale.' }, { overrideRequested: true })).toEqual({ override_reason: true })
    expect(screeningDecisionProblems({ ...base, decision: 'pass_to_quiz', rationale: 'A valid rationale.' })).toEqual({})
  })

  it('holds the rationale to 10-5,000 characters once trimmed, and a cancellation reason to 3-2,000', () => {
    expect(isRationaleValid('123456789')).toBe(false)
    expect(isRationaleValid('  123456789  ')).toBe(false)
    expect(isRationaleValid('1234567890')).toBe(true)
    expect(isRationaleValid('x'.repeat(5000))).toBe(true)
    expect(isRationaleValid('x'.repeat(5001))).toBe(false)
    expect(isCancelReasonValid('ab')).toBe(false)
    expect(isCancelReasonValid('abc')).toBe(true)
    expect(isCancelReasonValid('x'.repeat(2001))).toBe(false)
  })
})

describe('the request for an override reason', () => {
  it('is read from a 422 that names override_reason', () => {
    const error = { response: { status: 422, data: { message: 'Override needed.', errors: { override_reason: ['No current completed screening exists for this case.'] } } } }
    expect(overrideReasonRequest(error)).toBe('No current completed screening exists for this case.')
  })

  it('is not read from any other refusal', () => {
    expect(overrideReasonRequest({ response: { status: 422, data: { errors: { application: ['The case is not under verification.'] } } } })).toBe('')
    expect(overrideReasonRequest({ response: { status: 500, data: { errors: { override_reason: ['x'] } } } })).toBe('')
    expect(overrideReasonRequest(null)).toBe('')
  })
})

describe('the interview time and place', () => {
  it('sends the time chosen in the browser as an instant, never a zone-less string', () => {
    const local = '2026-11-02T10:30'
    expect(fromDateTimeLocalValue(local)).toBe(new Date(local).toISOString())
    expect(toDateTimeLocalValue(fromDateTimeLocalValue(local))).toBe(local)
    expect(fromDateTimeLocalValue('')).toBeNull()
    expect(toDateTimeLocalValue('not a date')).toBe('')
  })

  it('accepts only an https link for an online interview', () => {
    expect(isHttpsUrl('https://meet.example.org/rpl-41')).toBe(true)
    expect(isHttpsUrl('http://meet.example.org/rpl-41')).toBe(false)
    expect(isHttpsUrl('javascript:alert(1)')).toBe(false)
    expect(isHttpsUrl('meet.example.org')).toBe(false)
  })

  it('reads the applicant language the way the API does, English for anything but Arabic', () => {
    expect(applicantLanguage({ profile_snapshot: { personal: { preferred_locale: 'ar' } }, user: { preferred_locale: 'en' } })).toBe('ar')
    expect(applicantLanguage({ user: { preferred_locale: 'ar-SA' } })).toBe('ar')
    expect(applicantLanguage({ user: { preferred_locale: 'de' } })).toBe('en')
    expect(applicantLanguage({})).toBe('en')
  })

  it('reads the office address in one language, trimmed', () => {
    expect(officeAddressIn({ ar: '  عمّان، شارع الجامعة  ', en: 'Amman, University Street' }, 'ar')).toBe('عمّان، شارع الجامعة')
    expect(officeAddressIn({ ar: '', en: 'Amman' }, 'ar')).toBe('')
    expect(officeAddressIn(null, 'en')).toBe('')
  })
})

describe('the outcome of a legacy interview, offered only where the server takes it', () => {
  const legacy = { id: 4, kind: 'legacy_assessment', rpl_assessment_id: 12, status: 'scheduled' }
  const own = { assessments: [{ id: 12, rpl_assessor_assignment_id: null, assessor_id: 3, locked_at: null }] }
  const assigned = (overrides = {}) => ({
    assessments: [{ id: 12, rpl_assessor_assignment_id: 7, assessor_id: 21, locked_at: null }],
    assessor_assignments: [{ id: 7, status: 'accepted', conflict_declaration: { has_conflict: false, resolution: 'cleared' }, ...overrides }],
  })
  const admin = { id: 9, isAdministrator: true }

  it('takes an administrator evaluation from an administrator, any administrator', () => {
    expect(canRecordLegacyOutcome(legacy, own, admin)).toBe(true)
    expect(canRecordLegacyOutcome(legacy, own, { id: 9, isAdministrator: false })).toBe(false)
    expect(canRecordLegacyOutcome(legacy, own, null)).toBe(false)
  })

  it('takes an assigned assessment only from its assessor, the assignment accepted and cleared', () => {
    expect(canRecordLegacyOutcome(legacy, assigned(), { id: 21, isAdministrator: false })).toBe(true)
    expect(canRecordLegacyOutcome(legacy, assigned(), admin)).toBe(false)
    expect(canRecordLegacyOutcome(legacy, assigned({ status: 'accepted_pending_conflict' }), { id: 21 })).toBe(false)
    expect(canRecordLegacyOutcome(legacy, assigned({ conflict_declaration: { has_conflict: true, resolution: 'cleared' } }), { id: 21 })).toBe(false)
    expect(canRecordLegacyOutcome(legacy, assigned({ conflict_declaration: { has_conflict: false, resolution: 'pending' } }), { id: 21 })).toBe(false)
    expect(canRecordLegacyOutcome(legacy, assigned({ conflict_declaration: null }), { id: 21 })).toBe(false)
    expect(canRecordLegacyOutcome(legacy, { assessments: assigned().assessments }, { id: 21 })).toBe(false)
  })

  it('never for a locked assessment, one the case does not show, a row no longer scheduled or a case-level row', () => {
    expect(canRecordLegacyOutcome(legacy, { assessments: [{ ...own.assessments[0], locked_at: '2026-09-01T10:00:00Z' }] }, admin)).toBe(false)
    expect(canRecordLegacyOutcome(legacy, { assessments: [] }, admin)).toBe(false)
    expect(canRecordLegacyOutcome(legacy, {}, admin)).toBe(false)
    expect(canRecordLegacyOutcome({ ...legacy, status: 'completed' }, own, admin)).toBe(false)
    expect(canRecordLegacyOutcome({ ...legacy, kind: 'case', rpl_assessment_id: null }, own, admin)).toBe(false)
  })
})

describe('the screening as staff saw it at the decision', () => {
  it('shows the figure only for a screen that completed with one', () => {
    expect(snapshotFigureText({ state: 'completed', fake_likelihood_percent: 30, score_out_of_10: 3 }, SCREENING_COPY.en)).toBe('Authenticity risk 30% (3/10)')
    expect(snapshotFigureText({ state: 'stale', fake_likelihood_percent: 40, score_out_of_10: null }, SCREENING_COPY.en)).toBe('Authenticity risk 40%')
    expect(snapshotFigureText({ state: 'none', fake_likelihood_percent: 0 }, SCREENING_COPY.en)).toBeNull()
    expect(snapshotFigureText({ state: 'screening_disabled' }, SCREENING_COPY.en)).toBeNull()
    expect(snapshotFigureText({ state: 'completed', fake_likelihood_percent: null }, SCREENING_COPY.en)).toBeNull()
  })

  // RplEmployerCheck::RESULTS since rpl-screen-v3 (owner report of 18 Oct 2026): six counts, in the API's order.
  it.each(['ar', 'en'])('counts every employer result the API sends, "cannot be identified" included, in %s', (language) => {
    const template = CASE_DECISION_COPY[language].employerSummary
    const keys = [...template.matchAll(/\{(\w+)\}/g)].map(([, key]) => key)
    expect(keys).toEqual(['found_consistent', 'found_inconsistent', 'not_found_online', 'not_identifiable', 'ambiguous', 'not_checked'])
  })

  it('words the "cannot be identified" count as the screen does', () => {
    const counts = { found_consistent: 0, found_inconsistent: 0, not_found_online: 1, not_identifiable: 2, ambiguous: 0, not_checked: 0 }
    expect(fill(CASE_DECISION_COPY.en.employerSummary, counts)).toBe('Employers: 0 consistent, 0 inconsistent, 1 not found online, 2 cannot be identified, 0 ambiguous, 0 not checked.')
    expect(fill(CASE_DECISION_COPY.ar.employerSummary, counts)).toContain('2 لا يمكن تحديد هويتها')
  })
})

describe('the copy itself', () => {
  const paths = (block, prefix = '') => Object.entries(block).flatMap(([key, value]) => (
    value && typeof value === 'object' && !Array.isArray(value) ? paths(value, `${prefix}${key}.`) : [`${prefix}${key}`]
  ))

  it.each([['decision', CASE_DECISION_COPY], ['interview', INTERVIEW_COPY], ['decline', DECLINE_COPY]])('keeps every %s key in Arabic and English, and only those two', (_, table) => {
    expect(Object.keys(table).sort()).toEqual(['ar', 'en'])
    expect(paths(table.ar).sort()).toEqual(paths(table.en).sort())
    for (const value of [...Object.values(table.ar), ...Object.values(table.en)]) {
      if (typeof value === 'string') expect(value.trim()).not.toBe('')
    }
  })

  it('reads English for any language but Arabic', () => {
    expect(caseDecisionCopy('ar')).toBe(CASE_DECISION_COPY.ar)
    expect(caseDecisionCopy('fr')).toBe(CASE_DECISION_COPY.en)
    expect(caseDecisionCopy(undefined)).toBe(CASE_DECISION_COPY.en)
  })

  it('never tells staff to show the applicant a figure', () => {
    expect(CASE_DECISION_COPY.en.offerMessageHint).toMatch(/Never mention a screening figure/)
    expect(CASE_DECISION_COPY.en.rationaleHint).toMatch(/never shown to the applicant/)
  })
})
