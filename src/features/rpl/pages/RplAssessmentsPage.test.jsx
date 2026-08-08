import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RplAssessmentsPage, { GEMINI_COPY } from './RplAssessmentsPage'

/*
 * THE GATE HAS TO EXPLAIN ITSELF.
 *
 * Owner instruction, 7 Aug 2026: no AI evaluation before the applicant has
 * answered every issued question. The server enforces that and returns a REASON
 * CODE — `no_assessment_issued` when nothing was ever asked,
 * `assessment_not_answered` when it was asked and not finished. Two different
 * next actions.
 *
 * Without a sentence for each, the administrator on the live case sees a
 * disabled button and, on pressing anything else, a bare toast. And because copy
 * lookup here is a whole-object fallback with no per-key rescue, a key missing
 * from the Arabic block does not fall back to English — it renders the literal
 * string "undefined", in the language this CMS defaults to.
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
  // The dynamic-assessment panel mounts inside this page, so its calls have to
  // exist on the mock even though only the list read is reached from here.
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

const language = vi.hoisted(() => ({ current: 'ar' }))

vi.mock('../services/rplService', () => mocks)
// Partial: utils/localization reads ADMIN_LANGUAGE_METADATA off this same module
// to format the advisory timestamps, and a bare stub takes the date rendering
// down with it.
vi.mock('../../../services/languageStorage', async (importOriginal) => ({
  ...(await importOriginal()),
  getAdminLanguage: () => language.current,
}))
vi.mock('../../auth/context/useAuthorization', () => ({
  useAuthorization: () => ({ isAdministrator: true }),
}))

function assessment(overrides = {}) {
  return {
    id: 12,
    status: 'in_progress',
    rpl_assessor_assignment_id: null,
    locked_at: null,
    application: {
      case_reference: 'RPL-2026-AAAA1111',
      requested_level: { id: 2, code: 'practitioner', name: { ar: 'ممارس', en: 'Practitioner', nl: 'Beoefenaar' } },
      evidences: [],
    },
    rubric: { criteria: [] },
    findings: [],
    ai_advisories: [],
    gemini_readiness: { enabled: true, configured: true, available: true, reason_code: null },
    ...overrides,
  }
}

function advisory(overrides = {}) {
  return {
    id: 3,
    model: 'gemini-2.5-flash',
    generated_at: '2026-08-01T09:00:00Z',
    acknowledged_at: null,
    input_snapshot: { guardrails: {} },
    advisory: { disclaimer: 'Advisory only.', case_summary: 'A summary.' },
    ...overrides,
  }
}

function renderPage(payload) {
  mocks.fetchRplAssessment.mockResolvedValue({ data: payload })

  return render(
    <MemoryRouter initialEntries={['/rpl/assessments/12']}>
      <Routes>
        <Route path="/rpl/assessments/:assessmentId" element={<RplAssessmentsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  language.current = 'ar'
  mocks.fetchRplReferenceData.mockResolvedValue({
    data: { outcomes: [], pathways: [], settings: {} },
  })
  mocks.fetchDynamicAssessments.mockResolvedValue({ data: [] })
})

describe('why the Generate-advisory button is disabled', () => {
  it('says the applicant has not been asked anything yet — in Arabic, the default', async () => {
    renderPage(
      assessment({
        gemini_readiness: {
          enabled: true,
          configured: true,
          available: false,
          reason_code: 'no_assessment_issued',
          answers: {
            complete: false,
            verification_count: 0,
            answered_verification_count: 0,
            outstanding_items: 0,
          },
        },
      }),
    )

    expect(await screen.findByText(/لم يُرسل إلى هذا المتقدم أي تقييم كفاءة بعد/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /إنشاء مسودة Gemini/ })).toBeDisabled()
    expect(document.body.textContent).not.toContain('undefined')
    // Mojibake guard: Arabic must survive the render intact.
    expect(document.body.textContent).not.toMatch(/[ØÙÃÂ]/)
  })

  it('says the answers are unfinished — a different reason and a different next action', async () => {
    language.current = 'en'
    renderPage(
      assessment({
        gemini_readiness: {
          enabled: true,
          configured: true,
          available: false,
          reason_code: 'assessment_not_answered',
          answers: {
            complete: false,
            verification_count: 1,
            answered_verification_count: 0,
            outstanding_items: 7,
          },
        },
      }),
    )

    expect(
      await screen.findByText(/has not answered every issued question yet/),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Generate Gemini draft/ })).toBeDisabled()
  })

  it('renders the same refusal in Dutch', async () => {
    language.current = 'nl'
    renderPage(
      assessment({
        gemini_readiness: {
          enabled: true,
          configured: true,
          available: false,
          reason_code: 'assessment_not_answered',
        },
      }),
    )

    expect(await screen.findByText(/nog niet elke verzonden vraag beantwoord/)).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('undefined')
  })

  it('shows a reason code it has no sentence for as the CODE, never as "undefined"', async () => {
    renderPage(
      assessment({
        gemini_readiness: { available: false, reason_code: 'some_future_reason' },
      }),
    )

    expect(await screen.findByText('some_future_reason')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('undefined')
  })

  it('leaves the button live when the gate is open', async () => {
    language.current = 'en'
    renderPage(
      assessment({
        gemini_readiness: {
          available: true,
          reason_code: null,
          answers: {
            complete: true,
            verification_count: 1,
            answered_verification_count: 1,
            outstanding_items: 0,
          },
        },
      }),
    )

    expect(await screen.findByRole('button', { name: /Generate Gemini draft/ })).toBeEnabled()
  })
})

describe('answer progress on the advisory card', () => {
  it('names how many assessments were issued, submitted and left outstanding', async () => {
    language.current = 'en'
    renderPage(
      assessment({
        gemini_readiness: {
          available: false,
          reason_code: 'assessment_not_answered',
          answers: {
            complete: false,
            verification_count: 2,
            answered_verification_count: 1,
            outstanding_items: 9,
          },
        },
      }),
    )

    const progress = within(
      await screen.findByRole('region', { name: GEMINI_COPY.advisory.en.answersTitle }),
    )
    expect(progress.getByText('2')).toBeInTheDocument()
    expect(progress.getByText('1')).toBeInTheDocument()
    expect(progress.getByText('9')).toBeInTheDocument()
  })

  it('says when the block comes from elsewhere on the applicant case', async () => {
    language.current = 'en'
    renderPage(
      assessment({
        gemini_readiness: {
          available: false,
          reason_code: 'assessment_not_answered',
          answers: {
            complete: false,
            scope: 'application',
            verification_count: 2,
            answered_verification_count: 1,
            outstanding_items: 9,
          },
        },
      }),
    )

    /*
     * Without this sentence the administrator sees a complete assessment beside
     * a refused button and has nothing to act on: the outstanding questions are
     * on another assessment of the same case, and the gate is over the person.
     */
    expect(await screen.findByText(GEMINI_COPY.advisory.en.answersCaseScope)).toBeInTheDocument()
  })

  it('stays quiet about other assessments when this one is what blocks', async () => {
    language.current = 'en'
    renderPage(
      assessment({
        gemini_readiness: {
          available: false,
          reason_code: 'assessment_not_answered',
          answers: {
            complete: false,
            scope: 'assessment',
            verification_count: 1,
            answered_verification_count: 0,
            outstanding_items: 25,
          },
        },
      }),
    )

    await screen.findByRole('region', { name: GEMINI_COPY.advisory.en.answersTitle })
    expect(
      screen.queryByText(GEMINI_COPY.advisory.en.answersCaseScope),
    ).not.toBeInTheDocument()
  })

  it('renders nothing rather than zeros when the server never counted', async () => {
    language.current = 'en'
    renderPage(assessment({ gemini_readiness: { available: false, reason_code: 'gemini_not_configured' } }))

    await screen.findByText(/Gemini API key is not configured/)
    expect(
      screen.queryByRole('region', { name: GEMINI_COPY.advisory.en.answersTitle }),
    ).not.toBeInTheDocument()
  })
})

