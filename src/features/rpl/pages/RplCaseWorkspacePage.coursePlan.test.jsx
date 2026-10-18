import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RplCaseWorkspacePage from './RplCaseWorkspacePage'
import { APPLICATION_STATUS } from '../domain/rpl'
import { COURSE_PLAN_COPY } from '../domain/coursePlan'
import { CASE_DECISION_COPY, DECLINE_COPY } from '../domain/caseDecision'
import { SCREENING_COPY } from '../domain/documentScreening'
import { createAuthorization } from '../../auth/authorization'

/*
 * THE COURSE PLAN ON THE CASE (owner flow of 12 Oct 2026, P5).
 *
 * The case gets a "Course plan" tab from the assessment stage, or whenever it
 * has a plan, for anyone holding rpl.applications.view; the server's 403 removes
 * it. The editor loads its own data (never inside the case load), and when one
 * of its acts moves the case the page reloads the case and shows the editor's
 * sentence. The overview says where the case stands on its plan.
 */

const mocks = vi.hoisted(() => ({
  assignRplAssessor: vi.fn(),
  acceptRplAssignment: vi.fn(),
  closeRplInformationRequest: vi.fn(),
  createRplInformationRequest: vi.fn(),
  declareRplConflict: vi.fn(),
  fetchRplApplication: vi.fn(),
  fetchRplAssessments: vi.fn(),
  fetchRplAssessors: vi.fn(),
  fetchRplAssignments: vi.fn(),
  fetchRplEvidence: vi.fn(),
  fetchRplReferenceData: vi.fn(),
  fetchRplTimeline: vi.fn(),
  submitRplCommitteeDecision: vi.fn(),
  submitRplInitialReview: vi.fn(),
  submitRplQualityReview: vi.fn(),
  startAdminRplAssessment: vi.fn(),
  startRplAssessment: vi.fn(),
  transitionRplApplication: vi.fn(),
  reconcileRplPayment: vi.fn(),
  fetchRplScreenings: vi.fn(),
  requestRplScreening: vi.fn(),
  acknowledgeRplScreening: vi.fn(),
  fetchGapClosurePlan: vi.fn(),
  fetchRplCoursePlan: vi.fn(),
  fetchRplCoursePlanCatalogue: vi.fn(),
  fetchRplCoursePlanVersion: vi.fn(),
  generateRplCoursePlan: vi.fn(),
  regenerateRplCoursePlan: vi.fn(),
  addRplCoursePlanItem: vi.fn(),
  removeRplCoursePlanItem: vi.fn(),
  approveRplCoursePlan: vi.fn(),
  amendRplCoursePlan: vi.fn(),
  discardRplCoursePlan: vi.fn(),
  // The decision tab (P3), so the merged page never reaches for an export this mock lacks.
  fetchRplScreeningDecisions: vi.fn(),
  recordRplScreeningDecision: vi.fn(),
  declineRplApplication: vi.fn(),
  fetchRplInterviews: vi.fn(),
  fetchRplSettings: vi.fn(),
  offerRplInterview: vi.fn(),
  scheduleRplCaseInterview: vi.fn(),
  completeRplInterview: vi.fn(),
  markRplInterviewNoShow: vi.fn(),
  cancelRplInterview: vi.fn(),
  decideRplInterview: vi.fn(),
  updateRplInterview: vi.fn(),
}))

const language = vi.hoisted(() => ({ current: 'en' }))
const auth = vi.hoisted(() => ({ current: null }))

vi.mock('../services/rplService', () => mocks)
vi.mock('../../../services/languageStorage', async (importOriginal) => ({
  ...(await importOriginal()),
  getAdminLanguage: () => language.current,
}))
vi.mock('../../auth/context/useAuthorization', () => ({
  useAuthorization: () => auth.current,
}))

const EN = COURSE_PLAN_COPY.en
const ADMINISTRATOR = { id: 1, name: 'Admin Example', roles: [{ slug: 'admin' }] }

function application(overrides = {}) {
  return {
    id: 41,
    public_id: 'case-41',
    case_reference: 'RPL-2026-COURSES',
    status: 'assessment_in_progress',
    user: { name: 'Applicant Example', email: 'applicant@example.test' },
    submitted_at: '2026-10-01T09:00:00+00:00',
    course_plan: { entry_quiz_result: 'passed', draft_version: null, in_force_version: null, has_plan: false },
    ...overrides,
  }
}

