import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import PublicationGatesPanel from './PublicationGatesPanel'

/*
 * These two gates are why no governed package was ever published: the write
 * endpoints existed and nothing called them. So what is worth testing is the
 * payload shaping — a form that posts the wrong shape fails in exactly the same
 * way as no form at all, only more confusingly.
 */

const mocks = vi.hoisted(() => ({
  proposeLearningTime: vi.fn(),
  approveLearningTime: vi.fn(),
  proposeAssessmentBlueprint: vi.fn(),
  approveAssessmentBlueprint: vi.fn(),
}))

vi.mock('../services/programsService', () => mocks)

const CATEGORIES = [
  'instruction', 'guided_examples', 'activities', 'case_work',
  'practice', 'formative_assessment', 'summative_assessment',
]

function gatesFixture(overrides = {}) {
  return {
    learning_time: {
      categories: CATEGORIES,
      allocation: null,
      status: null,
      approved_at: null,
      required_minutes: 1200,
      accredited_hours: 20,
      ...(overrides.learning_time || {}),
    },
    blueprint: overrides.blueprint === undefined ? null : overrides.blueprint,
    outcomes: overrides.outcomes || [
      { id: 1, code: 'LO-001', title: { en: 'First outcome' }, available: 8 },
      { id: 2, code: 'LO-002', title: { en: 'Second outcome' }, available: 5 },
    ],
    question_review: { total: 50, awaiting_review: 10, approved: 40 },
  }
}

/*
 * Two independent forms live in one card, so every query is scoped to its own
 * named region. An unscoped getByRole('button', {name: 'Save proposal'})
 * matches both, and the test would then pass or fail for the wrong section.
 */
function renderPanel(gates = gatesFixture(), onChanged = vi.fn()) {
  render(<PublicationGatesPanel programId={240} gates={gates} language="en" onChanged={onChanged} />)

  return {
    time: within(screen.getByRole('region', { name: 'Learning-time allocation' })),
    exam: within(screen.getByRole('region', { name: 'Assessment blueprint' })),
  }
}

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset().mockResolvedValue({}))
})

