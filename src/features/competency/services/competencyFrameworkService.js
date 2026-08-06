import { http } from '../../../services/http'

export async function fetchCompetencyFramework() {
  const response = await http.get('/admin/competency-framework')
  return response.data?.data || response.data
}

export async function fetchCompetencyGapPrograms(params = {}) {
  const response = await http.get('/admin/programs', { params })
  return response.data?.data || response.data
}

/*
 * DICTIONARY AUTHORING.
 *
 * No seeder or console command creates a ProfessionalCompetency anywhere, so
 * POST /admin/professional-competencies is the only way one can ever exist —
 * and nothing called it. Meanwhile the seed-pack panel tells the admin "if one
 * is missing, add it to the competency framework first", an action the CMS
 * could not perform, and hard-disables competency mapping when the dictionary
 * is empty. That is a direct cause of 93 of 100 packages declaring nothing.
 */

export async function createProfessionalCompetency(payload) {
  const response = await http.post('/admin/professional-competencies', payload)
  return response.data
}

export async function updateProfessionalCompetency(id, payload) {
  const response = await http.put(`/admin/professional-competencies/${id}`, payload)
  return response.data
}

/** Refused server-side when a programme or RPL competency still references it. */
export async function deleteProfessionalCompetency(id) {
  const response = await http.delete(`/admin/professional-competencies/${id}`)
  return response.data
}