function draftPlan() {
  return {
    public_id: 'plan-1',
    version: 1,
    status: 'draft',
    is_live: true,
    is_amendment: false,
    source: 'model_call',
    lock_version: 1,
    entry_quiz_result: 'passed',
    target_level: { id: 2, code: 'practitioner', name: { en: 'Practitioner' } },
    minimum_required: 1,
    minimum_applies: true,
    minimums_setting_snapshot: null,
    below_minimum: false,
    counts: { active: 1, buyable: 0, removed: 0 },
    model: 'gemini-3.5-flash',
    created_by: { id: 1, name: 'Admin Example' },
    created_at: '2026-10-15T09:00:00Z',
    items: [{ id: 1, status: 'proposed', origin: 'gemini', purpose: 'gap_closure', program: { id: 41, official_code: 'CGP-DGT-041', title: { en: 'Course 41' }, buyable: false }, gemini_reason: 'Closes the gap.' }],
  }
}

function overview(overrides = {}) {
  return {
    application: { public_id: 'case-41', case_reference: 'RPL-2026-COURSES', status: 'assessment_in_progress' },
    entry_quiz: { verification_id: 5, result: 'passed', percent: 72, pass_mark_applied: 50, scored_at: '2026-10-14T09:00:00Z' },
    after_courses: 'final_exam',
    experience_certificate_eligible: true,
    generation: { can_generate: true, refusal: null, target_level: null, live_minimum: 1, minimum_applies: true },
    draft: null,
    approved: null,
    versions: [],
    can: { generate: true, regenerate: false, edit: false, approve: false, amend: false, discard: false },
    ...overrides,
  }
}

function renderCase(entry = '/rpl/applications/case-41') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/rpl/applications/:applicationId" element={<RplCaseWorkspacePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const tabButton = () => within(screen.getByRole('navigation')).queryByRole('button', { name: EN.tab })

beforeEach(() => {
  vi.clearAllMocks()
  language.current = 'en'
  auth.current = createAuthorization(ADMINISTRATOR)
  mocks.fetchRplScreenings.mockResolvedValue({ data: [] })
  mocks.fetchRplApplication.mockResolvedValue({ data: application() })
  mocks.fetchRplEvidence.mockResolvedValue({ data: [] })
  mocks.fetchRplReferenceData.mockResolvedValue({ data: {} })
  mocks.fetchRplTimeline.mockResolvedValue({ data: [] })
  mocks.fetchRplAssessments.mockResolvedValue({ data: [] })
  mocks.fetchRplAssignments.mockResolvedValue({ data: [] })
  mocks.fetchRplAssessors.mockResolvedValue({ data: [] })
  mocks.fetchGapClosurePlan.mockResolvedValue({ data: { gap_count: 0, recommended_packages: [], uncovered_gaps: [], unresolvable_gaps: [], progress: { total_gaps: 0, closable_by_catalogue: 0, percentage: 100 } } })
  mocks.fetchRplCoursePlan.mockResolvedValue({ data: overview() })
})

