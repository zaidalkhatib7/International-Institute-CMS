import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DynamicAssessmentPanel, { COPY } from './DynamicAssessmentPanel'
import { ENTRY_QUIZ_COPY } from '../domain/entryQuiz'
import { formatLocalizedDateTime } from '../../../utils/localization'

/*
 * THE ENTRY QUIZ ON THE ADMINISTRATOR'S PANEL (owner flow of 12 Oct 2026, P4).
 *
 * The platform marks an entry quiz sent after P4 against the pass mark, more
 * than the mark on the exact fraction. The panel shows that frozen result, and
 * it carries the owner's one-attempt rule: a marked set never reopens, and an
 * opened set reopens only for a documented technical failure. A failed quiz
 * means no certificate route and a course plan, never a decline (D11).
 */

const mocks = vi.hoisted(() => ({
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

vi.mock('../services/rplService', () => mocks)

const EN = ENTRY_QUIZ_COPY.en
const AR = ENTRY_QUIZ_COPY.ar
// The server's stamp (RplQuizScoringService::POLICY).
const POLICY = 'rpl_entry_quiz_pass_mark_v1'
const SCORED_AT = '2026-10-14T11:00:00Z'

function items(count, answeredCount) {
  return Array.from({ length: count }, (_, index) => ({
    id: 100 + index,
    status: 'approved',
    type: 'knowledge',
    prompt: { generated: `Question ${index + 1}` },
    options: [{ id: 'C', text: 'The governed answer' }],
    response: index < answeredCount ? { selected_option_id: 'C' } : null,
  }))
}

/** A delivered entry quiz of 25 questions, as the admin set payload carries it after P4. */
function entryQuiz({ answeredCount = 25, ...overrides } = {}) {
  const active = items(25, answeredCount)
  return {
    id: 7,
    status: 'answered',
    time_limit_minutes: 25,
    issued_at: '2026-10-14T09:00:00Z',
    opened_at: '2026-10-14T09:05:00Z',
    due_at: '2026-10-14T09:30:00Z',
    answers_submitted_at: '2026-10-14T09:25:00Z',
    issued_snapshot: active.map((item) => ({ id: item.id })),
    final_evaluation: null,
    active_items: active,
    is_entry_quiz: true,
    scoring_policy: POLICY,
    quiz_result: null,
    ...overrides,
  }
}

/** quiz_result exactly as the contract fixes it. `marks` lists, per question, correct true|false|null or 'unanswered'. */
function quizResult({ correct, scored = 25, percent, result, marks, closedBy = 'all_answered', referralReason = null, passMark = 50 }) {
  return {
    scored_item_count: scored,
    correct_item_count: correct,
    percent,
    pass_mark_applied: passMark,
    pass_comparison: 'greater_than',
    result,
    referral_reason: referralReason,
    scored_at: SCORED_AT,
    closed_by: closedBy,
    items: marks.map((mark, index) => ({
      item_ref: 100 + index,
      answered: mark !== 'unanswered',
      correct: mark === 'unanswered' ? null : mark,
    })),
  }
}

function marksFor(correct, total = 25, { unanswered = 0, unmarkable = 0 } = {}) {
  return Array.from({ length: total }, (_, index) => {
    if (index < correct) return true
    if (index >= total - unanswered) return 'unanswered'
    if (index >= total - unanswered - unmarkable) return null
    return false
  })
}

function renderPanel(assessment, language = 'en') {
  mocks.fetchDynamicAssessments.mockResolvedValue({ data: assessment ? [{ id: assessment.id }] : [] })
  mocks.fetchDynamicAssessment.mockResolvedValue({ data: assessment })

  return render(<DynamicAssessmentPanel assessmentId="12" language={language} evidence={[]} />)
}

const card = async (copy = EN) => within(await screen.findByRole('region', { name: copy.title }))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('the result card of a marked entry quiz', () => {
  it('shows correct over scored, the percentage with two decimals, the pass mark as "more than", and how it closed', async () => {
    renderPanel(entryQuiz({ quiz_result: quizResult({ correct: 13, percent: 52, result: 'passed', marks: marksFor(13) }) }))

    const result = await card()
    expect(result.getByText('Correct answers: 13 of 25')).toBeInTheDocument()
    expect(result.getByText('52.00%')).toBeInTheDocument()
    expect(result.getByText(/Pass mark applied: more than 50%/)).toBeInTheDocument()
    expect(result.getByText('Exactly 50% does not pass.')).toBeInTheDocument()
    expect(result.getByText(EN.resultLabels.passed)).toBeInTheDocument()
    expect(result.getByText(EN.resultExplanation.passed)).toBeInTheDocument()
    expect(result.getByText(`${EN.closedByLabel}: ${EN.closedBy.all_answered}`)).toBeInTheDocument()
    expect(result.getByText(`${EN.scoredAt}: ${formatLocalizedDateTime(SCORED_AT, 'en')}`)).toBeInTheDocument()
    // An entry gate, never a competency finding (R24), and frozen against later edits.
    expect(result.getByText(EN.gateNote)).toBeInTheDocument()
    expect(result.getByText(EN.frozen)).toBeInTheDocument()
  })

  it('marks every question correct, incorrect, unanswered or without a key, numbered as the panel numbers them', async () => {
    const marks = marksFor(20, 25, { unanswered: 3, unmarkable: 1 })
    renderPanel(entryQuiz({
      answeredCount: 22,
      quiz_result: quizResult({ correct: 20, percent: 80, result: 'referred', referralReason: 'issued_item_without_answer_key', marks }),
    }))

    const list = within((await card()).getByRole('list', { name: EN.marksTitle }))
    const rows = list.getAllByRole('listitem')
    expect(rows).toHaveLength(25)
    expect(rows[0]).toHaveTextContent(`#1${EN.marks.correct}`)
    expect(rows[20]).toHaveTextContent(`#21${EN.marks.incorrect}`)
    expect(rows[21]).toHaveTextContent(`#22${EN.marks.unmarkable}`)
    expect(rows[24]).toHaveTextContent(`#25${EN.marks.unanswered}`)
    expect(list.getAllByText(EN.marks.correct)).toHaveLength(20)
    expect(list.getAllByText(EN.marks.unanswered)).toHaveLength(3)
  })

  it('marks each question in the list of answers too', async () => {
    renderPanel(entryQuiz({ quiz_result: quizResult({ correct: 24, percent: 96, result: 'passed', marks: marksFor(24) }) }))

    await card()
    const last = screen.getByText('Question 25').closest('article')
    expect(within(last).getByText(EN.marks.incorrect)).toBeInTheDocument()
    const first = screen.getByText('Question 1').closest('article')
    expect(within(first).getByText(EN.marks.correct)).toBeInTheDocument()
  })

  it('says plainly what a failed quiz means: no Experience Confirmation Certificate, a course plan, never a decline', async () => {
    renderPanel(entryQuiz({ quiz_result: quizResult({ correct: 12, percent: 48, result: 'failed', marks: marksFor(12) }) }))

    const result = await card()
    expect(result.getByText(EN.resultLabels.failed)).toBeInTheDocument()
    expect(result.getByText(EN.resultExplanation.failed)).toBeInTheDocument()
    expect(result.getByText(/no Experience Confirmation Certificate/)).toBeInTheDocument()
    expect(result.getByText(/course plan/)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: EN.title }).textContent).not.toMatch(/declin|reject/i)
  })

  it('shows a marking at exactly the pass mark as failed, the server\'s verdict, not a recount', async () => {
    renderPanel(entryQuiz({
      issued_snapshot: items(50, 50).map((item) => ({ id: item.id })),
      active_items: items(50, 50),
      quiz_result: quizResult({ correct: 25, scored: 50, percent: 50, result: 'failed', marks: marksFor(25, 50) }),
    }))

    const result = await card()
    expect(result.getByText('Correct answers: 25 of 50')).toBeInTheDocument()
    expect(result.getByText('50.00%')).toBeInTheDocument()
    expect(result.getByText(EN.resultLabels.failed)).toBeInTheDocument()
  })

  it('names why a quiz was referred, and shows no percentage the server did not send', async () => {
    renderPanel(entryQuiz({
      quiz_result: quizResult({ correct: 24, percent: null, result: 'referred', referralReason: 'pass_mark_setting_missing', passMark: null, marks: marksFor(24) }),
    }))

    const result = await card()
    expect(result.getByText(EN.resultLabels.referred)).toBeInTheDocument()
    expect(result.getByText(EN.resultExplanation.referred)).toBeInTheDocument()
    expect(result.getByText(`Why: ${EN.referralReasons.pass_mark_setting_missing}`)).toBeInTheDocument()
    expect(result.queryByText(/%/)).not.toBeInTheDocument()
  })

  it('renders in Arabic without "undefined", and the failed wording never says رفض', async () => {
    renderPanel(entryQuiz({ quiz_result: quizResult({ correct: 12, percent: 48, result: 'failed', marks: marksFor(12) }) }), 'ar')

    const result = await card(AR)
    expect(result.getByText(AR.resultLabels.failed)).toBeInTheDocument()
    expect(result.getByText(AR.resultExplanation.failed)).toBeInTheDocument()
    expect(result.getByText('48.00٪')).toBeInTheDocument()
    expect(result.getByText(/حد النجاح المطبَّق: أكثر من 50٪/)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: AR.title }).textContent).not.toMatch(/رفض/)
    expect(document.body.textContent).not.toContain('undefined')
  })
})

