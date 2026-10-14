import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchAdminSections } from '../../sections/services/sectionsService'
import {
  fetchAdminQuizById,
  fetchQuizPdfImport,
  importQuizQuestionsFromPdf,
  updateAdminQuiz,
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

/*
 * A bank an AI run authored in Arabic holds every title, question and option in
 * Arabic only. Arabic and English are the platform's two languages, so it saves
 * without about 250 English fields being typed first, and its Arabic is never
 * copied into the English fields.
 */
describe('QuizBuilderPage — an Arabic-only bank saves', () => {
  const arabicBank = {
    id: 5,
    course_section_id: 3,
    questions_per_attempt: 1,
    title: { ar: 'بنك الوحدة' },
    questions: [{
      id: 7,
      question_text: { ar: 'ما الجودة؟' },
      options: [
        { id: 70, option_text: { ar: 'أ' }, is_correct: true },
        { id: 71, option_text: { ar: 'ب' }, is_correct: false },
        { id: 72, option_text: { ar: 'ج' }, is_correct: false },
      ],
    }],
  }

  beforeEach(() => {
    fetchAdminSections.mockResolvedValue({ data: [{ id: 3, title: { ar: 'وحدة' } }] })
    fetchAdminQuizById.mockReset()
    updateAdminQuiz.mockReset()
    updateAdminQuiz.mockResolvedValue({ data: {} })
  })

  it.each(['ar', 'en'])('from the %s interface, with every English field left empty', async (language) => {
    localStorage.setItem('icpc_admin_language', language)
    fetchAdminQuizById.mockResolvedValue({ data: arabicBank })

    render(
      <MemoryRouter initialEntries={['/quizzes/edit?id=5']}>
        <QuizBuilderPage />
      </MemoryRouter>
    )
    await waitFor(() => expect(fetchAdminQuizById).toHaveBeenCalledWith('5'))
    await waitFor(() => expect(screen.queryByText(/Loading question bank|جاري تحميل الاختبار/)).not.toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /^(Save Question Bank|حفظ الاختبار)$/ }))

    await waitFor(() => expect(updateAdminQuiz).toHaveBeenCalledTimes(1))
    const payload = updateAdminQuiz.mock.calls[0][1]
    expect(payload.title).toEqual({ en: '', ar: 'بنك الوحدة' })
    expect(payload.questions[0].question_text).toEqual({ en: '', ar: 'ما الجودة؟' })
    expect(payload.questions[0].options.map((option) => option.option_text)).toEqual([
      { en: '', ar: 'أ' }, { en: '', ar: 'ب' }, { en: '', ar: 'ج' },
    ])
    expect(JSON.stringify(payload)).not.toContain('"nl"')
  })
})
