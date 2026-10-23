import { MemoryRouter } from 'react-router-dom'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RplConfigurationPage, { COPY } from './RplConfigurationPage'
import { SCREENING_SETTINGS_COPY } from '../domain/documentScreening'

/*
 * THE PRIVACY KILL SWITCH NEEDS A SWITCH.
 *
 * `rpl_advisory_include_evidence_documents` decides whether the applicant's own
 * uploaded files leave the platform for Gemini. It governs four call sites, the
 * backend has always accepted it on the settings endpoint — and there was no
 * control anywhere in the CMS, so the only way to move it was an UPDATE against
 * `rpl_settings`. That is not a control anyone can reach in the moment they need
 * it, which is the moment an applicant objects.
 *
 * Copy lookup on this page is a whole-object fallback with no per-key rescue, so
 * a key present in en and missing in ar renders the literal string "undefined" —
 * in the language this CMS actually defaults to.
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

const longPrompt = 'Governed advisory instruction. '.repeat(20)

beforeEach(() => {
  vi.clearAllMocks()
  language.current = 'en'
  mocks.fetchRplConfiguration.mockResolvedValue({ data: [] })
  mocks.fetchRplReferenceData.mockResolvedValue({ data: {} })
  mocks.updateRplSettings.mockResolvedValue({ data: {} })
  mocks.fetchRplSettings.mockResolvedValue({
    data: {
      appeal_window_days: 15,
      require_verified_evidence_for_assessment: true,
      gemini_advisory_model: 'gemini-3.5-flash',
      gemini_advisory_prompt: longPrompt,
      rpl_advisory_include_evidence_documents: true,
      rpl_reapply_cooldown_days: 7,
      rpl_reapply_cooldown_scope: 'all_rejections',
    },
  })
})

async function openControls(copy = COPY.en) {
  render(<MemoryRouter><RplConfigurationPage /></MemoryRouter>)
  fireEvent.click(await screen.findByRole('button', { name: copy.workflow }))

  return screen.findByRole('checkbox', { name: new RegExp(copy.evidenceDocuments) })
}

describe('the evidence-documents kill switch', () => {
  it('shows it on when the stored setting is on', async () => {
    const toggle = await openControls()

    expect(toggle).toBeChecked()
  })

  it('shows it off when governance has already switched it off', async () => {
    mocks.fetchRplSettings.mockResolvedValue({
      data: {
        appeal_window_days: 15,
        require_verified_evidence_for_assessment: true,
        gemini_advisory_model: 'gemini-3.5-flash',
        gemini_advisory_prompt: longPrompt,
        rpl_advisory_include_evidence_documents: false,
      },
    })

    expect(await openControls()).not.toBeChecked()
  })

  it('reads on when the row does not exist, matching the reader default', async () => {
    // The reader defaults the missing key to true (`?? true`). Showing it off
    // here would invite a save that writes a restriction nobody chose.
    mocks.fetchRplSettings.mockResolvedValue({
      data: { appeal_window_days: 15, gemini_advisory_prompt: longPrompt },
    })

    expect(await openControls()).toBeChecked()
  })

  it('says plainly what turning it off does', async () => {
    await openControls()

    const hint = screen.getByText(COPY.en.evidenceDocumentsHint)
    expect(hint).toHaveTextContent(/evidence metadata only/)
    // Turning it off does not blind the audit trail: the manifest is still
    // written, which is what makes "we did not send the files" checkable.
    expect(hint).toHaveTextContent(/still records a manifest/)
  })

  it('names the Academic RPL path the switch also governs', async () => {
    await openControls()

    // The setting is read at four call sites, not three: the case advisory, the
    // shared reader behind question generation AND answer evaluation, and
    // GeminiAcademicAdmissionService (POST /admin/rpl/academic/applications/
    // {application}/analyse). An enumeration that stops at three tells an
    // administrator the Academic path is ungoverned, which is the opposite of
    // true — and the whole point of this control is that an accreditor can
    // audit what the model was allowed to see.
    const hint = screen.getByText(COPY.en.evidenceDocumentsHint)
    expect(hint).toHaveTextContent(/Academic RPL admission analysis/)
    // Non-enumerating lead-in, so a fifth call site cannot make this a lie.
    expect(hint).toHaveTextContent(/every path that reads them/)
    expect(COPY.ar.evidenceDocumentsHint).toContain('RPL الأكاديمي')
  })

  it('saves the new value without disturbing the other controls', async () => {
    const toggle = await openControls()

    fireEvent.click(toggle)
    fireEvent.click(screen.getByRole('button', { name: COPY.en.saveSettings }))

    await waitFor(() => expect(mocks.updateRplSettings).toHaveBeenCalledTimes(1))
    expect(mocks.updateRplSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        rpl_advisory_include_evidence_documents: false,
        appeal_window_days: 15,
        require_verified_evidence_for_assessment: true,
      }),
    )
    // The model is the server's chain (AI resilience, D16): the old key is never sent, or the save is refused 422 model_set_by_chain.
    expect(mocks.updateRplSettings.mock.calls[0][0]).not.toHaveProperty('gemini_advisory_model')
  })

  it('sends it back on again', async () => {
    mocks.fetchRplSettings.mockResolvedValue({
      data: {
        appeal_window_days: 15,
        require_verified_evidence_for_assessment: true,
        gemini_advisory_model: 'gemini-3.5-flash',
        gemini_advisory_prompt: longPrompt,
        rpl_advisory_include_evidence_documents: false,
        rpl_reapply_cooldown_days: 7,
        rpl_reapply_cooldown_scope: 'all_rejections',
      },
    })
    const toggle = await openControls()

    fireEvent.click(toggle)
    fireEvent.click(screen.getByRole('button', { name: COPY.en.saveSettings }))

    await waitFor(() =>
      expect(mocks.updateRplSettings).toHaveBeenCalledWith(
        expect.objectContaining({ rpl_advisory_include_evidence_documents: true }),
      ),
    )
  })

  it('renders in Arabic without a literal "undefined"', async () => {
    language.current = 'ar'
    const toggle = await openControls(COPY.ar)

    expect(toggle).toBeChecked()
    expect(screen.getByText(COPY.ar.evidenceDocumentsHint)).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('undefined')
  })

  it('no longer claims Gemini never receives raw uploads', async () => {
    await openControls()

    // It does receive them, on every governed path, whenever the switch above
    // is on. Leaving the old sentence beside the new control would make the
    // screen contradict itself about the one thing it is there to govern.
    expect(screen.getByText(COPY.en.geminiHint)).toHaveTextContent(
      /the applicant’s own uploaded files|the applicant's own uploaded files/,
    )
  })
})

/*
 * THE REAPPLY COOLDOWN (owner, 12 Oct 2026).
 *
 * Two governed settings: how many days a rejected client waits before a new RPL
 * case (0-365), and which rejections start the wait. The API holds no default
 * for either and refuses every rejection while one is missing, so this form must
 * not invent one either: an absent row shows empty and blocks the save.
 */
