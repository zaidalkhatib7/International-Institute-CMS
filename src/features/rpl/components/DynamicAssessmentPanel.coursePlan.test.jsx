import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DynamicAssessmentPanel, { COPY } from './DynamicAssessmentPanel'
import { ENTRY_QUIZ_COPY } from '../domain/entryQuiz'
import { COURSE_PLAN_COPY } from '../domain/coursePlan'

/*
 * FROM THE MARKED ENTRY QUIZ TO THE COURSE PLAN (owner flow of 12 Oct 2026, P5).
 *
 * A passed or failed entry quiz leads to the course plan (7.1 D11: a failed
 * client gets the gap-closing courses), and the evaluation of the answers seeds
 * it. When the page gives the panel a way there, the result card and the final
 * evaluation offer it; a referred quiz decides nothing and offers nothing. A
 * callback, never a link: these components render without a router.
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

const OPEN = COURSE_PLAN_COPY.en.openPlan

function entryQuiz(result, overrides = {}) {
  const active = Array.from({ length: 2 }, (_, index) => ({
    id: 100 + index,
    status: 'approved',
    type: 'knowledge',
    prompt: { generated: `Question ${index + 1}` },
    options: [{ id: 'C', text: 'The governed answer' }],
    response: { selected_option_id: 'C' },
  }))
  return {
    id: 7,
    status: 'answered',
    time_limit_minutes: 25,
    issued_at: '2026-10-14T09:00:00Z',
    opened_at: '2026-10-14T09:05:00Z',
    answers_submitted_at: '2026-10-14T09:25:00Z',
    issued_snapshot: active.map((item) => ({ id: item.id })),
    final_evaluation: null,
    active_items: active,
    is_entry_quiz: true,
    scoring_policy: 'rpl_entry_quiz_pass_mark_v1',
    quiz_result: {
      scored_item_count: 2,
      correct_item_count: result === 'passed' ? 2 : 0,
      percent: result === 'passed' ? 100 : 0,
      pass_mark_applied: 50,
      pass_comparison: 'greater_than',
      result,
      referral_reason: result === 'referred' ? 'pass_mark_setting_missing' : null,
      scored_at: '2026-10-14T11:00:00Z',
      closed_by: 'all_answered',
      items: [],
    },
    ...overrides,
  }
}

function renderPanel(assessment, props = {}) {
  mocks.fetchDynamicAssessments.mockResolvedValue({ data: [{ id: assessment.id }] })
  mocks.fetchDynamicAssessment.mockResolvedValue({ data: assessment })

  return render(<DynamicAssessmentPanel assessmentId="12" language="en" evidence={[]} {...props} />)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('the way to the course plan', () => {
  it.each(['passed', 'failed'])('a %s result card opens the course plan', async (result) => {
    const onOpenCoursePlan = vi.fn()
    renderPanel(entryQuiz(result), { onOpenCoursePlan })

    const card = within(await screen.findByRole('region', { name: ENTRY_QUIZ_COPY.en.title }))
    fireEvent.click(card.getByRole('button', { name: OPEN }))
    expect(onOpenCoursePlan).toHaveBeenCalledTimes(1)
  })

  it('a referred result offers nothing: no result, no plan', async () => {
    renderPanel(entryQuiz('referred'), { onOpenCoursePlan: vi.fn() })

    const card = within(await screen.findByRole('region', { name: ENTRY_QUIZ_COPY.en.title }))
    expect(card.queryByRole('button', { name: OPEN })).not.toBeInTheDocument()
  })

  it('the final evaluation, which seeds the plan, opens it too', async () => {
    const onOpenCoursePlan = vi.fn()
    renderPanel(entryQuiz('passed', { final_evaluation: { advisory: { disclaimer: 'Advisory only.', evaluation_summary: 'The answers show a risk-analysis gap.' } } }), { onOpenCoursePlan })

    const block = (await screen.findByText(COPY.en.finalTitle)).parentElement
    fireEvent.click(within(block).getByRole('button', { name: OPEN }))
    expect(onOpenCoursePlan).toHaveBeenCalledTimes(1)
  })

  it('offers nothing when the page gives no way there', async () => {
    renderPanel(entryQuiz('passed', { final_evaluation: { advisory: { disclaimer: 'Advisory only.' } } }))

    await screen.findByText(COPY.en.finalTitle)
    expect(screen.queryByRole('button', { name: OPEN })).not.toBeInTheDocument()
  })
})
