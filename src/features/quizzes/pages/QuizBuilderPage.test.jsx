import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchAdminSections } from '../../sections/services/sectionsService'
import {
  fetchAdminQuizById,
  fetchQuizPdfImport,
  importQuizQuestionsFromPdf,
} from '../services/quizzesService'
import QuizBuilderPage from './QuizBuilderPage'

vi.mock('../../sections/services/sectionsService', () => ({
  fetchAdminSections: vi.fn(),
}))

vi.mock('../services/quizzesService', () => ({
  createAdminQuiz: vi.fn(),
  fetchAdminQuizById: vi.fn(),
  fetchQuizPdfImport: vi.fn(),
  importQuizQuestionsFromPdf: vi.fn(),
  updateAdminQuiz: vi.fn(),
}))

function generatedQuestion(number) {
  return {
    question_text: {
      en: `Generated question ${number}`,
      ar: `سؤال مولد ${number}`,
      nl: `Gegenereerde vraag ${number}`,
    },
    options: [1, 2, 3, 4].map((option) => ({
      option_text: {
        en: `Option ${number}-${option}`,
        ar: `خيار ${number}-${option}`,
        nl: `Optie ${number}-${option}`,
      },
      is_correct: option === 1,
    })),
  }
}

describe('QuizBuilderPage PDF import', () => {
  beforeEach(() => {
    localStorage.setItem('icpc_admin_language', 'en')
    fetchAdminSections.mockResolvedValue({ data: [] })
    fetchAdminQuizById.mockReset()
    fetchQuizPdfImport.mockReset()
    importQuizQuestionsFromPdf.mockReset()
  })

  it('materializes every generated question instead of stopping at the initial fields', async () => {
    importQuizQuestionsFromPdf.mockResolvedValue({
      data: {
        suggested_title: { en: 'Generated question bank', ar: 'بنك أسئلة مولد', nl: 'Gegenereerde vragenbank' },
        questions: [generatedQuestion(1), generatedQuestion(2), generatedQuestion(3)],
      },
    })

    render(
      <MemoryRouter initialEntries={['/quizzes/edit']}>
        <QuizBuilderPage />
      </MemoryRouter>
    )

    const file = new File(['%PDF-1.7'], 'question-bank.pdf', { type: 'application/pdf' })
    fireEvent.change(await screen.findByLabelText('PDF document'), { target: { files: [file] } })
    fireEvent.change(screen.getByLabelText('Number of questions'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Generate draft' }))

    await waitFor(() => {
      expect(screen.getByText('Gemini generated 3 questions. Review every answer before saving.')).toBeInTheDocument()
    })
    expect(screen.getByText('Question 3')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Generated question 3')).toBeInTheDocument()
    expect(importQuizQuestionsFromPdf).toHaveBeenCalledWith(file, 3)
  })
})
