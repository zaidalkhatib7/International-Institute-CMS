import { http } from '../../../services/http'

export async function fetchAdminQuizzes(params = {}) {
  const response = await http.get('/admin/quizzes', { params })
  return response.data
}

export async function fetchAdminQuizById(id) {
  const response = await http.get(`/admin/quizzes/${id}`)
  return response.data
}

export async function createAdminQuiz(payload) {
  const response = await http.post('/admin/quizzes', payload)
  return response.data
}

export async function updateAdminQuiz(id, payload) {
  const response = await http.put(`/admin/quizzes/${id}`, payload)
  return response.data
}

export async function deleteAdminQuiz(id) {
  const response = await http.delete(`/admin/quizzes/${id}`)
  return response.data
}

export async function importQuizQuestionsFromPdf(pdf, questionCount) {
  const formData = new FormData()
  formData.append('pdf', pdf)
  formData.append('question_count', String(questionCount))

  const response = await http.post('/admin/quizzes/import-pdf', formData, {
    timeout: 180000,
  })
  return response.data
}

export async function fetchQuizPdfImport(importId) {
  const response = await http.get(`/admin/quizzes/imports/${importId}`)
  return response.data
}

// --- B1 per-question review lifecycle (AI_DRAFT != APPROVED) ---

export async function updateQuestionReview(questionId, payload) {
  const response = await http.put(`/admin/quiz-questions/${questionId}/review`, payload)
  return response.data
}

export async function approveQuestion(questionId) {
  const response = await http.post(`/admin/quiz-questions/${questionId}/approve`)
  return response.data
}

export async function rejectQuestion(questionId, reason = '') {
  const response = await http.post(`/admin/quiz-questions/${questionId}/reject`, { reason })
  return response.data
}

/**
 * The whole programme's questions as ONE bank.
 *
 * Storage still keeps a quiz per unit — quizzes.course_section_id is unique and
 * not-null — but nobody reviewing a bank thinks in units, and the exam engine
 * already selects across the entire programme. This endpoint returns the bank
 * flat, with the unit as a field on each question, plus counts computed
 * server-side so the screen cannot disagree with the publication gates about
 * how many questions are actually approved.
 */
export async function fetchProgramQuestionBank(programId) {
  const response = await http.get(`/admin/programs/${programId}/question-bank`)
  return response.data
}
