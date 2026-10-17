import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import InterviewPanel from './InterviewPanel'
import { CASE_DECISION_COPY, INTERVIEW_COPY } from '../domain/caseDecision'

/*
 * THE INTERVIEW, AS STAFF RUN IT (owner flow of 12 Oct 2026, D9(a), P3).
 *
 * What this file pins, each against the exact route and body of the contract:
 *
 *   - offer: online and/or at the office, plus an optional message;
 *   - schedule: a future time as an instant, an https link for online, the
 *     office address in the applicant's language prefilled for in person, and
 *     the mode recorded by staff only while the offer is unanswered;
 *   - held (notes, minutes), no-show (confirmed), cancel (staff-only reason);
 *   - decide: pass to quiz or decline after a held interview, decline only
 *     after a no-show, a category always with a decline;
 *   - an offer past its answer date reads "expired" and cannot be scheduled;
 *   - who chose the mode is shown; legacy rows keep their own outcome route.
 */

const mocks = vi.hoisted(() => ({
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

vi.mock('../services/rplService', () => mocks)

const EN = INTERVIEW_COPY.en
const AR = INTERVIEW_COPY.ar
const DECISION = CASE_DECISION_COPY.en
const FUTURE = '2030-11-02T10:30'
const RATIONALE = 'The applicant described the fleet work in detail.'

function interview(overrides = {}) {
  return {
    id: 15,
    application_public_id: 'case-41',
    rpl_assessment_id: null,
    kind: 'case',
    status: 'offered',
    offered_modes: ['online', 'in_person'],
    offer_message: 'Please choose how you would like to meet.',
    offered_by: { id: 3, name: 'Reviewer Example' },
    offered_at: '2026-10-14T09:00:00Z',
    response_due_at: '2030-10-21T09:00:00Z',
    chosen_mode: null,
    chosen_at: null,
    chosen_by_applicant: null,
    scheduled_at: null,
    location_or_url: null,
    office_address_snapshot: null,
    notes: null,
    minutes_media_id: null,
    decision: null,
    decision_rationale: null,
    decided_by: null,
    decided_at: null,
    cancelled_reason: null,
    outcome: null,
    created_at: '2026-10-14T09:00:00Z',
    ...overrides,
  }
}

function renderPanel({ items = [interview()], status = 'interview_required', props = {}, application = {} } = {}) {
  mocks.fetchRplInterviews.mockResolvedValue({ message: 'Fetched.', data: items })
  const onChanged = vi.fn()
  render(
    <MemoryRouter>
      <InterviewPanel applicationId="case-41" application={{ public_id: 'case-41', status, ...application }} canManage canReadSettings language="en" onChanged={onChanged} {...props} />
    </MemoryRouter>,
  )
  return { onChanged }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.fetchRplSettings.mockResolvedValue({ data: { rpl_interview_office_address: { ar: 'عمّان، شارع الجامعة 12', en: 'Amman, University Street 12' } } })
  for (const name of ['offerRplInterview', 'scheduleRplCaseInterview', 'completeRplInterview', 'markRplInterviewNoShow', 'cancelRplInterview', 'decideRplInterview', 'updateRplInterview']) {
    mocks[name].mockResolvedValue({ message: 'Done.', data: {} })
  }
})

describe('who sees the panel', () => {
  it('is absent without rpl.interviews.manage, and the interviews are never requested', async () => {
    const { container } = render(<MemoryRouter><InterviewPanel applicationId="case-41" application={{ status: 'interview_required' }} canManage={false} canReadSettings language="en" /></MemoryRouter>)

    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(container).toBeEmptyDOMElement()
    expect(mocks.fetchRplInterviews).not.toHaveBeenCalled()
    expect(mocks.fetchRplSettings).not.toHaveBeenCalled()
  })

  it('disappears on a 403', async () => {
    mocks.fetchRplInterviews.mockRejectedValue({ response: { status: 403, data: { message: 'This action is unauthorized.' } } })
    const { container } = render(<MemoryRouter><InterviewPanel applicationId="case-41" application={{ status: 'interview_required' }} canManage language="en" /></MemoryRouter>)

    await waitFor(() => expect(mocks.fetchRplInterviews).toHaveBeenCalledWith('case-41'))
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })

  it('does not read the settings without rpl.settings.manage', async () => {
    renderPanel({ props: { canReadSettings: false } })

    expect(await screen.findByText(EN.current)).toBeInTheDocument()
    expect(mocks.fetchRplSettings).not.toHaveBeenCalled()
  })
})

describe('offering an interview', () => {
  it('is offered while the case waits for an interview and none is active, with the exact body', async () => {
    const { onChanged } = renderPanel({ items: [] })

    const form = await screen.findByRole('region', { name: EN.offerTitle })
    expect(within(form).getByRole('button', { name: EN.offerSubmit })).toBeDisabled()
    fireEvent.click(within(form).getByRole('checkbox', { name: EN.modeLabels.online }))
    fireEvent.change(within(form).getByLabelText(EN.offerMessageLabel), { target: { value: '  We would like to hear about your projects.  ' } })
    fireEvent.click(within(form).getByRole('button', { name: EN.offerSubmit }))

    await waitFor(() => expect(mocks.offerRplInterview).toHaveBeenCalledWith('case-41', { offered_modes: ['online'], offer_message: 'We would like to hear about your projects.' }))
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ message: EN.offeredDone })))
    // The list is read again after the action.
    expect(mocks.fetchRplInterviews).toHaveBeenCalledTimes(2)
  })

  it('is not offered while an interview is active, nor while the case is in another status', async () => {
    renderPanel()
    expect(await screen.findByText(EN.current)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: EN.offerTitle })).not.toBeInTheDocument()
  })

  it('is not offered outside interview_required', async () => {
    renderPanel({ items: [], status: 'evidence_verification' })
    expect(await screen.findByText(EN.empty)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: EN.offerTitle })).not.toBeInTheDocument()
  })
})