describe('the reapply cooldown controls', () => {
  it('shows the stored days and scope', async () => {
    await openControls()

    expect(screen.getByLabelText(COPY.en.cooldownDays)).toHaveValue(7)
    expect(screen.getByLabelText(COPY.en.cooldownScope)).toHaveValue('all_rejections')
    expect(screen.getByRole('option', { name: COPY.en.cooldownScopeNarrow })).toHaveValue('screening_interview_quiz_declines')
  })

  it('saves an edited cooldown as a number, with the other controls intact', async () => {
    await openControls()

    fireEvent.change(screen.getByLabelText(COPY.en.cooldownDays), { target: { value: '14' } })
    fireEvent.change(screen.getByLabelText(COPY.en.cooldownScope), { target: { value: 'screening_interview_quiz_declines' } })
    fireEvent.click(screen.getByRole('button', { name: COPY.en.saveSettings }))

    await waitFor(() => expect(mocks.updateRplSettings).toHaveBeenCalledTimes(1))
    expect(mocks.updateRplSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        rpl_reapply_cooldown_days: 14,
        rpl_reapply_cooldown_scope: 'screening_interview_quiz_declines',
        appeal_window_days: 15,
        rpl_advisory_include_evidence_documents: true,
      }),
    )
  })

  it('accepts zero days, which means no wait', async () => {
    await openControls()

    fireEvent.change(screen.getByLabelText(COPY.en.cooldownDays), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: COPY.en.saveSettings }))

    await waitFor(() =>
      expect(mocks.updateRplSettings).toHaveBeenCalledWith(expect.objectContaining({ rpl_reapply_cooldown_days: 0 })),
    )
  })

  it('invents no value when the rows are absent, and will not save until one is chosen', async () => {
    mocks.fetchRplSettings.mockResolvedValue({
      data: { appeal_window_days: 15, gemini_advisory_prompt: longPrompt },
    })
    await openControls()

    expect(screen.getByLabelText(COPY.en.cooldownDays)).toHaveValue(null)
    expect(screen.getByLabelText(COPY.en.cooldownScope)).toHaveValue('')
    expect(screen.getAllByText(COPY.en.cooldownMissing)).toHaveLength(2)
    expect(screen.getByRole('button', { name: COPY.en.saveSettings })).toBeDisabled()

    fireEvent.change(screen.getByLabelText(COPY.en.cooldownDays), { target: { value: '7' } })
    fireEvent.change(screen.getByLabelText(COPY.en.cooldownScope), { target: { value: 'all_rejections' } })
    expect(screen.getByRole('button', { name: COPY.en.saveSettings })).toBeEnabled()
  })

  it.each(['366', '-1', '2.5', ''])('will not save %j days', async (value) => {
    await openControls()

    fireEvent.change(screen.getByLabelText(COPY.en.cooldownDays), { target: { value } })

    expect(screen.getByRole('button', { name: COPY.en.saveSettings })).toBeDisabled()
  })

  it('renders the cooldown in Arabic without a literal "undefined"', async () => {
    language.current = 'ar'
    await openControls(COPY.ar)

    expect(screen.getByText(COPY.ar.cooldownTitle)).toBeInTheDocument()
    expect(screen.getByLabelText(COPY.ar.cooldownDays)).toHaveValue(7)
    expect(document.body.textContent).not.toContain('undefined')
  })
})

