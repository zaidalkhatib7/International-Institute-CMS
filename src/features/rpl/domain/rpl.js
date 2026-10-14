import { formatLocalizedNumber } from '../../../utils/localization'

export const MAX_EVIDENCE_FILE_SIZE = 50 * 1024 * 1024

export const EVIDENCE_ACCEPT = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'video/mp4',
  'audio/mpeg',
]

export const EVIDENCE_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'docx', 'xlsx', 'pptx', 'mp4', 'mp3']

export const EVIDENCE_UPLOAD_POLICY = Object.freeze({
  maxFileSizeBytes: MAX_EVIDENCE_FILE_SIZE,
  extensions: Object.freeze([...EVIDENCE_EXTENSIONS]),
})

const categoryDefinitions = [
  {
    code: 'identity',
    labels: { ar: 'الهوية الشخصية', en: 'Personal identity' },
    examples: {
      ar: ['جواز السفر', 'الهوية الوطنية', 'رخصة القيادة', 'صورة شخصية'],
      en: ['Passport', 'National ID', 'Driving licence', 'Portrait photo'],
    },
  },
  {
    code: 'academic_qualification',
    labels: { ar: 'المؤهلات العلمية', en: 'Academic qualifications' },
    examples: {
      ar: ['شهادة الثانوية', 'البكالوريوس', 'الماجستير', 'الدكتوراه', 'كشف العلامات'],
      en: ['Secondary certificate', 'Bachelor degree', 'Master degree', 'Doctorate', 'Transcript'],
    },
  },
  {
    code: 'professional_experience',
    labels: { ar: 'الخبرة المهنية', en: 'Professional experience' },
    examples: {
      ar: ['عقد عمل', 'كتاب خبرة', 'قرار تعيين', 'قرار ترقية', 'بطاقة موظف'],
      en: ['Employment contract', 'Experience letter', 'Appointment', 'Promotion', 'Employee card'],
    },
  },
  {
    code: 'training_certification',
    labels: { ar: 'الدورات والشهادات المهنية', en: 'Training and certifications' },
    examples: {
      ar: ['إسعافات أولية', 'إدارة مشاريع', 'تدريب المدربين', 'ISO', 'شهادات ICPC Academy'],
      en: ['First aid', 'Project management', 'Training of Trainers', 'ISO', 'ICPC Academy certificate'],
    },
  },
  {
    code: 'portfolio',
    labels: { ar: 'نماذج الأعمال', en: 'Portfolio' },
    examples: {
      ar: ['تقرير رسمي', 'دراسة قانونية', 'خطة مشروع', 'عرض تقديمي', 'تطبيق مطور'],
      en: ['Official report', 'Legal study', 'Project plan', 'Presentation', 'Developed application'],
    },
  },
  {
    code: 'photo_video',
    labels: { ar: 'الصور والفيديوهات', en: 'Photos and videos' },
    examples: {
      ar: ['صورة تنفيذ مشروع', 'صورة أثناء التدريب', 'فيديو تقديم دورة', 'فيديو مهمة ميدانية'],
      en: ['Project photo', 'Training photo', 'Course delivery video', 'Field-work video'],
    },
  },
  {
    code: 'recommendation',
    labels: { ar: 'خطابات التوصية', en: 'Recommendation letters' },
    examples: {
      ar: ['رسالة توصية', 'كتاب تزكية', 'خطاب شكر', 'شهادة حسن أداء'],
      en: ['Recommendation', 'Endorsement', 'Appreciation letter', 'Good-performance certificate'],
    },
  },
  {
    code: 'award_accreditation',
    labels: { ar: 'الجوائز والاعتمادات', en: 'Awards and accreditations' },
    examples: {
      ar: ['أفضل موظف', 'جائزة ابتكار', 'وسام تكريم', 'اعتماد مهني', 'عضوية مهنية'],
      en: ['Employee award', 'Innovation award', 'Honour', 'Professional accreditation', 'Membership'],
    },
  },
  {
    code: 'electronic_link',
    labels: { ar: 'الروابط الإلكترونية', en: 'Electronic links' },
    examples: {
      ar: ['LinkedIn', 'ORCID', 'Google Scholar', 'GitHub', 'YouTube', 'صفحة مشروع'],
      en: ['LinkedIn', 'ORCID', 'Google Scholar', 'GitHub', 'YouTube', 'Project page'],
    },
  },
]

