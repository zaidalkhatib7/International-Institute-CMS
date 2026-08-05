import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProgramQuestionBankPage from './ProgramQuestionBankPage'

/*
 * Review is the most expensive interaction in the platform: 100–300 questions
 * per unit, across a hundred programmes, and until now each approval meant
 * opening the per-unit builder to find the question.
 *
 * Bulk approval was added on 5 Aug 2026 by owner decision, after the cost was
 * put to them: a single operator cannot judge tens of thousands of questions
 * individually, and the alternative was packages that never publish. It does
 * not relax eligibility, and every event it writes is marked as NOT
 * individually reviewed.
 *
 * So these tests cover both routes — that one review is fast and honest, and
 * that the bulk route says what it is.
 */

const mocks = vi.hoisted(() => ({
  fetchProgramQuestionBank: vi.fn(),
  approveQuestion: vi.fn(),
  rejectQuestion: vi.fn(),
  approveAllQuestions: vi.fn(),
  fetchAdminPrograms: vi.fn(),
}))

vi.mock('../services/quizzesService', () => ({
  fetchProgramQuestionBank: mocks.fetchProgramQuestionBank,
  approveQuestion: mocks.approveQuestion,
  rejectQuestion: mocks.rejectQuestion,
  approveAllQuestions: mocks.approveAllQuestions,
}))

vi.mock('../../programs/services/programsService', () => ({
  fetchAdminPrograms: mocks.fetchAdminPrograms,
}))

const COMPLETE = {
  format: 'MCQ_SINGLE', context: 'SCENARIO_BASED',
  cognitive_demand: 'APPLY', difficulty: 'intermediate',
}

function bank(questions) {
  return {
    data: {
      program_id: 240,
      total: questions.length,
      by_review_status: questions.reduce((acc, q) => ({ ...acc, [q.review_status]: (acc[q.review_status] || 0) + 1 }), {}),
      by_difficulty: {},
      by_cognitive_demand: {},
      by_unit: { 12: questions.length },
      units: [{ id: 12, title: { en: 'Unit one', ar: 'وحدة' } }],
      questions,
    },
  }
}

function question(overrides = {}) {
  return {
    id: 481,
    question_text: { en: 'What is the answer?', ar: 'ما الجواب؟' },
    review_status: 'ai_draft',
    answer_rationale: {},
    unit_id: 12,
    unit_title: { en: 'Unit one', ar: 'وحدة' },
    learning_outcome_code: 'LO-01',
    options: [{ id: 1, text: { en: 'Yes' }, is_correct: true, sort_order: 1 }],
    ...COMPLETE,
    ...overrides,
  }
}

async function renderWithCourse(payload) {
  mocks.fetchAdminPrograms.mockResolvedValue({
    data: [{ id: 240, official_code: 'CGP-LED-007', title: { en: 'Leadership', ar: 'القيادة' } }],
  })
  mocks.fetchProgramQuestionBank.mockResolvedValue(payload)

  render(<ProgramQuestionBankPage />)
  await waitFor(() => expect(mocks.fetchAdminPrograms).toHaveBeenCalled())

  // CoursePicker is a search field: type a code, Enter commits a single match.
  const search = document.querySelector('input:not([type="number"])')
  fireEvent.change(search, { target: { value: 'CGP-LED-007' } })
  fireEvent.keyDown(search, { key: 'Enter' })

  await waitFor(() => expect(mocks.fetchProgramQuestionBank).toHaveBeenCalledWith('240'))
}

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset())
  mocks.approveQuestion.mockResolvedValue({})
  mocks.rejectQuestion.mockResolvedValue({})
  mocks.approveAllQuestions.mockResolvedValue({ data: { approved_count: 2, skipped_count: 0 } })
})