describe('an entry quiz that is not marked', () => {
  it('says "not scored" for a quiz sent before the pass mark (D21)', async () => {
    renderPanel(entryQuiz({ scoring_policy: null }))

    expect(await screen.findByText(EN.notScored)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: EN.title })).not.toBeInTheDocument()
  })

  it('says when and how it will be marked while it is still running', async () => {
    renderPanel(entryQuiz({ status: 'issued', answeredCount: 5, answers_submitted_at: null, due_at: '2099-01-01T00:00:00Z' }))

    expect(await screen.findByText(EN.awaiting)).toBeInTheDocument()
  })

  it('shows nothing about marking on a set that is not an entry quiz', async () => {
    renderPanel(entryQuiz({ is_entry_quiz: false, scoring_policy: null }))

    await screen.findByRole('region', { name: COPY.en.progressTitle })
    expect(screen.queryByText(EN.notScored)).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: EN.title })).not.toBeInTheDocument()
  })
})

describe('a quiz the timer closed (D11(i))', () => {
  const expiredAndMarked = () => entryQuiz({
    answeredCount: 20,
    answers_submitted_at: null,
    quiz_result: quizResult({ correct: 18, percent: 72, result: 'passed', closedBy: 'timer_expired', marks: marksFor(18, 25, { unanswered: 5 }) }),
  })

  it('says it closed on time, with unanswered questions counted as wrong', async () => {
    renderPanel(expiredAndMarked())

    expect((await card()).getByText(`${EN.closedByLabel}: ${EN.closedBy.timer_expired}`)).toBeInTheDocument()
  })

  it('counts as heard: the final evaluation opens although five questions are unanswered (R8 exception)', async () => {
    renderPanel(expiredAndMarked())

    const button = await screen.findByRole('button', { name: /Final advisory evaluation/ })
    expect(button).toBeEnabled()
    expect(screen.queryByText(COPY.en.finalBlocked)).not.toBeInTheDocument()
    expect(screen.getByText(EN.heardAtExpiry)).toBeInTheDocument()
    expect(screen.queryByText(COPY.en.progressIncomplete)).not.toBeInTheDocument()
  })
})