export const EVIDENCE_CATEGORIES = categoryDefinitions

export const EVIDENCE_STATUS = {
  new: { variant: 'info', labels: { ar: 'جديد', en: 'New' } },
  under_review: { variant: 'warning', labels: { ar: 'قيد المراجعة', en: 'Under review' } },
  verified: { variant: 'success', labels: { ar: 'تم التحقق', en: 'Verified' } },
  clarification_required: { variant: 'warning', labels: { ar: 'يحتاج توضيحًا', en: 'Needs clarification' } },
  rejected: { variant: 'danger', labels: { ar: 'مرفوض', en: 'Rejected' } },
  unverifiable: { variant: 'danger', labels: { ar: 'غير قابل للتحقق', en: 'Unverifiable' } },
}

export const APPLICATION_STATUS = {
  draft: { variant: 'neutral', labels: { ar: 'مسودة', en: 'Draft' } },
  submitted: { variant: 'info', labels: { ar: 'تم الإرسال', en: 'Submitted' } },
  administrative_review: { variant: 'warning', labels: { ar: 'مراجعة إدارية', en: 'Administrative review' } },
  awaiting_applicant: { variant: 'warning', labels: { ar: 'بانتظار المتقدم', en: 'Awaiting applicant' } },
  evidence_verification: { variant: 'warning', labels: { ar: 'قيد التحقق', en: 'Evidence verification' } },
  // Owner flow of 12 Oct 2026 (P3): staff asked for an interview before the quiz.
  interview_required: { variant: 'warning', labels: { ar: 'مقابلة مطلوبة', en: 'Interview required' } },
  ready_for_assessment: { variant: 'info', labels: { ar: 'جاهز للتقييم', en: 'Ready for assessment' } },
  assessment_in_progress: { variant: 'warning', labels: { ar: 'قيد التقييم', en: 'Assessment in progress' } },
  // Owner flow of 12 Oct 2026 (P5): the course plan is drafted, then in force.
  course_plan_review: { variant: 'info', labels: { ar: 'مراجعة خطة الدورات', en: 'Course plan review' } },
  course_plan_active: { variant: 'success', labels: { ar: 'خطة الدورات سارية', en: 'Course plan active' } },
  remediation_required: { variant: 'danger', labels: { ar: 'يحتاج استكمال', en: 'Remediation required' } },
  committee_review: { variant: 'info', labels: { ar: 'لجنة الاعتماد', en: 'Committee review' } },
  quality_review: { variant: 'info', labels: { ar: 'مراجعة الجودة', en: 'Quality review' } },
  decision_issued: { variant: 'success', labels: { ar: 'صدر القرار', en: 'Decision issued' } },
  appeal_open: { variant: 'warning', labels: { ar: 'تظلم مفتوح', en: 'Appeal open' } },
  under_appeal: { variant: 'warning', labels: { ar: 'قيد التظلم', en: 'Under appeal' } },
  credential_pending: { variant: 'info', labels: { ar: 'بانتظار إصدار الاعتماد', en: 'Credential pending' } },
  returned_for_rework: { variant: 'warning', labels: { ar: 'معاد للاستكمال', en: 'Returned for rework' } },
  withdrawn: { variant: 'neutral', labels: { ar: 'مسحوب', en: 'Withdrawn' } },
  completed: { variant: 'success', labels: { ar: 'مكتمل', en: 'Completed' } },
  rejected: { variant: 'danger', labels: { ar: 'مرفوض', en: 'Rejected' } },
}

/*
 * WHY A CASE WAS DECLINED (owner flow of 12 Oct 2026).
 *
 * App\Enums\RplDeclineReason: the fixed list RplWorkflowService::transition
 * stamps on every move into `rejected` as `decline_reason_code`. It is a staff
 * label, not the staff rationale, and it never carries a figure. The screening
 * and interview declines (P3) produce the second to fourth; the quiz decline
 * arrives with P4.
 */
