import { http } from '../../../services/http'

/*
 * The Professional Academic RPL pathway — Diploma / Master / Doctorate.
 *
 * A sibling of rplService, deliberately not an extension of it. The two
 * pathways are separate domains on the server (separate tables, separate
 * routes), and a shared client would quietly invite a shared screen, which is
 * how two governed processes end up entangled.
 *
 * Note the prefix difference: admin calls sit under /academic-rpl, applicant
 * calls under /my/academic-rpl. The CMS only uses the admin ones.
 */

function read(response) {
  return response.data
}

export async function fetchAcademicReferenceData() {
  return read(await http.get('/academic-rpl/reference-data'))
}

export async function fetchAcademicApplications(params = {}) {
  return read(await http.get('/academic-rpl/applications', { params }))
}

export async function fetchAcademicApplication(publicId) {
  return read(await http.get(`/academic-rpl/applications/${publicId}`))
}

export async function confirmAcademicEligibility(publicId, payload) {
  return read(await http.post(`/academic-rpl/applications/${publicId}/eligibility`, payload))
}

/** Stage 4. Reads the uploaded documents; returns an extraction, never a score. */
export async function analyseAcademicApplication(publicId, payload = {}) {
  return read(await http.post(`/academic-rpl/applications/${publicId}/analyse`, payload))
}

/** Computed fresh and unsaved, so newly verified evidence can be previewed. */
export async function fetchAcademicReadiness(publicId) {
  return read(await http.get(`/academic-rpl/applications/${publicId}/readiness`))
}

/** Persists the scores AND issues a recommendation. A governed act, not a page load. */
export async function recordAcademicRecommendation(publicId, payload) {
  return read(await http.post(`/academic-rpl/applications/${publicId}/recommendation`, payload))
}

export async function fetchAcademicGapPlan(publicId, params = {}) {
  return read(await http.get(`/academic-rpl/applications/${publicId}/gap-plan`, { params }))
}

/** The gate on the whole pathway: nothing scores until the framework is approved. */
export async function approveAcademicCompetency(competencyId, payload) {
  return read(await http.post(`/academic-rpl/competencies/${competencyId}/approve`, payload))
}

export async function generateAcademicDiagnostic(publicId, payload) {
  return read(await http.post(`/academic-rpl/diagnostics/generate/${publicId}`, payload))
}

export async function fetchAcademicDiagnostic(diagnosticId) {
  return read(await http.get(`/academic-rpl/diagnostics/${diagnosticId}`))
}

export async function updateAcademicDiagnosticItem(itemId, payload) {
  return read(await http.put(`/academic-rpl/diagnostics/items/${itemId}`, payload))
}

export async function approveAcademicDiagnosticItem(itemId) {
  return read(await http.post(`/academic-rpl/diagnostics/items/${itemId}/approve`))
}

export async function rejectAcademicDiagnosticItem(itemId, payload) {
  return read(await http.post(`/academic-rpl/diagnostics/items/${itemId}/reject`, payload))
}

export async function issueAcademicDiagnostic(diagnosticId, payload = {}) {
  return read(await http.post(`/academic-rpl/diagnostics/${diagnosticId}/issue`, payload))
}
