import { describe, expect, it } from 'vitest'
import {
  AFTER_QUIZ_COPY,
  AFTER_QUIZ_PERMISSIONS,
  AFTER_QUIZ_SETTING_KEYS,
  CERTIFICATE_KIND_LABELS,
  CHARGE_TYPES,
  FEE_POINTS_CURRENCY,
  afterQuizCopy,
  afterQuizSettingsFieldErrors,
  afterQuizSettingsPayload,
  canApproveWording,
  certificateKind,
  changeAfterQuizSetting,
  chargeStatusLabel,
  chargeTitle,
  confirmFormErrors,
  confirmPayload,
  emptyConfirmForm,
  experienceStateLabel,
  feeScheduleFormError,
  finalExamStateLabel,
  formatChargeAmount,
  hasPaidChargeForSlot,
  isAfterQuizReasonValid,
  isAfterQuizSettingValid,
  isAfterQuizSettingsReady,
  isConfirmFormValid,
  isPointsFee,
  isReopenableTry,
  isStaleConflict,
  isVoidableTry,
  isWordingFormValid,
  levelCertificateStateLabel,
  readAfterQuizSettings,
  serverAllows,
  settingMissingName,
  wordingForm,
  wordingTexts,
} from './afterQuiz'
import { createAuthorization } from '../../auth/authorization'

/*
 * AFTER THE ENTRY QUIZ (owner model of 15 Oct 2026, P6), the domain module.
 *
 * Pinned here: Arabic and English only with the same keys; English for any other
 * language; the settings payload holds a key only when the server holds a value
 * for it or someone typed, and emptying a nullable key sends null; the 422 per
 * key; a stale write is a 409 carrying exactly the row's own code; the confirm
 * body is exactly the API's; and approving the wording is the owner's role only.
 */

