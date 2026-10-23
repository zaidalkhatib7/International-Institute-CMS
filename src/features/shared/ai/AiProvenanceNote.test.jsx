import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AiProvenanceNote from './AiProvenanceNote'
import AiRunNotice from './AiRunNotice'
import { FALLBACK_PROVENANCE, PRIMARY_PROVENANCE, waitingRun } from '../../../test/aiFixtures'

/*
 * WHO MADE AN AI RESULT, AND A STEP WAITING TO RETRY (AI-RESILIENCE-SPEC §5.2,
 * §7.3, §9.4): the plain and fallback notes in both languages, and the waiting
 * notice with its Retry now.
 */

describe('the provenance note', () => {
  it('names the model of a primary answer, quietly', () => {
    render(<AiProvenanceNote provenance={PRIMARY_PROVENANCE} language="en" />)
    const note = screen.getByText('Made by gemini-3.6-flash').closest('p')
    expect(note).toHaveAttribute('data-ai-provenance', 'primary')
    expect(note.className).not.toMatch(/amber/)
  })

  it('marks a fallback answer in amber, with its step and why the first model was passed over', () => {
    render(<AiProvenanceNote provenance={FALLBACK_PROVENANCE} language="en" />)
    const note = screen.getByText('Made by fallback model gemini-3.1-pro-preview (step 2 of 3); the first model gemini-3.6-flash was busy.').closest('p')
    expect(note).toHaveAttribute('data-ai-provenance', 'fallback')
    expect(note.className).toMatch(/amber/)
  })

  it('reads in Arabic, right to left', () => {
    render(<AiProvenanceNote provenance={FALLBACK_PROVENANCE} language="ar" />)
    const note = screen.getByText('أعدّه النموذج الاحتياطي gemini-3.1-pro-preview (الخطوة 2 من 3)؛ النموذج الأول gemini-3.6-flash كان مشغولًا.').closest('p')
    expect(note).toHaveAttribute('dir', 'rtl')
  })

  it('reads the older columns, and draws nothing when no model is named', () => {
    const { container, rerender } = render(<AiProvenanceNote legacy={{ model: 'gemini-3.6-flash' }} language="ar" />)
    expect(screen.getByText('أعدّه: gemini-3.6-flash')).toBeInTheDocument()
    rerender(<AiProvenanceNote legacy={{}} language="en" />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('the run notice', () => {
  it('says when a waiting step tries next, which try, and which models it tried, and starts it at once on Retry now', async () => {
    const onRetryNow = vi.fn().mockResolvedValue({})
    render(<AiRunNotice run={waitingRun()} language="en" onRetryNow={onRetryNow} />)
    const notice = screen.getByRole('status', { name: 'Waiting to retry' })
    expect(notice).toHaveTextContent(/The AI service is busy, so this work is waiting to retry on its own\. Next try: .+\. This is try 2 of 11\. It keeps trying until .+; nothing needs to be done\. You can continue by hand meanwhile\./)
    expect(notice).toHaveTextContent('Models tried: gemini-3.6-flash (Busy, status 503) and gemini-3.1-pro-preview (Did not answer in time).')
    fireEvent.click(screen.getByRole('button', { name: 'Retry now' }))
    await waitFor(() => expect(screen.getByText('The next try was started now.')).toBeInTheDocument())
    expect(onRetryNow).toHaveBeenCalledTimes(1)
  })

  it('says why Retry now failed, and offers no button to a viewer who may not start the step', async () => {
    const onRetryNow = vi.fn().mockRejectedValue({ response: { status: 422, data: { message: 'x', errors: { generation_in_progress: ['A generation is already running for this record.'] } } } })
    const { rerender } = render(<AiRunNotice run={waitingRun()} language="en" onRetryNow={onRetryNow} />)
    fireEvent.click(screen.getByRole('button', { name: 'Retry now' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('A generation is already running for this record.')
    rerender(<AiRunNotice run={waitingRun()} language="en" onRetryNow={onRetryNow} canRetry={false} />)
    expect(screen.queryByRole('button', { name: 'Retry now' })).not.toBeInTheDocument()
  })

  it('reads in Arabic', () => {
    render(<AiRunNotice run={waitingRun()} language="ar" onRetryNow={vi.fn()} />)
    expect(screen.getByRole('status', { name: 'بانتظار إعادة المحاولة' })).toHaveTextContent('هذه المحاولة 2 من 11.')
    expect(screen.getByRole('button', { name: 'أعد المحاولة الآن' })).toBeInTheDocument()
  })

  it('words a failure by its code, and leaves an unknown one to the panel', () => {
    const { rerender, container } = render(<AiRunNotice run={{ status: 'failed', error_code: 'ai_unavailable_window_exhausted', error_class: 'busy' }} language="en" />)
    expect(screen.getByRole('note')).toHaveTextContent('The AI service stayed busy for the whole time this work may wait')
    rerender(<AiRunNotice run={{ status: 'failed', error: { code: 'generation_error', messages: ['x'] } }} language="en" />)
    expect(container).toBeEmptyDOMElement()
    rerender(<AiRunNotice run={{ status: 'completed' }} language="en" />)
    expect(container).toBeEmptyDOMElement()
  })
})
