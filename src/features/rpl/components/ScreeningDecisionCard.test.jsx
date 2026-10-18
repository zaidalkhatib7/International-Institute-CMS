import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ScreeningDecisionCard, { ScreeningDecisionHistory } from './ScreeningDecisionCard'
import { CASE_DECISION_COPY } from '../domain/caseDecision'
import { DECLINE_CATEGORIES } from '../domain/rpl'

/*
 * THE SCREENING DECISION, AS STAFF MAKE IT (owner flow of 12 Oct 2026, P3).
 *
 * What this file pins:
 *
 *   - the card exists only for rpl.screening.decide, and only while the case is
 *     under evidence verification;
 *   - every decision posts to POST /screening-decision with exactly the fields
 *     that decision takes, and a rationale of 10 to 5,000 characters;
 *   - a decline needs a category from the fixed list, shows the applicant's
 *     sentence before it is sent, and is confirmed in a second step;
 *   - the override reason appears when the server asks for it, and only then
 *     goes out;
 *   - an administrator can pass to quiz and start the assessment in one go;
 *   - the latest screen is shown beside the choice only to those who may see it.
 */

const mocks = vi.hoisted(() => ({
  fetchRplScreeningDecisions: vi.fn(),
  recordRplScreeningDecision: vi.fn(),
  startAdminRplAssessment: vi.fn(),
}))

vi.mock('../services/rplService', () => mocks)

const EN = CASE_DECISION_COPY.en
const AR = CASE_DECISION_COPY.ar
const RATIONALE = 'Experience letter checked with the employer by phone.'

function completedScreen(overrides = {}) {
  return {
    public_id: 'scr-1', status: 'completed', fake_likelihood_percent: 30, score_out_of_10: 3,
    coverage: { documents_total: 4, read: 3, withheld: [] }, is_stale: false, created_at: '2026-10-13T09:00:00Z', ...overrides,
  }
}

function renderCard(props = {}) {
  const onDecided = vi.fn()
  render(<ScreeningDecisionCard applicationId="case-41" status="evidence_verification" canDecide canViewScreening screenings={[completedScreen()]} declineCategories={DECLINE_CATEGORIES} language="en" onDecided={onDecided} {...props} />)
  return { onDecided }
}

function choose(decision) {
  fireEvent.click(screen.getByRole('radio', { name: new RegExp(EN.decisions[decision]) }))
}

function writeRationale(text = RATIONALE) {
  fireEvent.change(screen.getByLabelText(EN.rationale), { target: { value: text } })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.recordRplScreeningDecision.mockResolvedValue({ message: 'Recorded.', data: { decision: { id: 9, decision: 'pass_to_quiz' }, application_status: 'ready_for_assessment', interview: null } })
  mocks.startAdminRplAssessment.mockResolvedValue({ data: { id: 77 } })
  mocks.fetchRplScreeningDecisions.mockResolvedValue({ message: 'Fetched.', data: [] })
})

describe('who sees the decision card, and when', () => {
  it('is shown to rpl.screening.decide while the evidence is under verification', () => {
    renderCard()

    expect(screen.getByText(EN.title)).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(3)
  })

  it.each(['submitted', 'administrative_review', 'interview_required', 'ready_for_assessment', 'rejected'])('is absent while the case is %s', (status) => {
    const { container } = render(<ScreeningDecisionCard applicationId="case-41" status={status} canDecide language="en" />)

    expect(container).toBeEmptyDOMElement()
  })

  it('is absent without rpl.screening.decide', () => {
    const { container } = render(<ScreeningDecisionCard applicationId="case-41" status="evidence_verification" canDecide={false} canViewScreening language="en" />)

    expect(container).toBeEmptyDOMElement()
  })
})

