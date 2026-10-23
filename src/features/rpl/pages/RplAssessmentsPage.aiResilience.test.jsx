import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RplAssessmentsPage, { GEMINI_COPY } from './RplAssessmentsPage'
import { AI_COPY } from '../../shared/ai/aiCopy'
import { FALLBACK_PROVENANCE, waitingRun } from '../../../test/aiFixtures'

/*
 * THE ADVISORY ON THE QUEUE (AI resilience, Release G, AI-RESILIENCE-SPEC D13,
 * §5.3, §7.3). The route answers 202 and the assessment carries the run under
 * advisory_generation until it has finished: the page says it was asked for,
 * says it is queued or waiting (with Retry now), holds Generate meanwhile, and
 * each advisory says which model made it.
 */

const mocks = vi.hoisted(() => ({
  fetchRplAssessment: vi.fn(),
  fetchRplAssessments: vi.fn(),
  fetchRplReferenceData: vi.fn(),
  generateRplAiAdvisory: vi.fn(),
  acknowledgeRplAiAdvisory: vi.fn(),
  exportRplAiAdvisory: vi.fn(),
  saveRplAssessmentFindings: vi.fn(),
  saveRplGapAnalysis: vi.fn(),
  scheduleRplInterview: vi.fn(),
  submitRplAssessmentReport: vi.fn(),
  fetchGapClosurePlan: vi.fn(),
  fetchDynamicAssessments: vi.fn(),
  fetchDynamicAssessment: vi.fn(),
  createDynamicAssessment: vi.fn(),
  generateDynamicAssessmentDraft: vi.fn(),
  approveAllDynamicAssessmentItems: vi.fn(),
  approveDynamicAssessmentItem: vi.fn(),
  addDynamicAssessmentItem: vi.fn(),
  updateDynamicAssessmentItem: vi.fn(),
  rejectDynamicAssessmentItem: vi.fn(),
  regenerateDynamicAssessmentItem: vi.fn(),
  sendDynamicAssessment: vi.fn(),
  reissueDynamicAssessment: vi.fn(),
  finalEvaluateDynamicAssessment: vi.fn(),
  exportDynamicAssessment: vi.fn(),
}))
const language = vi.hoisted(() => ({ current: 'en' }))

vi.mock('../services/rplService', () => mocks)
const aiApi = vi.hoisted(() => ({ retryAiGenerationNow: vi.fn() }))
vi.mock('../../shared/ai/aiServiceApi', () => aiApi)
vi.mock('../../../services/languageStorage', async (importOriginal) => ({ ...(await importOriginal()), getAdminLanguage: () => language.current }))
vi.mock('../../auth/context/useAuthorization', () => ({ useAuthorization: () => ({ isAdministrator: true, hasPermission: () => true }) }))

function assessment(overrides = {}) {
  return {
    id: 12,
    status: 'in_progress',
    rpl_assessor_assignment_id: null,
    locked_at: null,
    application: { case_reference: 'RPL-2026-AAAA1111', requested_level: { id: 2, code: 'practitioner', name: { ar: 'ممارس', en: 'Practitioner' } }, evidences: [] },
    rubric: { criteria: [] },
    findings: [],
    ai_advisories: [],
    gemini_readiness: { enabled: true, configured: true, available: true, reason_code: null },
    ...overrides,
  }
}

function renderPage(payloads) {
  for (const payload of payloads) mocks.fetchRplAssessment.mockResolvedValueOnce({ data: payload })
  mocks.fetchRplAssessment.mockResolvedValue({ data: payloads[payloads.length - 1] })
  return render(
    <MemoryRouter initialEntries={['/rpl/assessments/12']}>
      <Routes><Route path="/rpl/assessments/:assessmentId" element={<RplAssessmentsPage />} /></Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  language.current = 'en'
  mocks.fetchRplReferenceData.mockResolvedValue({ data: { outcomes: [], pathways: [], settings: {} } })
  mocks.fetchDynamicAssessments.mockResolvedValue({ data: [] })
})

describe('the advisory on the queue', () => {
  it('says a 202 asked for the draft, and that it is queued, holding Generate', async () => {
    mocks.generateRplAiAdvisory.mockResolvedValue({ message: 'queued', data: { generation: { status: 'queued' } } })
    renderPage([assessment(), assessment({ advisory_generation: { status: 'queued' } })])

    fireEvent.click(await screen.findByRole('button', { name: GEMINI_COPY.advisory.en.generate }))
    await waitFor(() => expect(mocks.generateRplAiAdvisory).toHaveBeenCalledWith('12', { assessor_question: null }))
    expect(await screen.findByText(GEMINI_COPY.advisory.en.generationQueued)).toBeInTheDocument()
    expect(await screen.findByText(AI_COPY.en.run.queued)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: GEMINI_COPY.advisory.en.generate })).toBeDisabled()
  })

  it('says when a waiting draft tries next and starts it at once on Retry now, through the server\'s own route', async () => {
    aiApi.retryAiGenerationNow.mockResolvedValue({ data: { status: 'queued' } })
    const waiting = waitingRun({ kind: 'advisory', subject_id: 12 })
    renderPage([assessment({ advisory_generation: waiting })])

    expect(await screen.findByRole('status', { name: 'Waiting to retry' })).toHaveTextContent(/This is try 2 of 11\./)
    fireEvent.click(screen.getByRole('button', { name: 'Retry now' }))
    await waitFor(() => expect(aiApi.retryAiGenerationNow).toHaveBeenCalledWith(waiting))
    expect(mocks.generateRplAiAdvisory).not.toHaveBeenCalled()
  })

  it('says why a draft failed, and marks an advisory made by a fallback model, in Arabic', async () => {
    language.current = 'ar'
    renderPage([assessment({ advisory_generation: { status: 'failed', error_code: 'provider_http_503' }, ai_advisories: [{ id: 3, model: 'gemini-3.1-pro-preview', generated_at: '2026-10-23T09:00:00Z', input_snapshot: { guardrails: { answered_assessment_supplied: true } }, advisory: { disclaimer: 'Advisory only.' }, ai_provenance: FALLBACK_PROVENANCE }] })])

    expect(await screen.findByText(AI_COPY.ar.errors.busy)).toBeInTheDocument()
    expect(screen.getByText('أعدّه النموذج الاحتياطي gemini-3.1-pro-preview (الخطوة 2 من 3)؛ النموذج الأول gemini-3.6-flash كان مشغولًا.')).toBeInTheDocument()
  })
})