describe('an offer the applicant has not answered', () => {
  it('records the mode for the applicant when staff schedule it, with an https link', async () => {
    renderPanel()

    const form = await screen.findByRole('region', { name: EN.scheduleTitle })
    expect(screen.getByText(EN.awaitingChoice)).toBeInTheDocument()
    fireEvent.change(within(form).getByLabelText(EN.recordMode), { target: { value: 'online' } })
    fireEvent.change(within(form).getByLabelText(EN.scheduledAtLabel), { target: { value: FUTURE } })
    fireEvent.change(within(form).getByLabelText(EN.link), { target: { value: 'http://meet.example.org/rpl-41' } })
    expect(within(form).getByText(EN.linkInvalid)).toBeInTheDocument()
    expect(within(form).getByRole('button', { name: EN.scheduleSubmit })).toBeDisabled()

    fireEvent.change(within(form).getByLabelText(EN.link), { target: { value: 'https://meet.example.org/rpl-41' } })
    fireEvent.click(within(form).getByRole('button', { name: EN.scheduleSubmit }))

    await waitFor(() => expect(mocks.scheduleRplCaseInterview).toHaveBeenCalledWith(15, {
      scheduled_at: new Date(FUTURE).toISOString(),
      location_or_url: 'https://meet.example.org/rpl-41',
      mode: 'online',
    }))
  })

  it('refuses a time in the past', async () => {
    renderPanel()

    const form = await screen.findByRole('region', { name: EN.scheduleTitle })
    fireEvent.change(within(form).getByLabelText(EN.recordMode), { target: { value: 'in_person' } })
    fireEvent.change(within(form).getByLabelText(EN.scheduledAtLabel), { target: { value: '2020-01-01T09:00' } })

    expect(within(form).getByText(EN.scheduledAtFuture)).toBeInTheDocument()
    expect(within(form).getByRole('button', { name: EN.scheduleSubmit })).toBeDisabled()
  })

  it('is cancelled with a staff-only reason', async () => {
    renderPanel()

    fireEvent.click(await screen.findByRole('button', { name: EN.cancel }))
    const form = screen.getByRole('region', { name: EN.cancel })
    fireEvent.change(within(form).getByLabelText(EN.cancelReason), { target: { value: 'ab' } })
    expect(within(form).getByRole('button', { name: EN.cancelSubmit })).toBeDisabled()
    fireEvent.change(within(form).getByLabelText(EN.cancelReason), { target: { value: '  The applicant asked to withdraw.  ' } })
    fireEvent.click(within(form).getByRole('button', { name: EN.cancelSubmit }))

    await waitFor(() => expect(mocks.cancelRplInterview).toHaveBeenCalledWith(15, { reason: 'The applicant asked to withdraw.' }))
  })
})