describe('the course plan tab', () => {
  it('shows from the assessment stage, and never asks for the plan until it is opened', async () => {
    renderCase()

    expect(await screen.findByText('Case summary')).toBeInTheDocument()
    expect(tabButton()).toBeInTheDocument()
    expect(mocks.fetchRplCoursePlan).not.toHaveBeenCalled()

    fireEvent.click(tabButton())
    await waitFor(() => expect(mocks.fetchRplCoursePlan).toHaveBeenCalledWith('case-41'))
    // With no recorded gaps the cross-check says nothing, and its column gives way (D-29).
    await waitFor(() => expect(mocks.fetchGapClosurePlan).toHaveBeenCalled())
    expect(screen.queryByText(/A deterministic cross-check from the recorded gaps, not the course plan/)).not.toBeInTheDocument()
  })

  it('keeps the gap cross-check beside the plan when the case has gaps', async () => {
    mocks.fetchGapClosurePlan.mockResolvedValue({ data: { gap_count: 2, recommended_packages: [], uncovered_gaps: [], unresolvable_gaps: [], progress: { total_gaps: 2, closable_by_catalogue: 1, percentage: 50 } } })
    renderCase('/rpl/applications/case-41?tab=course_plan')
    // The gap closure engine sits beside the plan as a cross-check, never the plan.
    expect(await screen.findByText(/A deterministic cross-check from the recorded gaps, not the course plan/)).toBeInTheDocument()
  })

  it.each(['course_plan_review', 'course_plan_active'])('shows in %s', async (status) => {
    mocks.fetchRplApplication.mockResolvedValue({ data: application({ status, course_plan: { entry_quiz_result: 'passed', draft_version: 1, in_force_version: null, has_plan: true } }) })
    renderCase()

    await screen.findByText('Case summary')
    expect(tabButton()).toBeInTheDocument()
  })

  it('is hidden before the assessment stage, and shown later only when the case has a plan', async () => {
    mocks.fetchRplApplication.mockResolvedValue({ data: application({ status: 'evidence_verification', course_plan: { entry_quiz_result: null, draft_version: null, in_force_version: null, has_plan: false } }) })
    const { unmount } = renderCase()
    await screen.findByText('Case summary')
    expect(tabButton()).not.toBeInTheDocument()
    unmount()

    mocks.fetchRplApplication.mockResolvedValue({ data: application({ status: 'quality_review', course_plan: { entry_quiz_result: 'passed', draft_version: null, in_force_version: 1, has_plan: true } }) })
    renderCase()
    await screen.findByText('Case summary')
    expect(tabButton()).toBeInTheDocument()
  })

  it('is hidden from an account without rpl.applications.view', async () => {
    auth.current = createAuthorization({ id: 7, name: 'Support', roles: [{ slug: 'support-agent', permissions: [] }] })
    renderCase()

    await screen.findByText('Case summary')
    expect(tabButton()).not.toBeInTheDocument()
  })

  it('is shown to a reviewer holding rpl.applications.view', async () => {
    auth.current = createAuthorization({ id: 8, name: 'Assessor', roles: [{ slug: 'assessor', permissions: [{ slug: 'rpl.applications.view' }] }] })
    renderCase()

    await screen.findByText('Case summary')
    expect(tabButton()).toBeInTheDocument()
  })

  it('disappears after a 403 from the server, and the page falls back to the overview', async () => {
    mocks.fetchRplCoursePlan.mockRejectedValue({ response: { status: 403, data: { message: 'This action is unauthorized.' } } })
    renderCase('/rpl/applications/case-41?tab=course_plan')

    await waitFor(() => expect(mocks.fetchRplCoursePlan).toHaveBeenCalled())
    await waitFor(() => expect(tabButton()).not.toBeInTheDocument())
    expect(await screen.findByText('Case summary')).toBeInTheDocument()
  })
})

describe('an act that moves the case', () => {
  it('generates, then reloads the case and shows the editor\'s sentence and the new status', async () => {
    mocks.fetchRplApplication
      .mockResolvedValueOnce({ data: application() })
      .mockResolvedValue({ data: application({ status: 'course_plan_review', course_plan: { entry_quiz_result: 'passed', draft_version: 1, in_force_version: null, has_plan: true } }) })
    mocks.fetchRplCoursePlan
      .mockResolvedValueOnce({ data: overview() })
      .mockResolvedValue({ data: overview({ application: { public_id: 'case-41', status: 'course_plan_review' }, draft: draftPlan(), can: { generate: false, regenerate: true, edit: true, approve: true, amend: false, discard: true } }) })
    mocks.generateRplCoursePlan.mockResolvedValue({ message: 'RPL course plan generated.', data: { plan: draftPlan(), application_status: 'course_plan_review' } })
    renderCase('/rpl/applications/case-41?tab=course_plan')

    fireEvent.click(await screen.findByRole('button', { name: EN.generate }))

    await waitFor(() => expect(mocks.generateRplCoursePlan).toHaveBeenCalledWith('case-41', { locale: 'en' }))
    await waitFor(() => expect(mocks.fetchRplApplication).toHaveBeenCalledTimes(2))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Gemini proposed version 1. Review it before approving.')
    await waitFor(() => expect(screen.getAllByText(APPLICATION_STATUS.course_plan_review.labels.en).length).toBeGreaterThan(0))
    expect(await screen.findByRole('article', { name: 'Course 41' })).toBeInTheDocument()
  })
})

