import { describe, expect, it } from 'vitest'
import {
  AFTER_QUIZ_COPY,
  AFTER_QUIZ_PERMISSIONS,
  AFTER_QUIZ_SETTING_KEYS,
  CERTIFICATE_KIND_LABELS,
  CHARGE_TYPES,
  OFFLINE_METHODS,
  STAFF_CANCEL_CATEGORIES,
  afterQuizCopy,
  afterQuizSettingsFieldErrors,
  afterQuizSettingsPayload,
  canApproveWording,
  cancelCategoriesFor,
  certificateKind,
  certificateLine,
  changeAfterQuizSetting,
  chargePaidInLabel,
  chargePriceLine,
  chargeRouteLabel,
  chargeStatusLabel,
  chargeTitle,
  confirmFormErrors,
  confirmPayload,
  emptyConfirmForm,
  experienceRequestStatus,
  experienceRequestStatusLabel,
  experienceRequestStatusVariant,
  experienceStateLabel,
  feeScheduleAmountMinor,
  feeScheduleFormError,
  finalExamStateLabel,
  hasPaidChargeForSlot,
  isAfterQuizReasonValid,
  isAfterQuizSettingValid,
  isAfterQuizSettingsReady,
  isConfirmFormValid,
  isConfirmableCharge,
  isReopenableTry,
  rateMissing,
  rateUnchanged,
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
import { LEGACY_POINTS } from '../../../utils/money'

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
    // revoked (J09-F3) and stop_chosen (J09-F2): 17 Oct 2026.
    expect(Object.keys(AFTER_QUIZ_COPY.en.experience.states).sort()).toEqual(['available', 'awaiting_issue', 'awaiting_payment', 'issued', 'not_eligible', 'revoked', 'unavailable'])
    expect(Object.keys(AFTER_QUIZ_COPY.ar.experience.states).sort()).toEqual(['available', 'awaiting_issue', 'awaiting_payment', 'issued', 'not_eligible', 'revoked', 'unavailable'])
    expect(Object.keys(AFTER_QUIZ_COPY.en.finalExam.states).sort()).toEqual(['available', 'blocked', 'closed', 'in_progress', 'not_yet', 'passed', 'retake_due', 'waiting'])
    expect(Object.keys(AFTER_QUIZ_COPY.en.finalExam.blocked).sort()).toEqual(['course_on_hold', 'no_courses', 'question_bank_short', 'setting_missing', 'stop_chosen', 'try_referred'])
    expect(Object.keys(AFTER_QUIZ_COPY.ar.finalExam.blocked).sort()).toEqual(['course_on_hold', 'no_courses', 'question_bank_short', 'setting_missing', 'stop_chosen', 'try_referred'])
    expect(experienceStateLabel('revoked', 'en')).toBe('Revoked')
    // The API's states (RplLevelCertificateIssuer::staffState), by their API names; revoked: review of the fixes, 17 Oct 2026.
    expect(Object.keys(AFTER_QUIZ_COPY.en.finalExam.level.states).sort()).toEqual(['awaiting_fee', 'fee_unusable', 'held', 'issued', 'not_due', 'queued', 'revoked'])
    expect(Object.keys(AFTER_QUIZ_COPY.ar.finalExam.level.states).sort()).toEqual(['awaiting_fee', 'fee_unusable', 'held', 'issued', 'not_due', 'queued', 'revoked'])
    expect(levelCertificateStateLabel('revoked', 'en')).toBe('Revoked')
    expect(levelCertificateStateLabel('revoked', 'ar')).toBe('مُلغاة')
    expect(experienceStateLabel('awaiting_issue', 'ar')).toBe('بانتظار الإصدار')
    expect(finalExamStateLabel('retake_due', 'en')).toBe('Retake fee due')
    expect(levelCertificateStateLabel('awaiting_fee', 'en')).toBe('Awaiting the certification fee')
    expect(levelCertificateStateLabel('fee_unusable', 'en')).toBe('Fee cannot be charged')
    expect(levelCertificateStateLabel('awaiting_fee', 'ar')).toBe('بانتظار رسوم الشهادة')
    // An unknown code is shown in words rather than hidden.
    expect(chargeStatusLabel('something_new', 'en')).toBe('something new')
  })

  // Review of the fixes (17 Oct 2026): an issued request whose certificate was revoked never reads "Issued".
  it('reads an experience-certificate request by its certificate\'s own status', () => {
    const revoked = { status: 'issued', certificate: { id: 77, number: 'ICPC-EXC-2026-000001', status: 'revoked', reissued: false, revoked_at: '2026-10-16T09:00:00Z' } }
    expect(experienceRequestStatus(revoked)).toBe('revoked')
    expect(experienceRequestStatusLabel(revoked, 'en')).toBe('Revoked after issue')
    expect(experienceRequestStatusLabel(revoked, 'ar')).toBe('أُلغيت بعد صدورها')
    expect(experienceRequestStatusVariant(revoked)).toBe('danger')
    const active = { status: 'issued', certificate: { id: 78, status: 'active', reissued: true } }
    expect(experienceRequestStatus(active)).toBe('issued')
    expect(experienceRequestStatusVariant(active)).toBe('success')
    expect(experienceRequestStatus({ status: 'requested', certificate: null })).toBe('requested')
    expect(experienceRequestStatusVariant({ status: 'cancelled' })).toBe('neutral')
    expect(experienceRequestStatus(null)).toBe('')
    expect(experienceRequestStatusLabel({ status: 'requested' }, 'ar')).toBe('مطلوبة')
  })

  it('words a certificate as it stands now: issued, a reissue, or revoked with when', () => {
    const at = (value) => `<${value}>`
    const level = AFTER_QUIZ_COPY.en.finalExam.level
    expect(certificateLine({ number: 'N-1', issued_at: 'i' }, level, at)).toBe('Certificate N-1, issued on <i>')
    expect(certificateLine({ number: 'N-2', issued_at: 'i', status: 'active', reissued: true }, level, at)).toBe('Certificate N-2 (a reissue), issued on <i>')
    expect(certificateLine({ number: 'N-3', issued_at: 'i', status: 'revoked', reissued: true, revoked_at: 'r' }, level, at)).toBe('Certificate N-3, issued on <i>, revoked on <r>')
    expect(certificateLine({ number: 'N-3', issued_at: 'i', status: 'revoked', revoked_at: 'r' }, AFTER_QUIZ_COPY.ar.finalExam.level, at)).toBe('الشهادة N-3، صدرت في <i> وأُلغيت في <r>')
  })

  it('carries the spec\'s fixed sentences word for word', () => {
    expect(AFTER_QUIZ_COPY.en.experience.approveHint).toBe('One member of staff approves after payment (owner decision, 15 Oct 2026). The certificate is issued with the approved wording, and with "stop" the case closes.')
    expect(AFTER_QUIZ_COPY.en.charges.confirmHint).toBe('Confirm only money the institute has received. The reference must be unique.')
    expect(AFTER_QUIZ_COPY.en.wording.notApproved).toBe('Not approved: the Experience Confirmation Certificate cannot be sold or issued until the owner approves this wording.')
    expect(AFTER_QUIZ_COPY.ar.wording.notApproved).toBe('غير معتمدة: لا يمكن بيع شهادة تثبيت الخبرة ولا إصدارها حتى يعتمد المالك هذه الصيغة.')
    expect(AFTER_QUIZ_COPY.en.finalExam.autoIssue).toMatch(/^A passed try issues the level certificate automatically: no staff approval, assessor report, quality review or committee \(owner decision, 15 Oct 2026\)\./)
    // O2: the certification fee, when above 0, is paid before the automatic issue.
    expect(AFTER_QUIZ_COPY.en.finalExam.autoIssue).toMatch(/certification fee is above 0/)
    expect(AFTER_QUIZ_COPY.en.settings.fields.price.hint).toBe('In US dollars, cents allowed. Empty: the certificate is not offered.')
    // D7 overrides (owner decisions of 17 Oct 2026).
    expect(AFTER_QUIZ_COPY.en.settings.fields.price.label).toContain('1.00 to 1,000,000.00')
    expect(AFTER_QUIZ_COPY.en.charges.hint).toBe('The client pays the dollar price from his dollar or pound balance, or outside the platform. A pound amount is the dollar price × the rate at the moment he pays from his balance or asks to pay outside, and it is frozen then.')
    expect(AFTER_QUIZ_COPY.ar.charges.hint).toBe('يدفع العميل السعر بالدولار من رصيده بالدولار أو بالليرة، أو خارج المنصة. ويُحسب المبلغ بالليرة من السعر بالدولار مضروبًا في سعر الصرف لحظة الدفع من الرصيد أو لحظة طلب الدفع الخارجي، ويُثبَّت عندها.')
    expect(AFTER_QUIZ_COPY.en.cancelCategories.exchange_rate_outdated).toBe('Syrian-pound amount out of date')
    expect(AFTER_QUIZ_COPY.ar.cancelCategories.exchange_rate_outdated).toBe('مبلغ الليرة السورية لم يعد صالحًا')
  })

  it('names no II Points anywhere, in either language', () => {
    expect(JSON.stringify(AFTER_QUIZ_COPY)).not.toMatch(/II Points|نقاط II|POINTS/)
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
  // The server holds the two prices as whole US cents (contract 2.8): 150000 is $1,500.00.
  const HELD = {
    rpl_experience_certificate_price_usd_minor: 150000,
    rpl_final_exam_pass_mark_percent: 50,
    rpl_final_exam_questions_per_course: null,
    rpl_final_exam_retake_wait_days: 14,
  }

  it('lists exactly the five keys, the two prices in US cents', () => {
    expect(AFTER_QUIZ_SETTING_KEYS).toEqual([
      'rpl_experience_certificate_price_usd_minor',
      'rpl_final_exam_pass_mark_percent',
      'rpl_final_exam_questions_per_course',
      'rpl_final_exam_retake_wait_days',
      'rpl_final_exam_retake_fee_usd_minor',
    ])
  })

  it('shows a held price as dollars and sends the typed dollars as an integer of cents', () => {
    const state = readAfterQuizSettings({ ...HELD, rpl_final_exam_retake_fee_usd_minor: 4999 })
    expect(state.values.rpl_experience_certificate_price_usd_minor).toBe('1500.00')
    expect(state.values.rpl_final_exam_retake_fee_usd_minor).toBe('49.99')
    const typed = changeAfterQuizSetting(state, 'rpl_final_exam_retake_fee_usd_minor', '5.50')
    expect(afterQuizSettingsPayload(typed)).toHaveProperty('rpl_final_exam_retake_fee_usd_minor', 550)
    expect(Number.isInteger(afterQuizSettingsPayload(typed).rpl_experience_certificate_price_usd_minor)).toBe(true)
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
      rpl_experience_certificate_price_usd_minor: 150000,
      rpl_final_exam_pass_mark_percent: 50,
      rpl_final_exam_retake_wait_days: 14,
    })
    const typed = changeAfterQuizSetting(state, 'rpl_final_exam_questions_per_course', '5')
    expect(afterQuizSettingsPayload(typed)).toHaveProperty('rpl_final_exam_questions_per_course', 5)
  })

  it('sends null when a nullable key is emptied, which clears it, and refuses an empty pass mark', () => {
    let state = readAfterQuizSettings(HELD)
    state = changeAfterQuizSetting(state, 'rpl_experience_certificate_price_usd_minor', '')
    expect(afterQuizSettingsPayload(state)).toHaveProperty('rpl_experience_certificate_price_usd_minor', null)
    expect(isAfterQuizSettingsReady(state)).toBe(true)
    state = changeAfterQuizSetting(state, 'rpl_final_exam_pass_mark_percent', '')
    expect(isAfterQuizSettingsReady(state)).toBe(false)
  })

  it.each([
    ['rpl_experience_certificate_price_usd_minor', '1', true],
    ['rpl_experience_certificate_price_usd_minor', '1.00', true],
    ['rpl_experience_certificate_price_usd_minor', '1000000', true],
    ['rpl_experience_certificate_price_usd_minor', '1000000.00', true],
    ['rpl_experience_certificate_price_usd_minor', '5.5', true],
    ['rpl_experience_certificate_price_usd_minor', '0', false],
    ['rpl_experience_certificate_price_usd_minor', '0.99', false],
    ['rpl_experience_certificate_price_usd_minor', '1000000.01', false],
    ['rpl_experience_certificate_price_usd_minor', '5.555', false],
    ['rpl_experience_certificate_price_usd_minor', 'abc', false],
    ['rpl_experience_certificate_price_usd_minor', '1e3', false],
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
    ['rpl_final_exam_retake_fee_usd_minor', '0', false],
    ['rpl_final_exam_retake_fee_usd_minor', '-1', false],
    ['rpl_final_exam_retake_fee_usd_minor', '49.99', true],
    // The retired points keys are unknown.
    ['rpl_final_exam_retake_fee_points', '400', false],
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
            rpl_experience_certificate_price_usd_minor: ['The price must be an integer.', 'The price must be an integer.'],
            rpl_quiz_pass_mark_percent: ['Unrelated.'],
          },
        },
      },
    })
    expect(errors).toEqual({
      rpl_final_exam_questions_per_course: 'The questions per course must not be greater than 50.',
      rpl_experience_certificate_price_usd_minor: 'The price must be an integer.',
    })
    expect(afterQuizSettingsFieldErrors(new Error('x'))).toEqual({})
  })

  it('clears a key\'s server line once it is edited', () => {
    const state = { values: {}, include: {}, errors: { rpl_final_exam_retake_wait_days: 'Too big.', rpl_final_exam_retake_fee_usd_minor: 'Other.' } }
    expect(changeAfterQuizSetting(state, 'rpl_final_exam_retake_wait_days', '7').errors).toEqual({ rpl_final_exam_retake_fee_usd_minor: 'Other.' })
  })
})

