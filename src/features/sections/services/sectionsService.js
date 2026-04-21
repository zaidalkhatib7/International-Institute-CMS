import { http } from '../../../services/http'

export async function fetchAdminSections(params = {}) {
  const response = await http.get('/admin/sections', { params })
  return response.data
}

export async function fetchAdminSectionById(id) {
  const response = await http.get(`/admin/sections/${id}`)
  return response.data
}

export async function createAdminSection(payload) {
  const response = await http.post('/admin/sections', payload)
  return response.data
}

export async function updateAdminSection(id, payload) {
  const response = await http.put(`/admin/sections/${id}`, payload)
  return response.data
}

export async function deleteAdminSection(id) {
  const response = await http.delete(`/admin/sections/${id}`)
  return response.data
}
