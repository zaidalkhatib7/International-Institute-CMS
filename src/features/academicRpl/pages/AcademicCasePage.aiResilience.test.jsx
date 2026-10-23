import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuthorization } from '../../auth/authorization'
import { roleUser } from '../../../test/roleFixtures'
import AcademicCasePage from './AcademicCasePage'
import AcademicDiagnosticPage from './AcademicDiagnosticPage'
import { AI_COPY } from '../../shared/ai/aiCopy'
import { FALLBACK_PROVENANCE, waitingRun } from '../../../test/aiFixtures'

/*
 * THE ACADEMIC PATH WHEN THE AI SERVICE IS BUSY (AI resilience, Release G,
 * AI-RESILIENCE-SPEC D13, §5.3, D15, §7.3):
 *
 *   - the analysis and the diagnostic run on the queue: each says it is queued
 *     or waiting (with Retry now), and Generate is held meanwhile;
 *   - a diagnostic can be written by hand, with a reason, without the analysis;
 *     its questions are added one by one, pending review;
 *   - the analysis and the diagnostic say which model made them.
 */

const mocks = vi.hoisted(() => ({
  user: { current: null },
  language: { current: 'en' },
  fetchAcademicApplication: vi.fn(),
  fetchAcademicReferenceData: vi.fn(),
  analyseAcademicApplication: vi.fn(),
  generateAcademicDiagnostic: vi.fn(),
  createManualAcademicDiagnostic: vi.fn(),
  fetchAcademicDiagnostic: vi.fn(),
  addAcademicDiagnosticItem: vi.fn(),
}))

const aiApi = vi.hoisted(() => ({ retryAiGenerationNow: vi.fn() }))
vi.mock('../../shared/ai/aiServiceApi', () => aiApi)

vi.mock('../services/academicRplService', () => ({
  fetchAcademicApplication: mocks.fetchAcademicApplication,
  fetchAcademicReferenceData: mocks.fetchAcademicReferenceData,
  fetchAcademicReadiness: vi.fn().mockResolvedValue({ data: null }),
  fetchAcademicGapPlan: vi.fn(),
  analyseAcademicApplication: mocks.analyseAcademicApplication,
  confirmAcademicEligibility: vi.fn(),
  generateAcademicDiagnostic: mocks.generateAcademicDiagnostic,
  createManualAcademicDiagnostic: mocks.createManualAcademicDiagnostic,
  recordAcademicRecommendation: vi.fn(),
  fetchAcademicDiagnostic: mocks.fetchAcademicDiagnostic,
  addAcademicDiagnosticItem: mocks.addAcademicDiagnosticItem,
  approveAcademicDiagnosticItem: vi.fn(),
  rejectAcademicDiagnosticItem: vi.fn(),
  updateAcademicDiagnosticItem: vi.fn(),
  issueAcademicDiagnostic: vi.fn(),
}))
vi.mock('../../auth/context/useAuthorization', () => ({ useAuthorization: () => createAuthorization(mocks.user.current) }))
vi.mock('../../../services/languageStorage', async (importOriginal) => ({ ...(await importOriginal()), getAdminLanguage: () => mocks.language.current }))

const REASON = 'The AI service is busy and the applicant sits the test this week.'

function application(overrides = {}) {
  return {
    public_id: 'aca-1',
    case_reference: 'ARPL-2026-0001',
    status: 'diagnostic_in_progress',
    user: { name: 'Academic Client' },
    evidences: [{ id: 1, title: 'Transcript', status: 'verified', category: { name: { en: 'Transcript' } } }],
    analyses: [],
    diagnostics: [],
    ...overrides,
  }
}

function Location() {
  const location = useLocation()
  return <p data-testid="location">{location.pathname}</p>
}