describe('an offer past its answer date', () => {
  it('shows "expired", says why, and cannot be scheduled, while a new offer can be made', async () => {
    renderPanel({ items: [interview({ response_due_at: '2020-01-01T09:00:00Z' })] })

    const card = (await screen.findByText(EN.current)).closest('article')
    expect(within(card).getByText(EN.status.expired)).toBeInTheDocument()
    expect(within(card).getByText(EN.expiredHint)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: EN.scheduleTitle })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: EN.cancel })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: EN.offerTitle })).toBeInTheDocument()
  })
})

describe('a mode the applicant chose', () => {
  it('says the applicant chose it, prefills the office address in their language, and does not send the mode', async () => {
    renderPanel({
      items: [interview({ status: 'mode_chosen', chosen_mode: 'in_person', chosen_by_applicant: true, chosen_at: '2026-10-15T09:00:00Z' })],
      application: { profile_snapshot: { personal: { preferred_locale: 'ar' } } },
    })

    // In the details, and again in the schedule form, which no longer asks for it.
    expect(await screen.findAllByText(`${EN.modeLabels.in_person} · ${EN.chosenByApplicant}`)).toHaveLength(2)
    const form = screen.getByRole('region', { name: EN.scheduleTitle })
    expect(within(form).queryByLabelText(EN.recordMode)).not.toBeInTheDocument()
    await waitFor(() => expect(within(form).getByLabelText(EN.address)).toHaveValue('عمّان، شارع الجامعة 12'))

    fireEvent.change(within(form).getByLabelText(EN.scheduledAtLabel), { target: { value: FUTURE } })
    fireEvent.click(within(form).getByRole('button', { name: EN.scheduleSubmit }))

    await waitFor(() => expect(mocks.scheduleRplCaseInterview).toHaveBeenCalledWith(15, {
      scheduled_at: new Date(FUTURE).toISOString(),
      location_or_url: 'عمّان، شارع الجامعة 12',
    }))
  })

  it('leaves the address out when it is empty, so the server uses the setting', async () => {
    mocks.fetchRplSettings.mockResolvedValue({ data: {} })
    renderPanel({ items: [interview({ status: 'mode_chosen', chosen_mode: 'in_person', chosen_by_applicant: true })] })

    const form = await screen.findByRole('region', { name: EN.scheduleTitle })
    fireEvent.change(within(form).getByLabelText(EN.scheduledAtLabel), { target: { value: FUTURE } })
    fireEvent.click(within(form).getByRole('button', { name: EN.scheduleSubmit }))

    await waitFor(() => expect(mocks.scheduleRplCaseInterview).toHaveBeenCalledWith(15, { scheduled_at: new Date(FUTURE).toISOString() }))
  })

  it('shows a mode staff recorded as recorded by staff', async () => {
    renderPanel({ items: [interview({ status: 'scheduled', chosen_mode: 'online', chosen_by_applicant: false, scheduled_at: '2030-11-02T08:30:00Z', location_or_url: 'https://meet.example.org/rpl-41' })] })

    expect(await screen.findByText(`${EN.modeLabels.online} · ${EN.chosenByStaff}`)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'https://meet.example.org/rpl-41' })).toHaveAttribute('rel', 'noopener noreferrer')
  })
})

