import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DocumentScreeningPanel from './DocumentScreeningPanel'
import { AI_COPY } from '../../shared/ai/aiCopy'
import { FALLBACK_PROVENANCE, PRIMARY_PROVENANCE, waitingRun } from '../../../test/aiFixtures'

/*
 * THE DOCUMENT SCREEN, WHEN THE AI SERVICE IS BUSY (AI resilience, Release G,
 * AI-RESILIENCE-SPEC §5.2, §7.3, §9.4):
 *
 *   - a run waiting to retry says when it tries next, holds the re-run, and
 *     offers Retry now, the screen's own route (POST /admin/rpl/screenings/
 *     {public_id}/retry-now), which starts the same run, not a new one;
 *   - a failed or refused run says why by its error code, never the generic
 *     "stopped";
 *   - pass 1's answering model is shown, and a fallback model marked;
 *   - the history names a run's model when it differs from the selected run's,
 *     and a figure made by another model than the previous run's says not to
 *     compare them directly: the models the figure stands on (figure_models),
 *     pass 2's included when an employer search raised a component of it.
 */

const mocks = vi.hoisted(() => ({ requestRplScreening: vi.fn(), retryRplScreeningNow: vi.fn(), acknowledgeRplScreening: vi.fn() }))
vi.mock('../services/rplService', () => mocks)

function run(overrides = {}) {
  return {
    public_id: 'scr-1',
    status: 'completed',
    trigger: 'auto_on_submit',
    requested_model: 'gemini-3.6-flash',
    responding_model: 'gemini-3.6-flash',
    prompt_version: 'rpl-screen-v3',
    fake_likelihood_percent: 30,
    score_out_of_10: 3,
    coverage: { documents_total: 1, read: 1, withheld: [], excluded_categories: [], extraction_only_categories: [] },
    web_search_used: true,
    created_at: '2026-10-23T09:00:00Z',
    completed_at: '2026-10-23T09:03:00Z',
    items: [],
    employer_checks: [],
    ...overrides,
  }
}

