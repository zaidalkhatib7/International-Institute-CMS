import { MemoryRouter } from 'react-router-dom'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RplConfigurationPage, { COPY } from './RplConfigurationPage'
import { QUIZ_PASS_MARK_COPY } from '../domain/entryQuiz'

/*
 * THE ENTRY QUIZ PASS MARK SETTING (owner, 12 Oct 2026, D12(a), P4).
 *
 * `rpl_quiz_pass_mark_percent` on GET/PUT /admin/rpl/settings: an integer from
 * 1 to 99, seeded 50, saved with the page's existing save. A client passes with
 * MORE than it. It is governed and has no default (R15): when the server does
 * not hold it, the form writes nothing until somebody types a value, and says
 * that every entry quiz is referred to staff meanwhile.
 */

const mocks = vi.hoisted(() => ({
  fetchRplSettings: vi.fn(),
  updateRplSettings: vi.fn(),
  fetchRplConfiguration: vi.fn(),
  fetchRplReferenceData: vi.fn(),
  createRplConfiguration: vi.fn(),
  updateRplConfiguration: vi.fn(),
  deleteRplConfiguration: vi.fn(),
}))

const language = vi.hoisted(() => ({ current: 'en' }))

vi.mock('../services/rplService', () => mocks)
vi.mock('../../users/services/usersService', () => ({ fetchUsers: vi.fn() }))
// Partial: readApiError reads the stored admin language off this same module.
vi.mock('../../../services/languageStorage', async (importOriginal) => ({
  ...(await importOriginal()),
  getAdminLanguage: () => language.current,
}))

const PM = QUIZ_PASS_MARK_COPY.en
const longPrompt = 'Governed advisory instruction. '.repeat(20)

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
      ...overrides,
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  language.current = 'en'
  mocks.fetchRplConfiguration.mockResolvedValue({ data: [] })
  mocks.fetchRplReferenceData.mockResolvedValue({ data: {} })
  mocks.updateRplSettings.mockResolvedValue({ data: {} })
  mocks.fetchRplSettings.mockResolvedValue(storedSettings())
})

async function openControls(copy = COPY.en, label = PM.label) {
  render(<MemoryRouter><RplConfigurationPage /></MemoryRouter>)
  fireEvent.click(await screen.findByRole('button', { name: copy.workflow }))

  return screen.findByLabelText(label)
}

const save = () => fireEvent.click(screen.getByRole('button', { name: COPY.en.saveSettings }))