describe('one attempt only: reopening (owner, 12 Oct 2026)', () => {
  const expiredUnmarked = () => entryQuiz({
    status: 'issued',
    answeredCount: 9,
    answers_submitted_at: null,
    due_at: '2026-10-14T09:30:00Z',
  })

  it('never offers to reopen a marked quiz, even one with questions outstanding', async () => {
    renderPanel(entryQuiz({
      answeredCount: 9,
      quiz_result: quizResult({ correct: 5, percent: 20, result: 'failed', marks: marksFor(5, 25, { unanswered: 16 }) }),
    }))

    await card()
    expect(screen.queryByRole('region', { name: COPY.en.reissueTitle })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: COPY.en.reissue })).not.toBeInTheDocument()
  })

  it('asks for the technical failure on an opened set, and sends both reasons', async () => {
    renderPanel(expiredUnmarked())
    mocks.reissueDynamicAssessment.mockResolvedValue({ data: {} })

    const section = within(await screen.findByRole('region', { name: COPY.en.reissueTitle }))
    expect(section.getByText(EN.reopenOpenedRule)).toBeInTheDocument()
    fireEvent.click(section.getByRole('button', { name: COPY.en.reissue }))

    const confirm = screen.getByRole('button', { name: COPY.en.reissueConfirm })
    fireEvent.change(screen.getByLabelText(COPY.en.reissueReason), { target: { value: 'Platform outage.' } })
    // The reason alone is not enough once the applicant opened the quiz.
    expect(confirm).toBeDisabled()

    const technical = screen.getByLabelText(EN.technicalFailureReason)
    expect(technical).toHaveAttribute('maxLength', '2000')
    fireEvent.change(technical, { target: { value: 'Too short' } })
    expect(confirm).toBeDisabled()

    fireEvent.change(technical, { target: { value: '  The platform was unavailable from 10:05 to 10:40.  ' } })
    expect(confirm).toBeEnabled()
    fireEvent.click(confirm)

    await waitFor(() => expect(mocks.reissueDynamicAssessment).toHaveBeenCalledTimes(1))
    expect(mocks.reissueDynamicAssessment.mock.calls[0]).toEqual([
      7,
      { reason: 'Platform outage.', technical_failure_reason: 'The platform was unavailable from 10:05 to 10:40.' },
    ])
    expect(await screen.findByText(COPY.en.reissueDone)).toBeInTheDocument()
  })

  it('offers the technical-failure reopen while the window is still running, and sends both reasons (E2E-J05-1)', async () => {
    renderPanel(entryQuiz({ status: 'issued', answeredCount: 5, answers_submitted_at: null, opened_at: '2026-10-14T09:05:00Z', due_at: '2099-01-01T00:00:00Z' }))
    mocks.reissueDynamicAssessment.mockResolvedValue({ data: {} })

    const section = within(await screen.findByRole('region', { name: COPY.en.reissueTitle }))
    expect(section.getByText(COPY.en.reissueWhyRunning)).toBeInTheDocument()
    expect(section.getByText(EN.reopenOpenedRule)).toBeInTheDocument()
    fireEvent.click(section.getByRole('button', { name: COPY.en.reissue }))
    fireEvent.change(screen.getByLabelText(COPY.en.reissueReason), { target: { value: 'Power cut reported by phone.' } })
    const confirm = screen.getByRole('button', { name: COPY.en.reissueConfirm })
    expect(confirm).toBeDisabled()
    fireEvent.change(screen.getByLabelText(EN.technicalFailureReason), { target: { value: 'Power cut in the district from minute 3, confirmed by phone.' } })
    fireEvent.click(confirm)

    await waitFor(() => expect(mocks.reissueDynamicAssessment).toHaveBeenCalledTimes(1))
    expect(mocks.reissueDynamicAssessment.mock.calls[0]).toEqual([
      7,
      { reason: 'Power cut reported by phone.', technical_failure_reason: 'Power cut in the district from minute 3, confirmed by phone.' },
    ])
  })

  it('does not offer the running-window reopen on a set sent before the pass-mark policy', async () => {
    renderPanel(entryQuiz({ status: 'issued', answeredCount: 5, answers_submitted_at: null, opened_at: '2026-10-14T09:05:00Z', due_at: '2099-01-01T00:00:00Z', scoring_policy: null }))

    await screen.findByRole('region', { name: COPY.en.progressTitle })
    expect(screen.queryByRole('region', { name: COPY.en.reissueTitle })).not.toBeInTheDocument()
  })

  it('sends the reason alone for a set nobody opened, and asks for no technical failure', async () => {
    renderPanel(entryQuiz({ status: 'issued', answeredCount: 0, answers_submitted_at: null, opened_at: null, due_at: null }))
    mocks.reissueDynamicAssessment.mockResolvedValue({ data: {} })

    fireEvent.click(await screen.findByRole('button', { name: COPY.en.reissue }))
    expect(screen.queryByLabelText(EN.technicalFailureReason)).not.toBeInTheDocument()
    expect(screen.queryByText(EN.reopenOpenedRule)).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(COPY.en.reissueReason), { target: { value: 'Never opened.' } })
    fireEvent.click(screen.getByRole('button', { name: COPY.en.reissueConfirm }))

    await waitFor(() => expect(mocks.reissueDynamicAssessment).toHaveBeenCalledTimes(1))
    expect(mocks.reissueDynamicAssessment.mock.calls[0]).toEqual([7, { reason: 'Never opened.' }])
  })

  it('shows the server\'s refusal (422 errors.set)', async () => {
    const refusal = 'This entry quiz was opened by the applicant; it can be reopened only for a documented technical failure.'
    renderPanel(expiredUnmarked())
    mocks.reissueDynamicAssessment.mockRejectedValue({
      response: { status: 422, data: { message: refusal, errors: { set: [refusal] } } },
    })

    fireEvent.click(await screen.findByRole('button', { name: COPY.en.reissue }))
    fireEvent.change(screen.getByLabelText(COPY.en.reissueReason), { target: { value: 'Platform outage.' } })
    fireEvent.change(screen.getByLabelText(EN.technicalFailureReason), { target: { value: 'The platform was unavailable for 35 minutes.' } })
    fireEvent.click(screen.getByRole('button', { name: COPY.en.reissueConfirm }))

    expect(await screen.findByRole('alert')).toHaveTextContent(refusal)
  })

  it('renders the reopen rule in Arabic without "undefined"', async () => {
    renderPanel(expiredUnmarked(), 'ar')

    expect(await screen.findByText(AR.reopenOpenedRule)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: COPY.ar.reissue }))
    expect(screen.getByLabelText(AR.technicalFailureReason)).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('undefined')
  })
})