describe('PublicationGatesPanel', () => {
  it('shows the exact minute target, because approval is refused without it', () => {
    const { time } = renderPanel()
    // "defensible, not approximate" — 20 accredited hours means 1200 minutes.
    expect(time.getByText('Required: 1200 (20h)')).toBeInTheDocument()
    expect(time.getByText('Total: 0')).toBeInTheDocument()
    expect(time.getByText(/does not match/)).toBeInTheDocument()
  })

  it('stops warning once the minutes total the accredited hours exactly', () => {
    const { time } = renderPanel(
      gatesFixture({
        learning_time: {
          allocation: {
            instruction: 600, guided_examples: 200, activities: 100, case_work: 100,
            practice: 100, formative_assessment: 50, summative_assessment: 50,
          },
          status: 'proposed',
        },
      }),
    )
    expect(time.getByText('Total: 1200')).toBeInTheDocument()
    expect(time.queryByText(/does not match/)).toBeNull()
  })

  it('posts every category as a number, including the ones left blank', async () => {
    const { time } = renderPanel()

    fireEvent.change(time.getByLabelText('Instruction'), { target: { value: '1200' } })
    fireEvent.click(time.getByRole('button', { name: /Save proposal/ }))

    await waitFor(() => expect(mocks.proposeLearningTime).toHaveBeenCalled())
    const [programId, allocation] = mocks.proposeLearningTime.mock.calls[0]

    expect(programId).toBe(240)
    // The server validates EVERY category as non-negative numeric. An omitted
    // key or an empty string is refused for a box nobody typed in.
    expect(Object.keys(allocation).sort()).toEqual([...CATEGORIES].sort())
    expect(allocation.instruction).toBe(1200)
    expect(allocation.practice).toBe(0)
  })

  it('omits outcomes with no count, because the server requires min:1 per row', async () => {
    const { exam } = renderPanel()

    fireEvent.change(exam.getByLabelText('Total exam questions'), { target: { value: '30' } })
    fireEvent.change(exam.getByLabelText(/LO-001/), { target: { value: '30' } })
    // LO-002 deliberately left blank.
    fireEvent.click(exam.getByRole('button', { name: /Save proposal/ }))

    await waitFor(() => expect(mocks.proposeAssessmentBlueprint).toHaveBeenCalled())
    const [, payload] = mocks.proposeAssessmentBlueprint.mock.calls[0]

    expect(payload.total_questions).toBe(30)
    expect(payload.outcome_coverage).toEqual([{ outcome_code: 'LO-001', count: 30 }])
  })

  it('warns when an outcome is asked for more questions than the bank has approved', () => {
    /*
     * approve() checks only that the counts sum to total_questions — never that
     * the bank can supply them. An over-subscribed outcome therefore approves
     * cleanly and fails later when an exam is built, which is the worst place
     * to find out. LO-001 has 8 approved questions; asking for 9 must warn.
     */
    const { exam } = renderPanel()
    fireEvent.change(exam.getByLabelText('Total exam questions'), { target: { value: '9' } })
    fireEvent.change(exam.getByLabelText(/LO-001/), { target: { value: '9' } })

    expect(exam.getByText(/could not build an exam/)).toBeInTheDocument()
    expect(exam.getByText(/LO-001 \(8\)/)).toBeInTheDocument()
  })

  it('shows how many approved questions each outcome actually has', () => {
    const { exam } = renderPanel()
    expect(exam.getByLabelText(/LO-001 — First outcome \(8 available\)/)).toBeInTheDocument()
  })

  it('does not warn while coverage stays within what is available', () => {
    const { exam } = renderPanel()
    fireEvent.change(exam.getByLabelText('Total exam questions'), { target: { value: '8' } })
    fireEvent.change(exam.getByLabelText(/LO-001/), { target: { value: '8' } })

    expect(exam.queryByText(/could not build an exam/)).toBeNull()
  })

  it('warns when coverage does not sum to the total', () => {
    const { exam } = renderPanel()
    fireEvent.change(exam.getByLabelText('Total exam questions'), { target: { value: '30' } })
    fireEvent.change(exam.getByLabelText(/LO-001/), { target: { value: '10' } })

    expect(exam.getByText('Coverage sum: 10')).toBeInTheDocument()
    expect(exam.getByText(/does not match/)).toBeInTheDocument()
  })

  it('cannot approve a learning-time allocation that was never proposed', () => {
    const { time } = renderPanel()
    expect(time.getByRole('button', { name: 'Approve' })).toBeDisabled()
  })

  it('enables approval once the server reports the allocation as proposed', () => {
    const { time } = renderPanel(
      gatesFixture({ learning_time: { status: 'proposed', allocation: { instruction: 1200 } } }),
    )
    expect(time.getByRole('button', { name: 'Approve' })).not.toBeDisabled()
  })

  it('locks the fields once approved, so an approved gate is not silently edited', () => {
    const { time } = renderPanel(
      gatesFixture({ learning_time: { status: 'approved', allocation: { instruction: 1200 } } }),
    )
    expect(time.getByLabelText('Instruction')).toBeDisabled()
    // And that section's save/approve pair is gone entirely.
    expect(time.queryByRole('button', { name: /Save proposal/ })).toBeNull()
  })

  it('an approved gate stays correctable, because approval can be wrong', () => {
    /*
     * publish-package refuses a blueprint the bank cannot satisfy. An approved
     * blueprint can therefore be WRONG, and locking the fields left the only
     * screen that could fix it unable to. The server supports revision — upsert
     * opens a new blueprint version when the latest is approved.
     */
    const { exam } = renderPanel(
      gatesFixture({
        blueprint: { status: 'approved', version: 1, total_questions: 20, outcome_coverage: [] },
      }),
    )

    expect(exam.getByLabelText('Total exam questions')).toBeDisabled()
    fireEvent.click(exam.getByRole('button', { name: /Revise after approval/ }))

    expect(exam.getByLabelText('Total exam questions')).not.toBeDisabled()
    expect(exam.getByRole('button', { name: /Save proposal/ })).toBeInTheDocument()
  })

  it('says that revising opens a new version rather than editing the approved one', () => {
    const { exam } = renderPanel(
      gatesFixture({
        blueprint: { status: 'approved', version: 1, total_questions: 20, outcome_coverage: [] },
      }),
    )
    expect(exam.getByText(/opens a NEW blueprint version/)).toBeInTheDocument()
  })

  it('an approved learning-time allocation can be re-proposed too', () => {
    const { time } = renderPanel(
      gatesFixture({ learning_time: { status: 'approved', allocation: { instruction: 1200 } } }),
    )
    fireEvent.click(time.getByRole('button', { name: /Revise after approval/ }))
    expect(time.getByLabelText('Instruction')).not.toBeDisabled()
  })

  it('says so when there are no outcomes to build coverage from', () => {
    const { exam } = renderPanel(gatesFixture({ outcomes: [] }))
    expect(exam.getByText(/Approve the seed pack first/)).toBeInTheDocument()
  })

  it('renders nothing without a gates payload', () => {
    const { container } = render(
      <PublicationGatesPanel programId={240} gates={null} language="en" />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('reloads from the server after a successful write', async () => {
    const onChanged = vi.fn()
    const { time } = renderPanel(gatesFixture(), onChanged)

    fireEvent.click(time.getByRole('button', { name: /Save proposal/ }))
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
  })
})