describe('the screen beside the decision', () => {
  it('shows the figure, the coverage and a partial screen to those who may see screens', () => {
    renderCard()

    const glance = screen.getByRole('region', { name: EN.latestScreening })
    expect(within(glance).getByText('Authenticity risk 30% (3/10)')).toBeInTheDocument()
    expect(within(glance).getByText('Read 3 of 4 documents.')).toBeInTheDocument()
    expect(within(glance).queryByText(EN.noCurrentScreening)).not.toBeInTheDocument()
  })

  it('never shows a figure without rpl.screening.view', () => {
    renderCard({ canViewScreening: false })

    expect(screen.queryByText(/Authenticity risk/)).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: EN.latestScreening })).not.toBeInTheDocument()
  })

  it('says a stale screen no longer describes the documents, and that an override may be asked', () => {
    renderCard({ screenings: [completedScreen({ is_stale: true })] })

    expect(screen.getByText(EN.staleScreening)).toBeInTheDocument()
    expect(screen.getByText(EN.noCurrentScreening)).toBeInTheDocument()
  })

  it('says when no screen has run', () => {
    renderCard({ screenings: [] })

    expect(screen.getByText(EN.noScreening)).toBeInTheDocument()
  })
})

describe('recording the decision', () => {
  it('passes to quiz with the decision and the rationale only', async () => {
    const { onDecided } = renderCard()

    choose('pass_to_quiz')
    writeRationale(`  ${RATIONALE}  `)
    fireEvent.click(screen.getByRole('button', { name: EN.submit }))

    await waitFor(() => expect(mocks.recordRplScreeningDecision).toHaveBeenCalledTimes(1))
    expect(mocks.recordRplScreeningDecision).toHaveBeenCalledWith('case-41', { decision: 'pass_to_quiz', rationale: RATIONALE })
    await waitFor(() => expect(onDecided).toHaveBeenCalledWith(expect.objectContaining({ decision: 'pass_to_quiz', message: EN.recorded.pass_to_quiz, failed: false, assessment: null })))
    expect(mocks.startAdminRplAssessment).not.toHaveBeenCalled()
  })

  it('will not send a rationale shorter than 10 characters', () => {
    renderCard()

    choose('pass_to_quiz')
    writeRationale('Too short')

    expect(screen.getByText(EN.rationaleInvalid)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: EN.submit })).toBeDisabled()
  })

  it('offers an interview with the modes chosen and the message to the applicant', async () => {
    renderCard()

    choose('interview_required')
    writeRationale()
    expect(screen.getByRole('button', { name: EN.submit })).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox', { name: EN.modeLabels.in_person }))
    fireEvent.click(screen.getByRole('checkbox', { name: EN.modeLabels.online }))
    fireEvent.change(screen.getByLabelText(EN.offerMessage), { target: { value: 'Please bring your original certificates.' } })
    fireEvent.click(screen.getByRole('button', { name: EN.submit }))

    await waitFor(() => expect(mocks.recordRplScreeningDecision).toHaveBeenCalledWith('case-41', {
      decision: 'interview_required',
      rationale: RATIONALE,
      offered_modes: ['online', 'in_person'],
      offer_message: 'Please bring your original certificates.',
    }))
  })

  it('declines only with a category, shows what the applicant will read, and asks to confirm', async () => {
    const { onDecided } = renderCard()

    choose('decline')
    writeRationale()
    expect(screen.getByRole('button', { name: EN.submitDecline })).toBeDisabled()

    fireEvent.change(screen.getByLabelText(EN.category), { target: { value: 'experience_not_confirmed' } })
    const preview = screen.getByText(EN.applicantReads).closest('div')
    expect(within(preview).getByText('The professional experience stated could not be confirmed.')).toBeInTheDocument()
    expect(within(preview).getByText('تعذّر تأكيد الخبرة المهنية المذكورة.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: EN.submitDecline }))
    expect(mocks.recordRplScreeningDecision).not.toHaveBeenCalled()
    expect(screen.getByText(EN.confirmDeclineHint)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: EN.confirmDecline }))

    await waitFor(() => expect(mocks.recordRplScreeningDecision).toHaveBeenCalledWith('case-41', {
      decision: 'decline',
      rationale: RATIONALE,
      decline_category: 'experience_not_confirmed',
    }))
    await waitFor(() => expect(onDecided).toHaveBeenCalledWith(expect.objectContaining({ decision: 'decline', message: EN.recorded.decline })))
  })

  it('lists only the categories the server sent', () => {
    renderCard({ declineCategories: [{ code: 'requirements_not_met', label: { ar: 'نص', en: 'Server sentence.' } }] })

    choose('decline')
    const options = within(screen.getByLabelText(EN.category)).getAllByRole('option').map((option) => option.value)
    expect(options).toEqual(['', 'requirements_not_met'])
  })
})