describe('one live entry quiz per application', () => {
  it('shows the server\'s refusal of a second entry quiz (422 errors.application)', async () => {
    const refusal = 'This application already has a live entry quiz on another assessment; withdraw it before creating a new one.'
    renderPanel(null)
    mocks.createDynamicAssessment.mockRejectedValue({
      response: { status: 422, data: { message: refusal, errors: { application: [refusal] } } },
    })

    fireEvent.click(await screen.findByRole('button', { name: /Create the entry quiz/ }))

    await waitFor(() => expect(mocks.createDynamicAssessment).toHaveBeenCalledWith('12'))
    expect(await screen.findByRole('alert')).toHaveTextContent(refusal)
  })
})

describe('one attempt only: a reopened attempt, and a quiz sent before the pass mark', () => {
  it('still asks for the technical failure after one technical reopen (opened_at cleared, first_opened_at kept)', async () => {
    // What the server leaves after a technical reopen: the set reads as never
    // opened, but it is still the one attempt, and the server refuses a plain
    // reopen (422 errors.set) unless technical_failure_reason is sent.
    renderPanel(entryQuiz({
      status: 'issued',
      answeredCount: 9,
      answers_submitted_at: null,
      opened_at: null,
      due_at: null,
      first_opened_at: '2026-08-01T09:05:00Z',
    }))
    mocks.reissueDynamicAssessment.mockResolvedValue({ data: {} })

    const section = within(await screen.findByRole('region', { name: COPY.en.reissueTitle }))
    expect(section.getByText(EN.reopenOpenedRule)).toBeInTheDocument()
    fireEvent.click(section.getByRole('button', { name: COPY.en.reissue }))
    fireEvent.change(screen.getByLabelText(COPY.en.reissueReason), { target: { value: 'Second outage.' } })
    const confirm = screen.getByRole('button', { name: COPY.en.reissueConfirm })
    expect(confirm).toBeDisabled()
    fireEvent.change(screen.getByLabelText(EN.technicalFailureReason), {
      target: { value: 'The platform was down again from 11:00 to 11:20.' },
    })
    fireEvent.click(confirm)

    await waitFor(() => expect(mocks.reissueDynamicAssessment).toHaveBeenCalledTimes(1))
    expect(mocks.reissueDynamicAssessment.mock.calls[0]).toEqual([
      7,
      { reason: 'Second outage.', technical_failure_reason: 'The platform was down again from 11:00 to 11:20.' },
    ])
  })

  it('keeps today\'s reopen on an opened quiz sent before the pass mark: the reason alone (D21(a))', async () => {
    renderPanel(entryQuiz({
      status: 'issued',
      answeredCount: 9,
      answers_submitted_at: null,
      scoring_policy: null,
      opened_at: '2026-08-01T09:05:00Z',
      due_at: '2026-08-01T09:30:00Z',
    }))
    mocks.reissueDynamicAssessment.mockResolvedValue({ data: {} })

    fireEvent.click(await screen.findByRole('button', { name: COPY.en.reissue }))
    expect(screen.queryByLabelText(EN.technicalFailureReason)).not.toBeInTheDocument()
    expect(screen.queryByText(EN.reopenOpenedRule)).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(COPY.en.reissueReason), { target: { value: 'More time.' } })
    fireEvent.click(screen.getByRole('button', { name: COPY.en.reissueConfirm }))

    await waitFor(() => expect(mocks.reissueDynamicAssessment).toHaveBeenCalledTimes(1))
    expect(mocks.reissueDynamicAssessment.mock.calls[0]).toEqual([7, { reason: 'More time.' }])
  })
})

