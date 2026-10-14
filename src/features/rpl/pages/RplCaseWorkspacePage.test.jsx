import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RplCaseWorkspacePage from './RplCaseWorkspacePage'
import { DECLINE_REASONS } from '../domain/rpl'
import { CLAIMED_EMPLOYERS_COPY, SCREENING_COPY } from '../domain/documentScreening'
import { CASE_DECISION_COPY, DECLINE_COPY, INTERVIEW_COPY } from '../domain/caseDecision'
import { createAuthorization } from '../../auth/authorization'
import { formatLocalizedDateTime } from '../../../utils/localization'

/*
 * A REJECTED CASE SAYS WHY, AND WHEN ITS CLIENT MAY COME BACK.
 *
 * Owner flow of 12 Oct 2026: every move into `rejected` stamps the case with a
 * reason code and `reapply_available_at`, the end of the reapply cooldown frozen
 * at that moment. Until the client's wait is over the API refuses a new RPL case
 * for them, so the staff member on the phone needs that date on the case itself,
 * not a calculation from today's setting.
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
  // The decision tab (P3).
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
// The real authorization object, so the administrator shortcut and the
// permission lookup behave exactly as they do in the running CMS.
const auth = vi.hoisted(() => ({ current: null }))

vi.mock('../services/rplService', () => mocks)
// Partial: utils/localization reads the language metadata off this same module.
vi.mock('../../../services/languageStorage', async (importOriginal) => ({
  ...(await importOriginal()),
  getAdminLanguage: () => language.current,
}))
vi.mock('../../auth/context/useAuthorization', () => ({
  useAuthorization: () => auth.current,
}))

const ADMINISTRATOR = { id: 1, name: 'Admin Example', roles: [{ slug: 'admin' }] }

function application(overrides = {}) {
  return {
    id: 41,
    case_reference: 'RPL-2026-DECLINED',
    status: 'rejected',
    user: { name: 'Applicant Example', email: 'applicant@example.test' },
    submitted_at: '2026-10-01T09:00:00+00:00',
    finalised_at: '2026-10-12T10:00:00+00:00',
    decline_reason_code: 'intake_declined',
    reapply_available_at: '2026-10-19T10:00:00+00:00',
    ...overrides,
  }
}

function renderCase(entry = '/rpl/applications/41') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/rpl/applications/:applicationId" element={<RplCaseWorkspacePage />} />
        <Route path="/rpl/assessments/:assessmentId" element={<p>Assessment page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  language.current = 'en'
  auth.current = createAuthorization(ADMINISTRATOR)
  mocks.fetchRplScreenings.mockResolvedValue({ message: 'RPL document screenings fetched.', data: [] })
  mocks.fetchRplApplication.mockResolvedValue({ data: application() })
  mocks.fetchRplEvidence.mockResolvedValue({ data: [] })
  mocks.fetchRplReferenceData.mockResolvedValue({ data: {} })
  mocks.fetchRplTimeline.mockResolvedValue({ data: [] })
  mocks.fetchRplAssessments.mockResolvedValue({ data: [] })
  mocks.fetchRplAssignments.mockResolvedValue({ data: [] })
  mocks.fetchRplAssessors.mockResolvedValue({ data: [] })
  mocks.fetchRplScreeningDecisions.mockResolvedValue({ data: [] })
  mocks.fetchRplInterviews.mockResolvedValue({ data: [] })
  mocks.fetchRplSettings.mockResolvedValue({ data: {} })
})

describe('the decline stamp on the case summary', () => {
  it('shows the reason and the date the client may open a new request', async () => {
    renderCase()

    expect(await screen.findByText('Decline reason')).toBeInTheDocument()
    expect(screen.getByText(DECLINE_REASONS.intake_declined.labels.en)).toBeInTheDocument()
    expect(screen.getByText('May open a new request from')).toBeInTheDocument()
    // The stored date, formatted; never a date recomputed from today's setting.
    expect(screen.getByText(formatLocalizedDateTime('2026-10-19T10:00:00+00:00', 'en'))).toBeInTheDocument()
  })

  it('shows neither on a case that is not declined', async () => {
    mocks.fetchRplApplication.mockResolvedValue({
      data: application({ status: 'administrative_review', finalised_at: null, decline_reason_code: null, reapply_available_at: null }),
    })
    renderCase()

    expect(await screen.findByText('Case summary')).toBeInTheDocument()
    expect(screen.queryByText('Decline reason')).not.toBeInTheDocument()
    expect(screen.queryByText('May open a new request from')).not.toBeInTheDocument()
  })

  it('shows the date the API holds a pre-stamp rejection to, marked as derived', async () => {
    // Rejected before the stamp existed: nothing stored, but both store routes
    // refuse the client until finalised_at + the cooldown days. Before, staff saw
    // no date at all.
    mocks.fetchRplApplication.mockResolvedValue({
      data: application({ decline_reason_code: null, reapply_available_at: null, effective_reapply_available_at: '2026-10-19T10:00:00.000000Z' }),
    })
    renderCase()

    expect(await screen.findByText('May open a new request from')).toBeInTheDocument()
    expect(
      screen.getByText(`${formatLocalizedDateTime('2026-10-19T10:00:00.000000Z', 'en')} (derived from the rejection date and the current cooldown setting)`),
    ).toBeInTheDocument()
  })

  it('never marks a stored stamp as derived', async () => {
    mocks.fetchRplApplication.mockResolvedValue({
      data: application({ effective_reapply_available_at: '2026-10-19T10:00:00+00:00' }),
    })
    renderCase()

    expect(await screen.findByText(formatLocalizedDateTime('2026-10-19T10:00:00+00:00', 'en'))).toBeInTheDocument()
    expect(screen.queryByText(/derived from the rejection date/)).not.toBeInTheDocument()
  })

  it('renders the stamp in Arabic without a literal "undefined"', async () => {
    language.current = 'ar'
    mocks.fetchRplApplication.mockResolvedValue({ data: application({ decline_reason_code: 'committee_rejected' }) })
    renderCase()

    expect(await screen.findByText('سبب الرفض')).toBeInTheDocument()
    expect(screen.getByText(DECLINE_REASONS.committee_rejected.labels.ar)).toBeInTheDocument()
    expect(screen.getByText('يمكنه تقديم طلب جديد اعتبارًا من')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('undefined')
  })
})

/*
 * WHO SEES THE DOCUMENT SCREEN (D17(a), owner 12 Oct 2026).
 *
 * Administrators and evidence reviewers only. Assessors and the committee see
 * the staff decision, never the figure, because a number about a named person
 * anchors whoever reads it. So the tab is not merely empty for them: it is not
 * there, and the CMS never asks the API for the screens. The server is the
 * authority, so its 403 removes the tab too.
 */