describe('the override reason', () => {
  const refusal = { response: { status: 422, data: { message: 'The given data was invalid.', errors: { override_reason: ['No current completed screening exists; give an override reason.'] } } } }

  it('appears when the server asks for it, and goes out on the next try', async () => {
    mocks.recordRplScreeningDecision.mockRejectedValueOnce(refusal)
    renderCard({ screenings: [] })

    expect(screen.queryByLabelText(EN.overrideReason)).not.toBeInTheDocument()
    choose('pass_to_quiz')
    writeRationale()
    fireEvent.click(screen.getByRole('button', { name: EN.submit }))

    expect(await screen.findByLabelText(EN.overrideReason)).toBeInTheDocument()
    expect(screen.getByText('No current completed screening exists; give an override reason.')).toBeInTheDocument()
    // The first request went out without one.
    expect(mocks.recordRplScreeningDecision.mock.calls[0][1]).not.toHaveProperty('override_reason')
    expect(screen.getByRole('button', { name: EN.submit })).toBeDisabled()

    fireEvent.change(screen.getByLabelText(EN.overrideReason), { target: { value: '  The screening worker has been down since Monday.  ' } })
    fireEvent.click(screen.getByRole('button', { name: EN.submit }))

    await waitFor(() => expect(mocks.recordRplScreeningDecision).toHaveBeenCalledTimes(2))
    expect(mocks.recordRplScreeningDecision.mock.calls[1]).toEqual(['case-41', {
      decision: 'pass_to_quiz',
      rationale: RATIONALE,
      override_reason: 'The screening worker has been down since Monday.',
    }])
  })

  it('shows any other refusal as an error, without an override field', async () => {
    mocks.recordRplScreeningDecision.mockRejectedValueOnce({ response: { status: 422, data: { message: 'Invalid.', errors: { application: ['The case is no longer under evidence verification.'] } } } })
    renderCard()

    choose('pass_to_quiz')
    writeRationale()
    fireEvent.click(screen.getByRole('button', { name: EN.submit }))

    expect(await screen.findByText(/The case is no longer under evidence verification\./)).toBeInTheDocument()
    expect(screen.queryByLabelText(EN.overrideReason)).not.toBeInTheDocument()
  })
})

describe('pass to quiz and start the assessment', () => {
  it('is offered to an administrator, and records the decision before starting the assessment', async () => {
    const { onDecided } = renderCard({ canStartAssessment: true })

    choose('pass_to_quiz')
    writeRationale()
    fireEvent.click(screen.getByRole('button', { name: EN.passAndStart }))

    await waitFor(() => expect(mocks.startAdminRplAssessment).toHaveBeenCalledWith('case-41'))
    expect(mocks.recordRplScreeningDecision).toHaveBeenCalledWith('case-41', { decision: 'pass_to_quiz', rationale: RATIONALE })
    expect(mocks.recordRplScreeningDecision.mock.invocationCallOrder[0]).toBeLessThan(mocks.startAdminRplAssessment.mock.invocationCallOrder[0])
    await waitFor(() => expect(onDecided).toHaveBeenCalledWith(expect.objectContaining({ assessment: { id: 77 }, failed: false, message: EN.recordedAndStarted })))
  })

  it('says the decision stands when the assessment cannot be started', async () => {
    mocks.startAdminRplAssessment.mockRejectedValueOnce({ response: { status: 422, data: { message: 'Invalid.', errors: { evidence: ['Required evidence is not verified.'] } } } })
    const { onDecided } = renderCard({ canStartAssessment: true })

    choose('pass_to_quiz')
    writeRationale()
    fireEvent.click(screen.getByRole('button', { name: EN.passAndStart }))

    await waitFor(() => expect(onDecided).toHaveBeenCalledTimes(1))
    const report = onDecided.mock.calls[0][0]
    expect(report.failed).toBe(true)
    expect(report.message).toContain(EN.startFailed)
    expect(report.message).toContain('Required evidence is not verified.')
  })

  it('is not offered to anyone else, nor for another decision', () => {
    renderCard()
    choose('pass_to_quiz')
    expect(screen.queryByRole('button', { name: EN.passAndStart })).not.toBeInTheDocument()
  })
})