describe('one attempt only: withdrawing (owner, 12 Oct 2026)', () => {
  it.each([
    ['opened and still running', { opened_at: '2026-08-01T09:05:00Z', due_at: '2099-01-01T00:00:00Z' }],
    ['opened and past its time, before the timer close', { opened_at: '2026-08-01T09:05:00Z', due_at: '2026-08-01T09:30:00Z' }],
    ['reopened after a technical failure', { opened_at: null, due_at: null, first_opened_at: '2026-08-01T09:05:00Z' }],
  ])('does not offer to withdraw a quiz the applicant has %s, and says why', async (_, opened) => {
    renderPanel(entryQuiz({ status: 'issued', answeredCount: 3, answers_submitted_at: null, ...opened }))

    expect(await screen.findByText(EN.withdrawBlockedOpened)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: COPY.en.withdrawTitle })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: COPY.en.withdraw })).not.toBeInTheDocument()
    expect(mocks.cancelDynamicAssessment).not.toHaveBeenCalled()
  })

  it.each([
    ['nobody opened', { answeredCount: 0, opened_at: null, due_at: null }],
    ['was sent before the pass mark (D21(a))', { answeredCount: 3, scoring_policy: null, due_at: '2099-01-01T00:00:00Z' }],
  ])('still offers to withdraw a quiz that %s', async (_, shape) => {
    renderPanel(entryQuiz({ status: 'issued', answers_submitted_at: null, ...shape }))

    expect(await screen.findByRole('region', { name: COPY.en.withdrawTitle })).toBeInTheDocument()
    expect(screen.queryByText(EN.withdrawBlockedOpened)).not.toBeInTheDocument()
  })
})

