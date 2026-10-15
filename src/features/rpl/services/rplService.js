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

export async function generateRplAiAdvisory(id, payload = {}) {
  return read(await http.post(`/admin/rpl/assessments/${id}/ai-advisories`, payload, {
    // Gemini may need longer than the normal CMS request budget for a full
    // rubric-and-evidence advisory. Keep this exception scoped to AI work.
    timeout: 5 * 60 * 1000,
  }))
}

export async function acknowledgeRplAiAdvisory(id) {
  return read(await http.post(`/admin/rpl/ai-advisories/${id}/acknowledge`))
}

/*
 * DOCUMENT SCREENING (owner flow of 12 Oct 2026, P2).
 *
 * Staff-only: rpl.screening.view reads and acknowledges, rpl.screening.run
 * re-runs (at most 5 per case per calendar day, 429 beyond). The application is
 * addressed by public_id like every other case route, and a screening by its
 * own public_id. A re-run only QUEUES the job, so it needs no AI timeout.
 */
export async function fetchRplScreenings(applicationId) {
  return read(await http.get(`/admin/rpl/applications/${applicationId}/screenings`))
}

export async function requestRplScreening(applicationId) {
  return read(await http.post(`/admin/rpl/applications/${applicationId}/screenings`))
}

export async function acknowledgeRplScreening(screeningPublicId) {
  return read(await http.post(`/admin/rpl/screenings/${screeningPublicId}/acknowledge`))
}

/*
 * THE STAFF DECISION, THE INTERVIEW AND THE DECLINE (owner flow of 12 Oct 2026, P3).
 *
 * The case is addressed by public_id, an interview by its numeric id. Reading
 * the decisions needs rpl.screening.view (they carry the screening snapshot);
 * recording one, and declining, need rpl.screening.decide; every interview call
 * needs rpl.interviews.manage. Each of these is the only way into its target
 * status: the generic transition route refuses those moves.
 */
export async function fetchRplScreeningDecisions(applicationId) {
  return read(await http.get(`/admin/rpl/applications/${applicationId}/screening-decisions`))
}

export async function recordRplScreeningDecision(applicationId, payload) {
  return read(await http.post(`/admin/rpl/applications/${applicationId}/screening-decision`, payload))
}

export async function declineRplApplication(applicationId, payload) {
  return read(await http.post(`/admin/rpl/applications/${applicationId}/decline`, payload))
}

export async function fetchRplInterviews(applicationId) {
  return read(await http.get(`/admin/rpl/applications/${applicationId}/interviews`))
}

export async function offerRplInterview(applicationId, payload) {
  return read(await http.post(`/admin/rpl/applications/${applicationId}/interviews`, payload))
}

export async function scheduleRplCaseInterview(interviewId, payload) {
  return read(await http.post(`/admin/rpl/interviews/${interviewId}/schedule`, payload))
}

export async function completeRplInterview(interviewId, payload = {}) {
  return read(await http.post(`/admin/rpl/interviews/${interviewId}/complete`, payload))
}

export async function markRplInterviewNoShow(interviewId) {
  return read(await http.post(`/admin/rpl/interviews/${interviewId}/no-show`))
}

export async function cancelRplInterview(interviewId, payload) {
  return read(await http.post(`/admin/rpl/interviews/${interviewId}/cancel`, payload))
}

export async function decideRplInterview(interviewId, payload) {
  return read(await http.post(`/admin/rpl/interviews/${interviewId}/decision`, payload))
}

// ===== Downloads (PDF/CSV exports) =====

function saveDownload(response, fallbackName) {
  const disposition = response.headers?.['content-disposition'] || ''
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)/i.exec(disposition)
  const name = match ? decodeURIComponent(match[1]) : fallbackName
  const url = URL.createObjectURL(response.data)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export async function exportRplAiAdvisory(id, format = 'pdf') {
  const response = await http.get(`/admin/rpl/ai-advisories/${id}/export`, {
    params: { format },
    responseType: 'blob',
  })
  saveDownload(response, `gemini-advisory-${id}.${format}`)
}