describe('a legacy advisory generated before the applicant answered', () => {
  it('is labelled, kept and never deleted', async () => {
    language.current = 'en'
    renderPage(assessment({ ai_advisories: [advisory()] }))

    expect(await screen.findByText(GEMINI_COPY.advisory.en.preAnswerAdvisory)).toBeInTheDocument()
    expect(screen.getByText(/not evidence of assessed competence/)).toBeInTheDocument()
    // It is still readable and still exportable — labelling, not withdrawal.
    expect(screen.getByText('A summary.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /PDF/ })).toBeInTheDocument()
  })

  it('labels an advisory whose snapshot predates the guarantee entirely', async () => {
    language.current = 'en'
    // Every advisory generated before 6 Aug 2026 carries no guardrail key at
    // all. Absent must not read as satisfied.
    renderPage(assessment({ ai_advisories: [advisory({ input_snapshot: {} })] }))

    expect(await screen.findByText(GEMINI_COPY.advisory.en.preAnswerAdvisory)).toBeInTheDocument()
  })

  it('does not label one generated after the answers were in', async () => {
    language.current = 'en'
    renderPage(
      assessment({
        ai_advisories: [
          advisory({ input_snapshot: { guardrails: { answered_assessment_supplied: true } } }),
        ],
      }),
    )

    await screen.findByText('A summary.')
    expect(
      screen.queryByText(GEMINI_COPY.advisory.en.preAnswerAdvisory),
    ).not.toBeInTheDocument()
  })
})

describe('the copy itself', () => {
  it('keeps every key in all three language blocks', () => {
    const paths = (block) => Object.keys(block).sort()

    for (const block of [GEMINI_COPY.advisory, GEMINI_COPY.status]) {
      expect(paths(block.ar)).toEqual(paths(block.en))
      expect(paths(block.nl)).toEqual(paths(block.en))
    }
  })

  it('carries a sentence for every reason code the server can now return', () => {
    /*
     * Transcribed from the server, not from the block under test:
     * RplAssessmentController::loadAssessment sets the first three,
     * RplAnswerCompletenessService the answers pair, and
     * GeminiRplAdvisoryService the document refusal and the two prefill
     * refusals.
     */
    const serverReasonCodes = [
      'gemini_disabled',
      'gemini_not_configured',
      'target_level_required',
      'no_assessment_issued',
      'assessment_not_answered',
      'evidence_documents_unreadable',
      'ai_prefill_advisory_not_answered',
      'ai_prefill_advisory_mismatch',
      'route_mismatch',
    ]

    for (const code of serverReasonCodes) {
      for (const [tag, block] of Object.entries(GEMINI_COPY.status)) {
        expect(block[code], `${code} missing from "${tag}"`).toBeTruthy()
      }
    }
  })

  it('no longer claims the model never receives raw files', async () => {
    language.current = 'en'
    renderPage(assessment())

    // It does receive them now, through the governed reader with its kill
    // switch and its stored manifest. Leaving the old sentence up made the
    // screen contradict what the platform does with an applicant's documents.
    await waitFor(() => expect(mocks.fetchRplAssessment).toHaveBeenCalled())
    expect(document.body.textContent).not.toMatch(/never receives raw files/)
    expect(await screen.findByText(/only after the applicant has answered every issued question/))
      .toBeInTheDocument()
  })
})
