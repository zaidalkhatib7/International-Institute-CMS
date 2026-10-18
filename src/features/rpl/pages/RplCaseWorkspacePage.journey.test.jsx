import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RplCaseWorkspacePage from './RplCaseWorkspacePage'
import { createAuthorization } from '../../auth/authorization'

/*
 * THE CASE AS A JOURNEY (owner, 18 Oct 2026; PLATFORM-JOURNEY-SPEC §4.3, §9.1
 * item 8): the stepper and the Next step on top, the tabs in the order of the
 * journey, the entry quiz inside the case, the committee forms only while they can
 * be saved, the client's page one click away, and Back to the list it came from.
 */

const mocks = vi.hoisted(() => ({}))
const language = vi.hoisted(() => ({ current: 'en' }))
const auth = vi.hoisted(() => ({ current: null }))
const counts = vi.hoisted(() => ({ refreshWorkCounts: vi.fn() }))

// Every service the page or its panels reach for answers an empty list unless a test says otherwise.
vi.mock('../services/rplService', async (importOriginal) => {
  const actual = await importOriginal()
  return Object.fromEntries(Object.keys(actual).map((key) => {
    if (typeof actual[key] !== 'function') return [key, actual[key]]
    mocks[key] = vi.fn(() => Promise.resolve({ data: [] }))
    return [key, (...args) => mocks[key](...args)]
  }))
})
vi.mock('../../../services/languageStorage', async (importOriginal) => ({
  ...(await importOriginal()),
  getAdminLanguage: () => language.current,
}))
vi.mock('../../auth/context/useAuthorization', () => ({
  useAuthorization: () => auth.current,
}))
// The case's acts read the shared work counts again (review of 18 Oct 2026).
vi.mock('../../dashboard/hooks/useWorkCounts', async (importOriginal) => ({
  ...(await importOriginal()),
  refreshWorkCounts: counts.refreshWorkCounts,
}))

const ADMINISTRATOR = { id: 1, name: 'Admin Example', roles: [{ slug: 'admin' }] }
const DECIDED = { id: 3, decision: 'pass_to_quiz', rationale: 'Verified.', decided_at: '2026-10-14T09:00:00Z' }

function application(overrides = {}) {
  return {
    id: 41,
    public_id: 'case-41',
    case_reference: 'RPL-2026-JOURNEY',
    status: 'assessment_in_progress',
    allowed_transitions: [],
    user: { id: 9, name: 'Maya Client', email: 'client1@e2e.test' },
    pathway: { name: { en: 'With secondary', ar: 'مع الشهادة الثانوية' } },
    requested_level: { name: { en: 'Advanced practitioner', ar: 'ممارس مهني متقدم' } },
    submitted_at: '2026-10-01T09:00:00+00:00',
    latest_screening_decision: DECIDED,
    work_queue: 'quiz_prepare',
    ...overrides,
  }
}

function Probe() {
  const location = useLocation()
  return <p data-testid="probe">{location.pathname}{location.search}</p>
}

function renderCase(entry = '/rpl/applications/case-41') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/rpl/applications/:applicationId" element={<><RplCaseWorkspacePage /><Probe /></>} />
        <Route path="*" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  )
}

const tabBar = () => screen.getByRole('navigation', { name: language.current === 'ar' ? 'ملف طلب' : 'Case' })
const tabNames = () => within(tabBar()).getAllByRole('button').map((button) => button.textContent)

beforeEach(() => {
  vi.clearAllMocks()
  language.current = 'en'
  auth.current = createAuthorization(ADMINISTRATOR)
  for (const fn of Object.values(mocks)) fn.mockImplementation(() => Promise.resolve({ data: [] }))
  mocks.fetchRplApplication.mockResolvedValue({ data: application() })
  mocks.fetchRplReferenceData.mockResolvedValue({ data: { settings: { rpl_advisory_include_evidence_documents: false } } })
  mocks.fetchRplSettings.mockResolvedValue({ data: {} })
})