describe('the entry quiz pass mark', () => {
  it('shows the stored mark, the strict rule, and the rule in numbers', async () => {
    const input = await openControls()

    expect(input).toHaveValue(50)
    expect(input).toHaveAttribute('min', '1')
    expect(input).toHaveAttribute('max', '99')
    expect(screen.getByText(PM.rule)).toBeInTheDocument()
    expect(screen.getByText('Example with 50 questions: 26 correct passes, 25 correct does not.')).toBeInTheDocument()
    expect(screen.getByText(PM.hint)).toHaveTextContent(/entry gate to the learning plan, never a competency finding/)
  })

  it('saves the stored mark with the existing save, as a number, in exactly this body', async () => {
    await openControls()

    save()

    await waitFor(() => expect(mocks.updateRplSettings).toHaveBeenCalledTimes(1))
    expect(mocks.updateRplSettings.mock.calls[0][0]).toEqual({
      appeal_window_days: 15,
      require_verified_evidence_for_assessment: true,
      gemini_advisory_model: 'gemini-3.5-flash',
      gemini_advisory_prompt: longPrompt.trim(),
      rpl_advisory_include_evidence_documents: true,
      rpl_reapply_cooldown_days: 7,
      rpl_reapply_cooldown_scope: 'all_rejections',
      rpl_quiz_pass_mark_percent: 50,
    })
  })

  it('saves an edited mark, the other controls intact', async () => {
    const input = await openControls()

    fireEvent.change(input, { target: { value: '60' } })
    expect(screen.getByText('Example with 50 questions: 31 correct passes, 30 correct does not.')).toBeInTheDocument()
    save()

    await waitFor(() => expect(mocks.updateRplSettings).toHaveBeenCalledTimes(1))
    expect(mocks.updateRplSettings).toHaveBeenCalledWith(expect.objectContaining({
      rpl_quiz_pass_mark_percent: 60,
      appeal_window_days: 15,
      rpl_reapply_cooldown_days: 7,
    }))
  })

  it.each(['0', '100', '50.5', '-5', ''])('will not save %j and says why', async (value) => {
    const input = await openControls()

    fireEvent.change(input, { target: { value } })

    expect(screen.getByText(PM.invalid)).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('button', { name: COPY.en.saveSettings })).toBeDisabled()
  })

  it('accepts both bounds, 1 and 99', async () => {
    const input = await openControls()

    fireEvent.change(input, { target: { value: '1' } })
    expect(screen.getByRole('button', { name: COPY.en.saveSettings })).toBeEnabled()
    fireEvent.change(input, { target: { value: '99' } })
    expect(screen.getByRole('button', { name: COPY.en.saveSettings })).toBeEnabled()
    save()

    await waitFor(() =>
      expect(mocks.updateRplSettings).toHaveBeenCalledWith(expect.objectContaining({ rpl_quiz_pass_mark_percent: 99 })),
    )
  })

  it('invents no mark when the server holds none: it says so, writes nothing, and still saves the rest (R15)', async () => {
    mocks.fetchRplSettings.mockResolvedValue(storedSettings({ rpl_quiz_pass_mark_percent: null }))
    const input = await openControls()

    expect(input).toHaveValue(null)
    expect(screen.getByText(PM.missing)).toBeInTheDocument()
    save()

    await waitFor(() => expect(mocks.updateRplSettings).toHaveBeenCalledTimes(1))
    expect(mocks.updateRplSettings.mock.calls[0][0]).not.toHaveProperty('rpl_quiz_pass_mark_percent')

    fireEvent.change(input, { target: { value: '50' } })
    expect(screen.queryByText(PM.missing)).not.toBeInTheDocument()
    save()

    await waitFor(() => expect(mocks.updateRplSettings).toHaveBeenCalledTimes(2))
    expect(mocks.updateRplSettings.mock.calls[1][0]).toHaveProperty('rpl_quiz_pass_mark_percent', 50)
  })

  it('shows the server\'s 422 under the field and in the page alert', async () => {
    const refusal = 'The rpl quiz pass mark percent field must be between 1 and 99.'
    mocks.updateRplSettings.mockRejectedValue({
      response: { status: 422, data: { message: refusal, errors: { rpl_quiz_pass_mark_percent: [refusal] } } },
    })
    const input = await openControls()

    fireEvent.change(input, { target: { value: '70' } })
    save()

    await waitFor(() => expect(screen.getAllByText(new RegExp(refusal))).toHaveLength(2))
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(document.getElementById(input.getAttribute('aria-describedby'))).toHaveTextContent(refusal)
    expect(screen.getByRole('alert')).toHaveTextContent(refusal)

    // Editing the value clears the server line under the field.
    fireEvent.change(input, { target: { value: '71' } })
    expect(input).not.toHaveAttribute('aria-invalid')
    expect(input).not.toHaveAttribute('aria-describedby')
  })

  it('renders in Arabic without a literal "undefined"', async () => {
    language.current = 'ar'
    const AR = QUIZ_PASS_MARK_COPY.ar
    const input = await openControls(COPY.ar, AR.label)

    expect(input).toHaveValue(50)
    const block = within(screen.getByRole('region', { name: AR.title }))
    expect(block.getByText(AR.rule)).toBeInTheDocument()
    expect(block.getByText('مثال على اختبار من 50 سؤالًا: 26 إجابة صحيحة تنجح، و25 لا تنجح.')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('undefined')
  })
})