describe('the overview card', () => {
  it('says the case awaits its course plan, and opens the tab', async () => {
    renderCase()

    expect(await screen.findByText(EN.awaitingPlan)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: EN.openPlan }))

    await waitFor(() => expect(mocks.fetchRplCoursePlan).toHaveBeenCalledWith('case-41'))
    expect(tabButton()).toHaveAttribute('aria-current', 'page')
  })

  it('says a draft awaits approval', async () => {
    mocks.fetchRplApplication.mockResolvedValue({ data: application({ status: 'course_plan_review', course_plan: { entry_quiz_result: 'passed', draft_version: 2, in_force_version: null, has_plan: true } }) })
    renderCase()

    expect(await screen.findByText('The course plan awaits approval (version 2).')).toBeInTheDocument()
    expect(screen.queryByText(EN.awaitingPlan)).not.toBeInTheDocument()
  })

  it('says which version is in force', async () => {
    mocks.fetchRplApplication.mockResolvedValue({ data: application({ status: 'course_plan_active', course_plan: { entry_quiz_result: 'failed', draft_version: null, in_force_version: 1, has_plan: true } }) })
    renderCase()

    expect(await screen.findByText('Course plan version 1 is in force.')).toBeInTheDocument()
    expect(screen.queryByText(/awaits approval/)).not.toBeInTheDocument()
  })

  it('says nothing before the entry quiz has a result', async () => {
    mocks.fetchRplApplication.mockResolvedValue({ data: application({ course_plan: { entry_quiz_result: 'referred', draft_version: null, in_force_version: null, has_plan: false } }) })
    renderCase()

    await screen.findByText('Case summary')
    expect(screen.queryByText(EN.awaitingPlan)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: EN.openPlan })).not.toBeInTheDocument()
  })

  it('renders in Arabic without a literal "undefined"', async () => {
    language.current = 'ar'
    renderCase()

    expect(await screen.findByText(COURSE_PLAN_COPY.ar.awaitingPlan)).toBeInTheDocument()
    expect(within(screen.getByRole('navigation')).getByRole('button', { name: COURSE_PLAN_COPY.ar.tab })).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('undefined')
  })
})

/*
 * THE COURSE PLAN BESIDE THE STAFF DECISION (P3 + P5 merge). P3's decision tab
 * and P5's course plan tab live on the same case: both show, in the workflow's
 * order; the course plan card sits after the latest decision on the overview;
 * a course plan case is never declined from here (P3 declines only during
 * verification or at the interview) and the generic select offers no course
 * plan move (the server never lists one); and a course plan act re-reads the
 * case and its timeline only, not the whole page.
 */