describe('the stepper and the Next step', () => {
  it('shows the entry quiz as the current step and what to do now, with the button to its tab', async () => {
    renderCase()

    const stages = await screen.findByRole('region', { name: 'Case stages' })
    expect(within(stages).getAllByRole('listitem').map((item) => item.dataset.state)).toEqual(['done', 'done', 'current', 'upcoming', 'upcoming', 'upcoming', 'upcoming'])
    expect(stages.querySelector('[aria-current="step"]')).toHaveAttribute('data-step', 'entry_quiz')

    const next = screen.getByRole('region', { name: 'Next step' })
    expect(within(next).getByText('Prepare the entry quiz: create and review the questions, then send them to the client.')).toBeInTheDocument()
    expect(within(next).getByText('Your move')).toBeInTheDocument()
    fireEvent.click(within(next).getByRole('button', { name: 'Open the entry quiz' }))
    expect(within(tabBar()).getByRole('button', { name: 'Entry quiz' })).toHaveAttribute('aria-current', 'page')
  })

  it('shows a pre-flow case its sentence instead of a stepper', async () => {
    mocks.fetchRplApplication.mockResolvedValue({ data: application({ status: 'committee_review', latest_screening_decision: null, work_queue: null }) })
    renderCase()
    const next = await screen.findByRole('region', { name: 'Next step' })
    expect(within(next).getByText('Pre-flow committee case: Committee review.')).toBeInTheDocument()
    expect(screen.getAllByText('Pre-flow committee case: Committee review.')).toHaveLength(1)
    expect(screen.queryByRole('region', { name: 'Case stages' })).not.toBeInTheDocument()
  })

  it('submits an office draft for the client only after confirming, through the generic move', async () => {
    mocks.fetchRplApplication.mockResolvedValue({ data: application({ status: 'draft', work_queue: 'office_drafts', latest_screening_decision: null, allowed_transitions: ['submitted', 'withdrawn'] }) })
    mocks.transitionRplApplication.mockResolvedValue({ data: { status: 'submitted' } })
    renderCase()

    const next = await screen.findByRole('region', { name: 'Next step' })
    expect(within(next).getByText('Upload the client\'s files, then submit the request for them.')).toBeInTheDocument()
    fireEvent.click(within(next).getByRole('button', { name: 'Submit the request' }))
    expect(mocks.transitionRplApplication).not.toHaveBeenCalled()
    expect(within(next).getByText('The request will be submitted and document screening will start.')).toBeInTheDocument()
    fireEvent.click(within(next).getByRole('button', { name: 'Confirm and submit' }))
    await waitFor(() => expect(mocks.transitionRplApplication).toHaveBeenCalledWith('case-41', { status: 'submitted' }))
  })

  it('renders in Arabic', async () => {
    language.current = 'ar'
    renderCase()
    const next = await screen.findByRole('region', { name: 'الخطوة التالية' })
    expect(within(next).getByText('جهّز اختبار الدخول: أنشئ الأسئلة وراجعها ثم أرسلها إلى العميل.')).toBeInTheDocument()
    expect(within(next).getByText('عليك')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'مراحل الطلب' })).toBeInTheDocument()
    expect(screen.getByText('ملف طلب · المسار المهني')).toBeInTheDocument()
    expect(document.body.textContent.replace(/RPL-2026-JOURNEY/g, '')).not.toMatch(/RPL|undefined/)
  })
})

describe('the tabs', () => {
  it('rewrites the old assessment key to the entry quiz tab', async () => {
    renderCase('/rpl/applications/case-41?tab=assessment')
    await waitFor(() => expect(within(tabBar()).getByRole('button', { name: 'Entry quiz' })).toHaveAttribute('aria-current', 'page'))
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('?tab=entry_quiz'))
  })

  it.each(['assessment_in_progress', 'course_plan_active', 'final_exam'])('has no committee tab while the case is %s', async (status) => {
    mocks.fetchRplApplication.mockResolvedValue({ data: application({ status }) })
    renderCase()
    await screen.findByText('Case summary')
    expect(tabNames()).not.toContain('Committee & quality')
  })

  it.each(['quality_review', 'committee_review'])('has the committee tab, last, while the case is %s', async (status) => {
    mocks.fetchRplApplication.mockResolvedValue({ data: application({ status, latest_screening_decision: null, work_queue: null }) })
    renderCase()
    await screen.findByText('Case summary')
    expect(tabNames().at(-1)).toBe('Committee & quality')
  })

  it('scrolls the tab bar inside its own container', async () => {
    renderCase()
    await screen.findByText('Case summary')
    expect(tabBar().parentElement.className).toMatch(/overflow-x-auto/)
    expect(tabBar().className).toMatch(/min-w-max/)
  })
})