function paths(block, prefix = '') {
  return Object.entries(block).flatMap(([key, value]) =>
    value && typeof value === 'object' && !Array.isArray(value) ? paths(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  )
}

const TABLES = { AFTER_QUIZ_COPY, CERTIFICATE_KIND_LABELS }

describe('the copy', () => {
  it.each(Object.entries(TABLES))('%s has Arabic and English only, with the same keys and no empty string', (_, table) => {
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
    expect(afterQuizCopy('nl')).toBe(AFTER_QUIZ_COPY.en)
    expect(afterQuizCopy(undefined)).toBe(AFTER_QUIZ_COPY.en)
    expect(afterQuizCopy('ar')).toBe(AFTER_QUIZ_COPY.ar)
    expect(chargeStatusLabel('pending', 'nl')).toBe('Awaiting confirmation')
  })

  it('names every charge type, status, experience state, final-exam state and level-certificate state the contract sends', () => {
    expect(Object.keys(AFTER_QUIZ_COPY.en.chargeTypes).sort()).toEqual([...CHARGE_TYPES].sort())
    expect(CHARGE_TYPES).toContain('certification_fee')
    expect(Object.keys(AFTER_QUIZ_COPY.en.chargeStatuses).sort()).toEqual(['cancelled', 'paid', 'pending', 'refunded'])
    expect(Object.keys(AFTER_QUIZ_COPY.en.experience.states).sort()).toEqual(['available', 'awaiting_issue', 'awaiting_payment', 'issued', 'not_eligible', 'unavailable'])
    expect(Object.keys(AFTER_QUIZ_COPY.en.finalExam.states).sort()).toEqual(['available', 'blocked', 'closed', 'in_progress', 'not_yet', 'passed', 'retake_due', 'waiting'])
    expect(Object.keys(AFTER_QUIZ_COPY.en.finalExam.blocked).sort()).toEqual(['course_on_hold', 'no_courses', 'question_bank_short', 'setting_missing', 'try_referred'])
    // The API's states (RplLevelCertificateIssuer::staffState), by their API names.
    expect(Object.keys(AFTER_QUIZ_COPY.en.finalExam.level.states).sort()).toEqual(['awaiting_fee', 'fee_unusable', 'held', 'issued', 'not_due', 'queued'])
    expect(Object.keys(AFTER_QUIZ_COPY.ar.finalExam.level.states).sort()).toEqual(['awaiting_fee', 'fee_unusable', 'held', 'issued', 'not_due', 'queued'])
    expect(experienceStateLabel('awaiting_issue', 'ar')).toBe('بانتظار الإصدار')
    expect(finalExamStateLabel('retake_due', 'en')).toBe('Retake fee due')
    expect(levelCertificateStateLabel('awaiting_fee', 'en')).toBe('Awaiting the certification fee')
    expect(levelCertificateStateLabel('fee_unusable', 'en')).toBe('Fee cannot be charged')
    expect(levelCertificateStateLabel('awaiting_fee', 'ar')).toBe('بانتظار رسوم الشهادة')
    // An unknown code is shown in words rather than hidden.
    expect(chargeStatusLabel('something_new', 'en')).toBe('something new')
  })

  it('carries the spec\'s fixed sentences word for word', () => {
    expect(AFTER_QUIZ_COPY.en.experience.approveHint).toBe('One member of staff approves after payment (owner decision, 15 Oct 2026). The certificate is issued with the approved wording, and with "stop" the case closes.')
    expect(AFTER_QUIZ_COPY.en.charges.confirmHint).toBe('Confirm only money the institute has received. The reference must be unique.')
    expect(AFTER_QUIZ_COPY.en.wording.notApproved).toBe('Not approved: the Experience Confirmation Certificate cannot be sold or issued until the owner approves this wording.')
    expect(AFTER_QUIZ_COPY.ar.wording.notApproved).toBe('غير معتمدة: لا يمكن بيع شهادة تثبيت الخبرة ولا إصدارها حتى يعتمد المالك هذه الصيغة.')
    expect(AFTER_QUIZ_COPY.en.finalExam.autoIssue).toMatch(/^A passed try issues the level certificate automatically: no staff approval, assessor report, quality review or committee \(owner decision, 15 Oct 2026\)\./)
    // O2: the certification fee, when above 0, is paid before the automatic issue.
    expect(AFTER_QUIZ_COPY.en.finalExam.autoIssue).toMatch(/certification fee is above 0/)
    expect(AFTER_QUIZ_COPY.en.settings.fields.price.hint).toBe('In II Points. Empty: the certificate is not offered.')
    expect(AFTER_QUIZ_COPY.en.settings.fields.passMark.hint).toBe('A try passes only above this mark, on the exact fraction (owner decision, 15 Oct 2026; seeded 50).')
  })

  it('never names the admin app anything but the platform', () => {
    expect(JSON.stringify(AFTER_QUIZ_COPY)).not.toMatch(/\bCMS\b/)
  })
})

describe('the permissions', () => {
  it('maps each act to its permission', () => {
    expect(AFTER_QUIZ_PERMISSIONS).toMatchObject({
      reconcile: 'rpl.payments.reconcile',
      approve: 'rpl.experience_certificates.approve',
      refund: 'finance.manage',
      wordingApprove: 'rpl.certificate_wording.approve',
      manage: 'rpl.applications.manage',
    })
  })

  it('lets only the owner\'s role approve the wording, never a plain administrator (K12)', () => {
    expect(canApproveWording(createAuthorization({ roles: [{ slug: 'super-admin' }] }))).toBe(true)
    expect(canApproveWording(createAuthorization({ roles: [{ slug: 'admin' }] }))).toBe(false)
    expect(canApproveWording(createAuthorization({ roles: [{ slug: 'custom', permissions: [{ slug: 'rpl.certificate_wording.approve' }] }] }))).toBe(true)
    expect(canApproveWording(null)).toBe(false)
  })
})

describe('isStaleConflict and the setting refusal', () => {
  const conflict = (status, code) => ({ response: { status, data: { code, current_lock_version: 4 } } })

  it('matches only a 409 carrying the given code', () => {
    expect(isStaleConflict(conflict(409, 'rpl_charge_stale'), 'rpl_charge_stale')).toBe(true)
    expect(isStaleConflict(conflict(409, 'payment_reference_used'), 'rpl_charge_stale')).toBe(false)
    expect(isStaleConflict(conflict(422, 'rpl_charge_stale'), 'rpl_charge_stale')).toBe(false)
    expect(isStaleConflict(conflict(409, 'rpl_charge_stale'), 'rpl_experience_certificate_stale')).toBe(false)
    expect(isStaleConflict(undefined, 'rpl_charge_stale')).toBe(false)
  })

  it('reads the 503 rpl_setting_missing with its setting, and nothing else', () => {
    expect(settingMissingName({ response: { status: 503, data: { code: 'rpl_setting_missing', setting: 'rpl_final_exam_questions_per_course' } } })).toBe('rpl_final_exam_questions_per_course')
    expect(settingMissingName({ response: { status: 503, data: {} } })).toBe(null)
    expect(settingMissingName({ response: { status: 422, data: { code: 'rpl_setting_missing' } } })).toBe(null)
  })

  it('accepts a reason of 10 to 2000 characters after trimming', () => {
    expect(isAfterQuizReasonValid('   too short  ')).toBe(false)
    expect(isAfterQuizReasonValid('A clear reason given.')).toBe(true)
    expect(isAfterQuizReasonValid('x'.repeat(2001))).toBe(false)
  })

  it('prefers the server\'s flag, and falls back only when it sends none', () => {
    expect(serverAllows({ can: { refund: false } }, 'refund', true)).toBe(false)
    expect(serverAllows({ can: { refund: true } }, 'refund', false)).toBe(true)
    expect(serverAllows({}, 'refund', true)).toBe(true)
  })
})

describe('the settings payload (2.2)', () => {
  const HELD = {
    rpl_experience_certificate_price_points: 1500,
    rpl_final_exam_pass_mark_percent: 50,
    rpl_final_exam_questions_per_course: null,
    rpl_final_exam_retake_wait_days: 14,
  }

  it('lists exactly the five keys', () => {
    expect(AFTER_QUIZ_SETTING_KEYS).toEqual([
      'rpl_experience_certificate_price_points',
      'rpl_final_exam_pass_mark_percent',
      'rpl_final_exam_questions_per_course',
      'rpl_final_exam_retake_wait_days',
      'rpl_final_exam_retake_fee_points',
    ])
  })

  it('invents nothing: a key the server holds no value for is neither shown nor sent', () => {
    const state = readAfterQuizSettings({})
    expect(Object.values(state.values).every((value) => value === '')).toBe(true)
    expect(afterQuizSettingsPayload(state)).toEqual({})
    expect(isAfterQuizSettingsReady(state)).toBe(true)
  })

  it('sends a key only when the server holds a value for it or someone typed', () => {
    const state = readAfterQuizSettings(HELD)
    expect(state.values.rpl_final_exam_questions_per_course).toBe('')
    expect(afterQuizSettingsPayload(state)).toEqual({
      rpl_experience_certificate_price_points: 1500,
      rpl_final_exam_pass_mark_percent: 50,
      rpl_final_exam_retake_wait_days: 14,
    })
    const typed = changeAfterQuizSetting(state, 'rpl_final_exam_questions_per_course', '5')
    expect(afterQuizSettingsPayload(typed)).toHaveProperty('rpl_final_exam_questions_per_course', 5)
  })

  it('sends null when a nullable key is emptied, which clears it, and refuses an empty pass mark', () => {
    let state = readAfterQuizSettings(HELD)
    state = changeAfterQuizSetting(state, 'rpl_experience_certificate_price_points', '')
    expect(afterQuizSettingsPayload(state)).toHaveProperty('rpl_experience_certificate_price_points', null)
    expect(isAfterQuizSettingsReady(state)).toBe(true)
    state = changeAfterQuizSetting(state, 'rpl_final_exam_pass_mark_percent', '')
    expect(isAfterQuizSettingsReady(state)).toBe(false)
  })

  it.each([
    ['rpl_experience_certificate_price_points', '1', true],
    ['rpl_experience_certificate_price_points', '1000000', true],
    ['rpl_experience_certificate_price_points', '0', false],
    ['rpl_experience_certificate_price_points', '1000001', false],
    ['rpl_experience_certificate_price_points', '5.5', false],
    ['rpl_final_exam_pass_mark_percent', '50', true],
    ['rpl_final_exam_pass_mark_percent', '100', false],
    ['rpl_final_exam_pass_mark_percent', '0', false],
    ['rpl_final_exam_pass_mark_percent', '', false],
    ['rpl_final_exam_questions_per_course', '50', true],
    ['rpl_final_exam_questions_per_course', '51', false],
    ['rpl_final_exam_questions_per_course', '', true],
    ['rpl_final_exam_retake_wait_days', '0', true],
    ['rpl_final_exam_retake_wait_days', '365', true],
    ['rpl_final_exam_retake_wait_days', '366', false],
    ['rpl_final_exam_retake_fee_points', '0', false],
    ['rpl_final_exam_retake_fee_points', '-1', false],
    ['unknown_key', '5', false],
  ])('%s = %j is valid: %s', (key, value, valid) => {
    expect(isAfterQuizSettingValid(key, value)).toBe(valid)
  })

  it('puts the server\'s 422 lines under each key, and nothing from other keys', () => {
    const errors = afterQuizSettingsFieldErrors({
      response: {
        status: 422,
        data: {
          errors: {
            rpl_final_exam_questions_per_course: ['The questions per course must not be greater than 50.'],
            rpl_experience_certificate_price_points: ['The price must be an integer.', 'The price must be an integer.'],
            rpl_quiz_pass_mark_percent: ['Unrelated.'],
          },
        },
      },
    })
    expect(errors).toEqual({
      rpl_final_exam_questions_per_course: 'The questions per course must not be greater than 50.',
      rpl_experience_certificate_price_points: 'The price must be an integer.',
    })
    expect(afterQuizSettingsFieldErrors(new Error('x'))).toEqual({})
  })

  it('clears a key\'s server line once it is edited', () => {
    const state = { values: {}, include: {}, errors: { rpl_final_exam_retake_wait_days: 'Too big.', rpl_final_exam_retake_fee_points: 'Other.' } }
    expect(changeAfterQuizSetting(state, 'rpl_final_exam_retake_wait_days', '7').errors).toEqual({ rpl_final_exam_retake_fee_points: 'Other.' })
  })
})

describe('the confirm form (S3)', () => {
  const TODAY = '2026-10-15'
  const filled = { method: 'bank_transfer', reference: 'TRX-2026-0042', paid_at: '2026-10-14', amount_received: '150.00', currency_received: 'eur', notes: '  Received at the Amman branch.  ' }

  it('builds exactly the API body, with the lock_version', () => {
    expect(confirmPayload(filled, 3)).toEqual({
      lock_version: 3,
      method: 'bank_transfer',
      reference: 'TRX-2026-0042',
      paid_at: '2026-10-14',
      amount_received: '150.00',
      currency_received: 'EUR',
      notes: 'Received at the Amman branch.',
    })
    expect(confirmPayload({ ...filled, notes: '  ' }, 1)).not.toHaveProperty('notes')
  })

  it('validates each field the way the API does', () => {
    expect(isConfirmFormValid(filled, TODAY)).toBe(true)
    expect(isConfirmFormValid(emptyConfirmForm(), TODAY)).toBe(false)
    expect(confirmFormErrors({ ...filled, reference: 'ab' }, TODAY).reference).toBe('reference')
    expect(confirmFormErrors({ ...filled, paid_at: '2026-10-16' }, TODAY).paid_at).toBe('paid_at')
    expect(confirmFormErrors({ ...filled, amount_received: '0' }, TODAY).amount_received).toBe('amount_received')
    expect(confirmFormErrors({ ...filled, amount_received: '1.234' }, TODAY).amount_received).toBe('amount_received')
    expect(confirmFormErrors({ ...filled, currency_received: 'EURO' }, TODAY).currency_received).toBe('currency_received')
    expect(confirmFormErrors({ ...filled, method: 'wallet' }, TODAY).method).toBe('method')
  })

  it('warns when another charge of the same type and round is already paid', () => {
    const pending = { public_id: 'c-2', type: 'final_exam_retake', cycle: 2, status: 'pending' }
    expect(hasPaidChargeForSlot([pending, { public_id: 'c-1', type: 'final_exam_retake', cycle: 2, status: 'paid' }], pending)).toBe(true)
    expect(hasPaidChargeForSlot([pending, { public_id: 'c-1', type: 'final_exam_retake', cycle: 3, status: 'paid' }], pending)).toBe(false)
    expect(hasPaidChargeForSlot([pending, { public_id: 'c-1', type: 'final_exam_retake', cycle: 2, status: 'refunded' }], pending)).toBe(false)
  })
})

describe('amounts, titles, tries, wording and certificate kinds', () => {
  it('shows II Points by name and any other currency as sent', () => {
    expect(formatChargeAmount(1500, 'POINTS', 'en')).toBe('1500 II Points')
    expect(formatChargeAmount(1500, 'POINTS', 'ar')).toBe('1500 نقاط II')
    expect(formatChargeAmount('150.00', 'EUR', 'en')).toBe('150.00 EUR')
    expect(formatChargeAmount(null, 'POINTS', 'en')).toBe('—')
  })

  it('names a retake by its round, and the certification fee by name (O2)', () => {
    expect(chargeTitle({ type: 'final_exam_retake', cycle: 2 }, 'en')).toBe('Final-exam retake · round 2')
    expect(chargeTitle({ type: 'certification_fee', cycle: 1 }, 'en')).toBe('Level certification fee')
    expect(chargeTitle({ type: 'experience_certificate', cycle: 1 }, 'ar')).toBe('شهادة تثبيت الخبرة')
  })

  it('voids only a referred try, and reopens only an opened try that is not marked', () => {
    expect(isVoidableTry({ result: 'referred', status: 'answered' })).toBe(true)
    expect(isVoidableTry({ result: 'referred', status: 'cancelled' })).toBe(false)
    expect(isVoidableTry({ result: 'failed', status: 'answered' })).toBe(false)
    expect(isReopenableTry({ status: 'issued', opened_at: '2026-10-15T09:00:00Z', quiz_scored_at: null })).toBe(true)
    expect(isReopenableTry({ status: 'issued', opened_at: null })).toBe(false)
    expect(isReopenableTry({ status: 'answered', opened_at: '2026-10-15T09:00:00Z', quiz_scored_at: '2026-10-15T09:30:00Z' })).toBe(false)
  })

  it('needs all four wording texts, trimmed, within their bounds', () => {
    const form = wordingForm({ title: { ar: 'شهادة', en: 'Certificate', nl: 'Certificaat' }, body: { ar: 'نص', en: 'Body' } })
    expect(form).toEqual({ title: { ar: 'شهادة', en: 'Certificate' }, body: { ar: 'نص', en: 'Body' } })
    expect(isWordingFormValid(form)).toBe(true)
    expect(isWordingFormValid({ ...form, title: { ar: '  ', en: 'Certificate' } })).toBe(false)
    expect(isWordingFormValid({ ...form, title: { ar: 'x'.repeat(201), en: 'Certificate' } })).toBe(false)
    expect(isWordingFormValid({ ...form, body: { ar: 'نص', en: 'x'.repeat(4001) } })).toBe(false)
    expect(wordingTexts({ title: { ar: ' شهادة ', en: ' Certificate ' }, body: { ar: ' نص ', en: ' Body ' } })).toEqual({ title: { ar: 'شهادة', en: 'Certificate' }, body: { ar: 'نص', en: 'Body' } })
  })

  it('reads a certificate\'s kind from the credential, then the channel, then the programme', () => {
    expect(certificateKind({ snapshot: { credential: { kind: 'rpl_experience_confirmation' } } })).toBe('rpl_experience_confirmation')
    expect(certificateKind({ snapshot: { credential: { kind: 'rpl_level' } }, metadata: { channel: 'reissue' } })).toBe('rpl_level')
    expect(certificateKind({ metadata: { channel: 'rpl_approval' } })).toBe('rpl_level')
    expect(certificateKind({ program_id: 12 })).toBe('program')
    expect(certificateKind({})).toBe('other')
  })
})

describe('the Fees tab schedule (owner answer O2)', () => {
  it('takes II Points as POINTS or a three-letter money code, as the API does', () => {
    expect(FEE_POINTS_CURRENCY).toBe('POINTS')
    expect(isPointsFee('POINTS')).toBe(true)
    expect(isPointsFee(' points ')).toBe(true)
    expect(isPointsFee('USD')).toBe(false)
    expect(feeScheduleFormError({ currency: 'POINTS', amount: '40' })).toBeNull()
    expect(feeScheduleFormError({ currency: 'POINTS', amount: '0' })).toBeNull()
    expect(feeScheduleFormError({ currency: 'usd', amount: '49.50' })).toBeNull()
    expect(feeScheduleFormError({ currency: 'EURO', amount: '10' })).toBe('currency')
    expect(feeScheduleFormError({ currency: '', amount: '10' })).toBe('currency')
    expect(feeScheduleFormError({ currency: 'US1', amount: '10' })).toBe('currency')
  })

  it('needs an amount of 0 or more, and a whole one in II Points', () => {
    expect(feeScheduleFormError({ currency: 'POINTS', amount: '' })).toBe('amount')
    expect(feeScheduleFormError({ currency: 'POINTS', amount: '-1' })).toBe('amount')
    expect(feeScheduleFormError({ currency: 'POINTS', amount: 'abc' })).toBe('amount')
    expect(feeScheduleFormError({ currency: 'POINTS', amount: '40.5' })).toBe('whole_points')
    expect(feeScheduleFormError({ currency: 'POINTS', amount: '100.00' })).toBeNull()
    expect(feeScheduleFormError({ currency: 'EUR', amount: '40.5' })).toBeNull()
  })
})
