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

/*
 * مكتبة الفجوات الأكاديمية — the academic gap library.
 *
 * What every gap plan is able to recommend from. A package the engine cannot
 * see is a package no applicant will ever be offered, which is why publication
 * is gated rather than a simple status flip.
 *
 * THE UNIT HERE IS A PACKAGE, AND THE ADDRESS IS ITS CODE.
 *
 * These calls used to say `module` and pass a numeric id. Both were wrong under
 * the Golden Specification: what this library authors is a PACKAGE (LD-001),
 * and GMS reserves "module" for a learning unit INSIDE one. The server renamed
 * the routes rather than aliasing them, so nothing here is kept for
 * compatibility — a /modules call now 404s, and a dead export would only hide
 * the next caller that reaches for it.
 *
 * Packages are bound by `code` server-side (AcademicPackage::getRouteKeyName),
 * because the code is the identity an academic actually cites and it is
 * URL-safe by construction.
 */

export async function fetchAcademicLibrary() {
  return read(await http.get('/academic-rpl/library'))
}

export async function createAcademicSchool(payload) {
  return read(await http.post('/academic-rpl/library/schools', payload))
}

export async function approveAcademicSchool(schoolId, payload) {
  return read(await http.post(`/academic-rpl/library/schools/${schoolId}/approve`, payload))
}

export async function createAcademicPackage(payload) {
  return read(await http.post('/academic-rpl/library/packages', payload))
}

export async function updateAcademicPackage(code, payload) {
  return read(await http.put(`/academic-rpl/library/packages/${encodeURIComponent(code)}`, payload))
}

/**
 * GPS §6 — the declaration the engine depends on: what this package requires.
 *
 * Each row is { id, required_level, classification?, weight? }. `required_level`
 * is mandatory per competency and lives on the PIVOT, because the same
 * competency is required at diploma depth by one package and doctorate depth by
 * another. The old `coverage` field is gone from this level entirely; coverage
 * is now a MODULE pivot, and modules arrive by JSON import.
 */
export async function setAcademicPackageCompetencies(code, competencies) {
  return read(await http.put(
    `/academic-rpl/library/packages/${encodeURIComponent(code)}/competencies`,
    { competencies },
  ))
}

export async function publishAcademicPackage(code) {
  return read(await http.post(`/academic-rpl/library/packages/${encodeURIComponent(code)}/publish`))
}

export async function deleteAcademicPackage(code) {
  return read(await http.delete(`/academic-rpl/library/packages/${encodeURIComponent(code)}`))
}

/*
 * Bulk JSON intake — owner decision 4, the official v1.0 route into the
 * library. Inspect and import run the identical validation and differ only in
 * commitment: inspect writes nothing, import lands the whole file or none of it.
 *
 * Both inspect calls answer 200 even for a file full of errors, because finding
 * the errors IS the inspection succeeding. A refused import answers 422 with
 * error ACADEMIC_IMPORT_REFUSED and the full report under `report`.
 */

export async function inspectAcademicPackageFile(payload) {
  return read(await http.post('/academic-rpl/library/import/packages/inspect', { payload }))
}

export async function importAcademicPackageFile(payload) {
  return read(await http.post('/academic-rpl/library/import/packages', { payload }))
}

export async function inspectAcademicCompetencyFile(payload) {
  return read(await http.post('/academic-rpl/library/import/competencies/inspect', { payload }))
}

export async function importAcademicCompetencyFile(payload) {
  return read(await http.post('/academic-rpl/library/import/competencies', { payload }))
}

/**
 * Open an academic case for a client from the administrator's workspace.
 *
 * Distinct from the applicant's own POST /my/academic-rpl/applications: this
 * one names the subject, and the server refuses it when that subject is staff.
 */
export async function createAcademicApplicationForClient(payload) {
  return read(await http.post('/academic-rpl/applications', payload))
}