describe('the entry quiz inside the case (D-09)', () => {
  it('mounts the entry quiz for an administrator with the admin assessment, and links the full page', async () => {
    mocks.fetchRplAssessments.mockResolvedValue({ data: [{ id: 5, rpl_assessor_assignment_id: 2 }, { id: 77, rpl_assessor_assignment_id: null }] })
    renderCase('/rpl/applications/case-41?tab=entry_quiz')

    await waitFor(() => expect(mocks.fetchDynamicAssessments).toHaveBeenCalledWith({ rpl_assessment_id: 77 }))
    expect(await screen.findByRole('button', { name: /Create the entry quiz/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Full assessment page/ })).toHaveAttribute('href', '/rpl/assessments/77')
  })

  it('re-reads the case after an act in the entry quiz, so the Next step follows the quiz', async () => {
    mocks.fetchRplAssessments.mockResolvedValue({ data: [{ id: 77, rpl_assessor_assignment_id: null }] })
    mocks.createDynamicAssessment.mockResolvedValue({ data: { id: 501 } })
    renderCase('/rpl/applications/case-41?tab=entry_quiz')
    const next = await screen.findByRole('region', { name: 'Next step' })
    expect(within(next).getByText('Prepare the entry quiz: create and review the questions, then send them to the client.')).toBeInTheDocument()
    const reads = mocks.fetchRplApplication.mock.calls.length

    // The server has moved the case on: the quiz is with the client now.
    mocks.fetchRplApplication.mockResolvedValue({ data: application({ work_queue: 'quiz_client' }) })
    fireEvent.click(await screen.findByRole('button', { name: /Create the entry quiz/ }))
    await waitFor(() => expect(mocks.createDynamicAssessment).toHaveBeenCalledWith(77))
    await waitFor(() => expect(mocks.fetchRplApplication.mock.calls.length).toBeGreaterThan(reads))
    expect(await within(next).findByText("The entry quiz was sent; waiting for the client's answers.")).toBeInTheDocument()
    expect(counts.refreshWorkCounts).toHaveBeenCalled()
  })

  it('starts the entry quiz for an administrator without one, staying on the tab', async () => {
    mocks.fetchRplApplication.mockResolvedValue({ data: application({ status: 'ready_for_assessment', work_queue: 'quiz_start' }) })
    mocks.startAdminRplAssessment.mockImplementation(async () => {
      mocks.fetchRplAssessments.mockResolvedValue({ data: [{ id: 88, rpl_assessor_assignment_id: null }] })
      return { data: { id: 88 } }
    })
    renderCase('/rpl/applications/case-41?tab=entry_quiz')

    expect(await screen.findByText('Start the entry quiz for this case.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Start the entry quiz' }))
    await waitFor(() => expect(mocks.startAdminRplAssessment).toHaveBeenCalledWith('case-41'))
    expect(await screen.findByRole('link', { name: /Full assessment page/ })).toHaveAttribute('href', '/rpl/assessments/88')
    expect(screen.getByTestId('probe')).toHaveTextContent('/rpl/applications/case-41?tab=entry_quiz')
  })

  it.each([['passed', 'Entry-quiz result: Passed'], ['failed', 'Entry-quiz result: Not passed'], [null, 'Entry-quiz result: Not scored yet']])('shows a non-administrator the result line (%s)', async (result, line) => {
    auth.current = createAuthorization({ id: 4, name: 'Reviewer', roles: [{ slug: 'quality-reviewer', permissions: ['rpl.applications.view'] }] })
    mocks.fetchRplApplication.mockResolvedValue({ data: application({ course_plan: { entry_quiz_result: result } }) })
    renderCase('/rpl/applications/case-41?tab=entry_quiz')
    expect(await screen.findByText(line)).toBeInTheDocument()
    expect(mocks.fetchDynamicAssessments).not.toHaveBeenCalled()
  })
})