export const DECLINE_REASONS = {
  intake_declined: { labels: { ar: 'رُفض في المراجعة الإدارية الأولية', en: 'Declined at the initial review' } },
  screening_declined: { labels: { ar: 'رُفض بعد فرز الوثائق', en: 'Declined after document screening' } },
  interview_declined: { labels: { ar: 'رُفض بعد المقابلة', en: 'Declined after the interview' } },
  interview_no_show: { labels: { ar: 'لم يحضر المقابلة', en: 'Did not attend the interview' } },
  quiz_below_pass_mark: { labels: { ar: 'دون علامة النجاح في الاختبار', en: 'Below the quiz pass mark' } },
  committee_rejected: { labels: { ar: 'رفض لجنة الاعتماد', en: 'Rejected by the accreditation committee' } },
  appeal_rejected: { labels: { ar: 'رُفض بعد التظلم', en: 'Rejected on appeal' } },
}

/*
 * WHAT A DECLINED APPLICANT IS TOLD (D8(b), owner flow of 12 Oct 2026).
 *
 * App\Enums\DeclineCategory: a fixed, neutral list, stored on the case as
 * `decline_applicant_category`. The applicant sees one of these sentences and
 * the date they may apply again: never the staff rationale, never a screening
 * figure, never free text. The admin reference data sends the same list as
 * `decline_categories`; this copy, word for word, stands in when it does not.
 */
export const DECLINE_CATEGORIES = [
  { code: 'documents_not_verified', label: { ar: 'تعذّر التحقق من الوثائق المقدّمة.', en: 'The documents submitted could not be verified.' } },
  { code: 'experience_not_confirmed', label: { ar: 'تعذّر تأكيد الخبرة المهنية المذكورة.', en: 'The professional experience stated could not be confirmed.' } },
  { code: 'interview_not_attended', label: { ar: 'لم تُعقد المقابلة.', en: 'The interview did not take place.' } },
  { code: 'requirements_not_met', label: { ar: 'الطلب لا يستوفي متطلبات المسار.', en: 'The request does not meet the requirements of the pathway.' } },
]

/** The server's decline categories when it sends a usable list, else the fixed copy above. */
export function readDeclineCategories(reference) {
  const sent = Array.isArray(reference?.decline_categories) ? reference.decline_categories.filter((item) => item?.code) : []
  return sent.length ? sent : DECLINE_CATEGORIES
}

/** The applicant-facing sentence for a category code; the code itself when the list does not know it. */
export function declineCategoryLabel(code, language = 'en', categories = DECLINE_CATEGORIES) {
  if (!code) return ''
  const found = categories.find((item) => item.code === code) || DECLINE_CATEGORIES.find((item) => item.code === code)
  return localize(found?.label, language) || code
}

export const PROFESSIONAL_LEVELS = [
  { code: 'practitioner', labels: { ar: 'ممارس مهني', en: 'Professional Practitioner' } },
  { code: 'advanced_practitioner', labels: { ar: 'ممارس مهني متقدم', en: 'Advanced Professional Practitioner' } },
  { code: 'expert', labels: { ar: 'خبير مهني', en: 'Professional Expert' } },
]

export function localize(value, language = 'en') {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  return value?.[language] || value?.en || value?.ar || ''
}

export function getCategory(code, categories = EVIDENCE_CATEGORIES) {
  return categories.find((category) => category.code === code) || EVIDENCE_CATEGORIES.find((category) => category.code === code)
}

export function getApplicationEvidenceCategories(application, fallbackCategories = []) {
  const standard = application?.standard || application?.rpl_standard || {}
  const assigned = standard.evidence_categories || standard.evidenceCategories

  if (!Array.isArray(assigned)) return []

  const fallbackById = new Map((Array.isArray(fallbackCategories) ? fallbackCategories : []).map((category) => [Number(category.id), category]))

  return assigned
    .map((category) => {
      const record = category?.id ? { ...(fallbackById.get(Number(category.id)) || {}), ...category } : category
      const pivot = record?.pivot || {}
      return {
        ...record,
        is_required: pivot.is_required ?? record?.is_required ?? record?.is_required_by_default,
        minimum_items: pivot.minimum_items ?? record?.minimum_items,
        maximum_items: pivot.maximum_items ?? record?.maximum_items,
      }
    })
    .filter((category) => category?.id && category.is_active !== false)
}

