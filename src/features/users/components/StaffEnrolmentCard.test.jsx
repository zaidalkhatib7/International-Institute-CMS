import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import StaffEnrolmentCard from './StaffEnrolmentCard'
import { ENROLMENT_GATE_CODES, ENROLMENT_REFUSAL_COPY, enrolmentRefusal } from '../domain/enrolment'

/*
 * THE STAFF-ASSISTED ENROLMENT REFUSED BY THE RPL PURCHASE GATE (review of the
 * fixes, 17 Oct 2026; J09-F1 on the platform).
 *
 * Pinned: each reason_code the API's RplCoursePlanGate answers with is said in
 * the reader's language in its own words (never the old single "outside the
 * approved learning plan" sentence, and never an override the platform cannot
 * make); a code the platform does not know yet shows the API's message, in the
 * reader's language when the API sends it; anything else keeps its own handling.
 */

const mocks = vi.hoisted(() => ({ enrollUserByStaff: vi.fn() }))

vi.mock('../services/usersService', () => mocks)

const COPY = {
  professional: 'Professional programmes',
  professionalHint: 'Enrol the client in a programme.',
  selectProgram: 'Select an eligible programme',
  noPrograms: 'No eligible programmes.',
  enrollFailed: 'Unable to enroll this client.',
}

const PROGRAMME = { id: 31, title: { en: 'Gap course 31', ar: 'دورة الفجوة 31' }, program_type: 'short_course', is_free: true, price: null }

// The API's 422 (Admin\UserController::enroll): message (en), message_label {en, ar}, reason_code and errors.
function gateRefusal(code, label = { en: `API says ${code}.`, ar: `يقول الخادم ${code}.` }) {
  return {
    response: {
      status: 422,
      data: {
        message: label.en,
        message_label: label,
        reason_code: code,
        errors: code === 'rpl_course_not_in_approved_plan'
          ? { override_reason: ['An override needs a written reason of 10 to 2000 characters.'] }
          : { program_id: [label.en] },
      },
    },
  }
}

function renderCard(language = 'en') {
  return render(<StaffEnrolmentCard userId={7} user={{ id: 7 }} programs={[PROGRAMME]} copy={COPY} language={language} typeLabel={() => 'Short course'} />)
}

async function enrolFree(language = 'en') {
  renderCard(language)
  fireEvent.change(screen.getByLabelText(COPY.selectProgram), { target: { value: '31' } })
  fireEvent.click(screen.getByRole('button', { name: language === 'ar' ? 'سجّل (مجاني)' : 'Enrol (free)' }))
  await waitFor(() => expect(mocks.enrollUserByStaff).toHaveBeenCalledWith(7, { program_id: 31 }))
  return screen.findByRole('alert')
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('the purchase gate\'s refusal, per reason_code', () => {
  it.each(ENROLMENT_GATE_CODES.map((code) => [code]))('says %s in its own words, in English', async (code) => {
    mocks.enrollUserByStaff.mockRejectedValue(gateRefusal(code))
    const alert = await enrolFree('en')
    expect(alert).toHaveTextContent(ENROLMENT_REFUSAL_COPY.en[code])
    expect(alert.textContent).not.toMatch(/override/i)
    expect(alert.textContent).not.toMatch(/submitted data/i)
  })

  it.each(ENROLMENT_GATE_CODES.map((code) => [code]))('says %s in Arabic', async (code) => {
    mocks.enrollUserByStaff.mockRejectedValue(gateRefusal(code))
    const alert = await enrolFree('ar')
    expect(alert).toHaveTextContent(ENROLMENT_REFUSAL_COPY.ar[code])
    expect(document.body.textContent).not.toContain('undefined')
  })

  it('never says "outside the approved learning plan" for a request closed with the experience certificate', async () => {
    mocks.enrollUserByStaff.mockRejectedValue(gateRefusal('rpl_case_closed_with_experience_certificate', {
      en: 'This course is outside the client\'s approved learning plan. Enrol only with an override and a written reason.',
      ar: 'هذه الدورة خارج خطة التعلم المعتمدة للعميل.',
    }))
    const alert = await enrolFree('en')
    expect(alert).toHaveTextContent('Experience Confirmation Certificate')
    expect(alert.textContent).not.toContain('outside the client')
  })

  it('shows the API\'s own message for a gate code the platform does not know yet, in the reader\'s language', async () => {
    mocks.enrollUserByStaff.mockRejectedValue(gateRefusal('rpl_something_new', { en: 'A new precise reason.', ar: 'سبب دقيق جديد.' }))
    expect(await enrolFree('ar')).toHaveTextContent('سبب دقيق جديد.')
  })

  it('keeps the general handling for any other refusal', async () => {
    mocks.enrollUserByStaff.mockRejectedValue({ response: { status: 422, data: { message: 'Only active programs can be purchased.' } } })
    expect(await enrolFree('en')).toHaveTextContent('Only active programs can be purchased.')
  })
})

describe('enrolmentRefusal', () => {
  it('has the same codes in Arabic and English, and every gate code', () => {
    expect(Object.keys(ENROLMENT_REFUSAL_COPY.ar).sort()).toEqual([...ENROLMENT_GATE_CODES].sort())
    expect(Object.keys(ENROLMENT_REFUSAL_COPY.en).sort()).toEqual([...ENROLMENT_GATE_CODES].sort())
  })

  it('reads only a 422 carrying a gate code', () => {
    expect(enrolmentRefusal({ response: { status: 409, data: { reason_code: 'rpl_course_already_bought' } } }, 'en')).toBeNull()
    expect(enrolmentRefusal({ response: { status: 422, data: { reason_code: 'insufficient_balance', message: 'Too low.' } } }, 'en')).toBeNull()
    expect(enrolmentRefusal({ response: { status: 422, data: { message: 'No code.' } } }, 'en')).toBeNull()
    expect(enrolmentRefusal(new Error('network'), 'en')).toBeNull()
  })

  it('falls back to the API message: the label in the language, then English, then message', () => {
    expect(enrolmentRefusal({ response: { status: 422, data: { reason_code: 'rpl_x', message_label: { en: 'English.' }, message: 'Plain.' } } }, 'ar')).toBe('English.')
    expect(enrolmentRefusal({ response: { status: 422, data: { reason_code: 'rpl_x', message: 'Plain.' } } }, 'ar')).toBe('Plain.')
    expect(enrolmentRefusal({ response: { status: 422, data: { reason_code: 'rpl_x' } } }, 'en')).toBeNull()
  })

  it('answers in English when no language is given', () => {
    expect(enrolmentRefusal(gateRefusal('rpl_plan_not_active'), undefined)).toBe(ENROLMENT_REFUSAL_COPY.en.rpl_plan_not_active)
  })
})
