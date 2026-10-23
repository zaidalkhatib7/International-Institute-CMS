import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SeedPackPanel from './SeedPackPanel'
import AiPackagePanel from './AiPackagePanel'
import { FALLBACK_PROVENANCE, busyRetryLaterError } from '../../../test/aiFixtures'

/*
 * THE SEED PACK AND THE PACKAGE WHEN THE AI SERVICE IS BUSY (AI resilience,
 * Release G, AI-RESILIENCE-SPEC §5.3, D14, D15, §7.3):
 *
 *   - "Write by hand" opens the same editor with an empty draft, from the
 *     approved dictionary and the active ladder, and the approval records
 *     draft_source "manual";
 *   - the instant proposal's busy answer (503 ai_busy_retry_later) says so and
 *     that nothing was saved, never "temporarily unavailable";
 *   - a proposed draft is approved with draft_source "ai" and its provenance,
 *     and "drafted by" is the answering model;
 *   - the professional package shows the model of each component, and marks a
 *     fallback model.
 */

const mocks = vi.hoisted(() => ({
  proposeSeedPack: vi.fn(),
  approveSeedPack: vi.fn(),
  fetchCompetencyFramework: vi.fn(),
  fetchAiPackageStatus: vi.fn(),
  regenerateAiPackageComponent: vi.fn(),
  language: { current: 'en' },
}))

vi.mock('../services/programsService', () => ({
  proposeSeedPack: mocks.proposeSeedPack,
  approveSeedPack: mocks.approveSeedPack,
  authorizeGeneration: vi.fn(),
  revokeGenerationAuthorization: vi.fn(),
  downloadPackagePdf: vi.fn(),
  fetchAiPackageStatus: mocks.fetchAiPackageStatus,
  generateAiPackage: vi.fn(),
  openNewPackageVersion: vi.fn(),
  publishTrainingPackage: vi.fn(),
  regenerateAiPackageComponent: mocks.regenerateAiPackageComponent,
  rejectAiPackage: vi.fn(),
  resolveAiPackageSource: vi.fn(),
}))
vi.mock('../../competency/services/competencyFrameworkService', () => ({ fetchCompetencyFramework: mocks.fetchCompetencyFramework }))
vi.mock('../../../utils/localization', async (importOriginal) => ({ ...(await importOriginal()), getCurrentLanguage: () => mocks.language.current }))
vi.mock('./PublicationGatesPanel', () => ({ default: () => null }))

const FRAMEWORK = {
  competencies: [
    { id: 5, code: 'PC-GOV-005', name: { en: 'Governs records', ar: 'يحوكم السجلات' }, status: 'approved', is_active: true },
    { id: 6, code: 'PC-GOV-006', name: { en: 'Audits controls' }, status: 'draft', is_active: true },
    { id: 7, code: 'PC-GOV-007', name: { en: 'Retired skill' }, status: 'published', is_active: false },
  ],
  proficiency_levels: [
    { id: 2, code: 'L2', rank: 2, name: { en: 'Developing' }, is_active: true },
    { id: 3, code: 'L3', rank: 3, name: { en: 'Proficient' }, is_active: true },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.language.current = 'en'
  mocks.fetchCompetencyFramework.mockResolvedValue(FRAMEWORK)
  mocks.approveSeedPack.mockResolvedValue({ message: 'Seed pack approved.' })
})

afterEach(() => vi.restoreAllMocks())

describe('the seed pack written by hand', () => {
  it('opens the editor from the approved dictionary and records the draft as manual', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<SeedPackPanel programId={240} />)
    fireEvent.click(screen.getByRole('button', { name: 'Write by hand' }))

    expect(await screen.findByText('Draft written by hand — no AI')).toBeInTheDocument()
    const competency = screen.getByLabelText('Competency')
    expect([...competency.querySelectorAll('option')].map((option) => option.textContent)).toEqual(['PC-GOV-005 — Governs records'])
    expect(screen.getByLabelText('Target level')).toHaveValue('3')
    expect(screen.queryByText(/Drafted by/)).not.toBeInTheDocument()
    expect(mocks.proposeSeedPack).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Weight (%)'), { target: { value: '40' } })
    fireEvent.change(screen.getByLabelText('Outcome'), { target: { value: 'Keeps records audit-ready' } })
    fireEvent.click(screen.getByRole('button', { name: 'Approve seed pack' }))

    await waitFor(() => expect(mocks.approveSeedPack).toHaveBeenCalledTimes(1))
    const [programId, competencies, outcomes, , origin] = mocks.approveSeedPack.mock.calls[0]
    expect(programId).toBe(240)
    expect(competencies).toEqual([expect.objectContaining({ professional_competency_id: 5, target_proficiency_level_id: 3, weight: 40, is_primary: true })])
    expect(outcomes[0].title).toEqual({ en: 'Keeps records audit-ready' })
    expect(origin).toEqual({ source: 'manual' })
  })

  it('says so when the dictionary is empty', async () => {
    mocks.fetchCompetencyFramework.mockResolvedValue({ competencies: [], proficiency_levels: [] })
    render(<SeedPackPanel programId={240} />)
    fireEvent.click(screen.getByRole('button', { name: 'Write by hand' }))
    expect(await screen.findByText(/The approved competency dictionary is empty/)).toBeInTheDocument()
  })

  it('reads in Arabic', async () => {
    mocks.language.current = 'ar'
    render(<SeedPackPanel programId={240} />)
    fireEvent.click(screen.getByRole('button', { name: 'اكتبها يدويًا' }))
    expect(await screen.findByText('مسودة مكتوبة يدويًا — دون ذكاء اصطناعي')).toBeInTheDocument()
  })
})

