import { http } from '../../../services/http'

export async function fetchCompetencyFramework() {
  const response = await http.get('/admin/competency-framework')
  return response.data?.data || response.data
}

export async function fetchCompetencyGapPrograms(params = {}) {
  const response = await http.get('/admin/programs', { params })
  return response.data?.data || response.data
}