describe('the copy itself', () => {
  it('keeps every key in both language blocks', () => {
    const paths = (block, prefix = '') =>
      Object.entries(block).flatMap(([key, value]) =>
        value && typeof value === 'object' && !Array.isArray(value)
          ? paths(value, `${prefix}${key}.`)
          : [`${prefix}${key}`],
      )

    expect(Object.keys(COPY).sort()).toEqual(['ar', 'en'])
    const en = paths(COPY.en).sort()
    expect(paths(COPY.ar).sort()).toEqual(en)
  })
})

/*
 * THE DOCUMENT SCREENING CONTROLS (owner flow of 12 Oct 2026, P2).
 *
 * Five settings on the same endpoint and the same save: the screen switch, the
 * online employer check, the model, and two category lists. The server refuses
 * the employer check (422) while the active applicant declaration is below
 * version 2, and that refusal has to be visible beside the switch. A key the
 * server does not hold is never written with a value nobody chose: an absent
 * extraction-only list saved as [] would quietly put identity documents back
 * under a figure.
 */
describe('the document screening controls', () => {
  const SC = SCREENING_SETTINGS_COPY.en
  const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const checkbox = (label) => screen.getByRole('checkbox', { name: new RegExp(escape(label)) })
  const group = (legend) => screen.getByRole('group', { name: legend })

  const screeningSettings = {
    rpl_document_screening_enabled: false,
    rpl_document_screening_web_search_enabled: false,
    rpl_document_screening_model: 'gemini-3-pro-preview',
    rpl_document_screening_excluded_categories: [],
    rpl_document_screening_extraction_only_categories: ['identity'],
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
        ...screeningSettings,
        ...overrides,
      },
    }
  }

  beforeEach(() => {
    mocks.fetchRplSettings.mockResolvedValue(storedSettings())
    mocks.fetchRplReferenceData.mockResolvedValue({
      data: {
        evidence_categories: [
          { id: 1, code: 'identity', name: { en: 'Personal identity', ar: 'الهوية الشخصية' }, is_active: true },
          { id: 2, code: 'professional_experience', name: { en: 'Professional experience', ar: 'الخبرة المهنية' }, is_active: true },
          { id: 3, code: 'legacy_letters', name: { en: 'Legacy letters', ar: 'خطابات قديمة' }, is_active: false },
        ],
      },
    })
  })

  it('shows the stored values, with active categories only', async () => {
    await openControls()

    expect(checkbox(SC.enabled)).not.toBeChecked()
    expect(checkbox(SC.webSearch)).not.toBeChecked()
    // The model is the server's chain now (D16), shown read-only: no field takes a model name.
    expect(screen.queryByLabelText(SC.model)).not.toBeInTheDocument()
    expect(document.querySelectorAll('[data-ai-chain="case_analysis"]').length).toBe(2)
    expect(within(group(SC.extractionOnly)).getByRole('checkbox', { name: /Personal identity/ })).toBeChecked()
    expect(within(group(SC.excluded)).getByRole('checkbox', { name: /Personal identity/ })).not.toBeChecked()
    expect(screen.queryByText('Legacy letters')).not.toBeInTheDocument()
  })

  it('saves the four it still owns with the existing save, never the model, the other controls intact', async () => {
    await openControls()

    fireEvent.click(checkbox(SC.enabled))
    fireEvent.click(checkbox(SC.webSearch))
    fireEvent.click(within(group(SC.excluded)).getByRole('checkbox', { name: /Professional experience/ }))
    fireEvent.click(screen.getByRole('button', { name: COPY.en.saveSettings }))

    await waitFor(() => expect(mocks.updateRplSettings).toHaveBeenCalledTimes(1))
    expect(mocks.updateRplSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        rpl_document_screening_enabled: true,
        rpl_document_screening_web_search_enabled: true,
        rpl_document_screening_excluded_categories: ['professional_experience'],
        rpl_document_screening_extraction_only_categories: ['identity'],
        appeal_window_days: 15,
        rpl_advisory_include_evidence_documents: true,
        rpl_reapply_cooldown_days: 7,
      }),
    )
    expect(mocks.updateRplSettings.mock.calls[0][0]).not.toHaveProperty('rpl_document_screening_model')
    expect(mocks.updateRplSettings.mock.calls[0][0]).not.toHaveProperty('gemini_advisory_model')
  })

  it('shows the server\'s 422 for the employer check beside its switch', async () => {
    const refusal = 'Online employer checks need applicant declaration version 2 or later to be active.'
    mocks.updateRplSettings.mockRejectedValue({
      response: { status: 422, data: { message: refusal, errors: { rpl_document_screening_web_search_enabled: [refusal] } } },
    })
    await openControls()

    fireEvent.click(checkbox(SC.webSearch))
    fireEvent.click(screen.getByRole('button', { name: COPY.en.saveSettings }))

    // Once in the page alert, once under the switch itself.
    await waitFor(() => expect(screen.getAllByText(new RegExp(escape(refusal)))).toHaveLength(2))
    const toggle = checkbox(SC.webSearch)
    expect(toggle).toHaveAttribute('aria-invalid', 'true')
    expect(document.getElementById(toggle.getAttribute('aria-describedby'))).toHaveTextContent(refusal)
  })

  it('writes no screening key the server does not hold, until somebody changes one', async () => {
    mocks.fetchRplSettings.mockResolvedValue({
      data: { appeal_window_days: 15, gemini_advisory_prompt: longPrompt, rpl_reapply_cooldown_days: 7, rpl_reapply_cooldown_scope: 'all_rejections' },
    })
    await openControls()

    fireEvent.click(screen.getByRole('button', { name: COPY.en.saveSettings }))
    await waitFor(() => expect(mocks.updateRplSettings).toHaveBeenCalledTimes(1))
    expect(Object.keys(mocks.updateRplSettings.mock.calls[0][0]).filter((key) => key.startsWith('rpl_document_screening'))).toEqual([])

    fireEvent.click(checkbox(SC.enabled))
    fireEvent.click(screen.getByRole('button', { name: COPY.en.saveSettings }))
    await waitFor(() => expect(mocks.updateRplSettings).toHaveBeenCalledTimes(2))
    const second = mocks.updateRplSettings.mock.calls[1][0]
    expect(Object.keys(second).filter((key) => key.startsWith('rpl_document_screening'))).toEqual(['rpl_document_screening_enabled'])
    expect(second.rpl_document_screening_enabled).toBe(true)
  })

  it('shows the model as the server\'s chain, read-only, and saves without one', async () => {
    await openControls()

    expect(screen.queryByText(SC.modelRequired)).not.toBeInTheDocument()
    expect(screen.getAllByText(/set by the server's AI model chain/).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'AI service page' })[0]).toHaveAttribute('href', '/settings/ai-service')
    expect(screen.getByRole('button', { name: COPY.en.saveSettings })).toBeEnabled()
  })

  it('warns that every screen is refused while document reading is off', async () => {
    mocks.fetchRplSettings.mockResolvedValue(storedSettings({ rpl_document_screening_enabled: true, rpl_advisory_include_evidence_documents: false }))
    await openControls()

    expect(screen.getByText(SC.readingOff)).toBeInTheDocument()
  })

  it('keeps a stored code that is no longer active visible, so it can be unticked', async () => {
    mocks.fetchRplSettings.mockResolvedValue(storedSettings({ rpl_document_screening_excluded_categories: ['legacy_letters'] }))
    await openControls()

    const stale = within(group(SC.excluded)).getByRole('checkbox', { name: /legacy_letters/ })
    expect(stale).toBeChecked()
    expect(within(group(SC.excluded)).getByText(SC.inactiveCategory)).toBeInTheDocument()

    fireEvent.click(stale)
    fireEvent.click(screen.getByRole('button', { name: COPY.en.saveSettings }))

    await waitFor(() =>
      expect(mocks.updateRplSettings).toHaveBeenCalledWith(expect.objectContaining({ rpl_document_screening_excluded_categories: [] })),
    )
  })

  it('never lets identity documents be left in neither list: identity is unticked only once it is ticked in the other (D20(c))', async () => {
    await openControls()

    const extractionIdentity = within(group(SC.extractionOnly)).getByRole('checkbox', { name: /Personal identity/ })
    expect(extractionIdentity).toBeChecked()
    expect(extractionIdentity).toBeDisabled()
    expect(within(group(SC.extractionOnly)).getByText(SC.identityLocked)).toBeInTheDocument()
    // Other categories stay free.
    expect(within(group(SC.extractionOnly)).getByRole('checkbox', { name: /Professional experience/ })).toBeEnabled()

    // Moving it: tick it in the excluded list first, then untick it here.
    fireEvent.click(within(group(SC.excluded)).getByRole('checkbox', { name: /Personal identity/ }))
    expect(extractionIdentity).toBeEnabled()
    fireEvent.click(extractionIdentity)
    // Now the excluded one is the only place it stands, so that one is held.
    expect(within(group(SC.excluded)).getByRole('checkbox', { name: /Personal identity/ })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: COPY.en.saveSettings }))

    await waitFor(() => expect(mocks.updateRplSettings).toHaveBeenCalledTimes(1))
    expect(mocks.updateRplSettings).toHaveBeenCalledWith(expect.objectContaining({
      rpl_document_screening_excluded_categories: ['identity'],
      rpl_document_screening_extraction_only_categories: [],
    }))
  })

  it('says the employer check sends name and location only, never a website', async () => {
    await openControls()

    expect(screen.getByText(SC.webSearchHint)).toBeInTheDocument()
    expect(SC.webSearchHint).toMatch(/country and city only/)
    expect(SC.webSearchHint).toMatch(/never the employer's website/)
    expect(SCREENING_SETTINGS_COPY.ar.webSearchHint).toMatch(/بلدها ومدينتها فقط/)
  })

  it('renders in Arabic and in English, never "undefined"', async () => {
    language.current = 'ar'
    const { unmount } = render(<MemoryRouter><RplConfigurationPage /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: COPY.ar.workflow }))

    expect(await screen.findByText(SCREENING_SETTINGS_COPY.ar.title)).toBeInTheDocument()
    expect(within(group(SCREENING_SETTINGS_COPY.ar.extractionOnly)).getByRole('checkbox', { name: /الهوية الشخصية/ })).toBeChecked()
    expect(document.body.textContent).not.toContain('undefined')
    unmount()

    language.current = 'en'
    render(<MemoryRouter><RplConfigurationPage /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: COPY.en.workflow }))

    expect(await screen.findByText(SC.title)).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('undefined')
  })
})

