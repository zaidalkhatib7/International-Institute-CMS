import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DynamicAssessmentPanel, { COPY, GENERATION_POLL_MS } from './DynamicAssessmentPanel'

/*
 * A QUEUED GENERATION ON THE PANEL (review round 2, 17 Oct 2026).
 *
 * The server answers "generate" at once (202) and runs the model on its queue;
 * the set carries the run under `generation`. A set sent while that run was at
 * the model lost every question it was sent with when the run finished, and the
 * panel showed nothing of the run: Approve all and Send stayed enabled. Now the
 * panel says the run is queued or running, holds the controls of the questions it
 * will replace (the server refuses them too, generation_in_progress), reads the
 * set again until the run ends, and shows why a run ended without a draft.
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

const EN = COPY.en
const AR = COPY.ar

function items(count, status = 'approved') {
  return Array.from({ length: count }, (_, index) => ({
    id: 100 + index,
    status,
    type: 'knowledge',
    is_ai_generated: true,
    prompt: { generated: `Question ${index + 1}` },
    options: [{ id: 'A', text: 'One' }, { id: 'B', text: 'Two' }, { id: 'C', text: 'Three' }],
  }))
}

/** A draft set of 25 approved questions (one still pending), with the run `generation`. */
function draftSet(generation, overrides = {}) {
  const active = items(25)
  active[24] = { ...active[24], status: 'pending_review' }
  return { id: 7, status: 'pending_review', recommended_question_count: 25, active_items: active, generation, ...overrides }
}

function run(status, extra = {}) {
  return { kind: 'entry_quiz_draft', status, run_id: 'run-1', requested_at: '2026-10-17T10:00:00Z', started_at: status === 'queued' ? null : '2026-10-17T10:00:05Z', error: null, ...extra }
}

function renderPanel(sets, language = 'en') {
  mocks.fetchDynamicAssessments.mockResolvedValue({ data: [{ id: 7 }] })
  for (const set of sets) mocks.fetchDynamicAssessment.mockResolvedValueOnce({ data: set })
  mocks.fetchDynamicAssessment.mockResolvedValue({ data: sets[sets.length - 1] })

  return render(<DynamicAssessmentPanel assessmentId="12" language={language} evidence={[]} />)
}

