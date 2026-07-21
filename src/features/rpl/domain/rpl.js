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
    labels: { ar: 'الهوية الشخصية', en: 'Personal identity', nl: 'Persoonlijke identiteit' },
    examples: {
      ar: ['جواز السفر', 'الهوية الوطنية', 'رخصة القيادة', 'صورة شخصية'],
      en: ['Passport', 'National ID', 'Driving licence', 'Portrait photo'],
      nl: ['Paspoort', 'Identiteitskaart', 'Rijbewijs', 'Profielfoto'],
    },
  },
  {
    code: 'academic_qualification',
    labels: { ar: 'المؤهلات العلمية', en: 'Academic qualifications', nl: 'Opleidingskwalificaties' },
    examples: {
      ar: ['شهادة الثانوية', 'البكالوريوس', 'الماجستير', 'الدكتوراه', 'كشف العلامات'],
      en: ['Secondary certificate', 'Bachelor degree', 'Master degree', 'Doctorate', 'Transcript'],
      nl: ['Middelbaar diploma', 'Bachelor', 'Master', 'Doctoraat', 'Cijferlijst'],
    },
  },
  {
    code: 'professional_experience',
    labels: { ar: 'الخبرة المهنية', en: 'Professional experience', nl: 'Werkervaring' },
    examples: {
      ar: ['عقد عمل', 'كتاب خبرة', 'قرار تعيين', 'قرار ترقية', 'بطاقة موظف'],
      en: ['Employment contract', 'Experience letter', 'Appointment', 'Promotion', 'Employee card'],
      nl: ['Arbeidscontract', 'Ervaringsverklaring', 'Benoeming', 'Promotie', 'Werknemerskaart'],
    },
  },
  {
    code: 'training_certification',
    labels: { ar: 'الدورات والشهادات المهنية', en: 'Training and certifications', nl: 'Trainingen en certificaten' },
    examples: {
      ar: ['إسعافات أولية', 'إدارة مشاريع', 'تدريب المدربين', 'ISO', 'شهادات ICPC Academy'],
      en: ['First aid', 'Project management', 'Training of Trainers', 'ISO', 'ICPC Academy certificate'],
      nl: ['Eerste hulp', 'Projectmanagement', 'Train-de-trainer', 'ISO', 'ICPC Academy-certificaat'],
    },
  },
  {
    code: 'portfolio',
    labels: { ar: 'نماذج الأعمال', en: 'Portfolio', nl: 'Portfolio' },
    examples: {
      ar: ['تقرير رسمي', 'دراسة قانونية', 'خطة مشروع', 'عرض تقديمي', 'تطبيق مطور'],
      en: ['Official report', 'Legal study', 'Project plan', 'Presentation', 'Developed application'],
      nl: ['Officieel rapport', 'Juridische studie', 'Projectplan', 'Presentatie', 'Ontwikkelde app'],
    },
  },
  {
    code: 'photo_video',
    labels: { ar: 'الصور والفيديوهات', en: 'Photos and videos', nl: "Foto's en video's" },
    examples: {
      ar: ['صورة تنفيذ مشروع', 'صورة أثناء التدريب', 'فيديو تقديم دورة', 'فيديو مهمة ميدانية'],
      en: ['Project photo', 'Training photo', 'Course delivery video', 'Field-work video'],
      nl: ['Projectfoto', 'Trainingsfoto', 'Cursusvideo', 'Veldwerkvideo'],
    },
  },
  {
    code: 'recommendation',
    labels: { ar: 'خطابات التوصية', en: 'Recommendation letters', nl: 'Aanbevelingsbrieven' },
    examples: {
      ar: ['رسالة توصية', 'كتاب تزكية', 'خطاب شكر', 'شهادة حسن أداء'],
      en: ['Recommendation', 'Endorsement', 'Appreciation letter', 'Good-performance certificate'],
      nl: ['Aanbeveling', 'Referentie', 'Dankbrief', 'Prestatieverklaring'],
    },
  },
  {
    code: 'award_accreditation',
    labels: { ar: 'الجوائز والاعتمادات', en: 'Awards and accreditations', nl: 'Prijzen en accreditaties' },
    examples: {
      ar: ['أفضل موظف', 'جائزة ابتكار', 'وسام تكريم', 'اعتماد مهني', 'عضوية مهنية'],
      en: ['Employee award', 'Innovation award', 'Honour', 'Professional accreditation', 'Membership'],
      nl: ['Werknemersprijs', 'Innovatieprijs', 'Ereteken', 'Beroepsaccreditatie', 'Lidmaatschap'],
    },
  },
  {
    code: 'electronic_link',
    labels: { ar: 'الروابط الإلكترونية', en: 'Electronic links', nl: 'Online links' },
    examples: {
      ar: ['LinkedIn', 'ORCID', 'Google Scholar', 'GitHub', 'YouTube', 'صفحة مشروع'],
      en: ['LinkedIn', 'ORCID', 'Google Scholar', 'GitHub', 'YouTube', 'Project page'],
      nl: ['LinkedIn', 'ORCID', 'Google Scholar', 'GitHub', 'YouTube', 'Projectpagina'],
    },
  },
]