describe('a scheduled interview', () => {
  const scheduled = () => interview({ status: 'scheduled', chosen_mode: 'online', chosen_by_applicant: true, scheduled_at: '2030-11-02T08:30:00Z', location_or_url: 'https://meet.example.org/rpl-41' })

  it('is recorded as held with notes and a minutes file', async () => {
    renderPanel({ items: [scheduled()] })

    fireEvent.click(await screen.findByRole('button', { name: EN.completeSubmit }))
    const form = screen.getByRole('region', { name: EN.completeTitle })
    fireEvent.change(within(form).getByLabelText(EN.minutesId), { target: { value: '5x' } })
    expect(within(form).getByText(EN.minutesInvalid)).toBeInTheDocument()
    fireEvent.change(within(form).getByLabelText(EN.minutesId), { target: { value: '55' } })
    fireEvent.change(within(form).getByLabelText(EN.completeNotes), { target: { value: '  Answered every question.  ' } })
    fireEvent.click(within(form).getByRole('button', { name: EN.completeSubmit }))

    await waitFor(() => expect(mocks.completeRplInterview).toHaveBeenCalledWith(15, { notes: 'Answered every question.', minutes_media_id: 55 }))
  })

  it('is recorded as a no-show only after a confirmation, once its time has passed', async () => {
    renderPanel({ items: [interview({ status: 'scheduled', chosen_mode: 'online', chosen_by_applicant: true, scheduled_at: '2026-01-05T08:30:00Z', location_or_url: 'https://meet.example.org/rpl-41' })] })

    fireEvent.click(await screen.findByRole('button', { name: EN.noShow }))
    expect(mocks.markRplInterviewNoShow).not.toHaveBeenCalled()
    expect(screen.getByText(EN.noShowConfirm)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: EN.noShowSubmit }))

    await waitFor(() => expect(mocks.markRplInterviewNoShow).toHaveBeenCalledWith(15))
  })

  it('does not offer a no-show before the interview time (J03-F1)', async () => {
    renderPanel({ items: [scheduled()] })

    const button = await screen.findByRole('button', { name: EN.noShow })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('title', EN.noShowNotYet)
    fireEvent.click(button)
    expect(screen.queryByText(EN.noShowConfirm)).toBeNull()
    expect(mocks.markRplInterviewNoShow).not.toHaveBeenCalled()
  })

  it('is rescheduled without resending the mode', async () => {
    renderPanel({ items: [scheduled()] })

    fireEvent.click(await screen.findByRole('button', { name: EN.reschedule }))
    const form = screen.getByRole('region', { name: EN.rescheduleTitle })
    expect(within(form).getByLabelText(EN.link)).toHaveValue('https://meet.example.org/rpl-41')
    fireEvent.change(within(form).getByLabelText(EN.scheduledAtLabel), { target: { value: FUTURE } })
    fireEvent.click(within(form).getByRole('button', { name: EN.scheduleSubmit }))

    await waitFor(() => expect(mocks.scheduleRplCaseInterview).toHaveBeenCalledWith(15, { scheduled_at: new Date(FUTURE).toISOString(), location_or_url: 'https://meet.example.org/rpl-41' }))
  })

  it('shows the server refusal in the panel', async () => {
    mocks.completeRplInterview.mockRejectedValue({ response: { status: 422, data: { message: 'Invalid.', errors: { minutes_media_id: ['The minutes file does not belong to this case.'] } } } })
    renderPanel({ items: [scheduled()] })

    fireEvent.click(await screen.findByRole('button', { name: EN.completeSubmit }))
    const form = screen.getByRole('region', { name: EN.completeTitle })
    fireEvent.change(within(form).getByLabelText(EN.minutesId), { target: { value: '99' } })
    fireEvent.click(within(form).getByRole('button', { name: EN.completeSubmit }))

    expect(await screen.findByText(/The minutes file does not belong to this case\./)).toBeInTheDocument()
  })
})