describe('ProgramQuestionBankPage — review in place', () => {
  it('approves a question without leaving the bank', async () => {
    await renderWithCourse(bank([question()]))

    fireEvent.click(await screen.findByRole('button', { name: /^(Approve|اعتماد)$/ }))

    await waitFor(() => expect(mocks.approveQuestion).toHaveBeenCalledWith(481))
    // The bank re-reads, so the counts and the badge reflect the decision.
    await waitFor(() => expect(mocks.fetchProgramQuestionBank).toHaveBeenCalledTimes(2))
  })

  it('refuses to offer approval when the taxonomy is incomplete', async () => {
    /*
     * The server throws "Approval requires complete taxonomy". Discovering that
     * by clicking, on question 200 of 300, is the wrong place to learn it.
     */
    await renderWithCourse(bank([question({ cognitive_demand: null, difficulty: null })]))

    const approve = await screen.findByRole('button', { name: /^(Approve|اعتماد)$/ })
    expect(approve).toBeDisabled()
    expect(screen.getByText(/cognitive_demand, difficulty/)).toBeInTheDocument()
  })

  it('records a rejection reason, and does nothing if the prompt is cancelled', async () => {
    await renderWithCourse(bank([question()]))

    vi.spyOn(window, 'prompt').mockReturnValueOnce(null)
    fireEvent.click(await screen.findByRole('button', { name: /Reject|رفض/ }))
    expect(mocks.rejectQuestion).not.toHaveBeenCalled()

    vi.spyOn(window, 'prompt').mockReturnValueOnce('Ambiguous stem.')
    fireEvent.click(screen.getByRole('button', { name: /Reject|رفض/ }))
    await waitFor(() => expect(mocks.rejectQuestion).toHaveBeenCalledWith(481, 'Ambiguous stem.'))
  })

  it('reads the write ceiling as a pause, not as lost work', async () => {
    // 30 writes a minute is the admin-write limit; reviewing at speed meets it.
    mocks.approveQuestion.mockRejectedValue({ response: { status: 429, data: {} } })
    await renderWithCourse(bank([question()]))

    fireEvent.click(await screen.findByRole('button', { name: /^(Approve|اعتماد)$/ }))

    expect(await screen.findByText(/30 per minute|٣٠ في الدقيقة/)).toBeInTheDocument()
  })

  it('shows review progress and offers a way into the queue', async () => {
    await renderWithCourse(bank([
      question({ id: 1, review_status: 'approved' }),
      question({ id: 2, review_status: 'ai_draft' }),
    ]))

    expect(await screen.findByText(/1\/2/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Show only what awaits review|اعرض ما ينتظر المراجعة فقط/ })).toBeInTheDocument()
  })

  it('warns that bulk approval is recorded as NOT individually reviewed', async () => {
    /*
     * Owner decision, 5 Aug 2026. The control exists because a single operator
     * cannot review 100-300 questions per unit across a hundred programmes. The
     * confirm has to say what the trail will say, so the person clicking knows
     * what they are signing.
     */
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(window, 'prompt').mockReturnValue('Bank-level review before release.')

    await renderWithCourse(bank([question({ id: 1 }), question({ id: 2 })]))
    fireEvent.click(await screen.findByRole('button', { name: /Approve all questions|اعتماد كل الأسئلة/ }))

    expect(confirm.mock.calls[0][0]).toMatch(/NOT individually reviewed|لم تُراجَع فرديًا/)
    await waitFor(() => expect(mocks.approveAllQuestions).toHaveBeenCalledWith('240', 'Bank-level review before release.'))
  })

  it('does not bulk approve when the basis prompt is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(window, 'prompt').mockReturnValue(null)

    await renderWithCourse(bank([question()]))
    fireEvent.click(await screen.findByRole('button', { name: /Approve all questions|اعتماد كل الأسئلة/ }))

    expect(mocks.approveAllQuestions).not.toHaveBeenCalled()
  })

  it('reports what was skipped, so an ineligible question is not assumed approved', async () => {
    mocks.approveAllQuestions.mockResolvedValue({ data: { approved_count: 8, skipped_count: 2 } })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(window, 'prompt').mockReturnValue('Bank-level review before release.')

    await renderWithCourse(bank([question()]))
    fireEvent.click(await screen.findByRole('button', { name: /Approve all questions|اعتماد كل الأسئلة/ }))

    expect(await screen.findByText(/8 approved · 2 skipped|اعتُمد 8/)).toBeInTheDocument()
  })

  it('says so when nothing is left to review, instead of an empty warning', async () => {
    await renderWithCourse(bank([question({ review_status: 'approved' })]))

    expect(await screen.findByText(/Every question has been reviewed|كل الأسئلة روجعت/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^(Approve|اعتماد)$/ })).toBeNull()
  })
})