function renderCase(payloads) {
  for (const payload of payloads) mocks.fetchAcademicApplication.mockResolvedValueOnce({ data: payload })
  mocks.fetchAcademicApplication.mockResolvedValue({ data: payloads[payloads.length - 1] })
  return render(
    <MemoryRouter initialEntries={['/academic-rpl/applications/aca-1']}>
      <Routes>
        <Route path="/academic-rpl/applications/:applicationId" element={<AcademicCasePage />} />
        <Route path="*" element={<Location />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.user.current = roleUser('admin')
  mocks.language.current = 'en'
  mocks.fetchAcademicReferenceData.mockResolvedValue({ data: { tracks: [{ id: 2, code: 'diploma', name: { en: 'Diploma', ar: 'دبلوم' } }], eligibility_routes: [] } })
})

describe('the analysis and the diagnostic on the queue', () => {
  it('says the analysis is waiting to retry, holds Analyse, and starts it at once on Retry now, through the server\'s own route', async () => {
    aiApi.retryAiGenerationNow.mockResolvedValue({ data: { status: 'queued' } })
    const waiting = waitingRun({ kind: 'academic_analysis', subject_id: 41 })
    renderCase([application({ analysis_generation: waiting })])

    const notice = await screen.findByRole('status', { name: 'Waiting to retry' })
    expect(notice).toHaveTextContent(/This is try 2 of 11\./)
    expect(screen.getByRole('button', { name: /Analyse/ })).toBeDisabled()
    fireEvent.click(within(notice).getByRole('button', { name: 'Retry now' }))
    await waitFor(() => expect(aiApi.retryAiGenerationNow).toHaveBeenCalledWith(waiting))
    expect(mocks.analyseAcademicApplication).not.toHaveBeenCalled()
  })

  it('starts a waiting diagnostic at once on Retry now, through the server\'s own route', async () => {
    aiApi.retryAiGenerationNow.mockResolvedValue({ data: { status: 'queued' } })
    const waiting = waitingRun({ kind: 'academic_diagnostic', subject_id: 41, track_id: 2 })
    renderCase([application({ analyses: [{ id: 1, extraction: {} }], diagnostic_generation: waiting })])

    const notice = await screen.findByRole('status', { name: 'Waiting to retry' })
    fireEvent.click(within(notice).getByRole('button', { name: 'Retry now' }))
    await waitFor(() => expect(aiApi.retryAiGenerationNow).toHaveBeenCalledWith(waiting))
    expect(mocks.generateAcademicDiagnostic).not.toHaveBeenCalled()
  })

  it('says the diagnostic is queued, holds Generate, and stays on the case after a 202', async () => {
    mocks.generateAcademicDiagnostic.mockResolvedValue({ data: { generation: { status: 'queued', track_id: 2 } } })
    renderCase([application({ analyses: [{ id: 1, extraction: {}, model: 'gemini-3.6-flash' }] }), application({ analyses: [{ id: 1, extraction: {} }], diagnostic_generation: { status: 'queued', track_id: 2 } })])

    fireEvent.click(await screen.findByRole('button', { name: /Generate for Diploma/ }))
    await waitFor(() => expect(mocks.generateAcademicDiagnostic).toHaveBeenCalledWith('aca-1', { track_id: 2, response_locale: 'en' }))
    expect(await screen.findByText(/The diagnostic was asked for, and the AI service works on it in the background\./)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Generate for Diploma/ })).toBeDisabled()
    expect(screen.queryByTestId('location')).not.toBeInTheDocument()
  })

  it('says why the diagnostic failed', async () => {
    renderCase([application({ analyses: [{ id: 1, extraction: {} }], diagnostic_generation: { status: 'failed', error_code: 'ai_unavailable_window_exhausted', error_class: 'busy' } })])
    expect(await screen.findByText(AI_COPY.en.errors.windowExhausted)).toBeInTheDocument()
  })

  it('says which model made the analysis', async () => {
    renderCase([application({ analyses: [{ id: 1, extraction: {}, model: 'gemini-3.1-pro-preview', generated_at: '2026-10-23T09:00:00Z', ai_provenance: FALLBACK_PROVENANCE }] })])
    expect(await screen.findByText('Made by fallback model gemini-3.1-pro-preview (step 2 of 3); the first model gemini-3.6-flash was busy.')).toBeInTheDocument()
  })
})