const draftButtons = (copy = EN) => [
  screen.getByRole('button', { name: new RegExp(copy.regenerateAll) }),
  screen.getByRole('button', { name: new RegExp(copy.approveAll) }),
  ...screen.getAllByRole('button', { name: new RegExp(`^${copy.approve}$`) }),
  ...screen.getAllByRole('button', { name: new RegExp(`^${copy.edit}$`) }),
  ...screen.getAllByRole('button', { name: new RegExp(`^${copy.regenerate}$`) }),
  ...screen.getAllByRole('button', { name: new RegExp(`^${copy.reject}$`) }),
]

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('a generation the server is running', () => {
  it('says it is running and holds approve, edit, remove, regenerate, approve all and send until it ends', async () => {
    renderPanel([draftSet(run('running'))])

    expect(await screen.findByRole('status')).toHaveTextContent(EN.generationRunning)
    for (const button of draftButtons()) expect(button).toBeDisabled()
    // Reading stays open: the exports are not the run's.
    expect(screen.getByRole('button', { name: 'PDF' })).toBeEnabled()
  })

  it('holds the send of a set that is otherwise ready to go, and frees it once the run has ended', async () => {
    const ready = (generation) => draftSet(generation, { active_items: items(25) })
    const view = renderPanel([ready(run('running'))])
    expect(await screen.findByRole('status')).toHaveTextContent(EN.generationRunning)
    expect(screen.getByRole('button', { name: new RegExp(EN.send) })).toBeDisabled()
    view.unmount()

    renderPanel([ready(run('completed'))])
    expect(await screen.findByRole('button', { name: new RegExp(EN.send) })).toBeEnabled()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('says it is queued while the server has not started it, in Arabic too', async () => {
    renderPanel([draftSet(run('queued'))], 'ar')

    expect(await screen.findByRole('status')).toHaveTextContent(AR.generationQueued)
    for (const button of draftButtons(AR)) expect(button).toBeDisabled()
  })

  it('reads the set again until the run ends, then releases the controls and stops reading', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const finished = draftSet(run('completed', { finished_at: '2026-10-17T10:02:00Z' }), { active_items: items(25, 'pending_review') })
    renderPanel([draftSet(run('queued')), draftSet(run('running')), finished])

    expect(await screen.findByRole('status')).toHaveTextContent(EN.generationQueued)
    expect(mocks.fetchDynamicAssessment).toHaveBeenCalledTimes(1)

    await act(async () => { await vi.advanceTimersByTimeAsync(GENERATION_POLL_MS) })
    expect(mocks.fetchDynamicAssessment).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('status')).toHaveTextContent(EN.generationRunning)

    await act(async () => { await vi.advanceTimersByTimeAsync(GENERATION_POLL_MS) })
    expect(mocks.fetchDynamicAssessment).toHaveBeenCalledTimes(3)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: new RegExp(EN.approveAll) })).toBeEnabled()

    // Nothing is in flight any more: no further reads.
    await act(async () => { await vi.advanceTimersByTimeAsync(GENERATION_POLL_MS * 3) })
    expect(mocks.fetchDynamicAssessment).toHaveBeenCalledTimes(3)
  })

  it('a generate answered 202 is followed by the set, which shows the queued run', async () => {
    mocks.generateDynamicAssessmentDraft.mockResolvedValue({ message: 'Draft generation queued.', data: draftSet(run('queued')) })
    renderPanel([draftSet(null), draftSet(run('queued'))])

    fireEvent.click(await screen.findByRole('button', { name: new RegExp(EN.regenerateAll) }))

    expect(await screen.findByRole('status')).toHaveTextContent(EN.generationQueued)
    expect(mocks.generateDynamicAssessmentDraft).toHaveBeenCalledWith(7)
    expect(screen.getByRole('button', { name: new RegExp(EN.approveAll) })).toBeDisabled()
  })
})

describe('a generation that ended without a draft', () => {
  it('says so with the server\'s reason, and leaves the controls free', async () => {
    renderPanel([draftSet(run('failed', { error: { code: 'generation_overtaken', messages: ['The question set was sent to the applicant while the model was answering, so nothing it returned was saved; the set the applicant has is unchanged.'] } }))])

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(EN.generationFailed)
    expect(alert).toHaveTextContent('nothing it returned was saved')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: new RegExp(EN.approveAll) })).toBeEnabled()
    expect(screen.getByRole('button', { name: new RegExp(EN.regenerateAll) })).toBeEnabled()
  })

  it('an abandoned run reads as ended too, in Arabic', async () => {
    renderPanel([draftSet(run('abandoned', { error: { code: 'generation_abandoned', messages: ['The generation did not finish within 30 minutes.'] } }))], 'ar')

    expect(await screen.findByRole('alert')).toHaveTextContent(AR.generationFailed)
    expect(screen.getByRole('button', { name: new RegExp(AR.approveAll) })).toBeEnabled()
  })

  it('says nothing of a run once the set was sent', async () => {
    renderPanel([draftSet(run('failed', { error: { code: 'generation_error', messages: ['Stopped.'] } }), { status: 'issued', issued_at: '2026-10-17T10:05:00Z', time_limit_minutes: 25, issued_snapshot: [] })])

    await screen.findByText(EN.statusLabels.issued)
    expect(screen.queryByText(EN.generationFailed)).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

describe('the copy', () => {
  it('names the run in both languages and never the old admin name', () => {
    for (const copy of [EN, AR]) {
      for (const key of ['generationQueued', 'generationRunning', 'generationFailed']) {
        expect(copy[key]).toBeTruthy()
        expect(copy[key]).not.toMatch(/CMS/)
      }
    }
  })
})