/*
 * A refusal from the API is English naming an Arabic fragment, under the
 * generic heading in the reader's language. On the Arabic page it is shown line
 * by line, each line in its own direction, so the fragment stays beside the
 * sentence that names it.
 */
describe('a refused action on the case', () => {
  const refusal = 'This text is sent to the applicant, so it may not contain a percentage or words such as fake, forged, counterfeit or fraud (مزور، مزيف، تزوير، احتيال). Document-screening results are for staff only: say what the applicant should provide instead. Refused wording: "\u2068مزورة\u2069".'

  it('keeps its line breaks and gives each line its own direction', async () => {
    language.current = 'ar'
    mocks.fetchRplApplication.mockResolvedValue({ data: application({ status: 'submitted', finalised_at: null, decline_reason_code: null, reapply_available_at: null }) })
    mocks.submitRplInitialReview.mockRejectedValue({ response: { status: 422, data: { message: 'The given data was invalid.', errors: { message: [refusal] } } } })
    renderCase()

    fireEvent.click(await screen.findByRole('button', { name: 'حفظ المراجعة' }))

    const alert = await screen.findByRole('alert')
    await waitFor(() => expect(alert.textContent).toContain('\n\n' + refusal))
    expect(alert).toHaveClass('whitespace-pre-line', '[unicode-bidi:plaintext]')
  })
})