export const EVIDENCE_CATEGORIES = categoryDefinitions

export const EVIDENCE_STATUS = {
  new: { variant: 'info', labels: { ar: 'جديد', en: 'New', nl: 'Nieuw' } },
  under_review: { variant: 'warning', labels: { ar: 'قيد المراجعة', en: 'Under review', nl: 'In beoordeling' } },
  verified: { variant: 'success', labels: { ar: 'تم التحقق', en: 'Verified', nl: 'Geverifieerd' } },
  clarification_required: { variant: 'warning', labels: { ar: 'يحتاج توضيحًا', en: 'Needs clarification', nl: 'Toelichting nodig' } },
  rejected: { variant: 'danger', labels: { ar: 'مرفوض', en: 'Rejected', nl: 'Afgewezen' } },
  unverifiable: { variant: 'danger', labels: { ar: 'غير قابل للتحقق', en: 'Unverifiable', nl: 'Niet verifieerbaar' } },
}

export const APPLICATION_STATUS = {
  draft: { variant: 'neutral', labels: { ar: 'مسودة', en: 'Draft', nl: 'Concept' } },
  submitted: { variant: 'info', labels: { ar: 'تم الإرسال', en: 'Submitted', nl: 'Ingediend' } },
  administrative_review: { variant: 'warning', labels: { ar: 'مراجعة إدارية', en: 'Administrative review', nl: 'Administratieve beoordeling' } },
  awaiting_applicant: { variant: 'warning', labels: { ar: 'بانتظار المتقدم', en: 'Awaiting applicant', nl: 'Wacht op aanvrager' } },
  evidence_verification: { variant: 'warning', labels: { ar: 'قيد التحقق', en: 'Evidence verification', nl: 'Bewijsverificatie' } },
  ready_for_assessment: { variant: 'info', labels: { ar: 'جاهز للتقييم', en: 'Ready for assessment', nl: 'Gereed voor beoordeling' } },
  assessment_in_progress: { variant: 'warning', labels: { ar: 'قيد التقييم', en: 'Assessment in progress', nl: 'Beoordeling loopt' } },
  remediation_required: { variant: 'danger', labels: { ar: 'يحتاج استكمال', en: 'Remediation required', nl: 'Aanvulling nodig' } },
  committee_review: { variant: 'info', labels: { ar: 'لجنة الاعتماد', en: 'Committee review', nl: 'Commissiebeoordeling' } },
  quality_review: { variant: 'info', labels: { ar: 'مراجعة الجودة', en: 'Quality review', nl: 'Kwaliteitsbeoordeling' } },
  decision_issued: { variant: 'success', labels: { ar: 'صدر القرار', en: 'Decision issued', nl: 'Besluit genomen' } },
  appeal_open: { variant: 'warning', labels: { ar: 'تظلم مفتوح', en: 'Appeal open', nl: 'Bezwaar geopend' } },
  under_appeal: { variant: 'warning', labels: { ar: 'قيد التظلم', en: 'Under appeal', nl: 'Onder bezwaar' } },
  credential_pending: { variant: 'info', labels: { ar: 'بانتظار إصدار الاعتماد', en: 'Credential pending', nl: 'Certificaat in afwachting' } },
  returned_for_rework: { variant: 'warning', labels: { ar: 'معاد للاستكمال', en: 'Returned for rework', nl: 'Teruggestuurd' } },
  withdrawn: { variant: 'neutral', labels: { ar: 'مسحوب', en: 'Withdrawn', nl: 'Ingetrokken' } },
  completed: { variant: 'success', labels: { ar: 'مكتمل', en: 'Completed', nl: 'Voltooid' } },
  rejected: { variant: 'danger', labels: { ar: 'مرفوض', en: 'Rejected', nl: 'Afgewezen' } },
}

export const PROFESSIONAL_LEVELS = [
  { code: 'practitioner', labels: { ar: 'ممارس مهني', en: 'Professional Practitioner', nl: 'Professioneel beoefenaar' } },
  { code: 'advanced_practitioner', labels: { ar: 'ممارس مهني متقدم', en: 'Advanced Professional Practitioner', nl: 'Gevorderd professional' } },
  { code: 'expert', labels: { ar: 'خبير مهني', en: 'Professional Expert', nl: 'Professioneel expert' } },
]

export function localize(value, language = 'en') {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  return value?.[language] || value?.en || value?.ar || value?.nl || ''
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

export function isEvidenceEligibleForAssessment(evidence, requireVerified = true) {
  if (!evidence || ['rejected', 'unverifiable'].includes(evidence.status)) return false
  return !requireVerified || evidence.status === 'verified'
}

export function getStatusDefinition(status, domain = 'application') {
  const source = domain === 'evidence' ? EVIDENCE_STATUS : APPLICATION_STATUS
  return source[status] || { variant: 'neutral', labels: { ar: status || '—', en: status || '—', nl: status || '—' } }
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
