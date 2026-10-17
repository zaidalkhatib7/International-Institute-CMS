import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RplCaseWorkspacePage from './RplCaseWorkspacePage'
import { AFTER_QUIZ_COPY } from '../domain/afterQuiz'
import { createAuthorization } from '../../auth/authorization'

/*
 * AFTER THE ENTRY QUIZ ON THE CASE (owner model of 15 Oct 2026, P6).
 *
 * The case gets a "Final exam" tab from final_exam, or once its after_quiz
 * summary says it has had one; the server's 403 removes it. The overview's right
 * column gains the payments and the Experience Confirmation Certificate, each
 * loading itself (never inside the case load) once the case detail carries its
 * after_quiz summary. The status badge, the next-status hint and the timeline
 * name the P6 status and events.
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
  // P6
  fetchRplCharges: vi.fn(),
  confirmRplChargePayment: vi.fn(),
  cancelRplCharge: vi.fn(),
  refundRplCharge: vi.fn(),
  fetchRplExperienceCertificate: vi.fn(),
  approveRplExperienceCertificate: vi.fn(),
  refuseRplExperienceCertificate: vi.fn(),
  fetchRplFinalExam: vi.fn(),
  voidRplFinalExamTry: vi.fn(),
  reopenRplFinalExamTry: vi.fn(),
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

const A = AFTER_QUIZ_COPY.en
const ADMINISTRATOR = { id: 1, name: 'Admin Example', roles: [{ slug: 'admin' }] }

function afterQuiz(overrides = {}) {
  return { completion_route: null, experience_certificate_state: 'available', charges_pending: 0, final_exam_state: 'not_yet', level_certificate_state: 'not_due', ...overrides }
}

function application(overrides = {}) {
  return {
    id: 41,
    public_id: 'case-41',
    case_reference: 'RPL-2026-AFTER',
    status: 'course_plan_active',
    allowed_transitions: [],
    user: { name: 'Applicant Example', email: 'applicant@example.test' },
    submitted_at: '2026-10-01T09:00:00+00:00',
    course_plan: { entry_quiz_result: 'passed', draft_version: null, in_force_version: 1, has_plan: true },
    after_quiz: afterQuiz(),
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

const tabButton = (name) => within(screen.getByRole('navigation')).queryByRole('button', { name })

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
  mocks.fetchRplCharges.mockResolvedValue({ data: [{ id: 1, public_id: 'charge-1', type: 'experience_certificate', cycle: 1, amount: { currency: 'USD', amount_minor: 150000, amount: '1500.00' }, price_usd: { currency: 'USD', amount_minor: 150000, amount: '1500.00' }, exchange_rate: null, route: 'offline', status: 'pending', lock_version: 1, can: { confirm: true, cancel: true, refund: false } }] })
  mocks.fetchRplExperienceCertificate.mockResolvedValue({ data: { eligible: true, state: 'available', reason_code: null, live_price: { usd: { currency: 'USD', amount_minor: 150000, amount: '1500.00' }, syp: null, exchange_rate: null }, live_wording: { id: 2, version: 1, sha256: 'ab' }, current: null, history: [] } })
  mocks.fetchRplFinalExam.mockResolvedValue({ data: { state: 'available', blocked_reason: null, courses: [], settings: {}, rounds: [], level_certificate: { state: 'not_due', holds: [] }, can: { void: false, reopen: false } } })
  mocks.confirmRplChargePayment.mockResolvedValue({ data: {} })
})

describe('the final exam tab', () => {
  it('shows in final_exam, with the status badge and the next-status hint, and loads only when opened', async () => {
    mocks.fetchRplApplication.mockResolvedValue({ data: application({ status: 'final_exam', after_quiz: afterQuiz({ final_exam_state: 'available' }) }) })
    renderCase()

    expect(await screen.findByText('Case summary')).toBeInTheDocument()
    expect(tabButton(A.finalExam.tab)).toBeInTheDocument()
    expect(screen.getAllByText('Final exam').length).toBeGreaterThan(1)
    expect(screen.getByText(A.finalExam.noTransitions)).toBeInTheDocument()
    expect(mocks.fetchRplFinalExam).not.toHaveBeenCalled()

    fireEvent.click(tabButton(A.finalExam.tab))
    await waitFor(() => expect(mocks.fetchRplFinalExam).toHaveBeenCalledWith('case-41'))
    expect(await screen.findByText(A.finalExam.autoIssue)).toBeInTheDocument()
  })

  it('stays once the case has had a final exam, and is absent before one', async () => {
    mocks.fetchRplApplication.mockResolvedValue({ data: application({ status: 'completed', after_quiz: afterQuiz({ completion_route: 'level_certificate', final_exam_state: 'passed', level_certificate_state: 'issued' }) }) })
    const { unmount } = renderCase()
    await screen.findByText('Case summary')
    expect(tabButton(A.finalExam.tab)).toBeInTheDocument()
    unmount()

    mocks.fetchRplApplication.mockResolvedValue({ data: application() })
    renderCase()
    await screen.findByText('Case summary')
    expect(tabButton(A.finalExam.tab)).not.toBeInTheDocument()
  })

  it('is hidden from an account without rpl.applications.view', async () => {
    auth.current = createAuthorization({ id: 7, name: 'Support', roles: [{ slug: 'support-agent', permissions: [] }] })
    mocks.fetchRplApplication.mockResolvedValue({ data: application({ status: 'final_exam' }) })
    renderCase()

    await screen.findByText('Case summary')
    expect(tabButton(A.finalExam.tab)).not.toBeInTheDocument()
  })

  it('disappears after a 403 from the server, and the page falls back to the overview', async () => {
    mocks.fetchRplApplication.mockResolvedValue({ data: application({ status: 'final_exam' }) })
    mocks.fetchRplFinalExam.mockRejectedValue({ response: { status: 403, data: { message: 'This action is unauthorized.' } } })
    renderCase('/rpl/applications/case-41?tab=final_exam')

    await waitFor(() => expect(mocks.fetchRplFinalExam).toHaveBeenCalled())
    await waitFor(() => expect(tabButton(A.finalExam.tab)).not.toBeInTheDocument())
    expect(await screen.findByText('Case summary')).toBeInTheDocument()
  })
})

describe('the overview panels', () => {
  it('shows the payments and the Experience Confirmation Certificate, each loading itself', async () => {
    renderCase()

    expect(await screen.findByRole('heading', { name: A.charges.title })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: A.experience.title })).toBeInTheDocument()
    await waitFor(() => expect(mocks.fetchRplCharges).toHaveBeenCalledWith('case-41'))
    await waitFor(() => expect(mocks.fetchRplExperienceCertificate).toHaveBeenCalledWith('case-41'))
    // The committee-path fee panel is titled as such, never mistaken for these.
    expect(screen.getByText('Certification fee (committee path)')).toBeInTheDocument()
  })

  it('shows neither panel on a case still before the entry quiz result', async () => {
    mocks.fetchRplApplication.mockResolvedValue({ data: application({ status: 'evidence_verification', course_plan: { entry_quiz_result: null, draft_version: null, in_force_version: null, has_plan: false }, after_quiz: afterQuiz({ experience_certificate_state: 'not_eligible' }) }) })
    renderCase()

    await screen.findByText('Case summary')
    expect(screen.queryByRole('heading', { name: A.charges.title })).not.toBeInTheDocument()
    expect(mocks.fetchRplExperienceCertificate).not.toHaveBeenCalled()
  })

  it('shows neither panel on a case whose detail carries no after_quiz summary', async () => {
    mocks.fetchRplApplication.mockResolvedValue({ data: application({ after_quiz: undefined }) })
    renderCase()

    await screen.findByText('Case summary')
    expect(screen.queryByRole('heading', { name: A.charges.title })).not.toBeInTheDocument()
    expect(mocks.fetchRplCharges).not.toHaveBeenCalled()
    expect(mocks.fetchRplExperienceCertificate).not.toHaveBeenCalled()
  })

  it('re-reads the case and tells the certificate panel to read again after a payment is confirmed', async () => {
    renderCase()

    fireEvent.click(await screen.findByRole('button', { name: A.charges.confirm }))
    const form = within(screen.getByRole('region', { name: A.charges.confirmTitle }))
    fireEvent.change(form.getByLabelText(A.charges.reference), { target: { value: 'TRX-2026-1' } })
    fireEvent.change(form.getByLabelText(A.charges.paidOn), { target: { value: '2026-01-05' } })
    // The amount due in the charge's own currency (S15): $1,500.00, typed as dollars.
    fireEvent.change(form.getByLabelText(A.charges.amountReceived), { target: { value: '1500' } })
    fireEvent.click(form.getByRole('button', { name: A.charges.confirmSubmit }))

    await waitFor(() => expect(mocks.confirmRplChargePayment).toHaveBeenCalledTimes(1))
    expect(mocks.confirmRplChargePayment.mock.calls[0][1]).toMatchObject({ amount_received_minor: 150000, currency_received: 'USD' })
    await waitFor(() => expect(mocks.fetchRplApplication).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(mocks.fetchRplExperienceCertificate).toHaveBeenCalledTimes(2))
    // Only the case and its timeline are read again, never the whole page.
    expect(mocks.fetchRplEvidence).toHaveBeenCalledTimes(1)
  })
})

describe('the timeline', () => {
  it('names the P6 events', async () => {
    mocks.fetchRplTimeline.mockResolvedValue({ data: [{ id: 1, event: 'course_plan.completed', created_at: '2026-10-20T09:00:00Z' }, { id: 2, event: 'charge.paid', created_at: '2026-10-21T09:00:00Z' }] })
    renderCase('/rpl/applications/case-41?tab=timeline')

    expect(await screen.findByText('Course plan completed; the final exam is open')).toBeInTheDocument()
    expect(screen.getByText('Payment received')).toBeInTheDocument()
  })
})

describe('in Arabic', () => {
  it('renders the P6 parts without a literal "undefined"', async () => {
    language.current = 'ar'
    mocks.fetchRplApplication.mockResolvedValue({ data: application({ status: 'final_exam', after_quiz: afterQuiz({ final_exam_state: 'available' }) }) })
    renderCase()

    expect(await screen.findByRole('heading', { name: AFTER_QUIZ_COPY.ar.charges.title })).toBeInTheDocument()
    expect(tabButton(AFTER_QUIZ_COPY.ar.finalExam.tab)).toBeInTheDocument()
    await screen.findByText(AFTER_QUIZ_COPY.ar.experience.states.available)
    expect(document.body.textContent).not.toContain('undefined')
  })
})