describe('the document screening tab', () => {
  const screeningTab = () => screen.queryByRole('button', { name: SCREENING_COPY.en.tab })

  it('is shown to an administrator, who loads the case screens by its public id', async () => {
    renderCase()

    expect(await screen.findByRole('button', { name: SCREENING_COPY.en.tab })).toBeInTheDocument()
    await waitFor(() => expect(mocks.fetchRplScreenings).toHaveBeenCalledWith('41'))
  })

  it('is shown to any account holding rpl.screening.view, without Re-run unless it also holds rpl.screening.run', async () => {
    auth.current = createAuthorization({ id: 7, roles: [{ slug: 'quality-reviewer', permissions: ['rpl.applications.view', 'rpl.screening.view'] }] })
    renderCase('/rpl/applications/41?tab=screening')

    expect(await screen.findByText(SCREENING_COPY.en.disclaimer)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: SCREENING_COPY.en.rerun })).not.toBeInTheDocument()
  })

  it('offers Re-run to an account holding rpl.screening.run', async () => {
    auth.current = createAuthorization({ id: 7, roles: [{ slug: 'quality-reviewer', permissions: ['rpl.applications.view', 'rpl.screening.view', 'rpl.screening.run'] }] })
    renderCase('/rpl/applications/41?tab=screening')

    expect(await screen.findByRole('button', { name: SCREENING_COPY.en.rerun })).toBeInTheDocument()
  })

  it.each(['assessor', 'committee-member'])('is absent for a %s, and the screens are never requested', async (role) => {
    auth.current = createAuthorization({ id: 9, roles: [{ slug: role, permissions: ['rpl.applications.view', 'rpl.evidence.view'] }] })
    // Even a deep link to the tab lands on the overview.
    renderCase('/rpl/applications/41?tab=screening')

    expect(await screen.findByText('Case summary')).toBeInTheDocument()
    expect(screeningTab()).not.toBeInTheDocument()
    expect(screen.queryByText(SCREENING_COPY.en.disclaimer)).not.toBeInTheDocument()
    expect(mocks.fetchRplScreenings).not.toHaveBeenCalled()
  })

  it('disappears when the server answers 403, without an error or the supporting-data warning', async () => {
    mocks.fetchRplScreenings.mockRejectedValue({ response: { status: 403, data: { message: 'This action is unauthorized.' } } })
    renderCase('/rpl/applications/41?tab=screening')

    await waitFor(() => expect(mocks.fetchRplScreenings).toHaveBeenCalled())
    await waitFor(() => expect(screeningTab()).not.toBeInTheDocument())
    expect(await screen.findByText('Case summary')).toBeInTheDocument()
    expect(screen.queryByText(/supporting data is temporarily unavailable/)).not.toBeInTheDocument()
    expect(screen.queryByText(SCREENING_COPY.en.loadError)).not.toBeInTheDocument()
  })

  it('keeps the tab and says so when the screens fail to load for another reason', async () => {
    mocks.fetchRplScreenings.mockRejectedValue({ response: { status: 500, data: { message: 'Server Error' } } })
    renderCase('/rpl/applications/41?tab=screening')

    // readApiError's rule for English: the server's own message, as for every other load on this page.
    expect(await screen.findByText('Server Error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: SCREENING_COPY.en.retry })).toBeInTheDocument()
    expect(screeningTab()).toBeInTheDocument()
  })

  it('opens from the tab bar and shows the latest screen', async () => {
    mocks.fetchRplScreenings.mockResolvedValue({
      data: [{
        public_id: 'scr-1', status: 'completed', trigger: 'auto_on_submit', fake_likelihood_percent: 30, score_out_of_10: 3,
        coverage: { documents_total: 2, read: 2, withheld: [], excluded_categories: [], extraction_only_categories: [] },
        items: [], employer_checks: [], instructions_found_in_documents: [], created_at: '2026-10-13T09:00:00Z',
      }],
    })
    renderCase()

    fireEvent.click(await screen.findByRole('button', { name: SCREENING_COPY.en.tab }))

    expect(await screen.findByText('Authenticity risk 30% (3/10)')).toBeInTheDocument()
  })
})