describe('the header', () => {
  it('links the client\'s name to the client page for a viewer with users.view', async () => {
    renderCase()
    const heading = await screen.findByRole('heading', { level: 2, name: 'Maya Client' })
    expect(within(heading).getByRole('link')).toHaveAttribute('href', '/users/9')
    expect(screen.getByText('With secondary · Advanced practitioner')).toBeInTheDocument()
  })

  it('shows the name as plain text without users.view', async () => {
    auth.current = createAuthorization({ id: 4, name: 'Reviewer', roles: [{ slug: 'quality-reviewer', permissions: ['rpl.applications.view'] }] })
    renderCase()
    const heading = await screen.findByRole('heading', { level: 2, name: 'Maya Client' })
    expect(within(heading).queryByRole('link')).not.toBeInTheDocument()
  })

  it('goes back to the list it came from, named by its queue', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/rpl/applications/case-41', state: { from: { pathname: '/rpl/applications', search: '?stage=entry_quiz&queue=quiz_prepare', label: 'To prepare and send' } } }]}>
        <Routes>
          <Route path="/rpl/applications/:applicationId" element={<RplCaseWorkspacePage />} />
          <Route path="/rpl/applications" element={<Probe />} />
        </Routes>
      </MemoryRouter>,
    )
    fireEvent.click(await screen.findByRole('button', { name: /Back to “To prepare and send”/ }))
    expect(screen.getByTestId('probe')).toHaveTextContent('/rpl/applications?stage=entry_quiz&queue=quiz_prepare')
  })

  it('goes back to the cases when opened directly', async () => {
    renderCase()
    fireEvent.click(await screen.findByRole('button', { name: /Back to cases/ }))
    expect(screen.getByTestId('probe')).toHaveTextContent('/rpl/applications')
  })
})

describe('a client reply to an information request', () => {
  it('shows the reply, tells staff it is theirs, and moves the case back to review after confirming', async () => {
    mocks.fetchRplApplication.mockResolvedValue({ data: application({
      status: 'awaiting_applicant', work_queue: 'information_review', latest_screening_decision: null, allowed_transitions: ['administrative_review', 'evidence_verification', 'withdrawn'],
      information_requests: [{ id: 3, subject: 'Letter', message: 'Send the signed letter.', status: 'responded', response: 'Uploaded the signed letter today.', due_at: '2030-01-01T00:00:00Z' }],
    }) })
    mocks.transitionRplApplication.mockResolvedValue({ data: { status: 'administrative_review' } })
    renderCase()

    const next = await screen.findByRole('region', { name: 'Next step' })
    expect(within(next).getByText('The client replied to the information request. Review the reply, then move the case back to review or screening.')).toBeInTheDocument()
    expect(within(next).getByText('Your move')).toBeInTheDocument()
    expect(screen.getByText('Uploaded the signed letter today.')).toBeInTheDocument()
    expect(screen.getByText('Client replied')).toBeInTheDocument()

    fireEvent.click(within(next).getByRole('button', { name: 'Move back to review' }))
    expect(mocks.transitionRplApplication).not.toHaveBeenCalled()
    fireEvent.click(within(next).getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(mocks.transitionRplApplication).toHaveBeenCalledWith('case-41', { status: 'administrative_review' }))
    // The tiles, badges and bell follow the move at once.
    await waitFor(() => expect(counts.refreshWorkCounts).toHaveBeenCalled())
  })
})

describe('the overview', () => {
  it('hides the information requests on a closed case, and names their status in words on an open one', async () => {
    mocks.fetchRplApplication.mockResolvedValue({ data: application({ status: 'awaiting_applicant', work_queue: 'awaiting_client_info', information_requests: [{ id: 1, subject: 'Letter', message: 'Send the letter.', status: 'open', due_at: '2030-01-01T00:00:00Z' }] }) })
    const { unmount } = renderCase()
    const card = await screen.findByRole('heading', { name: 'Missing-information requests' })
    expect(within(card.closest('.overflow-hidden')).getByText('Open')).toBeInTheDocument()
    unmount()

    mocks.fetchRplApplication.mockResolvedValue({ data: application({ status: 'completed', work_queue: null }) })
    renderCase()
    await screen.findByText('Case summary')
    expect(screen.queryByRole('heading', { name: 'Missing-information requests' })).not.toBeInTheDocument()
  })

  it('says when a declined case was declined and when its client may apply again', async () => {
    mocks.fetchRplApplication.mockResolvedValue({ data: application({ status: 'rejected', work_queue: null, finalised_at: '2026-10-12T10:00:00Z', decline_reason_code: 'screening_declined', reapply_available_at: '2026-10-19T10:00:00Z' }) })
    renderCase()
    expect(await screen.findByText(/^Declined on .* · may apply again from /)).toBeInTheDocument()
  })
})