describe('the confirm form (S15)', () => {
  const TODAY = '2026-10-15'
  const RATE = { id: 7, syp_per_usd: '13000.0000', effective_from: '2026-10-15T08:00:00Z' }
  // An outside request in pounds, frozen at the request: 649,870 SYP for $ 49.99 at 13,000.
  const sypCharge = { public_id: 'c-1', lock_version: 3, route: 'offline', status: 'pending', amount: { currency: 'SYP', amount_minor: 649870, amount: '649870' }, price_usd: { currency: 'USD', amount_minor: 4999, amount: '49.99' }, exchange_rate: RATE }
  const usdCharge = { public_id: 'c-2', lock_version: 1, route: 'offline', status: 'pending', amount: { currency: 'USD', amount_minor: 1500, amount: '15.00' }, price_usd: { currency: 'USD', amount_minor: 1500, amount: '15.00' }, exchange_rate: null }
  const pointsCharge = { public_id: 'c-0', lock_version: 1, route: 'offline', status: 'pending', amount: { currency: LEGACY_POINTS, amount_minor: 1500, amount: '1500', legacy: true }, price_usd: null, exchange_rate: null }
  const filled = { method: 'syriatel_cash', reference: 'TRX-2026-0042', paid_at: '2026-10-14', amount_received: '649870', notes: '  Received at the Damascus branch.  ' }

  it('builds exactly the S15 body: the charge\'s lock_version, its currency, the amount in minor units', () => {
    expect(confirmPayload(filled, sypCharge)).toEqual({
      lock_version: 3,
      method: 'syriatel_cash',
      reference: 'TRX-2026-0042',
      paid_at: '2026-10-14',
      amount_received_minor: 649870,
      currency_received: 'SYP',
      notes: 'Received at the Damascus branch.',
    })
    expect(confirmPayload({ ...filled, amount_received: '15', notes: '  ' }, usdCharge)).toEqual({ lock_version: 1, method: 'syriatel_cash', reference: 'TRX-2026-0042', paid_at: '2026-10-14', amount_received_minor: 1500, currency_received: 'USD' })
  })

  it('takes the two Syrian mobile-money methods the owner named', () => {
    expect(OFFLINE_METHODS).toEqual(['bank_transfer', 'cash', 'syriatel_cash', 'mtn_cash', 'external_gateway', 'manual_reconciliation'])
  })

  it('validates each field the way the API does, the amount equal to the amount due', () => {
    expect(isConfirmFormValid(filled, TODAY, sypCharge)).toBe(true)
    expect(isConfirmFormValid(emptyConfirmForm(), TODAY, sypCharge)).toBe(false)
    expect(emptyConfirmForm()).not.toHaveProperty('currency_received')
    expect(confirmFormErrors({ ...filled, reference: 'ab' }, TODAY, sypCharge).reference).toBe('reference')
    expect(confirmFormErrors({ ...filled, paid_at: '2026-10-16' }, TODAY, sypCharge).paid_at).toBe('paid_at')
    expect(confirmFormErrors({ ...filled, amount_received: '649870.5' }, TODAY, sypCharge).amount_received).toBe('amount_received')
    expect(confirmFormErrors({ ...filled, amount_received: '699860' }, TODAY, sypCharge).amount_received).toBe('amount_mismatch')
    expect(confirmFormErrors({ ...filled, amount_received: '15.00' }, TODAY, usdCharge).amount_received).toBe('')
    expect(confirmFormErrors({ ...filled, amount_received: '15.001' }, TODAY, usdCharge).amount_received).toBe('amount_received')
    expect(confirmFormErrors({ ...filled, amount_received: '14.99' }, TODAY, usdCharge).amount_received).toBe('amount_mismatch')
    expect(confirmFormErrors({ ...filled, method: 'wallet' }, TODAY, sypCharge).method).toBe('method')
  })

  it('never confirms a request in points from before 17 Oct 2026', () => {
    expect(isConfirmableCharge(pointsCharge)).toBe(false)
    expect(isConfirmableCharge(usdCharge)).toBe(true)
    expect(confirmFormErrors({ ...filled, amount_received: '1500' }, TODAY, pointsCharge).amount_received).toBe('legacy_currency')
  })

  it('offers the out-of-date-rate category only on a request in Syrian pounds', () => {
    expect(STAFF_CANCEL_CATEGORIES).toContain('exchange_rate_outdated')
    expect(cancelCategoriesFor(sypCharge)).toContain('exchange_rate_outdated')
    expect(cancelCategoriesFor(usdCharge)).not.toContain('exchange_rate_outdated')
  })

  // J07-G2 (17 Oct 2026): the server says whether the rate in force differs from the request's own.
  it('offers the out-of-date-rate category only while the rate in force differs from the request\'s, and reads the refusal', () => {
    expect(cancelCategoriesFor({ ...sypCharge, exchange_rate_outdated: true })).toContain('exchange_rate_outdated')
    expect(cancelCategoriesFor({ ...sypCharge, exchange_rate_outdated: false })).not.toContain('exchange_rate_outdated')
    expect(cancelCategoriesFor({ ...sypCharge, exchange_rate_outdated: false })).toContain('payment_not_found')
    expect(cancelCategoriesFor({ ...usdCharge, exchange_rate_outdated: true })).not.toContain('exchange_rate_outdated')
    expect(rateUnchanged({ response: { status: 422, data: { reason_code: 'exchange_rate_unchanged' } } })).toBe(true)
    expect(rateUnchanged({ response: { status: 422, data: { reason_code: 'amount_mismatch' } } })).toBe(false)
    expect(rateUnchanged({ response: { status: 409, data: { reason_code: 'exchange_rate_unchanged' } } })).toBe(false)
  })

  it('reads the 503 exchange_rate_missing, and nothing else', () => {
    expect(rateMissing({ response: { status: 503, data: { code: 'exchange_rate_missing' } } })).toBe(true)
    expect(rateMissing({ response: { status: 503, data: { code: 'rpl_setting_missing' } } })).toBe(false)
    expect(rateMissing({ response: { status: 422, data: { code: 'exchange_rate_missing' } } })).toBe(false)
  })

  it('warns when another charge of the same type and round is already paid', () => {
    const pending = { public_id: 'c-2', type: 'final_exam_retake', cycle: 2, status: 'pending' }
    expect(hasPaidChargeForSlot([pending, { public_id: 'c-1', type: 'final_exam_retake', cycle: 2, status: 'paid' }], pending)).toBe(true)
    expect(hasPaidChargeForSlot([pending, { public_id: 'c-1', type: 'final_exam_retake', cycle: 3, status: 'paid' }], pending)).toBe(false)
    expect(hasPaidChargeForSlot([pending, { public_id: 'c-1', type: 'final_exam_retake', cycle: 2, status: 'refunded' }], pending)).toBe(false)
  })
})

