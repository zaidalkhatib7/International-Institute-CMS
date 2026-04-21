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
