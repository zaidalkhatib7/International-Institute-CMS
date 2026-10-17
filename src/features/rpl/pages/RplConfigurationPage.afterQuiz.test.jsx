import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RplConfigurationPage, { COPY } from './RplConfigurationPage'
import { COURSE_PLAN_FAILED_MINIMUMS_COPY, COURSE_PLAN_MINIMUMS_COPY } from '../domain/coursePlan'
import { AFTER_QUIZ_COPY } from '../domain/afterQuiz'

/*
 * THE SETTINGS AFTER THE ENTRY QUIZ ON THE CONTROLS TAB (owner model of 15 Oct
 * 2026, P6; round-3 answer O1) AND THE CERTIFICATE WORDING TAB (O3).
 *
 * The five P6 keys and the failed-client minimums (rpl_course_plan_minimums_failed)
 * ride the page's one save under the same rule as P4's mark and P5's minimums: a
 * key goes into the PUT only when the server holds a value for it or someone
 * typed, emptying a nullable key sends null, and a 422 lands under the field it
 * names. The wording has a tab of its own that loads itself.
 */

const mocks = vi.hoisted(() => ({
  fetchRplSettings: vi.fn(),
  updateRplSettings: vi.fn(),
  fetchRplConfiguration: vi.fn(),
  fetchRplReferenceData: vi.fn(),
  createRplConfiguration: vi.fn(),
  updateRplConfiguration: vi.fn(),
  deleteRplConfiguration: vi.fn(),
  fetchRplCertificateWordings: vi.fn(),
  draftRplCertificateWording: vi.fn(),
  updateRplCertificateWording: vi.fn(),
  approveRplCertificateWording: vi.fn(),
}))

const language = vi.hoisted(() => ({ current: 'en' }))

vi.mock('../services/rplService', () => mocks)
// The pound preview under a typed price reads the public currencies route.
vi.mock('../../finance/services/financeService', () => ({ fetchCurrencies: vi.fn().mockResolvedValue({ exchange_rate: null }) }))
vi.mock('../../users/services/usersService', () => ({ fetchUsers: vi.fn() }))
vi.mock('../../../services/languageStorage', async (importOriginal) => ({
  ...(await importOriginal()),
  getAdminLanguage: () => language.current,
}))

const S = AFTER_QUIZ_COPY.en.settings
const FM = COURSE_PLAN_FAILED_MINIMUMS_COPY.en
const longPrompt = 'Governed advisory instruction. '.repeat(20)

const REFERENCE = {
  data: {
    pathways: [{ id: 1, code: 'rpl_without_secondary', levels: [
      { id: 1, code: 'practitioner', rank: 1, name: { en: 'Professional Practitioner', ar: 'ممارس مهني' } },
      { id: 2, code: 'advanced_practitioner', rank: 2, name: { en: 'Advanced Professional Practitioner', ar: 'ممارس مهني متقدم' } },
      { id: 3, code: 'expert', rank: 3, name: { en: 'Professional Expert', ar: 'خبير مهني' } },
    ] }],
  },
}

