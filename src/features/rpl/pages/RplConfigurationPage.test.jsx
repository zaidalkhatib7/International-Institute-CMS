import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RplConfigurationPage, { COPY } from './RplConfigurationPage'

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
  render(<RplConfigurationPage />)
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
    expect(COPY.nl.evidenceDocumentsHint).toContain('Academic RPL')
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
        gemini_advisory_model: 'gemini-3.5-flash',
      }),
    )
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
  it('keeps every key in all three language blocks', () => {
    const paths = (block, prefix = '') =>
      Object.entries(block).flatMap(([key, value]) =>
        value && typeof value === 'object' && !Array.isArray(value)
          ? paths(value, `${prefix}${key}.`)
          : [`${prefix}${key}`],
      )

    const en = paths(COPY.en).sort()
    expect(paths(COPY.ar).sort()).toEqual(en)
    expect(paths(COPY.nl).sort()).toEqual(en)
  })
})
