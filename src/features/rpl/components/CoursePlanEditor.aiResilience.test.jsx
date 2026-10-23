import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CoursePlanEditor from './CoursePlanEditor'
import { COURSE_PLAN_COPY } from '../domain/coursePlan'
import { AI_COPY } from '../../shared/ai/aiCopy'
import { FALLBACK_PROVENANCE, waitingRun } from '../../../test/aiFixtures'

/*
 * THE COURSE PLAN WHEN THE AI SERVICE IS BUSY (AI resilience, Release G,
 * AI-RESILIENCE-SPEC §5.2-5.3, §7.3, §9.4):
 *
 *   - "Compose the plan by hand" sits beside Generate at any time, asks for a
 *     reason (10 to 2,000 characters) and posts it; it comes first while the
 *     proposal waits to retry or stopped because the AI service was busy;
 *   - the queued proposal says it is queued, running or waiting (with Retry
 *     now), and a 202 says the proposal was asked for, never "version ''";
 *   - a plan composed by hand says by whom and why; a proposal made by a
 *     fallback model says so.
 */

const aiApi = vi.hoisted(() => ({ retryAiGenerationNow: vi.fn() }))
vi.mock('../../shared/ai/aiServiceApi', () => aiApi)

const mocks = vi.hoisted(() => ({
  fetchRplCoursePlan: vi.fn(),
  fetchRplCoursePlanCatalogue: vi.fn(),
  fetchRplCoursePlanVersion: vi.fn(),
  generateRplCoursePlan: vi.fn(),
  composeRplCoursePlan: vi.fn(),
  regenerateRplCoursePlan: vi.fn(),
  addRplCoursePlanItem: vi.fn(),
  removeRplCoursePlanItem: vi.fn(),
  approveRplCoursePlan: vi.fn(),
  amendRplCoursePlan: vi.fn(),
  discardRplCoursePlan: vi.fn(),
}))
const language = vi.hoisted(() => ({ current: 'en' }))

vi.mock('../services/rplService', () => mocks)
vi.mock('../../../services/languageStorage', async (importOriginal) => ({ ...(await importOriginal()), getAdminLanguage: () => language.current }))

const EN = COURSE_PLAN_COPY.en
const AR = COURSE_PLAN_COPY.ar
const REASON = 'The AI service is busy and the client is waiting for the plan.'

function emptyOverview(overrides = {}) {
  return {
    application: { public_id: 'case-1', status: 'assessment_in_progress' },
    entry_quiz: { verification_id: 5, result: 'passed', percent: 72, pass_mark_applied: 50 },
    generation: { can_generate: true, refusal: null, target_level: null, live_minimum: 2, minimum_applies: true, run: null },
    draft: null,
    approved: null,
    versions: [],
    can: { generate: true, regenerate: false, edit: false, approve: false, amend: false, discard: false },
    ...overrides,
  }
}

function draftPlan(overrides = {}) {
  return { public_id: 'plan-1', version: 1, status: 'draft', is_live: true, lock_version: 1, source: 'manual', model: null, minimum_required: 2, entry_quiz_result: 'passed', items: [], created_by: { id: 1, name: 'Admin Example' }, created_at: '2026-10-23T09:00:00Z', generation_report: { source: 'manual', reason: REASON, minimum_required: 2 }, ...overrides }
}

function renderEditor(props = {}) {
  return render(<CoursePlanEditor applicationId="case-1" application={{ status: 'assessment_in_progress' }} evidence={[]} canManage language={language.current} onCaseChanged={props.onCaseChanged || vi.fn()} onForbidden={vi.fn()} {...props} />)
}

beforeEach(() => {
  vi.clearAllMocks()
  language.current = 'en'
  mocks.fetchRplCoursePlan.mockResolvedValue({ data: emptyOverview() })
})