/*
 * THE EMPLOYERS THE CASE CLAIMS (owner flow of 12 Oct 2026).
 *
 * Until now they were shown nowhere on the case. A submitted case shows the list
 * frozen at submit, which is what the screen compared; a draft has no snapshot
 * and shows the live profile, said to be such.
 */
describe('the claimed employers on the overview', () => {
  const frozenEmployer = {
    id: 3, organization: 'Amman Logistics LLC', job_title: 'Fleet manager', started_on: '2018-01-01T00:00:00.000000Z', ended_on: null, is_current: true,
    country: 'JO', city: 'Amman', website: 'https://amman-logistics.example', registration_number: 'CR-20931',
  }

  it('lists the employers frozen at submit, with country, city, website and registration number', async () => {
    mocks.fetchRplApplication.mockResolvedValue({
      data: application({
        status: 'administrative_review', decline_reason_code: null, reapply_available_at: null,
        profile_snapshot: { work_experiences: [frozenEmployer] },
        // Edited after submit: never what the case claimed.
        user: { name: 'Applicant Example', work_experiences: [{ id: 3, organization: 'Renamed Later Ltd', job_title: 'Director' }] },
      }),
    })
    renderCase()

    expect(await screen.findByText(CLAIMED_EMPLOYERS_COPY.en.title)).toBeInTheDocument()
    expect(screen.getByText(CLAIMED_EMPLOYERS_COPY.en.snapshotHint)).toBeInTheDocument()
    expect(screen.getByText('Amman Logistics LLC')).toBeInTheDocument()
    expect(screen.getByText('Fleet manager')).toBeInTheDocument()
    expect(screen.getByText('Jordan (JO)')).toBeInTheDocument()
    expect(screen.getByText('Amman')).toBeInTheDocument()
    expect(screen.getByText('CR-20931')).toBeInTheDocument()
    expect(screen.queryByText('Renamed Later Ltd')).not.toBeInTheDocument()

    const website = screen.getByRole('link', { name: 'https://amman-logistics.example' })
    expect(website).toHaveAttribute('href', 'https://amman-logistics.example/')
    expect(website).toHaveAttribute('target', '_blank')
    expect(website).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('falls back to the live profile on a draft, labelled as such', async () => {
    mocks.fetchRplApplication.mockResolvedValue({
      data: application({
        status: 'draft', decline_reason_code: null, reapply_available_at: null, profile_snapshot: null,
        user: { name: 'Applicant Example', work_experiences: [{ id: 4, organization: 'Zarqa Freight', job_title: 'Dispatcher', country: 'JO' }] },
      }),
    })
    renderCase()

    expect(await screen.findByText('Zarqa Freight')).toBeInTheDocument()
    expect(screen.getByText(CLAIMED_EMPLOYERS_COPY.en.profileHint)).toBeInTheDocument()
    expect(screen.queryByText(CLAIMED_EMPLOYERS_COPY.en.snapshotHint)).not.toBeInTheDocument()
  })

  it('never turns a website that is not http(s) into a link', async () => {
    mocks.fetchRplApplication.mockResolvedValue({
      data: application({ profile_snapshot: { work_experiences: [{ ...frozenEmployer, website: 'javascript:alert(1)' }] } }),
    })
    renderCase()

    expect(await screen.findByText('javascript:alert(1)')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'javascript:alert(1)' })).not.toBeInTheDocument()
  })

  it('says when no work experience is recorded', async () => {
    mocks.fetchRplApplication.mockResolvedValue({ data: application({ profile_snapshot: { work_experiences: [] } }) })
    renderCase()

    expect(await screen.findByText(CLAIMED_EMPLOYERS_COPY.en.empty)).toBeInTheDocument()
  })

  it('renders in Arabic, and in English for any other language, never "undefined"', async () => {
    mocks.fetchRplApplication.mockResolvedValue({ data: application({ profile_snapshot: { work_experiences: [frozenEmployer] } }) })
    language.current = 'ar'
    const { unmount } = renderCase()

    expect(await screen.findByText(CLAIMED_EMPLOYERS_COPY.ar.title)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: SCREENING_COPY.ar.tab })).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('undefined')
    unmount()

    language.current = 'nl'
    renderCase()

    expect(await screen.findByText(CLAIMED_EMPLOYERS_COPY.en.title)).toBeInTheDocument()
    expect(screen.getByText(CLAIMED_EMPLOYERS_COPY.en.snapshotHint)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: SCREENING_COPY.en.tab })).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('undefined')
  })
})

