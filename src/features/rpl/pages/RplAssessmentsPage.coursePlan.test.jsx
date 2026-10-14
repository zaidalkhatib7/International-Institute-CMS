import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RplAssessmentsPage, { GEMINI_COPY } from './RplAssessmentsPage'

/*
 * THE ADVISORY'S COURSE LIST IS NOT THE COURSE PLAN (owner flow of 12 Oct 2026,
 * plan 5.4, P5).
 *
 * The case advisory still lists programmes, but the plan the client sees is
 * built from the evaluation of the answers and approved on the case. The list
 * says so, and offers a way to the plan on the case.
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
  cancelDynamicAssessment: vi.fn(),
  rescoreDynamicAssessment: vi.fn(),
  finalEvaluateDynamicAssessment: vi.fn(),
  exportDynamicAssessment: vi.fn(),
}))

const language = vi.hoisted(() => ({ current: 'en' }))

vi.mock('../services/rplService', () => mocks)
vi.mock('../../../services/languageStorage', async (importOriginal) => ({
  ...(await importOriginal()),
  getAdminLanguage: () => language.current,
}))
vi.mock('../../auth/context/useAuthorization', () => ({
  useAuthorization: () => ({ isAdministrator: true }),
}))

const EN = GEMINI_COPY.advisory.en
const AR = GEMINI_COPY.advisory.ar

function assessment(overrides = {}) {
  return {
    id: 12,
    status: 'in_progress',
    rpl_assessor_assignment_id: null,
    locked_at: null,
    application: {
      public_id: 'case-41',
      case_reference: 'RPL-2026-AAAA1111',
      requested_level: { id: 2, code: 'practitioner', name: { ar: 'ممارس', en: 'Practitioner' } },
      evidences: [],
    },
    rubric: { criteria: [] },
    findings: [],
    ai_advisories: [
      {
        id: 3,
        model: 'gemini-3.5-flash',
        generated_at: '2026-10-14T09:00:00Z',
        acknowledged_at: null,
        input_snapshot: { guardrails: { answered_assessment_supplied: true } },
        advisory: {
          disclaimer: 'Advisory only.',
          case_summary: 'A summary.',
          course_recommendations: [
            { program_id: 41, title: { en: 'Course 41', ar: 'دورة 41' }, slug: 'cgp-dgt-041', reason: 'Closes the risk-analysis gap.', grounded_in: ['answered_assessment'], is_conditional: false },
          ],
        },
      },
    ],
    gemini_readiness: { enabled: true, configured: true, available: true, reason_code: null },
    ...overrides,
  }
}

function CaseMarker() {
  const { applicationId } = useParams()
  const location = useLocation()
  return <p data-testid="case-route">{`${applicationId}${location.search}`}</p>
}

function renderPage(payload) {
  mocks.fetchRplAssessment.mockResolvedValue({ data: payload })

  return render(
    <MemoryRouter initialEntries={['/rpl/assessments/12']}>
      <Routes>
        <Route path="/rpl/assessments/:assessmentId" element={<RplAssessmentsPage />} />
        <Route path="/rpl/applications/:applicationId" element={<CaseMarker />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  language.current = 'en'
  mocks.fetchRplReferenceData.mockResolvedValue({ data: { outcomes: [], pathways: [], settings: {} } })
  mocks.fetchDynamicAssessments.mockResolvedValue({ data: [] })
  mocks.fetchGapClosurePlan.mockResolvedValue({ data: { gap_count: 0, recommended_packages: [], uncovered_gaps: [], unresolvable_gaps: [], progress: { total_gaps: 0, closable_by_catalogue: 0, percentage: 100 } } })
})

describe('the advisory course list', () => {
  it('is labelled an advisory view, not the course plan', async () => {
    renderPage(assessment())

    expect(await screen.findByText(EN.courses)).toHaveTextContent('Programmes in this advisory (advisory view, not the course plan)')
    expect(screen.getByText(EN.coursesNotPlan)).toBeInTheDocument()
    expect(screen.getByText('Closes the risk-analysis gap.')).toBeInTheDocument()
  })

  it('labels each course with its purpose, and a top-up as claiming no gap, never "Demonstrated gap" (R11)', async () => {
    const base = assessment()
    renderPage(assessment({
      ai_advisories: [{
        ...base.ai_advisories[0],
        advisory: {
          ...base.ai_advisories[0].advisory,
          course_recommendations: [
            { program_id: 41, title: { en: 'Course 41', ar: 'دورة 41' }, slug: 'cgp-dgt-041', reason: 'Closes the risk-analysis gap.', purpose: 'gap_closure', grounded_in: ['answered_assessment'], is_conditional: false },
            { program_id: 42, title: { en: 'Course 42', ar: 'دورة 42' }, slug: 'cgp-dgt-042', reason: 'Strengthens data governance, the weakest area.', purpose: 'minimum_completion', grounded_in: ['evidence_documents'], is_conditional: false },
          ],
        },
      }],
    }))

    const topUp = within((await screen.findByText('Strengthens data governance, the weakest area.')).parentElement)
    expect(topUp.getByText(EN.coursePurpose.minimum_completion)).toBeInTheDocument()
    expect(topUp.getByText(EN.claimsNoGap)).toBeInTheDocument()
    expect(topUp.queryByText(EN.demonstrated)).not.toBeInTheDocument()
    const gap = within(screen.getByText('Closes the risk-analysis gap.').parentElement)
    expect(gap.getByText(EN.coursePurpose.gap_closure)).toBeInTheDocument()
    expect(gap.getByText(EN.demonstrated)).toBeInTheDocument()
    expect(AR.coursePurpose.minimum_completion).toBe('لاستكمال الحد الأدنى')
    expect(AR.claimsNoGap).toBeTruthy()
  })

  it('opens the course plan on the case', async () => {
    renderPage(assessment())

    fireEvent.click(await screen.findByRole('button', { name: EN.openCoursePlan }))

    expect(await screen.findByTestId('case-route')).toHaveTextContent('case-41?tab=course_plan')
  })

  it('no longer promises a course list without counts (the minimum is governed)', async () => {
    renderPage(assessment())

    await screen.findByText(EN.courses)
    expect(document.body.textContent).not.toMatch(/without fixed course counts/)
    expect(screen.getByText(EN.targetMethod)).toHaveTextContent(/at least the minimum number of courses set for this level/)
  })

  it('renders in Arabic without a literal "undefined"', async () => {
    language.current = 'ar'
    renderPage(assessment())

    const heading = await screen.findByText(AR.courses)
    expect(heading).toHaveTextContent('وليس خطة الدورات')
    expect(within(heading.parentElement).getByRole('button', { name: AR.openCoursePlan })).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('undefined')
  })
})
