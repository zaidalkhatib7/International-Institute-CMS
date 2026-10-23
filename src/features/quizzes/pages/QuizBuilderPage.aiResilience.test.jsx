import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchAdminSections } from '../../sections/services/sectionsService'
import { fetchQuizPdfImport, importQuizQuestionsFromPdf } from '../services/quizzesService'
import QuizBuilderPage from './QuizBuilderPage'
import { busyRetryLaterError } from '../../../test/aiFixtures'

/*
 * THE PDF QUIZ IMPORT WHEN THE AI SERVICE IS BUSY (AI resilience, Release G,
 * AI-RESILIENCE-SPEC D14, §5.3, §7.3): the small synchronous import's busy
 * answer says so and that nothing was saved; a queued import waiting to retry
 * says it waits on its own; the questions say which models made them.
 */

vi.mock('../../sections/services/sectionsService', () => ({ fetchAdminSections: vi.fn() }))
vi.mock('../services/quizzesService', () => ({
  createAdminQuiz: vi.fn(),
  fetchAdminQuizById: vi.fn(),
  fetchQuizPdfImport: vi.fn(),
  importQuizQuestionsFromPdf: vi.fn(),
  updateAdminQuiz: vi.fn(),
}))

function question(number) {
  return { question_text: { en: `Generated question ${number}` }, options: [1, 2, 3].map((option) => ({ option_text: { en: `Option ${option}` }, is_correct: option === 1 })) }
}

async function startImport(count = '2') {
  render(<MemoryRouter initialEntries={['/quizzes/edit']}><QuizBuilderPage /></MemoryRouter>)
  const file = new File(['%PDF-1.7'], 'bank.pdf', { type: 'application/pdf' })
  fireEvent.change(await screen.findByLabelText('PDF document'), { target: { files: [file] } })
  fireEvent.change(screen.getByLabelText('Number of questions'), { target: { value: count } })
  fireEvent.click(screen.getByRole('button', { name: 'Generate draft' }))
}

beforeEach(() => {
  localStorage.setItem('icpc_admin_language', 'en')
  fetchAdminSections.mockResolvedValue({ data: [] })
  importQuizQuestionsFromPdf.mockReset()
  fetchQuizPdfImport.mockReset()
})

afterEach(() => vi.useRealTimers())

describe('the PDF import', () => {
  it('says the AI service is busy and that nothing was saved', async () => {
    importQuizQuestionsFromPdf.mockRejectedValue(busyRetryLaterError())
    await startImport()
    expect(await screen.findByText('The AI service is busy right now (Google reported high demand on gemini-3.6-flash and gemini-3.5-flash-lite). Nothing was saved. Try again in a few minutes, or continue by hand.')).toBeInTheDocument()
  })

  it('names the models that made the questions', async () => {
    importQuizQuestionsFromPdf.mockResolvedValue({ data: { questions: [question(1), question(2)], models_used: ['gemini-3.1-pro-preview', 'gemini-3.6-flash'] } })
    await startImport()
    expect(await screen.findByText('Made by: gemini-3.1-pro-preview · gemini-3.6-flash')).toBeInTheDocument()
  })

  it('says a queued import waiting to retry waits on its own, then names its models', async () => {
    importQuizQuestionsFromPdf.mockResolvedValue({ data: { id: 31, status: 'queued', question_count: 40, processed_questions: 0, progress: 0 } })
    let resolveRetrying
    fetchQuizPdfImport
      .mockImplementationOnce(() => new Promise((resolve) => { resolveRetrying = resolve }))
      .mockResolvedValue({ data: { id: 31, status: 'completed', progress: 100, models_used: [{ model: 'gemini-3.1-pro-preview' }], result: { questions: [question(1)] } } })
    vi.useFakeTimers({ shouldAdvanceTime: true })
    await startImport('40')
    await vi.advanceTimersByTimeAsync(2100)
    resolveRetrying({ data: { id: 31, status: 'retrying', question_count: 40, processed_questions: 10, progress: 25 } })
    expect(await screen.findByText(/The AI service was busy, so the import is waiting and retries on its own\./)).toBeInTheDocument()
    await vi.advanceTimersByTimeAsync(2100)
    await waitFor(() => expect(screen.getByText('Made by: gemini-3.1-pro-preview')).toBeInTheDocument())
  })
})