/*
 * THE NEXT-STATUS SELECT LISTS ONLY WHAT THE GENERIC ROUTE ACCEPTS (owner flow
 * of 12 Oct 2026, plan 4.5).
 *
 * The moves into ready_for_assessment, interview_required and rejected from
 * verification need a decision, an interview or a decline record, and the
 * server refuses them on the generic route. The select used to list every
 * status; it now lists the case's allowed_transitions, and the dedicated
 * controls carry the rest.
 */
describe('the next-status select', () => {
  const open = (overrides = {}) => mocks.fetchRplApplication.mockResolvedValue({
    data: application({ status: 'evidence_verification', finalised_at: null, decline_reason_code: null, reapply_available_at: null, ...overrides }),
  })

  it('lists only the allowed transitions, and posts the one chosen', async () => {
    open({ allowed_transitions: ['awaiting_applicant', 'withdrawn'] })
    mocks.transitionRplApplication.mockResolvedValue({ data: { status: 'awaiting_applicant' } })
    renderCase()

    const select = await screen.findByLabelText('Next status')
    expect(within(select).getAllByRole('option').map((option) => option.value)).toEqual(['', 'awaiting_applicant', 'withdrawn'])
    expect(screen.getByRole('button', { name: 'Update status' })).toBeDisabled()

    fireEvent.change(select, { target: { value: 'awaiting_applicant' } })
    fireEvent.change(screen.getByLabelText('Transition note'), { target: { value: 'Need the original letter.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update status' }))

    await waitFor(() => expect(mocks.transitionRplApplication).toHaveBeenCalledWith('41', { status: 'awaiting_applicant', reason: 'Need the original letter.' }))
    // The case is read again: what may follow depends on the status just set.
    await waitFor(() => expect(mocks.fetchRplApplication).toHaveBeenCalledTimes(2))
  })

  it('says so when nothing can be set from here', async () => {
    open({ allowed_transitions: [] })
    renderCase()

    const select = await screen.findByLabelText('Next status')
    expect(select).toBeDisabled()
    expect(screen.getByText('No other status can be set from here. Use the decision, interview or decline actions.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Update status' })).toBeDisabled()
  })

  it('labels interview_required wherever a status is shown', async () => {
    open({ status: 'interview_required', allowed_transitions: ['awaiting_applicant', 'withdrawn'] })
    renderCase()

    expect((await screen.findAllByText('Interview required')).length).toBeGreaterThan(0)
  })

  it('labels it in Arabic too', async () => {
    language.current = 'ar'
    open({ status: 'interview_required', allowed_transitions: [] })
    renderCase()

    expect((await screen.findAllByText('مقابلة مطلوبة')).length).toBeGreaterThan(0)
    expect(document.body.textContent).not.toContain('undefined')
  })
})

