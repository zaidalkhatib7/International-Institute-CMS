import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RplCaseWorkspacePage from './RplCaseWorkspacePage'
import { APPLICATION_STATUS } from '../domain/rpl'
import { COURSE_PLAN_COPY } from '../domain/coursePlan'
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
    leads_to_certificate_review: true,
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