describe('the diagnostic written by hand', () => {
  it('needs no analysis, asks for a reason, and opens the new paper', async () => {
    mocks.createManualAcademicDiagnostic.mockResolvedValue({ data: { id: 41 } })
    renderCase([application()])

    expect(await screen.findByRole('button', { name: /Generate for Diploma/ })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /Write by hand for Diploma/ }))
    const form = within(screen.getByRole('region', { name: 'Write the diagnostic by hand' }))
    const submit = form.getByRole('button', { name: /Create the diagnostic by hand/ })
    expect(submit).toBeDisabled()
    fireEvent.change(form.getByLabelText(/Reason/), { target: { value: REASON } })
    fireEvent.click(submit)

    await waitFor(() => expect(mocks.createManualAcademicDiagnostic).toHaveBeenCalledWith('aca-1', { track_id: 2, reason: REASON }))
    expect(await screen.findByTestId('location')).toHaveTextContent('/academic-rpl/diagnostics/41')
  })

  it('is not offered to a role that may not open a diagnostic', async () => {
    mocks.user.current = roleUser('committee-member')
    renderCase([application()])
    expect(await screen.findByText('ARPL-2026-0001', { exact: false })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Write by hand for/ })).not.toBeInTheDocument()
  })

  it('reads in Arabic', async () => {
    mocks.language.current = 'ar'
    renderCase([application()])
    fireEvent.click(await screen.findByRole('button', { name: /اكتب الاختبار يدويًا لـ دبلوم/ }))
    expect(screen.getByRole('region', { name: 'كتابة الاختبار التشخيصي يدويًا' })).toBeInTheDocument()
  })
})

describe('the questions of a diagnostic written by hand', () => {
  function diagnostic(overrides = {}) {
    return { id: 41, status: 'draft', application: { public_id: 'aca-1' }, items: [], question_count_rationale: { basis: 'manual', reason: REASON }, ...overrides }
  }

  function renderDiagnostic() {
    return render(
      <MemoryRouter initialEntries={['/academic-rpl/diagnostics/41']}>
        <Routes><Route path="/academic-rpl/diagnostics/:diagnosticId" element={<AcademicDiagnosticPage />} /></Routes>
      </MemoryRouter>,
    )
  }

  it('says the paper was written by hand, and adds one MCQ at a time, pending review', async () => {
    mocks.fetchAcademicDiagnostic.mockResolvedValue({ data: diagnostic() })
    mocks.addAcademicDiagnosticItem.mockResolvedValue({ data: { id: 900, governance_status: 'pending' } })
    renderDiagnostic()

    expect(await screen.findByText(`This diagnostic was written by hand, without AI. Reason: ${REASON}`)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Add a question by hand/ }))
    const form = within(screen.getByRole('region', { name: 'A multiple-choice question written by hand' }))
    const submit = form.getByRole('button', { name: /Add the question/ })
    expect(submit).toBeDisabled()
    fireEvent.change(form.getByLabelText('Question text'), { target: { value: 'Which design controls for confounding?' } })
    for (const [id, text] of [['A', 'A cross-sectional survey'], ['B', 'A randomised controlled trial'], ['C', 'A case report'], ['D', 'An expert opinion']]) {
      fireEvent.change(form.getByLabelText(`Option ${id}`), { target: { value: text } })
    }
    fireEvent.change(form.getByLabelText('Correct answer'), { target: { value: 'B' } })
    fireEvent.change(form.getByLabelText('Axis'), { target: { value: 'research_methodology' } })
    fireEvent.click(submit)

    await waitFor(() => expect(mocks.addAcademicDiagnosticItem).toHaveBeenCalledWith(41, {
      axis: 'research_methodology',
      difficulty: 'applied',
      prompt: { en: 'Which design controls for confounding?' },
      options: [
        { id: 'A', text: { en: 'A cross-sectional survey' } },
        { id: 'B', text: { en: 'A randomised controlled trial' } },
        { id: 'C', text: { en: 'A case report' } },
        { id: 'D', text: { en: 'An expert opinion' } },
      ],
      answer_key: { correct_option_id: 'B' },
    }))
  })

  it('offers no question form on an issued paper, and names the model of an AI-made one', async () => {
    mocks.fetchAcademicDiagnostic.mockResolvedValue({ data: diagnostic({ status: 'issued', question_count_rationale: { model: 'gemini-3.6-flash' } }) })
    renderDiagnostic()
    expect(await screen.findByText('Made by gemini-3.6-flash')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Add a question by hand/ })).not.toBeInTheDocument()
  })
})