/*
 * THE INTERVIEW SETTINGS (owner flow of 12 Oct 2026, P3).
 *
 * Two keys on the same endpoint and the same save: the days an applicant has
 * to choose an interview online or at the office (1 to 60, seeded 7), and the
 * office address in Arabic and English (at most 500 characters each, seeded
 * empty), which prefills an interview at the office. A key the server does not
 * hold is not written until somebody changes it, and a refusal from the server
 * appears under the field it names.
 */
describe('the interview settings', () => {
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
        rpl_interview_response_days: 7,
        rpl_interview_office_address: { ar: 'عمّان، شارع الجامعة 12', en: 'Amman, University Street 12' },
        ...overrides,
      },
    }
  }

  beforeEach(() => {
    mocks.fetchRplSettings.mockResolvedValue(storedSettings())
  })

  it('shows the stored days and the address in both languages', async () => {
    await openControls()

    expect(screen.getByLabelText(COPY.en.interviewResponseDays)).toHaveValue(7)
    expect(screen.getByLabelText(COPY.en.officeAddressAr)).toHaveValue('عمّان، شارع الجامعة 12')
    expect(screen.getByLabelText(COPY.en.officeAddressEn)).toHaveValue('Amman, University Street 12')
  })

  it('saves them with the existing save, the other controls intact', async () => {
    await openControls()

    fireEvent.change(screen.getByLabelText(COPY.en.interviewResponseDays), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText(COPY.en.officeAddressEn), { target: { value: '  Amman, Mecca Street 4  ' } })
    fireEvent.click(screen.getByRole('button', { name: COPY.en.saveSettings }))

    await waitFor(() => expect(mocks.updateRplSettings).toHaveBeenCalledTimes(1))
    expect(mocks.updateRplSettings).toHaveBeenCalledWith(expect.objectContaining({
      rpl_interview_response_days: 10,
      rpl_interview_office_address: { ar: 'عمّان، شارع الجامعة 12', en: 'Amman, Mecca Street 4' },
      rpl_reapply_cooldown_days: 7,
      appeal_window_days: 15,
    }))
  })

  it.each(['0', '61', '2.5', ''])('will not save %j days', async (value) => {
    await openControls()

    fireEvent.change(screen.getByLabelText(COPY.en.interviewResponseDays), { target: { value } })

    expect(screen.getByText(COPY.en.interviewResponseDaysInvalid)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: COPY.en.saveSettings })).toBeDisabled()
  })

  it('will not save an address over 500 characters', async () => {
    await openControls()

    fireEvent.change(screen.getByLabelText(COPY.en.officeAddressAr), { target: { value: 'ع'.repeat(501) } })

    expect(screen.getByText(COPY.en.officeAddressTooLong)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: COPY.en.saveSettings })).toBeDisabled()
  })

  it("shows the server's 422 under the field it names, and in the page alert", async () => {
    const refusal = 'The rpl interview office address.en field must not be greater than 500 characters.'
    mocks.updateRplSettings.mockRejectedValue({ response: { status: 422, data: { message: refusal, errors: { 'rpl_interview_office_address.en': [refusal] } } } })
    await openControls()

    fireEvent.click(screen.getByRole('button', { name: COPY.en.saveSettings }))

    await waitFor(() => expect(screen.getAllByText(new RegExp(refusal.replace(/\./g, '\\.')))).toHaveLength(2))
    const field = screen.getByLabelText(COPY.en.officeAddressEn)
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(document.getElementById(field.getAttribute('aria-describedby'))).toHaveTextContent(refusal)
  })

  it('writes neither key when the server holds neither, until somebody changes one', async () => {
    mocks.fetchRplSettings.mockResolvedValue({
      data: { appeal_window_days: 15, gemini_advisory_prompt: longPrompt, rpl_reapply_cooldown_days: 7, rpl_reapply_cooldown_scope: 'all_rejections' },
    })
    await openControls()

    fireEvent.click(screen.getByRole('button', { name: COPY.en.saveSettings }))
    await waitFor(() => expect(mocks.updateRplSettings).toHaveBeenCalledTimes(1))
    expect(Object.keys(mocks.updateRplSettings.mock.calls[0][0]).filter((key) => key.startsWith('rpl_interview'))).toEqual([])

    fireEvent.change(screen.getByLabelText(COPY.en.interviewResponseDays), { target: { value: '7' } })
    fireEvent.click(screen.getByRole('button', { name: COPY.en.saveSettings }))
    await waitFor(() => expect(mocks.updateRplSettings).toHaveBeenCalledTimes(2))
    const second = mocks.updateRplSettings.mock.calls[1][0]
    expect(Object.keys(second).filter((key) => key.startsWith('rpl_interview'))).toEqual(['rpl_interview_response_days'])
    expect(second.rpl_interview_response_days).toBe(7)
  })

  it('renders in Arabic without a literal "undefined"', async () => {
    language.current = 'ar'
    await openControls(COPY.ar)

    expect(screen.getByText(COPY.ar.interviewTitle)).toBeInTheDocument()
    expect(screen.getByLabelText(COPY.ar.officeAddressAr)).toHaveValue('عمّان، شارع الجامعة 12')
    expect(document.body.textContent).not.toContain('undefined')
  })
})
