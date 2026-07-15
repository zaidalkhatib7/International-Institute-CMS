import { http } from '../../../services/http'

function read(response) {
  return response.data
}

export async function fetchRplDashboard(params = {}) {
  return read(await http.get('/admin/rpl/dashboard', { params }))
}

export async function fetchRplReferenceData() {
  return read(await http.get('/admin/rpl/reference-data'))
}

export async function fetchRplApplications(params = {}) {
  return read(await http.get('/admin/rpl/applications', { params }))
}

export async function fetchRplApplication(id) {
  return read(await http.get(`/admin/rpl/applications/${id}`))
}

export async function createRplApplication(payload) {
  return read(await http.post('/admin/rpl/applications', payload))
}

export async function updateRplApplication(id, payload) {
  return read(await http.put(`/admin/rpl/applications/${id}`, payload))
}

export async function transitionRplApplication(id, payload) {
  return read(await http.post(`/admin/rpl/applications/${id}/transition`, payload))
}

export async function submitRplInitialReview(id, payload) {
  return read(await http.post(`/admin/rpl/applications/${id}/initial-review`, payload))
}

export async function saveRplDeclaration(id, payload) {
  return read(await http.post(`/admin/rpl/applications/${id}/consent`, payload))
}

export async function fetchRplDeclaration(id) {
  return read(await http.get(`/admin/rpl/applications/${id}/declaration`))
}

export async function fetchRplTimeline(id, params = {}) {
  return read(await http.get(`/admin/rpl/applications/${id}/timeline`, { params }))
}

export async function createRplInformationRequest(id, payload) {
  return read(await http.post(`/admin/rpl/applications/${id}/requests`, payload))
}

export async function closeRplInformationRequest(id, payload = {}) {
  return read(await http.post(`/admin/rpl/requests/${id}/close`, payload))
}

export async function fetchRplEvidence(params = {}) {
  return read(await http.get('/admin/rpl/evidence', { params }))
}

export async function uploadRplEvidence(applicationId, payload, onUploadProgress) {
  const formData = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value == null || value === '') return
    if (Array.isArray(value)) value.forEach((item) => formData.append(`${key}[]`, item))
    else formData.append(key, value)
  })

  return read(await http.post(`/admin/rpl/applications/${applicationId}/evidence`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 5 * 60 * 1000,
    onUploadProgress,
  }))
}

export async function createRplLinkEvidence(applicationId, payload) {
  return read(await http.post(`/admin/rpl/applications/${applicationId}/evidence`, {
    ...payload,
    kind: 'url',
  }))
}

export async function updateRplEvidence(id, payload) {
  return read(await http.put(`/admin/rpl/evidence/${id}`, payload))
}

export async function deleteRplEvidence(id) {
  return read(await http.delete(`/admin/rpl/evidence/${id}`))
}

export async function reviewRplEvidence(id, payload) {
  return read(await http.post(`/admin/rpl/evidence/${id}/review`, payload))
}

export async function fetchRplEvidenceHistory(id) {
  return read(await http.get(`/admin/rpl/evidence/${id}/history`))
}

export async function fetchRplEvidenceSignedUrl(id) {
  return read(await http.post(`/admin/rpl/evidence/${id}/signed-url`))
}

export async function fetchRplAssessments(params = {}) {
  return read(await http.get('/admin/rpl/assessments', { params }))
}

export async function fetchRplAssessment(id) {
  return read(await http.get(`/admin/rpl/assessments/${id}`))
}

export async function saveRplAssessmentFindings(id, payload) {
  return read(await http.put(`/admin/rpl/assessments/${id}/findings`, payload))
}

export async function saveRplGapAnalysis(id, payload) {
  return read(await http.put(`/admin/rpl/assessments/${id}/gap-analysis`, payload))
}

export async function saveRplCompletionPlan(id, payload) {
  return read(await http.put(`/admin/rpl/assessments/${id}/completion-plan`, payload))
}

export async function scheduleRplInterview(id, payload) {
  return read(await http.post(`/admin/rpl/assessments/${id}/interviews`, payload))
}

export async function updateRplInterview(id, payload) {
  return read(await http.put(`/admin/rpl/interviews/${id}`, payload))
}

export async function submitRplAssessmentReport(id, payload) {
  return read(await http.post(`/admin/rpl/assessments/${id}/submit-report`, payload))
}

export async function fetchRplAssessors(params = {}) {
  return read(await http.get('/admin/rpl/assessors', { params }))
}

export async function fetchRplAssignments(params = {}) {
  return read(await http.get('/admin/rpl/assignments', { params }))
}

export async function assignRplAssessor(applicationId, payload) {
  return read(await http.post(`/admin/rpl/applications/${applicationId}/assignments`, payload))
}

export async function removeRplAssignment(id, payload) {
  return read(await http.delete(`/admin/rpl/assignments/${id}`, { data: payload }))
}

export async function acceptRplAssignment(id) {
  return read(await http.post(`/admin/rpl/assignments/${id}/accept`))
}

export async function declareRplConflict(id, payload) {
  return read(await http.post(`/admin/rpl/assignments/${id}/conflict-declaration`, payload))
}

export async function startRplAssessment(id) {
  return read(await http.post(`/admin/rpl/assignments/${id}/start`))
}

export async function fetchRplCommitteeCases(params = {}) {
  return read(await http.get('/admin/rpl/committee/cases', { params }))
}

export async function submitRplCommitteeDecision(applicationId, payload) {
  return read(await http.post(`/admin/rpl/applications/${applicationId}/committee-decision`, payload))
}

export async function submitRplCommitteeVote(reviewId, payload) {
  return read(await http.post(`/admin/rpl/committee/reviews/${reviewId}/votes`, payload))
}

export async function fetchRplQualityReviews(params = {}) {
  return read(await http.get('/admin/rpl/quality/reviews', { params }))
}

export async function submitRplQualityReview(applicationId, payload) {
  return read(await http.post(`/admin/rpl/applications/${applicationId}/quality-review`, payload))
}

export async function fetchRplAppeals(params = {}) {
  return read(await http.get('/admin/rpl/appeals', { params }))
}

export async function decideRplAppeal(id, payload) {
  return read(await http.post(`/admin/rpl/appeals/${id}/decision`, payload))
}

export async function updateRplAppeal(id, payload) {
  return read(await http.put(`/admin/rpl/appeals/${id}`, payload))
}

export async function fetchRplConfiguration(resource) {
  return read(await http.get(`/admin/rpl/${resource}`))
}

export async function createRplConfiguration(resource, payload) {
  return read(await http.post(`/admin/rpl/${resource}`, payload))
}

export async function updateRplConfiguration(resource, id, payload) {
  return read(await http.put(`/admin/rpl/${resource}/${id}`, payload))
}

export async function deleteRplConfiguration(resource, id) {
  return read(await http.delete(`/admin/rpl/${resource}/${id}`))
}

export async function fetchRplSettings() {
  return read(await http.get('/admin/rpl/settings'))
}

export async function updateRplSettings(payload) {
  return read(await http.put('/admin/rpl/settings', payload))
}