describe('a referred quiz, marked again once its cause is fixed', () => {
  const referred = () => entryQuiz({
    quiz_result: quizResult({
      correct: 24,
      percent: null,
      result: 'referred',
      referralReason: 'pass_mark_setting_missing',
      passMark: null,
      marks: marksFor(24),
    }),
  })

  it('offers to mark it again with a reason of 10 to 2000 characters, and sends it trimmed', async () => {
    renderPanel(referred())
    mocks.rescoreDynamicAssessment.mockResolvedValue({ data: {} })

    const section = within(await screen.findByRole('region', { name: EN.rescoreTitle }))
    expect(section.getByText(EN.rescoreWhy)).toBeInTheDocument()
    fireEvent.click(section.getByRole('button', { name: EN.rescore }))

    const confirm = screen.getByRole('button', { name: EN.rescoreConfirm })
    expect(confirm).toBeDisabled()
    const reason = screen.getByLabelText(EN.rescoreReason)
    expect(reason).toHaveAttribute('maxLength', '2000')
    fireEvent.change(reason, { target: { value: 'Too short' } })
    expect(confirm).toBeDisabled()
    fireEvent.change(reason, { target: { value: '  The pass mark setting was restored to 50.  ' } })
    expect(confirm).toBeEnabled()
    fireEvent.click(confirm)

    await waitFor(() => expect(mocks.rescoreDynamicAssessment).toHaveBeenCalledTimes(1))
    expect(mocks.rescoreDynamicAssessment.mock.calls[0]).toEqual([7, { reason: 'The pass mark setting was restored to 50.' }])
    expect(await screen.findByText(EN.rescoreDone)).toBeInTheDocument()
  })

  it('shows the server\'s refusal while the cause is still there (422 errors.set)', async () => {
    const refusal = 'The platform still cannot mark this entry quiz (pass_mark_setting_missing). Fix the cause first.'
    renderPanel(referred())
    mocks.rescoreDynamicAssessment.mockRejectedValue({
      response: { status: 422, data: { message: refusal, errors: { set: [refusal] } } },
    })

    fireEvent.click(await screen.findByRole('button', { name: EN.rescore }))
    fireEvent.change(screen.getByLabelText(EN.rescoreReason), { target: { value: 'The pass mark was restored.' } })
    fireEvent.click(screen.getByRole('button', { name: EN.rescoreConfirm }))

    expect(await screen.findByRole('alert')).toHaveTextContent(refusal)
  })

  it.each([
    ['passed', 13, 52],
    ['failed', 12, 48],
  ])('never offers it on a %s result, which is frozen', async (result, correct, percent) => {
    renderPanel(entryQuiz({ quiz_result: quizResult({ correct, percent, result, marks: marksFor(correct) }) }))

    await card()
    expect(screen.queryByRole('region', { name: EN.rescoreTitle })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: EN.rescore })).not.toBeInTheDocument()
  })

  it('names the referral and the action in Arabic, with no English words for the code', async () => {
    renderPanel(referred(), 'ar')

    const result = await card(AR)
    expect(result.getByText(`السبب: ${AR.referralReasons.pass_mark_setting_missing}`)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: AR.rescoreTitle })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: AR.rescore })).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('pass mark setting missing')
    expect(document.body.textContent).not.toContain('undefined')
  })
})