describe('the decision after the interview', () => {
  it('passes a held interview to the quiz with a rationale', async () => {
    const { onChanged } = renderPanel({ items: [interview({ status: 'completed', chosen_mode: 'online', chosen_by_applicant: true, scheduled_at: '2026-10-20T08:30:00Z' })] })

    const form = await screen.findByRole('region', { name: EN.decideTitle })
    fireEvent.click(within(form).getByRole('radio', { name: EN.decisions.pass_to_quiz }))
    fireEvent.change(within(form).getByLabelText(DECISION.rationale), { target: { value: RATIONALE } })
    fireEvent.click(within(form).getByRole('button', { name: EN.decideSubmit }))

    await waitFor(() => expect(mocks.decideRplInterview).toHaveBeenCalledWith(15, { decision: 'pass_to_quiz', rationale: RATIONALE }))
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ message: EN.decidedDone.pass_to_quiz })))
  })

  it('declines a held interview only with a category, after a confirmation', async () => {
    renderPanel({ items: [interview({ status: 'completed', chosen_mode: 'online' })] })

    const form = await screen.findByRole('region', { name: EN.decideTitle })
    fireEvent.click(within(form).getByRole('radio', { name: EN.decisions.decline }))
    fireEvent.change(within(form).getByLabelText(DECISION.rationale), { target: { value: RATIONALE } })
    expect(within(form).getByRole('button', { name: DECISION.submitDecline })).toBeDisabled()
    fireEvent.change(within(form).getByLabelText(DECISION.category), { target: { value: 'experience_not_confirmed' } })
    fireEvent.click(within(form).getByRole('button', { name: DECISION.submitDecline }))
    fireEvent.click(within(form).getByRole('button', { name: DECISION.confirmDecline }))

    await waitFor(() => expect(mocks.decideRplInterview).toHaveBeenCalledWith(15, { decision: 'decline', rationale: RATIONALE, decline_category: 'experience_not_confirmed' }))
  })

  it('after a no-show offers only a decline, starting on "the interview did not take place"', async () => {
    renderPanel({ items: [interview({ status: 'no_show', chosen_mode: 'in_person' })] })

    const form = await screen.findByRole('region', { name: EN.decideTitle })
    expect(within(form).getAllByRole('radio').map((radio) => radio.value)).toEqual(['decline'])
    expect(within(form).getByLabelText(DECISION.category)).toHaveValue('interview_not_attended')
    fireEvent.change(within(form).getByLabelText(DECISION.rationale), { target: { value: RATIONALE } })
    fireEvent.click(within(form).getByRole('button', { name: DECISION.submitDecline }))
    fireEvent.click(within(form).getByRole('button', { name: DECISION.confirmDecline }))

    await waitFor(() => expect(mocks.decideRplInterview).toHaveBeenCalledWith(15, { decision: 'decline', rationale: RATIONALE, decline_category: 'interview_not_attended' }))
  })

  it('is not offered once the interview carries a decision, or once the case has moved on', async () => {
    renderPanel({ items: [interview({ status: 'completed', decision: 'pass_to_quiz', decision_rationale: RATIONALE })], status: 'ready_for_assessment' })

    expect(await screen.findByText(RATIONALE)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: EN.decideTitle })).not.toBeInTheDocument()
  })
})