function storedSettings(overrides = {}) {
  return {
    data: {
      appeal_window_days: 15,
      require_verified_evidence_for_assessment: true,
      gemini_advisory_model: 'gemini-3.5-flash',
      gemini_advisory_prompt: longPrompt,
      rpl_advisory_include_evidence_documents: true,
      rpl_reapply_cooldown_days: 7,
      rpl_reapply_cooldown_scope: 'all_rejections',
      rpl_quiz_pass_mark_percent: 50,
      rpl_course_plan_minimums: { practitioner: 5, advanced_practitioner: 7, expert: 10 },
      // As seeded by migration 100008 and the O1 seed: four JSON nulls, the mark 50, and the failed minimums.
      rpl_experience_certificate_price_usd_minor: null,
      rpl_final_exam_pass_mark_percent: 50,
      rpl_final_exam_questions_per_course: null,
      rpl_final_exam_retake_wait_days: null,
      rpl_final_exam_retake_fee_usd_minor: null,
      rpl_course_plan_minimums_failed: { practitioner: 5, advanced_practitioner: 7, expert: 10 },
      ...overrides,
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  language.current = 'en'
  mocks.fetchRplConfiguration.mockResolvedValue({ data: [] })
  mocks.fetchRplReferenceData.mockResolvedValue(REFERENCE)
  mocks.updateRplSettings.mockResolvedValue({ data: {} })
  mocks.fetchRplSettings.mockResolvedValue(storedSettings())
  mocks.fetchRplCertificateWordings.mockResolvedValue({ data: [] })
})

async function openControls(copy = COPY.en) {
  render(<RplConfigurationPage />)
  fireEvent.click(await screen.findByRole('button', { name: copy.workflow }))
  return screen.findByRole('region', { name: copy === COPY.ar ? AFTER_QUIZ_COPY.ar.settings.title : S.title })
}

const save = () => fireEvent.click(screen.getByRole('button', { name: COPY.en.saveSettings }))
const saveButton = () => screen.getByRole('button', { name: COPY.en.saveSettings })

describe('the five settings after the entry quiz', () => {
  it('shows five inputs, filled only with what the server holds (the seeded mark 50), the two prices as dollar fields', async () => {
    const block = within(await openControls())

    expect(block.getAllByRole('spinbutton')).toHaveLength(3)
    expect(block.getAllByRole('spinbutton').map((input) => input.value)).toEqual(['50', '', ''])
    expect(block.getByLabelText(S.fields.price.label)).toHaveValue('')
    expect(block.getByLabelText(S.fields.retakeFee.label)).toHaveValue('')
  })

  it('puts a key into the PUT only when held or typed, and sends null to clear a nullable one', async () => {
    await openControls()

    save()
    await waitFor(() => expect(mocks.updateRplSettings).toHaveBeenCalledTimes(1))
    const first = mocks.updateRplSettings.mock.calls[0][0]
    expect(first.rpl_final_exam_pass_mark_percent).toBe(50)
    for (const key of ['rpl_experience_certificate_price_usd_minor', 'rpl_final_exam_questions_per_course', 'rpl_final_exam_retake_wait_days', 'rpl_final_exam_retake_fee_usd_minor']) {
      expect(first).not.toHaveProperty(key)
    }

    fireEvent.change(screen.getByLabelText(S.fields.price.label), { target: { value: '1500' } })
    fireEvent.change(screen.getByLabelText(S.fields.questionsPerCourse.label), { target: { value: '5' } })
    save()
    await waitFor(() => expect(mocks.updateRplSettings).toHaveBeenCalledTimes(2))
    // $1,500 typed in dollars is sent as whole US cents (contract 2.8).
    expect(mocks.updateRplSettings.mock.calls[1][0]).toMatchObject({ rpl_experience_certificate_price_usd_minor: 150000, rpl_final_exam_questions_per_course: 5, rpl_final_exam_pass_mark_percent: 50 })
    expect(mocks.updateRplSettings.mock.calls[1][0]).not.toHaveProperty('rpl_final_exam_retake_fee_usd_minor')
    expect(mocks.updateRplSettings.mock.calls[1][0]).not.toHaveProperty('rpl_experience_certificate_price_points')

    // The owner withdraws the price: the key is sent as null.
    fireEvent.change(screen.getByLabelText(S.fields.price.label), { target: { value: '' } })
    save()
    await waitFor(() => expect(mocks.updateRplSettings).toHaveBeenCalledTimes(3))
    expect(mocks.updateRplSettings.mock.calls[2][0]).toHaveProperty('rpl_experience_certificate_price_usd_minor', null)
  })

  it('holds the save back while a value is out of bounds, and never lets the pass mark be emptied', async () => {
    await openControls()

    fireEvent.change(screen.getByLabelText(S.fields.waitDays.label), { target: { value: '366' } })
    expect(saveButton()).toBeDisabled()
    fireEvent.change(screen.getByLabelText(S.fields.waitDays.label), { target: { value: '0' } })
    expect(saveButton()).toBeEnabled()
    fireEvent.change(screen.getByLabelText(S.fields.passMark.label), { target: { value: '' } })
    expect(screen.getByText(S.passMarkRequired)).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()
  })

  it('shows the server\'s 422 under the key it names', async () => {
    const line = 'The rpl final exam questions per course field must not be greater than 50.'
    mocks.updateRplSettings.mockRejectedValue({ response: { status: 422, data: { message: line, errors: { rpl_final_exam_questions_per_course: [line] } } } })
    await openControls()

    fireEvent.change(screen.getByLabelText(S.fields.questionsPerCourse.label), { target: { value: '7' } })
    save()

    const field = screen.getByLabelText(S.fields.questionsPerCourse.label)
    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'))
    expect(document.getElementById(field.getAttribute('aria-describedby'))).toHaveTextContent(line)
    expect(screen.getByLabelText(S.fields.price.label)).not.toHaveAttribute('aria-invalid')
  })
})

describe('the failed-client minimums (O1)', () => {
  const failedLabel = (name) => `${name}, entry quiz not passed (0 to 50)`

  it('shows a second row of three inputs in its own block, held values shown', async () => {
    await openControls()

    const block = within(screen.getByRole('region', { name: FM.title }))
    expect(block.getAllByRole('spinbutton').map((input) => input.value)).toEqual(['5', '7', '10'])
    expect(block.getByText(FM.hint)).toBeInTheDocument()
    // The passed row keeps its own three.
    expect(within(screen.getByRole('region', { name: COURSE_PLAN_MINIMUMS_COPY.en.title })).getAllByRole('spinbutton')).toHaveLength(3)
  })

  it('saves the whole map under its own key, 0 allowed, and the passed map untouched', async () => {
    await openControls()

    fireEvent.change(screen.getByLabelText(failedLabel('Professional Practitioner')), { target: { value: '0' } })
    save()

    await waitFor(() => expect(mocks.updateRplSettings).toHaveBeenCalledTimes(1))
    const body = mocks.updateRplSettings.mock.calls[0][0]
    expect(body.rpl_course_plan_minimums_failed).toEqual({ practitioner: 0, advanced_practitioner: 7, expert: 10 })
    expect(body.rpl_course_plan_minimums).toEqual({ practitioner: 5, advanced_practitioner: 7, expert: 10 })
  })

  it('invents nothing when the server holds no failed map', async () => {
    mocks.fetchRplSettings.mockResolvedValue(storedSettings({ rpl_course_plan_minimums_failed: null }))
    await openControls()

    const block = within(screen.getByRole('region', { name: FM.title }))
    expect(block.getAllByRole('spinbutton').map((input) => input.value)).toEqual(['', '', ''])
    expect(block.getByText(FM.missing)).toBeInTheDocument()
    save()
    await waitFor(() => expect(mocks.updateRplSettings).toHaveBeenCalledTimes(1))
    expect(mocks.updateRplSettings.mock.calls[0][0]).not.toHaveProperty('rpl_course_plan_minimums_failed')
  })

  it('puts a 422 under the failed level it names, never under the passed row', async () => {
    const line = 'The rpl course plan minimums failed.expert field must not be greater than 50.'
    mocks.updateRplSettings.mockRejectedValue({ response: { status: 422, data: { message: line, errors: { 'rpl_course_plan_minimums_failed.expert': [line] } } } })
    await openControls()

    save()

    const failedExpert = screen.getByLabelText(failedLabel('Professional Expert'))
    await waitFor(() => expect(failedExpert).toHaveAttribute('aria-invalid', 'true'))
    expect(screen.getByLabelText('Professional Expert (0 to 50)')).not.toHaveAttribute('aria-invalid')
  })
})

describe('the certificate wording tab (O3)', () => {
  it('opens the wording panel, which loads itself', async () => {
    render(<RplConfigurationPage />)
    fireEvent.click(await screen.findByRole('button', { name: COPY.en.certificate_wording }))

    expect(await screen.findByText(AFTER_QUIZ_COPY.en.wording.notApproved)).toBeInTheDocument()
    expect(mocks.fetchRplCertificateWordings).toHaveBeenCalledWith('rpl_experience_confirmation')
    expect(mocks.fetchRplSettings).not.toHaveBeenCalled()
  })
})

describe('in Arabic', () => {
  it('renders the P6 settings without a literal "undefined"', async () => {
    language.current = 'ar'
    await openControls(COPY.ar)

    expect(screen.getByRole('region', { name: COURSE_PLAN_FAILED_MINIMUMS_COPY.ar.title })).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('undefined')
  })
})