describe('amounts, titles, tries, wording and certificate kinds', () => {
  it('shows a charge in dollars, in pounds with its dollar price and rate, or in points as an earlier record', () => {
    const rate = { id: 7, syp_per_usd: '13000.0000', effective_from: '2026-10-15T08:00:00Z' }
    const usd = { route: 'wallet', amount: { currency: 'USD', amount_minor: 4999, amount: '49.99' }, price_usd: { currency: 'USD', amount_minor: 4999, amount: '49.99' }, exchange_rate: null }
    const syp = { route: 'wallet', amount: { currency: 'SYP', amount_minor: 649870, amount: '649870' }, price_usd: { currency: 'USD', amount_minor: 4999, amount: '49.99' }, exchange_rate: rate }
    const points = { route: 'wallet', amount: { currency: LEGACY_POINTS, amount_minor: 1500, amount: '1500', legacy: true }, price_usd: null, exchange_rate: null }
    expect(chargePriceLine(usd, 'en')).toBe('$ 49.99')
    expect(chargePriceLine(syp, 'en')).toBe('649,870 SYP ($ 49.99 at 1 USD = 13,000 SYP)')
    expect(chargePriceLine(syp, 'ar')).toContain('649,870 ل.س')
    expect(chargePriceLine(points, 'en')).toBe('1,500 points (earlier record)')
    expect(chargePriceLine(points, 'ar')).toContain('1,500 نقطة (سجل سابق)')
    expect(chargePriceLine({ amount: null }, 'en')).toBe('—')
    expect(chargeRouteLabel(usd, 'en')).toBe('Wallet, dollar balance')
    expect(chargeRouteLabel(syp, 'en')).toBe('Wallet, pound balance')
    expect(chargeRouteLabel(points, 'en')).toBe('Wallet')
    expect(chargeRouteLabel({ ...usd, route: 'offline' }, 'ar')).toBe('دفع خارج المنصة')
    expect(chargePaidInLabel(syp, 'en')).toBe('Syrian pounds')
    expect(chargePaidInLabel(points, 'en')).toBe('Points (earlier record)')
    expect(chargePaidInLabel({}, 'en')).toBe('—')
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

describe('the Fees tab schedule (owner, 17 Oct 2026: US dollars only)', () => {
  it('takes US dollars only; any other currency is a legacy row, never saved as it is', () => {
    expect(feeScheduleFormError({ currency: 'USD', amount: '40' })).toBeNull()
    expect(feeScheduleFormError({ currency: 'usd', amount: '49.50' })).toBeNull()
    expect(feeScheduleFormError({ currency: LEGACY_POINTS, amount: '40' })).toBe('legacy_currency')
    expect(feeScheduleFormError({ currency: 'EUR', amount: '25' })).toBe('legacy_currency')
    expect(feeScheduleFormError({ currency: '', amount: '10' })).toBe('legacy_currency')
  })

  it('needs 0, or $1.00 to $1,000,000.00 with at most two decimals, sent as US cents', () => {
    expect(feeScheduleFormError({ currency: 'USD', amount: '0' })).toBeNull()
    expect(feeScheduleFormError({ currency: 'USD', amount: '' })).toBe('amount')
    expect(feeScheduleFormError({ currency: 'USD', amount: '-1' })).toBe('amount')
    expect(feeScheduleFormError({ currency: 'USD', amount: 'abc' })).toBe('amount')
    expect(feeScheduleFormError({ currency: 'USD', amount: '0.50' })).toBe('amount')
    expect(feeScheduleFormError({ currency: 'USD', amount: '40.505' })).toBe('amount')
    expect(feeScheduleFormError({ currency: 'USD', amount: '1000000.01' })).toBe('amount')
    expect(feeScheduleFormError({ currency: 'USD', amount: '40.5' })).toBeNull()
    expect(feeScheduleAmountMinor({ currency: 'USD', amount: '40.5' })).toBe(4050)
    expect(feeScheduleAmountMinor({ currency: 'USD', amount: '49.50' })).toBe(4950)
  })
})