export async function exportDynamicAssessment(id, format = 'pdf') {
  const response = await http.get(`/admin/rpl/dynamic-assessments/${id}/export`, {
    params: { format },
    responseType: 'blob',
  })
  saveDownload(response, `dynamic-assessment-${id}.${format}`)
}

// ===== Governed dynamic assessment (25–50 Gemini-drafted questions) =====

const AI_TIMEOUT = { timeout: 5 * 60 * 1000 }

export async function fetchDynamicAssessments(params = {}) {
  return read(await http.get('/admin/rpl/dynamic-assessments', { params }))
}

export async function createDynamicAssessment(assessmentId) {
  return read(await http.post(`/admin/rpl/dynamic-assessments/from-assessment/${assessmentId}`))
}

export async function fetchDynamicAssessment(id) {
  return read(await http.get(`/admin/rpl/dynamic-assessments/${id}`))
}

export async function generateDynamicAssessmentDraft(id) {
  return read(await http.post(`/admin/rpl/dynamic-assessments/${id}/generate`, {}, AI_TIMEOUT))
}

export async function updateDynamicAssessmentItem(itemId, payload) {
  return read(await http.put(`/admin/rpl/dynamic-assessments/items/${itemId}`, payload))
}

export async function addDynamicAssessmentItem(id, payload) {
  return read(await http.post(`/admin/rpl/dynamic-assessments/${id}/items`, payload))
}

export async function rejectDynamicAssessmentItem(itemId, payload = {}) {
  return read(await http.post(`/admin/rpl/dynamic-assessments/items/${itemId}/reject`, payload))
}

export async function regenerateDynamicAssessmentItem(itemId) {
  return read(await http.post(`/admin/rpl/dynamic-assessments/items/${itemId}/regenerate`, {}, AI_TIMEOUT))
}

export async function approveDynamicAssessmentItem(itemId) {
  return read(await http.post(`/admin/rpl/dynamic-assessments/items/${itemId}/approve`))
}

export async function approveAllDynamicAssessmentItems(id) {
  return read(await http.post(`/admin/rpl/dynamic-assessments/${id}/approve-all`))
}

export async function sendDynamicAssessment(id) {
  return read(await http.post(`/admin/rpl/dynamic-assessments/${id}/send`))
}

/*
 * Reopen the answering window on a delivered assessment.
 *
 * Allowed from `issued` when the window closed or was never opened at all
 * (`due_at` is written by the applicant opening the assessment, not by sending
 * it), and from `answered` or `assessed` with questions still outstanding. The
 * question set and every answer already given are preserved — the applicant
 * resumes rather than restarts. The reason is required by the server because
 * this is the one action that hands a delivered assessment back to the
 * applicant, and the audit trail has to say on whose judgement and why.
 */
export async function reissueDynamicAssessment(id, payload) {
  return read(await http.post(`/admin/rpl/dynamic-assessments/${id}/reissue`, payload))
}

/*
 * Withdraw a delivered question set the applicant will never finish.
 *
 * Reopening serves an applicant who is still there. This serves the case that
 * would otherwise be stuck forever: an outstanding issued set blocks every AI
 * evaluation on the applicant, so an abandoned assessment would remove the
 * advisory and the final evaluation from that case permanently. Withdrawing
 * deletes nothing — the frozen questions and any partial answers stay on the
 * record — and it is not a shortcut past the ordering rule: a withdrawn set was
 * never answered, so it neither blocks nor feeds an evaluation.
 */
export async function cancelDynamicAssessment(id, payload) {
  return read(await http.post(`/admin/rpl/dynamic-assessments/${id}/cancel`, payload))
}

/*
 * Mark a REFERRED entry quiz again once staff have fixed its cause (in practice
 * the pass mark setting), from the same frozen answers (owner flow of 12 Oct
 * 2026, P4). The server requires `reason` (10 to 2000 characters) and audits it;
 * it answers 422 errors.set while the cause is still there, and for any result
 * that is not referred: a passed or failed result is never marked again.
 */