export function readApplicationCompleteness(application) {
  const value = application?.completeness
  if (value && typeof value === 'object') return value
  if (typeof value === 'number') return { percentage: value }
  if (application?.completeness_percentage != null) return { percentage: Number(application.completeness_percentage) || 0 }
  return null
}

export function readApplicationDeclarationAccepted(application) {
  const authoritative = readApplicationCompleteness(application)?.declaration?.accepted
  if (authoritative != null) return Boolean(authoritative)

  const frozen = application?.profile_snapshot?.declaration?.accepted
  if (frozen != null) return Boolean(frozen)

  if (Array.isArray(application?.consents)) {
    return application.consents.some((consent) => consent?.accepted === true || consent?.accepted === 1)
  }

  return Boolean(application?.declaration?.accepted ?? application?.consent?.accepted ?? application?.declaration_accepted)
}

/*
 * The decline stamp on a rejected case: its reason and the moment the same client
 * may open a new RPL case. Both were frozen at the rejection, so this reads the
 * stored date and never recomputes one from today's cooldown setting.
 *
 * A case rejected before the stamp existed has neither, yet the API still holds
 * its client to a date: finalised_at plus the governed cooldown days. The staff
 * case view sends that date as effective_reapply_available_at, and it is shown
 * in place of the missing stamp, flagged as derived because a change to the
 * setting still moves it. An unknown code is shown as the code itself rather
 * than hidden.
 *
 * A screening or interview decline (P3) also carries the neutral category the
 * applicant was shown (D8(b)); staff see the same sentence the applicant reads.
 */
export function readApplicationDecline(application, language = 'en', categories = DECLINE_CATEGORIES) {
  const code = application?.decline_reason_code || null
  const stamped = application?.reapply_available_at || null
  const reapplyAvailableAt = stamped || application?.effective_reapply_available_at || null
  if (!code && !reapplyAvailableAt) return null
  const applicantCategory = application?.decline_applicant_category || null

  return {
    code,
    reason: code ? localize(DECLINE_REASONS[code]?.labels, language) || code : null,
    reapplyAvailableAt,
    reapplyDerived: !stamped && Boolean(reapplyAvailableAt),
    ...(applicantCategory ? { applicantCategory, applicantCategoryLabel: declineCategoryLabel(applicantCategory, language, categories) } : {}),
  }
}

export function isEvidenceEligibleForAssessment(evidence, requireVerified = true) {
  if (!evidence || ['rejected', 'unverifiable'].includes(evidence.status)) return false
  return !requireVerified || evidence.status === 'verified'
}

export function getStatusDefinition(status, domain = 'application') {
  const source = domain === 'evidence' ? EVIDENCE_STATUS : APPLICATION_STATUS
  return source[status] || { variant: 'neutral', labels: { ar: status || '—', en: status || '—' } }
}

export function validateEvidenceFile(file) {
  if (!file) return { valid: false, code: 'missing' }
  if (file.size > MAX_EVIDENCE_FILE_SIZE) return { valid: false, code: 'too_large' }

  const extension = file.name?.split('.').pop()?.toLowerCase() || ''
  if (!EVIDENCE_ACCEPT.includes(file.type) && !EVIDENCE_EXTENSIONS.includes(extension)) {
    return { valid: false, code: 'unsupported_type' }
  }

  return { valid: true, code: null }
}

export function evidencePreviewKind(mimeType = '', fileName = '') {
  const value = String(mimeType).toLowerCase()
  const extension = String(fileName).split('.').pop()?.toLowerCase()
  if (value.startsWith('image/') || ['jpg', 'jpeg', 'png'].includes(extension)) return 'image'
  if (value === 'application/pdf' || extension === 'pdf') return 'pdf'
  if (value.startsWith('video/') || extension === 'mp4') return 'video'
  if (value.startsWith('audio/') || extension === 'mp3') return 'audio'
  return 'document'
}

export function bytesToSize(bytes = 0, language = 'en') {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = Number(bytes) || 0
  let index = 0
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024
    index += 1
  }
  return `${formatLocalizedNumber(size, language, { maximumFractionDigits: 1 })} ${units[index]}`
}