describe('the course plan beside the staff decision', () => {
  const DT = CASE_DECISION_COPY.en
  const tabNames = () => within(screen.getByRole('navigation')).getAllByRole('button').map((button) => button.textContent)

  it('shows the decision tab and the course plan tab together, in the order of the flow', async () => {
    renderCase()

    await screen.findByText('Case summary')
    // The journey's order (D-10, D-12): the screen and the decision are one tab; the committee forms are absent outside their statuses.
    expect(tabNames()).toEqual(['Overview', 'Documents', DT.tab, 'Assessment (pre-flow)', EN.tab, 'History'])
    expect(tabNames()).not.toContain(SCREENING_COPY.en.tab)
  })

  it('names the entry quiz tab once the case is on the current flow', async () => {
    mocks.fetchRplApplication.mockResolvedValue({ data: application({ latest_screening_decision: { id: 1, decision: 'pass_to_quiz' } }) })
    renderCase()
    await screen.findByText('Case summary')
    expect(tabNames()).toEqual(['Overview', 'Documents', DT.tab, 'Entry quiz', EN.tab, 'History'])
  })

  it('puts the course plan card after the latest decision on the overview', async () => {
    const latest = {
      id: 5, decision: 'pass_to_quiz', rationale: 'All required evidence is verified.', override_reason: null,
      screening_snapshot: null, decided_by: { id: 3, name: 'Reviewer Example' }, decided_at: '2026-10-14T09:00:00Z',
    }
    mocks.fetchRplApplication.mockResolvedValue({ data: application({ status: 'course_plan_review', latest_screening_decision: latest, active_interview: null, course_plan: { entry_quiz_result: 'passed', draft_version: 2, in_force_version: null, has_plan: true } }) })
    renderCase()

    const decision = await screen.findByText('All required evidence is verified.')
    const plan = screen.getByText('The course plan awaits approval (version 2).')
    expect(decision.compareDocumentPosition(plan) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it.each(['course_plan_review', 'course_plan_active'])('offers no decline and no generic move while the case is in %s', async (status) => {
    mocks.fetchRplApplication.mockResolvedValue({ data: application({ status, allowed_transitions: [], course_plan: { entry_quiz_result: 'passed', draft_version: status === 'course_plan_review' ? 1 : null, in_force_version: status === 'course_plan_active' ? 1 : null, has_plan: true } }) })
    renderCase()

    // No move offered: no hand status form, and no decline here; the Next step opens the course plan.
    const next = await screen.findByRole('region', { name: 'Next step' })
    expect(screen.queryByLabelText('Next status')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: DECLINE_COPY.en.action })).not.toBeInTheDocument()
    expect(tabButton()).toBeInTheDocument()
    expect(within(next).getByText(status === 'course_plan_review' ? 'Review and approve the course plan (version 1).' : 'The client is studying the approved courses in the plan.')).toBeInTheDocument()
    fireEvent.click(within(next).getByRole('button', { name: EN.tab }))
    expect(tabButton()).toHaveAttribute('aria-current', 'page')
  })

  it.each(['course_plan_review', 'course_plan_active'])('points to the course plan tab in Arabic while the case is in %s', async (status) => {
    language.current = 'ar'
    mocks.fetchRplApplication.mockResolvedValue({ data: application({ status, allowed_transitions: [], course_plan: { entry_quiz_result: 'passed', draft_version: status === 'course_plan_review' ? 1 : null, in_force_version: status === 'course_plan_active' ? 1 : null, has_plan: true } }) })
    renderCase()

    const next = await screen.findByRole('region', { name: 'الخطوة التالية' })
    expect(within(next).getByText(status === 'course_plan_review' ? 'راجع خطة الدورات (الإصدار 1) واعتمدها.' : 'يدرس العميل الدورات المعتمدة في خطته.')).toBeInTheDocument()
    expect(within(next).getByRole('button', { name: COURSE_PLAN_COPY.ar.tab })).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('undefined')
  })

  it('falls back to the status sentence for an open case in no queue', async () => {
    mocks.fetchRplApplication.mockResolvedValue({ data: application({ status: 'assessment_in_progress', allowed_transitions: [], work_queue: null }) })
    renderCase()

    const next = await screen.findByRole('region', { name: 'Next step' })
    expect(within(next).getByText('Assessment in progress. No defined next step right now.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Next status')).not.toBeInTheDocument()
  })

  it('re-reads only the case and its timeline after a course plan act', async () => {
    mocks.fetchRplApplication
      .mockResolvedValueOnce({ data: application() })
      .mockResolvedValue({ data: application({ status: 'course_plan_review', course_plan: { entry_quiz_result: 'passed', draft_version: 1, in_force_version: null, has_plan: true } }) })
    mocks.generateRplCoursePlan.mockResolvedValue({ message: 'RPL course plan generated.', data: { plan: draftPlan(), application_status: 'course_plan_review' } })
    renderCase('/rpl/applications/case-41?tab=course_plan')

    fireEvent.click(await screen.findByRole('button', { name: EN.generate }))

    await waitFor(() => expect(mocks.fetchRplApplication).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(mocks.fetchRplTimeline).toHaveBeenCalledTimes(2))
    expect(mocks.fetchRplEvidence).toHaveBeenCalledTimes(1)
    expect(mocks.fetchRplAssessments).toHaveBeenCalledTimes(1)
    expect(mocks.fetchRplReferenceData).toHaveBeenCalledTimes(1)
    expect(mocks.fetchRplScreeningDecisions).not.toHaveBeenCalled()
    expect(mocks.fetchRplInterviews).not.toHaveBeenCalled()
    // The case never fell back to the full-page loading state: the tab kept its place.
    expect(tabButton()).toHaveAttribute('aria-current', 'page')
  })
})