describe('composing the plan by hand', () => {
  it('sits beside Generate, asks for a reason, posts it and tells the page the case moved', async () => {
    mocks.composeRplCoursePlan.mockResolvedValue({ data: { plan: draftPlan(), application_status: 'course_plan_review' } })
    const onCaseChanged = vi.fn()
    renderEditor({ onCaseChanged })

    const generate = await screen.findByRole('button', { name: EN.generate })
    const compose = screen.getByRole('button', { name: EN.compose })
    // Generate first while the AI service is fine.
    expect(generate.compareDocumentPosition(compose) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    fireEvent.click(compose)

    const form = within(screen.getByRole('region', { name: EN.composeTitle }))
    const submit = form.getByRole('button', { name: EN.composeSubmit })
    expect(submit).toBeDisabled()
    fireEvent.change(form.getByLabelText(EN.reason), { target: { value: 'Too short' } })
    expect(submit).toBeDisabled()
    fireEvent.change(form.getByLabelText(EN.reason), { target: { value: REASON } })
    fireEvent.click(submit)

    await waitFor(() => expect(mocks.composeRplCoursePlan).toHaveBeenCalledWith('case-1', { reason: REASON, locale: 'en' }))
    expect(mocks.generateRplCoursePlan).not.toHaveBeenCalled()
    await waitFor(() => expect(onCaseChanged).toHaveBeenCalledWith({ message: 'A draft composed by hand was created as version 1. Add the courses, then approve it.' }))
  })

  it('comes first while the proposal waits to retry, which Retry now starts at once through the server\'s own route', async () => {
    const waiting = waitingRun({ kind: 'course_plan', subject_id: 31 })
    mocks.fetchRplCoursePlan.mockResolvedValue({ data: emptyOverview({ generation: { can_generate: false, refusal: 'generation_in_progress', live_minimum: 2, run: waiting }, can: { generate: false } }) })
    aiApi.retryAiGenerationNow.mockResolvedValue({ data: { status: 'queued' } })
    renderEditor()

    const notice = await screen.findByRole('status', { name: 'Waiting to retry' })
    expect(notice).toHaveTextContent(/This is try 2 of 11\./)
    const actions = screen.getAllByRole('button').map((button) => button.textContent)
    expect(actions.indexOf(EN.compose)).toBeGreaterThan(-1)
    expect(actions.indexOf(EN.generate)).toBe(-1)
    expect(screen.queryByText('generation in progress')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Retry now' }))
    await waitFor(() => expect(aiApi.retryAiGenerationNow).toHaveBeenCalledWith(waiting))
    // Never the Generate request: the server refuses it while a run waits.
    expect(mocks.generateRplCoursePlan).not.toHaveBeenCalled()
  })

  it('comes first after a proposal stopped because the AI service was busy, which says so', async () => {
    mocks.fetchRplCoursePlan.mockResolvedValue({ data: emptyOverview({ generation: { can_generate: true, refusal: null, live_minimum: 2, run: { status: 'failed', error_code: 'ai_unavailable_window_exhausted', error_class: 'busy' } } }) })
    renderEditor()

    expect(await screen.findByText(AI_COPY.en.errors.windowExhausted)).toBeInTheDocument()
    const compose = screen.getByRole('button', { name: EN.compose })
    const generate = screen.getByRole('button', { name: EN.generate })
    expect(compose.compareDocumentPosition(generate) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('follows the server when it says whether composing is allowed', async () => {
    mocks.fetchRplCoursePlan.mockResolvedValue({ data: emptyOverview({ can: { generate: true, compose: false } }) })
    renderEditor()
    await screen.findByRole('button', { name: EN.generate })
    expect(screen.queryByRole('button', { name: EN.compose })).not.toBeInTheDocument()
  })

  it('reads in Arabic', async () => {
    language.current = 'ar'
    renderEditor({ language: 'ar' })
    fireEvent.click(await screen.findByRole('button', { name: AR.compose }))
    expect(screen.getByRole('region', { name: AR.composeTitle })).toHaveTextContent(AR.composeHint)
  })
})

describe('the queued proposal', () => {
  it('says a 202 asked for the proposal, never a version without a number', async () => {
    mocks.generateRplCoursePlan.mockResolvedValue({ data: { plan: null, generation: { status: 'queued' }, application_status: 'assessment_in_progress' } })
    renderEditor()
    fireEvent.click(await screen.findByRole('button', { name: EN.generate }))
    expect(await screen.findByText(EN.generationQueued)).toBeInTheDocument()
  })

  it('says a regeneration of a draft is waiting to retry, beside the draft', async () => {
    mocks.fetchRplCoursePlan.mockResolvedValue({ data: emptyOverview({ application: { public_id: 'case-1', status: 'course_plan_review' }, draft: draftPlan({ source: 'model_call', model: 'gemini-3.6-flash' }), generation: { can_generate: false, refusal: 'plan_exists', live_minimum: 2, run: waitingRun({ kind: 'course_plan' }) }, can: { edit: true, approve: true, regenerate: false } }) })
    renderEditor()
    expect(await screen.findByRole('status', { name: 'Waiting to retry' })).toHaveTextContent(/This is try 2 of 11\./)
    expect(screen.getByRole('button', { name: 'Retry now' })).toBeEnabled()
  })

  it('says it is queued and holds Generate', async () => {
    mocks.fetchRplCoursePlan.mockResolvedValue({ data: emptyOverview({ generation: { can_generate: false, refusal: 'generation_in_progress', live_minimum: 2, run: { status: 'queued' } }, can: { generate: true } }) })
    renderEditor()
    expect(await screen.findByText(AI_COPY.en.run.queued)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: EN.generate })).toBeDisabled()
  })
})

describe('who made the plan', () => {
  it('says a plan composed by hand was, by whom and why', async () => {
    mocks.fetchRplCoursePlan.mockResolvedValue({ data: emptyOverview({ application: { public_id: 'case-1', status: 'course_plan_review' }, draft: draftPlan(), can: { edit: true, approve: true } }) })
    renderEditor()
    expect(await screen.findByText(`Composed by hand by Admin Example. Reason: ${REASON}`)).toBeInTheDocument()
    expect(screen.getAllByText(EN.planSource.manual).length).toBeGreaterThan(0)
  })

  it('marks a proposal made by a fallback model', async () => {
    mocks.fetchRplCoursePlan.mockResolvedValue({ data: emptyOverview({ application: { public_id: 'case-1', status: 'course_plan_review' }, draft: draftPlan({ source: 'model_call', model: 'gemini-3.1-pro-preview', generation_report: { ai_provenance: FALLBACK_PROVENANCE } }), can: { edit: true, approve: true } }) })
    renderEditor()
    expect(await screen.findByText('Made by fallback model gemini-3.1-pro-preview (step 2 of 3); the first model gemini-3.6-flash was busy.')).toBeInTheDocument()
  })
})