describe('the decision history', () => {
  const decision = {
    id: 5,
    decision: 'interview_required',
    rationale: 'The employer letter needs a conversation.',
    override_reason: null,
    screening_snapshot: { state: 'completed', screening_public_id: 'scr-1', fake_likelihood_percent: 30, score_out_of_10: 3, coverage: { documents_total: 4, read: 4 }, is_stale: false, employer_summary: { found_consistent: 1, found_inconsistent: 0, not_found_online: 2, ambiguous: 0, not_checked: 0 } },
    decided_by: { id: 3, name: 'Reviewer Example' },
    decided_at: '2026-10-14T09:00:00Z',
  }

  it('reads the decisions of the case and shows what staff saw when deciding', async () => {
    mocks.fetchRplScreeningDecisions.mockResolvedValue({ data: [decision] })
    render(<ScreeningDecisionHistory applicationId="case-41" canView language="en" />)

    expect(await screen.findByText('The employer letter needs a conversation.')).toBeInTheDocument()
    expect(mocks.fetchRplScreeningDecisions).toHaveBeenCalledWith('case-41')
    expect(screen.getByText(EN.decisions.interview_required)).toBeInTheDocument()
    expect(screen.getByText('Authenticity risk 30% (3/10)')).toBeInTheDocument()
    expect(screen.getByText(/1 consistent, 0 inconsistent, 2 not found online/)).toBeInTheDocument()
    expect(screen.getByText(/Reviewer Example/)).toBeInTheDocument()
  })

  it('is never requested without rpl.screening.view', async () => {
    const { container } = render(<ScreeningDecisionHistory applicationId="case-41" canView={false} language="en" />)

    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(mocks.fetchRplScreeningDecisions).not.toHaveBeenCalled()
    expect(container).toBeEmptyDOMElement()
  })

  it('disappears on a 403', async () => {
    mocks.fetchRplScreeningDecisions.mockRejectedValue({ response: { status: 403, data: { message: 'This action is unauthorized.' } } })
    const { container } = render(<ScreeningDecisionHistory applicationId="case-41" canView language="en" />)

    await waitFor(() => expect(mocks.fetchRplScreeningDecisions).toHaveBeenCalled())
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })

  it('renders in Arabic without a literal "undefined"', async () => {
    mocks.fetchRplScreeningDecisions.mockResolvedValue({ data: [decision] })
    render(<ScreeningDecisionHistory applicationId="case-41" canView language="ar" />)

    expect(await screen.findByText(AR.history)).toBeInTheDocument()
    expect(await screen.findByText(AR.decisions.interview_required)).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('undefined')
  })
})

describe('the card in Arabic', () => {
  it('renders every part without a literal "undefined"', () => {
    render(<ScreeningDecisionCard applicationId="case-41" status="evidence_verification" canDecide canViewScreening canStartAssessment screenings={[completedScreen({ is_stale: true })]} language="ar" />)

    fireEvent.click(screen.getByRole('radio', { name: new RegExp(AR.decisions.interview_required) }))
    expect(screen.getByText(AR.modes)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(AR.decisions.decline) }))
    expect(screen.getByText(AR.category)).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('undefined')
  })
})