/*
 * F4: A CLOSED CASE REOPENS NOTHING (follow-up fix of 17 Oct 2026). The server
 * refuses a reopen once the case is completed, withdrawn or rejected; the show
 * payload carries application.status, so the panel offers no reopen there and
 * says why. An opened quiz is still marked by the timer.
 */
describe('a closed case reopens nothing', () => {
  const expiredUnmarked = (overrides = {}) => entryQuiz({
    status: 'issued',
    answeredCount: 9,
    answers_submitted_at: null,
    due_at: '2026-10-14T09:30:00Z',
    ...overrides,
  })
  const neverOpened = (overrides = {}) => entryQuiz({ status: 'issued', answeredCount: 0, answers_submitted_at: null, opened_at: null, due_at: null, ...overrides })

  it.each(['rejected', 'withdrawn', 'completed'])('offers no reopen on an opened, unmarked quiz when the case is %s, and says why', async (status) => {
    renderPanel(expiredUnmarked({ application: { id: 12, status } }))

    expect(await screen.findByText(COPY.en.reissueClosedCase)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: COPY.en.reissueTitle })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: COPY.en.reissue })).not.toBeInTheDocument()
    expect(screen.getByText(COPY.en.reissueClosedCase)).toBeInTheDocument()
    expect(mocks.reissueDynamicAssessment).not.toHaveBeenCalled()
  })

  it.each(['rejected', 'withdrawn', 'completed'])('offers no reopen on a set never opened when the case is %s', async (status) => {
    renderPanel(neverOpened({ application: { id: 12, status } }))

    expect(await screen.findByText(COPY.en.reissueClosedCase)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: COPY.en.reissue })).not.toBeInTheDocument()
    expect(screen.getByText(COPY.en.reissueClosedCase)).toBeInTheDocument()
  })

  it('still offers the reopen, with the technical-failure field, on an open case', async () => {
    renderPanel(expiredUnmarked({ application: { id: 12, status: 'evidence_verification' } }))

    const section = within(await screen.findByRole('region', { name: COPY.en.reissueTitle }))
    fireEvent.click(section.getByRole('button', { name: COPY.en.reissue }))
    expect(screen.getByLabelText(EN.technicalFailureReason)).toBeInTheDocument()
    expect(screen.queryByText(COPY.en.reissueClosedCase)).not.toBeInTheDocument()
  })

  it('reads the set again when the server refuses the reopen (the case closed meanwhile)', async () => {
    renderPanel(neverOpened({ application: { id: 12, status: 'evidence_verification' } }))
    mocks.reissueDynamicAssessment.mockRejectedValue({ response: { status: 422, data: { message: 'The case is closed; nothing is reopened for the applicant.', errors: { application: ['The case is closed; nothing is reopened for the applicant.'] } } } })

    fireEvent.click(await screen.findByRole('button', { name: COPY.en.reissue }))
    fireEvent.change(screen.getByLabelText(COPY.en.reissueReason), { target: { value: 'Never opened.' } })
    mocks.fetchDynamicAssessment.mockResolvedValue({ data: neverOpened({ application: { id: 12, status: 'rejected' } }) })
    fireEvent.click(screen.getByRole('button', { name: COPY.en.reissueConfirm }))

    expect(await screen.findByRole('alert')).toHaveTextContent('The case is closed; nothing is reopened for the applicant.')
    expect(await screen.findByText(COPY.en.reissueClosedCase)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: COPY.en.reissue })).not.toBeInTheDocument()
  })

  it('says it in Arabic without a literal "undefined"', async () => {
    renderPanel(expiredUnmarked({ application: { id: 12, status: 'rejected' } }), 'ar')

    expect(await screen.findByText(COPY.ar.reissueClosedCase)).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('undefined')
  })
})