/*
 * THE DECISION TAB (owner flow of 12 Oct 2026, P3, D17(a)).
 *
 * The same staff as the screening decide and run interviews: administrators
 * and the evidence reviewers who hold rpl.screening.decide and
 * rpl.interviews.manage, never assessor- or committee-only roles. Each part of
 * the tab shows itself only to those allowed to use it.
 */
describe('the decision tab', () => {
  const DT = CASE_DECISION_COPY.en
  const decisionTab = () => screen.queryByRole('button', { name: DT.tab })
  const caseIn = (status, overrides = {}) => mocks.fetchRplApplication.mockResolvedValue({
    data: application({ status, finalised_at: null, decline_reason_code: null, reapply_available_at: null, allowed_transitions: [], ...overrides }),
  })

  it('leads an administrator from the overview to the decision while the evidence is under verification', async () => {
    caseIn('evidence_verification')
    renderCase()

    expect(await screen.findByText(DT.awaitingDecision)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: DT.goToDecision }))

    expect(await screen.findByText(DT.title)).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(3)
    await waitFor(() => expect(mocks.fetchRplScreeningDecisions).toHaveBeenCalledWith('41'))
    await waitFor(() => expect(mocks.fetchRplInterviews).toHaveBeenCalledWith('41'))
  })

  it('gives a role holding only rpl.screening.decide the card, without figures, history or interviews', async () => {
    auth.current = createAuthorization({ id: 7, roles: [{ slug: 'evidence-reviewer', permissions: ['rpl.applications.view', 'rpl.screening.decide'] }] })
    caseIn('evidence_verification')
    mocks.fetchRplScreenings.mockResolvedValue({ data: [{ public_id: 'scr-1', status: 'completed', fake_likelihood_percent: 30, score_out_of_10: 3, coverage: { documents_total: 1, read: 1 } }] })
    renderCase('/rpl/applications/41?tab=decision')

    expect(await screen.findByText(DT.title)).toBeInTheDocument()
    expect(screen.queryByText(/Authenticity risk/)).not.toBeInTheDocument()
    expect(mocks.fetchRplScreenings).not.toHaveBeenCalled()
    expect(mocks.fetchRplScreeningDecisions).not.toHaveBeenCalled()
    expect(mocks.fetchRplInterviews).not.toHaveBeenCalled()
  })

  it.each(['assessor', 'committee-member'])('is absent for a %s, with no decline action', async (role) => {
    auth.current = createAuthorization({ id: 9, roles: [{ slug: role, permissions: ['rpl.applications.view', 'rpl.evidence.view'] }] })
    caseIn('evidence_verification')
    renderCase('/rpl/applications/41?tab=decision')

    expect(await screen.findByText('Case summary')).toBeInTheDocument()
    expect(decisionTab()).not.toBeInTheDocument()
    expect(screen.queryByText(DT.title)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: DECLINE_COPY.en.action })).not.toBeInTheDocument()
    expect(mocks.fetchRplInterviews).not.toHaveBeenCalled()
  })

  it('shows no decision card before the case is under verification', async () => {
    caseIn('administrative_review')
    renderCase('/rpl/applications/41?tab=decision')

    expect(await screen.findByText(DT.history)).toBeInTheDocument()
    expect(screen.queryByText(DT.title)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: DECLINE_COPY.en.action })).not.toBeInTheDocument()
  })

  it('opens the interview panel for rpl.interviews.manage while the case waits for its interview', async () => {
    auth.current = createAuthorization({ id: 7, roles: [{ slug: 'evidence-reviewer', permissions: ['rpl.applications.view', 'rpl.interviews.manage'] }] })
    caseIn('interview_required')
    renderCase()

    fireEvent.click(await screen.findByRole('button', { name: DT.goToInterview }))

    expect(await screen.findByText(INTERVIEW_COPY.en.title)).toBeInTheDocument()
    await waitFor(() => expect(mocks.fetchRplInterviews).toHaveBeenCalledWith('41'))
    expect(await screen.findByRole('region', { name: INTERVIEW_COPY.en.offerTitle })).toBeInTheDocument()
    // The office address lives in the settings, read only with rpl.settings.manage.
    expect(mocks.fetchRplSettings).not.toHaveBeenCalled()
  })

  it('offers a legacy interview\'s outcome only where the old route takes it from the signed-in member of staff', async () => {
    const legacy = { id: 4, application_public_id: 'case-41', kind: 'legacy_assessment', rpl_assessment_id: 12, status: 'scheduled', offered_modes: [], chosen_mode: 'phone', scheduled_at: '2026-08-01T09:00:00Z', created_at: '2026-08-01T08:00:00Z' }
    mocks.fetchRplInterviews.mockResolvedValue({ data: [legacy] })
    // The administrator's own evaluation: the administrator signed in may record it.
    caseIn('assessment_in_progress', { assessments: [{ id: 12, rpl_assessor_assignment_id: null, assessor_id: 5, locked_at: null }] })
    const first = renderCase('/rpl/applications/41?tab=decision')
    expect(await screen.findByRole('button', { name: INTERVIEW_COPY.en.legacyTitle })).toBeInTheDocument()
    first.unmount()

    // Assigned to an assessor: only that assessor may, so the administrator is not offered it.
    caseIn('assessment_in_progress', {
      assessments: [{ id: 12, rpl_assessor_assignment_id: 7, assessor_id: 21, locked_at: null }],
      assessor_assignments: [{ id: 7, status: 'accepted', conflict_declaration: { has_conflict: false, resolution: 'cleared' } }],
    })
    renderCase('/rpl/applications/41?tab=decision')
    expect(await screen.findByRole('region', { name: INTERVIEW_COPY.en.history })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: INTERVIEW_COPY.en.legacyTitle })).not.toBeInTheDocument()
  })

  it('records a decision, says so, and reads the case and the lists again', async () => {
    caseIn('evidence_verification')
    mocks.recordRplScreeningDecision.mockResolvedValue({ data: { decision: { id: 1, decision: 'pass_to_quiz' }, application_status: 'ready_for_assessment', interview: null } })
    renderCase('/rpl/applications/41?tab=decision')

    fireEvent.click(await screen.findByRole('radio', { name: new RegExp(DT.decisions.pass_to_quiz) }))
    fireEvent.change(screen.getByLabelText(DT.rationale), { target: { value: 'All required evidence is verified.' } })
    fireEvent.click(screen.getByRole('button', { name: DT.submit }))

    await waitFor(() => expect(mocks.recordRplScreeningDecision).toHaveBeenCalledWith('41', { decision: 'pass_to_quiz', rationale: 'All required evidence is verified.' }))
    expect(await screen.findByText(DT.recorded.pass_to_quiz)).toBeInTheDocument()
    await waitFor(() => expect(mocks.fetchRplApplication).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(mocks.fetchRplScreeningDecisions).toHaveBeenCalledTimes(2))
  })

  it('passes to quiz and opens the new assessment for an administrator', async () => {
    caseIn('evidence_verification')
    mocks.recordRplScreeningDecision.mockResolvedValue({ data: { decision: { id: 1, decision: 'pass_to_quiz' }, application_status: 'ready_for_assessment', interview: null } })
    mocks.startAdminRplAssessment.mockResolvedValue({ data: { id: 77 } })
    renderCase('/rpl/applications/41?tab=decision')

    fireEvent.click(await screen.findByRole('radio', { name: new RegExp(DT.decisions.pass_to_quiz) }))
    fireEvent.change(screen.getByLabelText(DT.rationale), { target: { value: 'All required evidence is verified.' } })
    fireEvent.click(screen.getByRole('button', { name: DT.passAndStart }))

    expect(await screen.findByText('Assessment page')).toBeInTheDocument()
    expect(mocks.startAdminRplAssessment).toHaveBeenCalledWith('41')
  })
})

