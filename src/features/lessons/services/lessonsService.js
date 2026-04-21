import { http } from '../../../services/http'

export async function fetchAdminLessons(params = {}) {
  const response = await http.get('/admin/lessons', { params })
  return response.data
}

export async function fetchAdminLessonById(id) {
  const response = await http.get(`/admin/lessons/${id}`)
  return response.data
}

export async function createAdminLesson(payload) {
  const response = await http.post('/admin/lessons', payload)
  return response.data
}

export async function updateAdminLesson(id, payload) {
  const response = await http.put(`/admin/lessons/${id}`, payload)
  return response.data
}

export async function deleteAdminLesson(id) {
  const response = await http.delete(`/admin/lessons/${id}`)
  return response.data
}

export async function fetchAdminSections(params = {}) {
  const response = await http.get('/admin/sections', { params })
  return response.data
}
