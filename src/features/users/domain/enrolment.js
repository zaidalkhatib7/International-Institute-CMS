/*
 * WHY STAFF CANNOT ENROL THE CLIENT IN A COURSE (review of the fixes, 17 Oct 2026;
 * J09-F1 on the platform).
 *
 * POST /admin/users/{user}/enrollments refuses a course of the Competency Gap
 * Learning Library with 422 and the purchase gate's reason_code
 * (RplCoursePlanGate), with a precise message in both languages (message_label).
 * The platform says each refusal in its own words, never the old single sentence
 * "outside the client's approved learning plan" for all of them:
 *
 *   rpl_course_not_in_approved_plan               no approved plan of the client holds it
 *   rpl_course_already_bought                     the client already holds it from the plan
 *   rpl_plan_not_active                           on the plan, but the request is not at the course stage
 *   rpl_case_closed_with_experience_certificate   the request completed with the Experience
 *                                                 Confirmation Certificate: its courses are no longer sold
 *
 * The platform has no override form, so no refusal tells staff to override. A
 * code the platform does not know yet shows the API's own message, in the
 * reader's language when the API sends it. Nothing is charged on any of them:
 * the gate refuses before the payment, and inside the purchase it rolls back.
 */

export const ENROLMENT_GATE_CODES = Object.freeze([
  'rpl_course_not_in_approved_plan',
  'rpl_course_already_bought',
  'rpl_plan_not_active',
  'rpl_case_closed_with_experience_certificate',
])

export const ENROLMENT_REFUSAL_COPY = {
  ar: {
    rpl_course_not_in_approved_plan: 'هذه الدورة خارج خطة التعلم المعتمدة للعميل، فلا يمكن تسجيله فيها من المنصة. لم يُخصم شيء.',
    rpl_course_already_bought: 'لدى العميل هذه الدورة بالفعل من خطة التعلم الخاصة به. لم يُخصم شيء.',
    rpl_plan_not_active: 'هذه الدورة ضمن خطة التعلم الخاصة بالعميل، لكن الخطة ليست سارية الآن: الطلب ليس في مرحلة الدورات. لم يُخصم شيء.',
    rpl_case_closed_with_experience_certificate: 'اكتمل طلب العميل بشهادة تثبيت الخبرة، لذلك لم تعد دورات خطة التعلم الخاصة به تُباع. لم يُخصم شيء.',
  },
  en: {
    rpl_course_not_in_approved_plan: 'This course is outside the client\'s approved learning plan, so the client cannot be enrolled in it from the platform. Nothing was charged.',
    rpl_course_already_bought: 'The client already holds this course from their learning plan. Nothing was charged.',
    rpl_plan_not_active: 'This course is on the client\'s learning plan, but the plan is not in force now: the request is not at the course stage. Nothing was charged.',
    rpl_case_closed_with_experience_certificate: 'The client\'s request was completed with the Experience Confirmation Certificate, so the courses of its learning plan are no longer sold. Nothing was charged.',
  },
}

function apiMessage(data, language) {
  const label = data?.message_label
  if (label && typeof label === 'object') {
    const text = label[language] || label.en
    if (typeof text === 'string' && text.trim() !== '') return text
  }
  return typeof data?.message === 'string' && data.message.trim() !== '' ? data.message : null
}

/** The purchase gate's 422 refusal in words, or null when the error is not one (the caller's own handling then applies). */
export function enrolmentRefusal(error, language) {
  if (Number(error?.response?.status) !== 422) return null
  const data = error?.response?.data || {}
  const code = data.reason_code
  if (typeof code !== 'string' || !code.startsWith('rpl_')) return null
  const lang = language === 'ar' ? 'ar' : 'en'
  return ENROLMENT_REFUSAL_COPY[lang][code] || apiMessage(data, lang)
}