function renderPanel(screenings, props = {}) {
  return render(<DocumentScreeningPanel applicationId="case-1" screenings={screenings} canRun language="en" onReload={vi.fn()} onScreeningUpdated={vi.fn()} {...props} />)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('a screen waiting to retry', () => {
  const waiting = () => run({ status: 'waiting_retry', fake_likelihood_percent: null, score_out_of_10: null, completed_at: null, ...waitingRun({ next_attempt_at: new Date(Date.now() + 5 * 60000).toISOString() }) })

  it('says when it tries next, holds the re-run, and starts the same run on Retry now', async () => {
    const updated = run({ status: 'queued', fake_likelihood_percent: null })
    mocks.retryRplScreeningNow.mockResolvedValue({ data: updated })
    const onScreeningUpdated = vi.fn()
    renderPanel([waiting()], { onScreeningUpdated })

    expect(screen.getAllByText('Waiting to retry').length).toBeGreaterThan(0)
    expect(screen.getByRole('status', { name: 'Waiting to retry' })).toHaveTextContent(/Next try: .+\. This is try 2 of 11\./)
    expect(screen.getByRole('button', { name: 'Re-run screen' })).toBeDisabled()
    expect(screen.getByText(/The latest screen is waiting to retry on its own because the AI service is busy\./)).toBeInTheDocument()
    expect(screen.queryByText(/^Authenticity risk \d/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Retry now' }))
    // The screen's own route, by its public_id; never the re-run request (fix review of 23 Oct 2026).
    await waitFor(() => expect(mocks.retryRplScreeningNow).toHaveBeenCalledWith('scr-1'))
    expect(mocks.requestRplScreening).not.toHaveBeenCalled()
    await waitFor(() => expect(onScreeningUpdated).toHaveBeenCalledWith(updated))
  })

  it('offers no Retry now to a viewer who may not run the screen, in Arabic too', () => {
    renderPanel([waiting()], { canRun: false, language: 'ar' })
    expect(screen.getByRole('status', { name: 'بانتظار إعادة المحاولة' })).toHaveTextContent('هذه المحاولة 2 من 11.')
    expect(screen.queryByRole('button', { name: 'أعد المحاولة الآن' })).not.toBeInTheDocument()
  })

  it('is offered for re-run once it is stuck past the window after its next try', () => {
    renderPanel([run({ status: 'waiting_retry', next_attempt_at: new Date(Date.now() - 45 * 60000).toISOString(), fake_likelihood_percent: null })])
    expect(screen.getByRole('button', { name: 'Re-run screen' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Retry now' })).not.toBeInTheDocument()
  })
})

describe('a failed screen says why', () => {
  it.each([
    ['provider_http_503', 'busy'],
    ['provider_timeout', 'timeout'],
    ['ai_unavailable_window_exhausted', 'windowExhausted'],
    ['model_unavailable', 'configuration'],
  ])('by its code %s', (code, key) => {
    renderPanel([run({ status: 'failed', fake_likelihood_percent: null, error_code: code })])
    expect(screen.getByText(AI_COPY.en.errors[key])).toHaveAttribute('data-error-code', code)
    expect(screen.queryByText(/stopped before producing a result/)).not.toBeInTheDocument()
  })

  it('keeps the generic sentence for a failure with no AI code', () => {
    renderPanel([run({ status: 'failed', fake_likelihood_percent: null })])
    expect(screen.getByText(/stopped before producing a result/)).toBeInTheDocument()
  })

  it('reads a refused run\'s capacity code in Arabic', () => {
    renderPanel([run({ status: 'refused', refusal_code: 'provider_error', fake_likelihood_percent: null, error_code: 'ai_busy', error_class: 'busy' })], { language: 'ar' })
    expect(screen.getByText(AI_COPY.ar.errors.busy)).toBeInTheDocument()
  })
})

describe('which model made the figure', () => {
  it('shows pass 1\'s answering model, a fallback model marked, and pass 2\'s own', () => {
    renderPanel([run({ responding_model: 'gemini-3.1-pro-preview', ai_provenance: { pass_1: FALLBACK_PROVENANCE, pass_2: PRIMARY_PROVENANCE } })])
    expect(screen.getByText('Made by fallback model gemini-3.1-pro-preview (step 2 of 3); the first model gemini-3.6-flash was busy.')).toBeInTheDocument()
    expect(screen.getByText('Made by gemini-3.6-flash')).toBeInTheDocument()
    // The existing "requested → responding" line shows the fallback too.
    expect(screen.getByText('gemini-3.6-flash, answered by gemini-3.1-pro-preview')).toBeInTheDocument()
  })

  it('names another model in the history, and says not to compare figures made by different models', () => {
    const latest = run({ public_id: 'scr-2', created_at: '2026-10-23T12:00:00Z', responding_model: 'gemini-3.1-pro-preview', ai_provenance: { pass_1: FALLBACK_PROVENANCE } })
    const previous = run({ public_id: 'scr-1', created_at: '2026-10-22T12:00:00Z', ai_provenance: { pass_1: PRIMARY_PROVENANCE } })
    renderPanel([latest, previous])

    expect(screen.getByText('This figure was made by a different model from the previous run (gemini-3.6-flash); do not compare the figures directly.')).toBeInTheDocument()
    const history = screen.getByRole('navigation', { name: 'Runs' })
    const buttons = history.querySelectorAll('button')
    expect(buttons[0]).not.toHaveAttribute('data-model')
    expect(buttons[1]).toHaveAttribute('data-model', 'gemini-3.6-flash')
    expect(buttons[1]).toHaveTextContent('gemini-3.6-flash')
  })

  it('compares the models the figure stands on: pass 2\'s counts when the employer search raised a component', () => {
    // Fix review of 23 Oct 2026: the same pass 1 model, but the employer
    // classification that raised the figure came from another model.
    const latest = run({ public_id: 'scr-2', ai_provenance: { pass_1: PRIMARY_PROVENANCE }, figure_models: { pass_1: 'gemini-3.6-flash', pass_2: 'gemini-3.5-flash-lite' } })
    const previous = run({ public_id: 'scr-1', ai_provenance: { pass_1: PRIMARY_PROVENANCE }, figure_models: { pass_1: 'gemini-3.6-flash', pass_2: 'gemini-3.6-flash' } })
    renderPanel([latest, previous])

    expect(screen.getByText('This figure was made by a different model from the previous run (gemini-3.6-flash + gemini-3.6-flash); do not compare the figures directly.')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Runs' }).querySelectorAll('button')[1]).toHaveAttribute('data-model', 'gemini-3.6-flash + gemini-3.6-flash')
  })

  it('a pass 2 model that raised nothing in the figure does not make it another instrument', () => {
    const latest = run({ public_id: 'scr-2', ai_provenance: { pass_1: PRIMARY_PROVENANCE }, figure_models: { pass_1: 'gemini-3.6-flash', pass_2: null } })
    const previous = run({ public_id: 'scr-1', ai_provenance: { pass_1: PRIMARY_PROVENANCE }, figure_models: { pass_1: 'gemini-3.6-flash', pass_2: null } })
    renderPanel([latest, previous])
    expect(screen.queryByText(/different model from the previous run/)).not.toBeInTheDocument()
  })

  it('says nothing about comparing when both runs were made by the same model', () => {
    renderPanel([run({ public_id: 'scr-2', ai_provenance: { pass_1: PRIMARY_PROVENANCE } }), run({ public_id: 'scr-1' })])
    expect(screen.queryByText(/different model from the previous run/)).not.toBeInTheDocument()
    expect(document.querySelector('[data-model]')).toBeNull()
  })

  it('says it in Arabic', () => {
    renderPanel([run({ public_id: 'scr-2', ai_provenance: { pass_1: FALLBACK_PROVENANCE } }), run({ public_id: 'scr-1', ai_provenance: { pass_1: PRIMARY_PROVENANCE } })], { language: 'ar' })
    expect(screen.getByText('أُعدّ هذا الرقم بنموذج مختلف عن التشغيل السابق (gemini-3.6-flash)؛ لا تُقارن الأرقام مباشرة.')).toBeInTheDocument()
  })
})
