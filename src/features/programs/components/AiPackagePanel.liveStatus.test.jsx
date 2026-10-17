import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AiPackagePanel from './AiPackagePanel'

/*
 * WHY THE COUNTERS STOPPED (incident of 17 Oct 2026).
 *
 * Eight packages were queued on the one ai-imports worker. Run 24 failed on
 * invalid JSON from Gemini and was released behind every package queued before
 * it; the live progress block kept showing 197 / 400 for about four hours and
 * said nothing about why. The status payload now carries last_error, retrying,
 * attempt {current, max, scope} and queue {running, position, ahead, ...}; these
 * tests pin what the panel says for each, in Arabic and English, and that it
 * says nothing extra when the server reports nothing. The fixtures are the
 * shapes ProgramAiAuthoringController::whyProgressStopped and
 * AuthoringQueueInspector::locate actually send (a review on 17 Oct 2026 found
 * the first fixtures used field names the server never sends).
 */

const mocks = vi.hoisted(() => ({
  fetchAiPackageStatus: vi.fn(),
  language: { current: 'en' },
}))

vi.mock('../services/programsService', () => ({
  authorizeGeneration: vi.fn(),
  revokeGenerationAuthorization: vi.fn(),
  downloadPackagePdf: vi.fn(),
  fetchAiPackageStatus: mocks.fetchAiPackageStatus,
  generateAiPackage: vi.fn(),
  openNewPackageVersion: vi.fn(),
  publishTrainingPackage: vi.fn(),
  regenerateAiPackageComponent: vi.fn(),
  rejectAiPackage: vi.fn(),
  resolveAiPackageSource: vi.fn(),
}))

vi.mock('../../../utils/localization', () => ({
  getCurrentLanguage: () => mocks.language.current,
}))

vi.mock('./PublicationGatesPanel', () => ({ default: () => null }))

const ERROR_503 = 'Gemini HTTP 503 for QUESTION_BANK_BATCH'

const COPY = {
  en: {
    retrying: 'Gemini did not answer properly — retrying automatically',
    queued: (n) => `Waiting in the queue — ${n} package(s) ahead`,
    lastError: (text) => `Last error: ${text}`,
    counter: 'Questions: 197 / 400',
  },
  ar: {
    retrying: 'تعذّر الرد من Gemini مؤقتًا — إعادة المحاولة تلقائيًا',
    queued: (n) => `في قائمة الانتظار — قبلها ${n} حزمة`,
    lastError: (text) => `آخر خطأ: ${text}`,
    counter: 'الأسئلة: 197 / 400',
  },
}

const ATTEMPT = {
  en: (n, m) => `(attempt ${n} of ${m})`,
  ar: (n, m) => `(المحاولة ${n} من ${m})`,
}

// data.progress.queue as AuthoringQueueInspector::locate sends it (database
// driver). The job the worker is holding: running, no position, nothing ahead.
function runningJob(overrides = {}) {
  return {
    connection: 'database',
    queue: 'ai-imports',
    job_id: 412,
    running: true,
    position: null,
    ahead: 0,
    attempts: 1,
    available_at: '2026-10-17T15:36:02+00:00',
    ...overrides,
  }
}

// A job row nobody is holding: waiting for a worker (attempts 0) or released
// after a failed attempt (attempts > 0).
function waitingJob(position, overrides = {}) {
  return runningJob({ running: false, position, ahead: position - 1, attempts: 0, ...overrides })
}

// data.progress.attempt for an in-place retry, as whyProgressStopped sends it.
function stepAttempt(current, max = 5) {
  return { current, max, scope: 'step', step: 'question_bank', resumes_at: '2026-10-17T15:59:30+00:00' }
}

// The shape ProgramAiAuthoringController::show returns while a run is live.
function statusPayload({ progress = {}, top = {}, runStatus = 'generating', aiStatus = 'ai_generating' } = {}) {
  return {
    data: {
      program_id: 77,
      program_title: { en: 'Leading teams' },
      package_version: '1.0',
      ai_authoring_status: aiStatus,
      package_published_at: null,
      progress: {
        current_step: 'question_bank',
        completed_steps: ['outline', 'modules', 'lessons', 'activities'],
        lessons_done: 20,
        lessons_total: 20,
        questions_done: 197,
        questions_total: 400,
        sections_done: 4,
        assignments_done: 20,
        last_error: null,
        retrying: false,
        attempt: null,
        queue: null,
        ...progress,
      },
      rationale_coverage: null,
      content_tree: [],
      run: { id: 24, status: runStatus, current_step: 'question_bank', artifacts: [] },
      governance: null,
      publication_gates: null,
      ...top,
    },
  }
}