export async function rescoreDynamicAssessment(id, payload) {
  return read(await http.post(`/admin/rpl/dynamic-assessments/${id}/rescore`, payload))
}

export async function finalEvaluateDynamicAssessment(id) {
  return read(await http.post(`/admin/rpl/dynamic-assessments/${id}/final-evaluation`, {}, AI_TIMEOUT))
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

/*
 * The assessment-scoped interview routes, kept for the rows created before the
 * interview moved to the case (owner flow of 12 Oct 2026). The CMS no longer
 * schedules one here, and the API refuses a new one (422, R17): new interviews
 * are offered on the case. The update is still how the outcome of such a legacy
 * row is recorded.
 */
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

export async function startAdminRplAssessment(applicationId) {
  return read(await http.post(`/admin/rpl/applications/${applicationId}/admin-assessment`))
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

export async function fetchRplSourceOfTruth() {
  return read(await http.get('/admin/rpl/source-of-truth'))
}

export async function updateRplSettings(payload) {
  return read(await http.put('/admin/rpl/settings', payload))
}

/*
 * GAP CLOSURE ENGINE (owner specification, 5 Aug 2026).
 *
 * Deterministic and read-only: it computes which training packages close the
 * gaps an assessment recorded. Bound by public_id like every other RPL
 * application route.
 */
export async function fetchGapClosurePlan(applicationPublicId) {
  const response = await http.get(`/admin/rpl/applications/${applicationPublicId}/gap-closure-plan`)
  return response.data
}

/*
 * THE GOVERNED COURSE PLAN (owner flow of 12 Oct 2026, plan 4.7 and 5.4-5.6, P5).
 *
 * Gemini proposes the courses, at least the governed minimum for the client's
 * target level after a passed entry quiz; staff add and remove courses with a
 * reason and approve the plan. Reading needs rpl.applications.view; every write
 * needs rpl.course_plans.manage. The case is addressed by public_id, a plan
 * version by its own public_id, an item by its id. Every write sends the PLAN's
 * lock_version and gets 409 (code rpl_course_plan_stale) when someone else
 * changed the plan first. Generating and regenerating call Gemini synchronously,
 * so only those two take the AI timeout. saveRplCompletionPlan above is retired
 * (the API answers 423) and is left as it is.
 */
export async function fetchRplCoursePlan(applicationId) {
  return read(await http.get(`/admin/rpl/applications/${applicationId}/course-plan`))
}

export async function fetchRplCoursePlanCatalogue(applicationId) {
  return read(await http.get(`/admin/rpl/applications/${applicationId}/course-plan/catalogue`))
}

export async function generateRplCoursePlan(applicationId, payload = {}) {
  return read(await http.post(`/admin/rpl/applications/${applicationId}/course-plan/generate`, payload, AI_TIMEOUT))
}

export async function fetchRplCoursePlanVersion(planId) {
  return read(await http.get(`/admin/rpl/course-plans/${planId}`))
}

export async function regenerateRplCoursePlan(planId, payload) {
  return read(await http.post(`/admin/rpl/course-plans/${planId}/regenerate`, payload, AI_TIMEOUT))
}

export async function addRplCoursePlanItem(planId, payload) {
  return read(await http.post(`/admin/rpl/course-plans/${planId}/items`, payload))
}

export async function removeRplCoursePlanItem(planId, itemId, payload) {
  return read(await http.delete(`/admin/rpl/course-plans/${planId}/items/${itemId}`, { data: payload }))
}

export async function approveRplCoursePlan(planId, payload) {
  return read(await http.post(`/admin/rpl/course-plans/${planId}/approve`, payload))
}

export async function amendRplCoursePlan(planId, payload) {
  return read(await http.post(`/admin/rpl/course-plans/${planId}/amend`, payload))
}

export async function discardRplCoursePlan(planId, payload) {
  return read(await http.post(`/admin/rpl/course-plans/${planId}/discard`, payload))
}

/*
 * AFTER THE ENTRY QUIZ (owner model of 15 Oct 2026, P6): the payments, the
 * Experience Confirmation Certificate, its wording, and the final exam.
 *
 * A charge is addressed by its public_id, an experience certificate by its
 * public_id, a wording by its id and a final-exam try by its verification id;
 * the case by public_id as everywhere. Every staff write sends the row's
 * lock_version (a try's void and reopen send only their reason) and gets 409
 * with the row's own code when someone else changed it first. Permissions:
 * reading needs rpl.applications.view; confirming and cancelling a payment
 * rpl.payments.reconcile; refunding finance.manage; approving or refusing a
 * certificate rpl.experience_certificates.approve; drafting the wording
 * rpl.settings.manage, and approving it rpl.certificate_wording.approve (the
 * owner's role only); voiding or reopening a try rpl.applications.manage.
 * Nothing here calls Gemini, so nothing takes the AI timeout.
 */
export async function fetchRplCharges(applicationId) {
  return read(await http.get(`/admin/rpl/applications/${applicationId}/charges`))
}

export async function fetchRplChargeQueue(params = {}) {
  return read(await http.get('/admin/rpl/charges', { params }))
}

export async function confirmRplChargePayment(chargeId, body) {
  return read(await http.post(`/admin/rpl/charges/${chargeId}/confirm-payment`, body))
}

export async function cancelRplCharge(chargeId, body) {
  return read(await http.post(`/admin/rpl/charges/${chargeId}/cancel`, body))
}

export async function refundRplCharge(chargeId, body) {
  return read(await http.post(`/admin/rpl/charges/${chargeId}/refund`, body))
}

export async function fetchRplExperienceCertificate(applicationId) {
  return read(await http.get(`/admin/rpl/applications/${applicationId}/experience-certificate`))
}

export async function fetchRplExperienceCertificateQueue(params = {}) {
  return read(await http.get('/admin/rpl/experience-certificates', { params }))
}

export async function approveRplExperienceCertificate(id, body) {
  return read(await http.post(`/admin/rpl/experience-certificates/${id}/approve`, body))
}

export async function refuseRplExperienceCertificate(id, body) {
  return read(await http.post(`/admin/rpl/experience-certificates/${id}/refuse`, body))
}

export async function fetchRplCertificateWordings(code) {
  return read(await http.get('/admin/rpl/certificate-wordings', { params: { code } }))
}

export async function draftRplCertificateWording(body) {
  return read(await http.post('/admin/rpl/certificate-wordings', body))
}

export async function updateRplCertificateWording(id, body) {
  return read(await http.put(`/admin/rpl/certificate-wordings/${id}`, body))
}

export async function approveRplCertificateWording(id, body) {
  return read(await http.post(`/admin/rpl/certificate-wordings/${id}/approve`, body))
}

export async function fetchRplFinalExam(applicationId) {
  return read(await http.get(`/admin/rpl/applications/${applicationId}/final-exam`))
}

export async function voidRplFinalExamTry(id, body) {
  return read(await http.post(`/admin/rpl/final-exam/tries/${id}/void`, body))
}

export async function reopenRplFinalExamTry(id, body) {
  return read(await http.post(`/admin/rpl/final-exam/tries/${id}/reopen`, body))
}

export async function fetchRplAfterQuizAttention() {
  return read(await http.get('/admin/rpl/after-quiz/attention'))
}

/**
 * Record a certificate fee received outside the platform.
 *
 * The only path that sets payment_status='paid', and credential issuance is
 * gated on it. Idempotent and row-locked server-side: the same reference is
 * never counted twice, and one already used on another order is refused 409.
 */
export async function reconcileRplPayment(applicationPublicId, payload) {
  return read(await http.post(`/admin/rpl/applications/${applicationPublicId}/payment-reconciliation`, payload))
}
