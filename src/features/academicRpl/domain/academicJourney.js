/*
 * THE ACADEMIC PATH IN THE SAME SHAPE AS THE FIRST (owner, 18 Oct 2026: "the
 * second path will be same as the first but different levels and courses and
 * certificates"; PLATFORM-JOURNEY-SPEC §8).
 *
 * Its own five steps, computed from what the academic case already carries, for
 * the shared JourneyStepper; and its status codes as words, never raw. When the
 * path gains learning, a final exam and a certificate, their steps are appended
 * here and the same stepper shows them.
 */

const L = (ar, en) => Object.freeze({ ar, en })

export const ACADEMIC_STEPS = Object.freeze([
  { key: 'eligibility', label: L('الأهلية', 'Eligibility') },
  { key: 'analysis', label: L('تحليل الأدلة', 'Evidence analysis') },
  { key: 'diagnostic', label: L('الاختبار التشخيصي', 'Diagnostic test') },
  { key: 'recommendation', label: L('التوصية', 'Recommendation') },
  { key: 'gap_plan', label: L('خطة سد الفجوات', 'Gap plan') },
])

/** A diagnostic counts as taken once the client answered it (and after it is assessed). */
export const DIAGNOSTIC_DONE_STATUSES = Object.freeze(['answered', 'assessed'])

/** Status words for the academic list, case, evidence and diagnostics; any other code is shown as itself. */
export const ACADEMIC_STATUS_LABELS = Object.freeze({
  draft: L('مسودة', 'Draft'),
  submitted: L('مُرسل', 'Submitted'),
  withdrawn: L('مسحوب', 'Withdrawn'),
  pending_review: L('بانتظار المراجعة', 'Awaiting review'),
  approved: L('معتمد', 'Approved'),
  issued: L('صادر', 'Issued'),
  answered: L('مُجاب', 'Answered'),
  assessed: L('مُقيَّم', 'Assessed'),
  cancelled: L('ملغى', 'Cancelled'),
  verified: L('تم التحقق', 'Verified'),
  under_review: L('قيد المراجعة', 'Under review'),
  rejected: L('مرفوض', 'Rejected'),
  new: L('جديد', 'New'),
})

/** The word for a status code, or null when the code has none (the caller shows the code itself, isolated). */
export function academicStatusLabel(code, language) {
  const label = ACADEMIC_STATUS_LABELS[code]
  return label ? label[language === 'ar' ? 'ar' : 'en'] : null
}

export function academicSteps(language) {
  const lang = language === 'ar' ? 'ar' : 'en'
  return ACADEMIC_STEPS.map((step) => ({ key: step.key, label: step.label[lang] }))
}

/** Which steps are done: from the case, and from a gap plan computed on the page. */
export function academicStepsDone(application, { gapPlan = null } = {}) {
  const diagnostics = Array.isArray(application?.diagnostics) ? application.diagnostics : []
  const recommendations = Array.isArray(application?.recommendations) ? application.recommendations : []
  const gapPlans = Array.isArray(application?.gap_plans) ? application.gap_plans : []
  return {
    eligibility: Boolean(application?.eligibility_confirmed),
    analysis: Boolean(application?.analyses?.[0]),
    diagnostic: diagnostics.some((diagnostic) => DIAGNOSTIC_DONE_STATUSES.includes(diagnostic?.status)),
    recommendation: recommendations.length > 0,
    gap_plan: Boolean(gapPlan) || gapPlans.length > 0,
  }
}

/**
 * The stepper's states: each done step is done, the first step not done is the
 * current one, and the rest are upcoming. A withdrawn case is closed where it stood.
 */
export function academicJourney(application, options = {}) {
  const done = academicStepsDone(application, options)
  const current = ACADEMIC_STEPS.find((step) => !done[step.key])?.key || null
  const withdrawn = application?.status === 'withdrawn'
  const states = {}
  let reachedCurrent = false
  for (const step of ACADEMIC_STEPS) {
    if (step.key === current) {
      states[step.key] = withdrawn ? 'closed' : 'current'
      reachedCurrent = true
    } else if (!reachedCurrent && done[step.key]) {
      states[step.key] = 'done'
    } else {
      states[step.key] = withdrawn ? 'skipped' : done[step.key] ? 'done' : 'upcoming'
    }
  }
  return { states, current }
}