describe('the decline action', () => {
  const DC = DECLINE_COPY.en
  const caseIn = (status) => mocks.fetchRplApplication.mockResolvedValue({
    data: application({ status, finalised_at: null, decline_reason_code: null, reapply_available_at: null, allowed_transitions: [] }),
  })

  it('declines a case waiting for its interview with a category and a rationale', async () => {
    caseIn('interview_required')
    mocks.declineRplApplication.mockResolvedValue({ data: { application_status: 'rejected', decline: { reason_code: 'screening_declined', applicant_category: 'requirements_not_met', reapply_available_at: '2026-10-21T10:00:00+00:00' } } })
    renderCase()

    fireEvent.click(await screen.findByRole('button', { name: DC.action }))
    const dialog = screen.getByRole('dialog', { name: DC.title })
    expect(within(dialog).getByRole('button', { name: DC.submit })).toBeDisabled()
    fireEvent.change(within(dialog).getByLabelText(CASE_DECISION_COPY.en.category), { target: { value: 'requirements_not_met' } })
    fireEvent.change(within(dialog).getByLabelText(CASE_DECISION_COPY.en.rationale), { target: { value: '  The stated experience is outside the pathway.  ' } })
    fireEvent.click(within(dialog).getByRole('button', { name: DC.submit }))

    await waitFor(() => expect(mocks.declineRplApplication).toHaveBeenCalledWith('41', { decline_category: 'requirements_not_met', rationale: 'The stated experience is outside the pathway.' }))
    expect(await screen.findByText(`The request was declined. The applicant may apply again from ${formatLocalizedDateTime('2026-10-21T10:00:00+00:00', 'en')}.`)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('needs rpl.screening.decide', async () => {
    auth.current = createAuthorization({ id: 7, roles: [{ slug: 'evidence-reviewer', permissions: ['rpl.applications.view', 'rpl.interviews.manage'] }] })
    caseIn('interview_required')
    renderCase()

    expect(await screen.findByText('Case summary')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: DC.action })).not.toBeInTheDocument()
  })

  it.each(['administrative_review', 'ready_for_assessment', 'rejected'])('is absent while the case is %s', async (status) => {
    caseIn(status)
    renderCase()

    expect(await screen.findByText('Case summary')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: DC.action })).not.toBeInTheDocument()
  })
})