describe('the proposal', () => {
  it('says the AI service is busy and that nothing was saved, with Write by hand beside it', async () => {
    mocks.proposeSeedPack.mockRejectedValue(busyRetryLaterError())
    render(<SeedPackPanel programId={240} />)
    fireEvent.click(screen.getByRole('button', { name: 'Propose seed pack' }))
    expect(await screen.findByText('The AI service is busy right now (Google reported high demand on gemini-3.6-flash and gemini-3.5-flash-lite). Nothing was saved. Try again in a few minutes, or continue by hand.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Write by hand' })).toBeEnabled()
  })

  it('names the answering model, marks a fallback, and approves with the provenance echoed back', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mocks.proposeSeedPack.mockResolvedValue({
      data: {
        model: 'gemini-3.6-flash',
        ai_provenance: { ...FALLBACK_PROVENANCE, chain: ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-pro-preview'], answering_model: 'gemini-3.5-flash-lite', requested_model: 'gemini-3.5-flash-lite' },
        competencies: [{ professional_competency_id: 5, is_primary: true, weight: 50, target_proficiency_level_id: 3, rationale: '' }],
        learning_outcomes: [{ code: 'LO-001', title: { en: 'Evaluates evidence' }, description: { en: '' }, professional_competency_id: 5 }],
        academic_identity: {},
        dictionary: [{ id: 5, code: 'PC-GOV-005', name: 'Governs records' }],
        proficiency_levels: [{ id: 3, code: 'L3', rank: 3, name: 'Proficient' }],
      },
    })
    render(<SeedPackPanel programId={240} />)
    fireEvent.click(screen.getByRole('button', { name: 'Propose seed pack' }))

    expect(await screen.findByText('Drafted by: gemini-3.5-flash-lite')).toBeInTheDocument()
    expect(screen.getByText('Made by fallback model gemini-3.5-flash-lite (step 2 of 3); the first model gemini-3.6-flash was busy.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Approve seed pack' }))
    await waitFor(() => expect(mocks.approveSeedPack).toHaveBeenCalledTimes(1))
    expect(mocks.approveSeedPack.mock.calls[0][4]).toEqual({ source: 'ai', provenance: expect.objectContaining({ answering_model: 'gemini-3.5-flash-lite', position: 2 }) })
  })
})

describe('the professional package, component by component', () => {
  function status(artifacts) {
    return { data: { program_id: 240, package_version: '1.0', ai_authoring_status: 'ai_draft', package_published_at: null, governance: { authorized: false }, run: { id: 9, status: 'completed', artifacts } } }
  }

  it('shows the model of each component and marks a fallback model', async () => {
    mocks.fetchAiPackageStatus.mockResolvedValue(status([
      { id: 1, component_type: 'outline', component_ref: 'program:240', sequence: 1, ai_model: 'gemini-3.1-pro-preview', responding_model: 'gemini-3.1-pro-preview', used_fallback_model: false },
      { id: 2, component_type: 'lesson', component_ref: 'lesson:12', ref_title: { en: 'Records basics' }, sequence: 1, ai_model: 'gemini-3.6-flash', used_fallback_model: true, ai_provenance: { ...FALLBACK_PROVENANCE, chain: ['gemini-3.1-pro-preview', 'gemini-3.6-flash', 'gemini-4-argon'], primary_model: 'gemini-3.1-pro-preview', answering_model: 'gemini-3.6-flash', requested_model: 'gemini-3.6-flash', passed_over: [{ model: 'gemini-3.1-pro-preview', outcome: 'timeout' }] } },
    ]))
    render(<MemoryRouter><AiPackagePanel programId={240} isGoverned officialCode="CGP-DGT-240" /></MemoryRouter>)

    expect(await screen.findByText('Made by gemini-3.1-pro-preview')).toBeInTheDocument()
    expect(screen.getByText('Made by fallback model gemini-3.6-flash (step 2 of 3); the first model gemini-3.1-pro-preview was not answering in time.')).toBeInTheDocument()
  })

  it('says the instant regenerate found the AI service busy', async () => {
    mocks.fetchAiPackageStatus.mockResolvedValue(status([{ id: 2, component_type: 'lesson', component_ref: 'lesson:12', ref_title: { en: 'Records basics' }, sequence: 1, ai_model: 'gemini-3.6-flash' }]))
    mocks.regenerateAiPackageComponent.mockRejectedValue(busyRetryLaterError())
    render(<MemoryRouter><AiPackagePanel programId={240} isGoverned officialCode="CGP-DGT-240" /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: /Regenerate/ }))
    expect(await screen.findByText(/The AI service is busy right now \(Google reported high demand on gemini-3\.6-flash and gemini-3\.5-flash-lite\)\. Nothing was saved\./)).toBeInTheDocument()
  })
})