describe('earlier interviews', () => {
  const legacy = interview({ id: 4, kind: 'legacy_assessment', rpl_assessment_id: 12, status: 'scheduled', offered_modes: [], mode: 'phone', chosen_mode: null, scheduled_at: '2026-08-01T09:00:00Z', response_due_at: null })

  // The administrator's own evaluation, open: the old route takes the outcome from an administrator.
  const adminEvaluation = { assessments: [{ id: 12, rpl_assessor_assignment_id: null, assessor_id: 3, locked_at: null }] }
  const administrator = { id: 9, isAdministrator: true }

  it('lists a legacy row with a link to its assessment, and records its outcome through the old route', async () => {
    renderPanel({ items: [legacy], application: adminEvaluation, props: { canRecordLegacy: true, viewer: administrator } })

    const history = await screen.findByRole('region', { name: EN.history })
    expect(within(history).getByText(EN.legacy)).toBeInTheDocument()
    expect(within(history).getByRole('link', { name: EN.openAssessment })).toHaveAttribute('href', '/rpl/assessments/12')
    expect(within(history).getByText(EN.modeLabels.phone)).toBeInTheDocument()

    fireEvent.click(within(history).getByRole('button', { name: EN.legacyTitle }))
    fireEvent.change(within(history).getByLabelText(EN.legacyResult), { target: { value: 'completed' } })
    fireEvent.change(within(history).getByLabelText(EN.legacyOutcomeLabel), { target: { value: '  Confirmed the portfolio.  ' } })
    fireEvent.click(within(history).getByRole('button', { name: EN.legacySubmit }))

    await waitFor(() => expect(mocks.updateRplInterview).toHaveBeenCalledWith(4, { status: 'completed', outcome: 'Confirmed the portfolio.' }))
  })

  it('offers no outcome form without the assessment permission', async () => {
    renderPanel({ items: [legacy], application: adminEvaluation, props: { viewer: administrator } })

    expect(await screen.findByRole('region', { name: EN.history })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: EN.legacyTitle })).not.toBeInTheDocument()
  })

  it.each([
    ['the assessment is assigned to another assessor', { assessments: [{ id: 12, rpl_assessor_assignment_id: 7, assessor_id: 21, locked_at: null }] }, administrator],
    ['the assessment is locked', { assessments: [{ id: 12, rpl_assessor_assignment_id: null, assessor_id: 3, locked_at: '2026-09-01T10:00:00Z' }] }, administrator],
    ['the viewer is not an administrator', adminEvaluation, { id: 9, isAdministrator: false }],
    ['the case does not show the assessment', { assessments: [] }, administrator],
  ])('offers no outcome form the server would refuse: %s', async (_, application, viewer) => {
    renderPanel({ items: [legacy], application, props: { canRecordLegacy: true, viewer } })

    expect(await screen.findByRole('region', { name: EN.history })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: EN.legacyTitle })).not.toBeInTheDocument()
  })

  it('offers the outcome form to the assigned assessor once the assignment is cleared', async () => {
    renderPanel({
      items: [legacy],
      application: {
        assessments: [{ id: 12, rpl_assessor_assignment_id: 7, assessor_id: 21, locked_at: null }],
        assessor_assignments: [{ id: 7, status: 'accepted', conflict_declaration: { has_conflict: false, resolution: 'cleared' } }],
      },
      props: { canRecordLegacy: true, viewer: { id: 21, isAdministrator: false } },
    })

    expect(await screen.findByRole('button', { name: EN.legacyTitle })).toBeInTheDocument()
  })
})

describe('the panel in Arabic', () => {
  it('renders the statuses and forms without a literal "undefined"', async () => {
    mocks.fetchRplInterviews.mockResolvedValue({ data: [interview({ response_due_at: '2020-01-01T09:00:00Z' }), interview({ id: 3, status: 'cancelled', cancelled_reason: 'Duplicate offer.' })] })
    render(<MemoryRouter><InterviewPanel applicationId="case-41" application={{ status: 'interview_required' }} canManage language="ar" /></MemoryRouter>)

    expect(await screen.findByText(AR.title)).toBeInTheDocument()
    expect(await screen.findByText(AR.status.expired)).toBeInTheDocument()
    expect(screen.getByText(AR.status.cancelled)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: AR.offerTitle })).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('undefined')
  })
})