function renderPanel(language, payload) {
  mocks.language.current = language
  mocks.fetchAiPackageStatus.mockResolvedValue(payload)
  render(
    <MemoryRouter>
      <AiPackagePanel programId={77} isGoverned officialCode="CGP-LED-008" />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mocks.fetchAiPackageStatus.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe.each(['en', 'ar'])('AiPackagePanel live status (%s)', (language) => {
  const copy = COPY[language]

  it('says an in-place retry is waiting, with the attempt number, while the worker holds the job', async () => {
    // The incident case on the database driver: the job is running (reserved)
    // and waiting in place before its next attempt. This is the payload the
    // API build report gives for exactly that moment.
    renderPanel(language, statusPayload({
      progress: {
        retrying: true,
        attempt: stepAttempt(2),
        last_error: 'Gemini returned invalid JSON for QUESTION_BANK_BATCH',
        queue: runningJob(),
      },
    }))

    const notice = await screen.findByRole('status')
    expect(notice.textContent).toBe(`${copy.retrying} ${ATTEMPT[language](2, 5)}`)
    expect(screen.queryByText(copy.queued(0))).toBeNull()
    // The counters stay exactly as they were.
    expect(screen.getByText(copy.counter)).toBeInTheDocument()
  })

  it('says an in-place retry is waiting on a queue driver it cannot read', async () => {
    renderPanel(language, statusPayload({ progress: { retrying: true, attempt: stepAttempt(4), queue: null } }))

    expect((await screen.findByRole('status')).textContent).toBe(`${copy.retrying} ${ATTEMPT[language](4, 5)}`)
  })

  it('says the retry is waiting without an attempt number when the server does not know it', async () => {
    renderPanel(language, statusPayload({ progress: { retrying: true, attempt: null } }))

    const notice = await screen.findByRole('status')
    expect(notice.textContent).toBe(copy.retrying)
  })

  it('says how many packages are ahead while the released job waits in the queue', async () => {
    renderPanel(language, statusPayload({
      // A released job is also "retrying": the queue is what the reader needs.
      progress: {
        retrying: true,
        attempt: { current: 2, max: 4, scope: 'job' },
        queue: waitingJob(7, { attempts: 1, available_at: '2026-10-17T16:01:00+00:00' }),
      },
    }))

    const notice = await screen.findByRole('status')
    expect(notice.textContent).toBe(copy.queued(6))
    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(screen.queryByText(new RegExp(copy.retrying))).toBeNull()
  })

  it('shows a run that is still queued with nothing ahead of it', async () => {
    renderPanel(language, statusPayload({
      runStatus: 'queued',
      progress: { current_step: null, completed_steps: [], queue: waitingJob(1) },
    }))

    expect((await screen.findByRole('status')).textContent).toBe(copy.queued(0))
  })

  it('does not call the job that the worker is running a wait in the queue', async () => {
    renderPanel(language, statusPayload({ progress: { queue: runningJob() } }))

    await screen.findByText(copy.counter)
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByText(copy.queued(0))).toBeNull()
  })

  it('shows the last error in a quiet line', async () => {
    renderPanel(language, statusPayload({ progress: { last_error: ERROR_503 } }))

    const line = await screen.findByText(copy.lastError(ERROR_503))
    expect(line).toHaveClass('text-xs')
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('shows nothing new when every new field is null', async () => {
    renderPanel(language, statusPayload())

    await screen.findByText(copy.counter)
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByText(new RegExp(copy.retrying))).toBeNull()
    expect(screen.queryByText(new RegExp(language === 'en' ? 'Last error' : 'آخر خطأ'))).toBeNull()
  })

  it('shows nothing new when the server omits the new fields altogether', async () => {
    const payload = statusPayload()
    for (const key of ['last_error', 'retrying', 'attempt', 'queue']) delete payload.data.progress[key]
    renderPanel(language, payload)

    await screen.findByText(copy.counter)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('reads the fields from the top level of the payload as well', async () => {
    const payload = statusPayload({
      top: { retrying: true, attempt: stepAttempt(3), last_error: ERROR_503, queue: null },
    })
    for (const key of ['last_error', 'retrying', 'attempt', 'queue']) delete payload.data.progress[key]
    renderPanel(language, payload)

    expect((await screen.findByRole('status')).textContent).toBe(`${copy.retrying} ${ATTEMPT[language](3, 5)}`)
    expect(screen.getByText(copy.lastError(ERROR_503))).toBeInTheDocument()
  })

  it('shows none of it once the run is no longer live', async () => {
    renderPanel(language, statusPayload({
      runStatus: 'failed',
      aiStatus: 'generation_failed',
      progress: { retrying: true, attempt: stepAttempt(5), last_error: ERROR_503, queue: waitingJob(2) },
    }))

    await screen.findByText(language === 'en' ? /Generation failed —/ : /فشل التوليد —/)
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByText(copy.lastError(ERROR_503))).toBeNull()
  })
})