describe('the decision on the overview', () => {
  const latest = {
    id: 5, decision: 'decline', rationale: 'Two letters carry the same reference number.', override_reason: null,
    screening_snapshot: { state: 'completed', fake_likelihood_percent: 70, score_out_of_10: 7, coverage: { documents_total: 2, read: 2 }, is_stale: false, employer_summary: null },
    decided_by: { id: 3, name: 'Reviewer Example' }, decided_at: '2026-10-14T09:00:00Z',
  }

  it('shows every staff role the decision and its rationale, and the figure only to those who see screens', async () => {
    mocks.fetchRplApplication.mockResolvedValue({ data: application({ decline_reason_code: 'screening_declined', decline_applicant_category: 'documents_not_verified', latest_screening_decision: latest, active_interview: null }) })
    auth.current = createAuthorization({ id: 9, roles: [{ slug: 'assessor', permissions: ['rpl.applications.view'] }] })
    const { unmount } = renderCase()

    expect(await screen.findByText('Two letters carry the same reference number.')).toBeInTheDocument()
    expect(screen.queryByText(/Authenticity risk/)).not.toBeInTheDocument()
    // The sentence the applicant was given, beside the staff reason.
    expect(screen.getByText('What the applicant was told')).toBeInTheDocument()
    expect(screen.getByText('The documents submitted could not be verified.')).toBeInTheDocument()
    unmount()

    auth.current = createAuthorization(ADMINISTRATOR)
    renderCase()
    expect(await screen.findByText('Authenticity risk 70% (7/10)')).toBeInTheDocument()
  })
})
