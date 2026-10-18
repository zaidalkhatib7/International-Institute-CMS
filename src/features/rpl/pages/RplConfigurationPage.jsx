import { useCallback, useContext, useEffect, useState } from 'react'
import { ArrowLeftRight, BookOpenCheck, Check, FileCog, Gavel, Layers3, LoaderCircle, Pencil, Plus, Save, Settings2, ShieldCheck, Stamp, Trash2, X } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, DataTableShell, Input, MoneyInput, PageHeader, SectionAnchorNav, Select, Textarea } from '../../../components/ui'
import { getRouteAccess } from '../../../routes/routeAccess'
import { AuthorizationContext } from '../../auth/context/authorizationContext'
import { readApiError, unwrapApiData, unwrapCollection } from '../../../services/apiResponse'
import { amountMinorOf, formatMoney, isMoney, moneyFromDecimal } from '../../../utils/money'
import { getAdminLanguage } from '../../../services/languageStorage'
import { formatLocalizedDate } from '../../../utils/localization'
import { fetchUsers } from '../../users/services/usersService'
import { APPLICATION_STATUS, EVIDENCE_EXTENSIONS, localize } from '../domain/rpl'
import { SCREENING_IDENTITY_CATEGORY, SCREENING_MODEL_MAX_LENGTH, SCREENING_SETTING_KEYS, screeningSettingsCopy } from '../domain/documentScreening'
import { CASE_DECISION_LIMITS } from '../domain/caseDecision'
import {
  createRplConfiguration,
  deleteRplConfiguration,
  fetchRplConfiguration,
  fetchRplReferenceData,
  fetchRplSettings,
  updateRplConfiguration,
  updateRplSettings,
} from '../services/rplService'
import RplPageState from '../components/RplPageState'
import QuizPassMarkSetting from '../components/QuizPassMarkSetting'
import CoursePlanMinimumsSetting from '../components/CoursePlanMinimumsSetting'
import AfterQuizSettings from '../components/AfterQuizSettings'
import CertificateWordingPanel from '../components/CertificateWordingPanel'
import { isQuizPassMarkReady, quizPassMarkFieldError, quizPassMarkPayload, readQuizPassMarkSetting } from '../domain/entryQuiz'
import { COURSE_PLAN_FAILED_MINIMUMS_KEY, changeCoursePlanMinimum, coursePlanMinimumsFieldErrors, coursePlanMinimumsPayload, isCoursePlanMinimumsReady, minimumLevels, readCoursePlanMinimumsSetting } from '../domain/coursePlan'
import { afterQuizSettingsFieldErrors, afterQuizSettingsPayload, changeAfterQuizSetting, feeScheduleAmountMinor, feeScheduleFormError, isAfterQuizSettingsReady, readAfterQuizSettings } from '../domain/afterQuiz'
import RplStatusBadge from '../components/RplStatusBadge'
import { useModalDialog } from '../../../hooks/useModalDialog'

const tabs = [
  { key: 'pathways', resource: 'pathways', icon: Layers3 },
  { key: 'levels', resource: 'levels', icon: ShieldCheck },
  { key: 'standards', resource: 'standards', icon: BookOpenCheck },
  { key: 'competencies', resource: 'competencies', icon: BookOpenCheck },
  { key: 'categories', resource: 'evidence-categories', icon: FileCog },
  { key: 'rubrics', resource: 'rubrics', icon: Check },
  { key: 'declarations', resource: 'declarations', icon: FileCog, immutable: true },
  { key: 'outcomes', resource: 'outcomes', icon: Check, immutable: true },
  { key: 'actions', resource: 'committee-actions', icon: Gavel, immutable: true },
  { key: 'fees', resource: 'fee-schedules', icon: Settings2 },
  { key: 'committees', resource: 'committees', icon: Gavel },
  { key: 'workflow', settings: true, icon: Settings2 },
  // The Experience Confirmation Certificate wording (owner, 15 Oct 2026): versions, approved by the owner's role only. The panel loads itself.
  { key: 'certificate_wording', wording: true, icon: Stamp },
]

/*
 * THE SETTINGS IN FIVE SECTIONS (PLATFORM-JOURNEY-SPEC §4.6, D-18). The tab keys
 * and every save payload are unchanged; the journey's rules open first, and the
 * pre-flow committee's definitions sit together last. ?tab=<key> opens a tab.
 */
const SECTIONS = [
  { key: 'journey', tabs: ['workflow'] },
  { key: 'fees', tabs: ['fees'] },
  { key: 'wording', tabs: ['certificate_wording'] },
  { key: 'levels', tabs: ['pathways', 'levels', 'standards', 'competencies', 'categories', 'declarations'] },
  { key: 'preflow', tabs: ['rubrics', 'outcomes', 'actions', 'committees'] },
]
const DEFAULT_TAB = 'workflow'
const TAB_KEYS = tabs.map((item) => item.key)
const sectionOf = (tabKey) => SECTIONS.find((section) => section.tabs.includes(tabKey)) || SECTIONS[0]
const SETTINGS_ANCHORS = ['intake', 'screening', 'interview', 'entry-quiz', 'course-plan', 'after-quiz', 'preflow', 'statuses']
const RECORD_STATUSES = ['published', 'draft', 'retired', 'archived']

/*
 * The journey rules' values as one string, to compare with what was loaded or
 * saved: the errors and the "written" flags are not values, so they are left out.
 */
const stripMeta = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).filter(([key]) => !['error', 'errors', 'include'].includes(key))) : value)
function settingsSnapshotOf(settings, quizPassMark, minimums, failedMinimums, afterQuiz) {
  // A number typed back to what was loaded is the same value: compare numbers as text.
  return JSON.stringify([settings, stripMeta(quizPassMark), stripMeta(minimums), stripMeta(failedMinimums), stripMeta(afterQuiz)], (key, value) => (typeof value === 'number' ? String(value) : value))
}

/** The API's bounds for the governed reapply cooldown (RplConfigurationController::updateSettings). */
const REAPPLY_COOLDOWN_SCOPES = ['all_rejections', 'screening_interview_quiz_declines']

function isReapplyCooldownValid({ rpl_reapply_cooldown_days: days, rpl_reapply_cooldown_scope: scope }) {
  return /^\d+$/.test(String(days ?? '')) && Number(days) <= 365 && REAPPLY_COOLDOWN_SCOPES.includes(scope)
}

/* A stored screening switch reads on only when it is plainly on: anything else is off, the seeded and safe value. */
function isSwitchedOn(value) {
  return value === true || value === 1 || value === '1' || value === 'true'
}

/** The server's validation lines for the given keys, by key ("…_categories.0" counts as its list; the first key that matches wins). */
function settingFieldErrors(error, keys) {
  const errors = error?.response?.data?.errors
  if (!errors || typeof errors !== 'object') return {}
  const collected = {}
  for (const [field, messages] of Object.entries(errors)) {
    const key = keys.find((candidate) => field === candidate || field.startsWith(`${candidate}.`))
    if (key) collected[key] = [...(collected[key] || []), ...[].concat(messages).filter((line) => typeof line === 'string')]
  }
  return Object.fromEntries(Object.entries(collected).map(([key, lines]) => [key, [...new Set(lines)].join('\n')]))
}

function screeningFieldErrors(error) {
  return settingFieldErrors(error, SCREENING_SETTING_KEYS)
}

/*
 * The interview settings (owner flow of 12 Oct 2026, P3): the days an applicant
 * has to choose online or at the office, and the office address in Arabic and
 * English. Seeded by the API (7 days, empty address); like the screening keys, a
 * save writes them only when the server holds them or an administrator changed one.
 */
const INTERVIEW_SETTING_KEYS = ['rpl_interview_response_days', 'rpl_interview_office_address']
// Most specific first, so an error on one language lands under that language's field.
const INTERVIEW_ERROR_KEYS = ['rpl_interview_response_days', 'rpl_interview_office_address.ar', 'rpl_interview_office_address.en', 'rpl_interview_office_address']

function isInterviewResponseDaysValid(days) {
  return /^\d+$/.test(String(days ?? '').trim()) && Number(days) >= CASE_DECISION_LIMITS.responseDaysMin && Number(days) <= CASE_DECISION_LIMITS.responseDaysMax
}

function readOfficeAddress(value) {
  const read = (language) => (value && typeof value === 'object' && typeof value[language] === 'string' ? value[language] : '')
  return { ar: read('ar'), en: read('en') }
}

const copyByLanguage = {
  ar: {
    title: 'إعدادات المسار المهني', description: 'قواعد رحلة المسار المهني ورسومه وصيغة شهادته ومستوياته ومعاييره.',
    pathways: 'المسارات', levels: 'المستويات', standards: 'المعايير', competencies: 'الكفاءات', categories: 'فئات الأدلة', rubrics: 'نماذج التقييم', declarations: 'الإقرارات', outcomes: 'النتائج', actions: 'إجراءات اللجنة', fees: 'الرسوم', committees: 'اللجان', workflow: 'قواعد الرحلة', certificate_wording: 'صيغة الشهادة',
    sectionLevels: 'المستويات والمعايير', sectionPreflow: 'مسار اللجنة السابق', sectionsLabel: 'أقسام الإعدادات', tabsLabel: 'صفحات القسم',
    rulesReference: 'مرجع القواعد', exchangeRate: 'سعر الصرف', jumpTo: 'انتقل إلى:', unsaved: 'تغييرات غير محفوظة',
    anchors: { intake: 'الاستلام', screening: 'فرز الوثائق', interview: 'المقابلة', 'entry-quiz': 'اختبار الدخول', 'course-plan': 'خطة الدورات', 'after-quiz': 'بعد الاختبار', preflow: 'مسار اللجنة', statuses: 'مرجع الحالات' },
    cards: { intake: 'الاستلام وفترة الانتظار', screening: 'فرز الوثائق', interview: 'المقابلة', 'entry-quiz': 'اختبار الدخول', 'course-plan': 'خطة الدورات', 'after-quiz': 'بعد الاختبار والاختبار النهائي', preflow: 'مسار اللجنة السابق', statuses: 'مرجع الحالات' },
    geminiOnAssessment: 'مساعد Gemini في صفحة التقييم', preflowHint: 'تُستخدم فقط في ملفات مسار اللجنة السابق.', statusLabels: { published: 'منشور', draft: 'مسودة', retired: 'متوقف العمل به', archived: 'مؤرشف' },
    feesFinalExamHint: 'رسوم الشهادة لكل مسار ومستوى بالدولار الأمريكي، وتسري أيضًا في مسار الاختبار النهائي: عند صفر تصدر شهادة المستوى تلقائيًا عند اجتياز الاختبار النهائي، وفوق الصفر يدفع العميل الرسوم أولًا، بالدولار أو بالليرة السورية بسعر الصرف عند الدفع، ثم تصدر الشهادة تلقائيًا.',
    feeCurrencyUsd: 'تُحصَّل الرسوم بالدولار الأمريكي.', feeAmountUsd: 'المبلغ (بالدولار الأمريكي)', feeAmountInvalid: 'أدخل صفرًا، أو مبلغًا من 1.00 إلى 1,000,000.00 دولار بخانتين عشريتين على الأكثر.', feeLegacyCurrency: 'ليست بالدولار الأمريكي ({currency}): أعد إدخال هذه الرسوم بالدولار. ولا يمكن تحصيلها حتى ذلك.',
    add: 'إضافة سجل', edit: 'تعديل', delete: 'حذف', save: 'حفظ', cancel: 'إلغاء', active: 'فعال', inactive: 'غير فعال', code: 'الرمز', name: 'الاسم', descriptionField: 'الوصف', status: 'الحالة', actionsLabel: 'الإجراءات', empty: 'لا توجد سجلات.',
    pathway: 'المسار', standard: 'المعيار', level: 'المستوى', slug: 'المعرف', rank: 'الرتبة', version: 'النسخة', order: 'الترتيب', behavior: 'السلوك', quorum: 'النصاب', quorumSingleOnly: 'النصاب مثبت على 1: النصاب الأكبر يتطلب تسجيل أصوات متعددة، وشاشة التصويت غير مبنية بعد، ولا يوجد إلغاء — فتُحبس الحالة نهائيًا.', amount: 'المبلغ', currency: 'العملة', effectiveFrom: 'ساري من', effectiveUntil: 'ساري حتى', feeAllLevels: 'كل المستويات (عام)', feeInForce: 'مدة السريان', feeOpenEnded: 'دون تاريخ انتهاء', feeChoosePathway: 'اختر المسار أولًا لتظهر مستوياته.',
    examples: 'أمثلة، كل مثال في سطر', extensions: 'الامتدادات', maxSize: 'الحد الأقصى (MB)', minimum: 'الحد الأدنى', maximum: 'الحد الأقصى', files: 'يقبل ملفات', urls: 'يقبل روابط', requiredDefault: 'مطلوب افتراضيًا',
    criteria: 'معايير النموذج', addCriterion: 'إضافة معيار تقييم', competency: 'الكفاءة', maximumScore: 'النقطة القصوى', passScore: 'نقطة النجاح', required: 'إلزامي', evidenceCategories: 'فئات الأدلة للمعيار', members: 'أعضاء اللجنة', addMember: 'إضافة عضو', member: 'العضو', role: 'الدور',
    draft: 'مسودة', published: 'منشور', retired: 'متوقف العمل به', chair: 'رئيس اللجنة', committeeMember: 'عضو', secretary: 'أمين السر', requiresGapPlan: 'يتطلب خطة لسد الفجوات', credentialEligible: 'مؤهل لإصدار اعتماد',
    achievedBehavior: 'متحقق', developmentRequired: 'يتطلب برنامج تطوير', limitedCompletion: 'يتطلب استكمالًا محدودًا', notAchievedBehavior: 'غير متحقق', approveBehavior: 'موافقة', conditionalBehavior: 'موافقة مشروطة', remediationBehavior: 'استكمال مطلوب', rejectBehavior: 'رفض', reassignBehavior: 'إعادة إسناد',
    saved: 'تم حفظ الإعداد.', deleted: 'تم حذف السجل.', confirmDelete: 'تأكيد الحذف', confirmText: 'سيتم حذف هذا السجل إذا لم يكن مرتبطًا ببيانات تشغيلية.', deactivateHint: 'يحمي النظام السجلات التاريخية؛ قم بتعطيلها بدلًا من حذفها.',
    workflowTitle: 'مرجع الحالات', workflowHint: 'حالة الطلب مستقلة عن حالة الدليل وقرار اللجنة.', appealDays: 'مدة التظلم (يوم)', requireVerified: 'اشتراط دليل متحقق للتقييم', saveSettings: 'حفظ قواعد الرحلة', fixedUploadPolicy: 'سياسة الرفع التشغيلية ثابتة', fixedUploadPolicyHint: '50 MiB لكل ملف. الصيغ: PDF، JPG، JPEG، PNG، DOCX، XLSX، PPTX، MP4، MP3. هذه الحدود مطبقة في المنصة والخادم.',
    geminiTitle: 'مساعد Gemini للتقييم', geminiHint: 'تحت سيطرة المدير فقط. يستقبل نموذج التقييم وبيانات الأدلة، ويستقبل كذلك ملفات المتقدم نفسها ما دام المفتاح أدناه مُفعَّلًا؛ ولا يستطيع التحقق من الأدلة أو اعتماد النتيجة أو إصدار قرار اللجنة.', geminiModel: 'نموذج Gemini', geminiPrompt: 'Prompt التقييم الاستشاري', geminiGovernance: 'يُحفظ الـPrompt ومصدر الحقيقة والمدخلات والمخرجات مع كل مسودة. راجعه ضمن حوكمة المسار.',
    evidenceDocuments: 'إرسال الوثائق إلى Gemini', evidenceDocumentsHint: 'عند التفعيل تُرسل ملفات المتقدم المرفوعة إلى Gemini في كل مسار يقرأها: الاستشارة على الملف، وتوليد أسئلة التقييم الديناميكي، وتقييم إجابات المتقدم، وتحليل القبول في مسار RPL الأكاديمي. وعند الإيقاف يعود كل مسار منها إلى بيانات الأدلة وحدها — العناوين والفئات وحالة التحقق، دون أي محتوى للملفات. لا يُرفض أي طلب بسبب هذا المفتاح، ويظل كل طلب يسجّل بيانًا بما أُرسل وما حُجب ولماذا.',
    interviewTitle: 'المقابلات', interviewHint: 'المهلة التي يختار فيها المتقدم أن تكون المقابلة عبر الإنترنت أو في المكتب، وعنوان المكتب للمقابلات التي تُعقد فيه. تسري المهلة على كل عرض جديد، ويحتفظ العرض القائم بموعده.', interviewResponseDays: 'مهلة اختيار نمط المقابلة (يوم، من 1 إلى 60)', interviewResponseDaysInvalid: 'أدخل عددًا صحيحًا من 1 إلى 60.', officeAddressAr: 'عنوان المكتب بالعربية', officeAddressEn: 'عنوان المكتب بالإنجليزية', officeAddressHint: 'يُنسخ إلى كل مقابلة في المكتب عند جدولتها، بلغة المتقدم، ويمكن للموظف تعديله لتلك المقابلة. بحد أقصى 500 حرف لكل لغة.', officeAddressTooLong: 'بحد أقصى 500 حرف.',
    cooldownTitle: 'مهلة إعادة التقديم بعد الرفض', cooldownHint: 'إعداد محكوم يقرره المالك، ولا قيمة افتراضية له في الشيفرة. يُثبَّت تاريخ إعادة التقديم على الطلب لحظة رفضه، فلا يغيّر تعديل هذه القيمة لاحقًا تاريخًا أُعطي للعميل. تسري المهلة على العميل في المسارين المهني والأكاديمي كليهما.', cooldownDays: 'مدة المهلة (يوم، من 0 إلى 365)', cooldownScope: 'ما الذي يبدأ المهلة', cooldownScopeAll: 'كل رفض لطلب، بما فيه قرار اللجنة والتظلم', cooldownScopeNarrow: 'رفض الفرز أو المقابلة أو الاختبار فقط', cooldownMissing: 'غير مضبوط: يُرفض كل قرار رفض حتى يُحدَّد هذا الإعداد.',
  },
  en: {
    title: 'Professional path settings', description: 'The professional path\'s journey rules, fees, certificate wording, levels and standards.',
    pathways: 'Pathways', levels: 'Levels', standards: 'Standards', competencies: 'Competencies', categories: 'Evidence categories', rubrics: 'Rubrics', declarations: 'Declarations', outcomes: 'Outcomes', actions: 'Committee actions', fees: 'Fees', committees: 'Committees', workflow: 'Journey rules', certificate_wording: 'Certificate wording',
    sectionLevels: 'Levels & standards', sectionPreflow: 'Pre-flow committee', sectionsLabel: 'Settings sections', tabsLabel: 'Section pages',
    rulesReference: 'Rules reference', exchangeRate: 'Exchange rate', jumpTo: 'Go to:', unsaved: 'Unsaved changes',
    anchors: { intake: 'Intake', screening: 'Document screening', interview: 'Interview', 'entry-quiz': 'Entry quiz', 'course-plan': 'Course plan', 'after-quiz': 'After the quiz', preflow: 'Committee path', statuses: 'Status reference' },
    cards: { intake: 'Intake & cooldown', screening: 'Document screening', interview: 'Interview', 'entry-quiz': 'Entry quiz', 'course-plan': 'Course plan', 'after-quiz': 'After the quiz & final exam', preflow: 'Pre-flow committee', statuses: 'Status reference' },
    geminiOnAssessment: 'Gemini assistant on the assessment page', preflowHint: 'Used only on pre-flow committee cases.', statusLabels: { published: 'Published', draft: 'Draft', retired: 'Retired', archived: 'Archived' },
    feesFinalExamHint: 'The certification fee per pathway and level is in US dollars and also applies on the final-exam path: at 0 the level certificate is issued automatically when the final exam is passed; above 0 the client pays the fee first, in dollars or in Syrian pounds at the rate when he pays, and the certificate is then issued automatically.',
    feeCurrencyUsd: 'The fee is charged in US dollars.', feeAmountUsd: 'Amount (US dollars)', feeAmountInvalid: 'Enter 0, or an amount from 1.00 to 1,000,000.00 US dollars with at most two decimals.', feeLegacyCurrency: 'Not in US dollars ({currency}): re-enter this fee in dollars. Until then it cannot be charged.',
    add: 'Add record', edit: 'Edit', delete: 'Delete', save: 'Save', cancel: 'Cancel', active: 'Active', inactive: 'Inactive', code: 'System code', name: 'Name', descriptionField: 'Description', status: 'Status', actionsLabel: 'Actions', empty: 'No records have been configured.',
    pathway: 'Pathway', standard: 'Standard', level: 'Level', slug: 'Slug', rank: 'Rank', version: 'Version', order: 'Sort order', behavior: 'Behaviour', quorum: 'Quorum', quorumSingleOnly: 'Quorum is fixed at 1: a higher quorum needs multiple recorded votes, the vote panel is not built yet, and there is no cancel — the case would be stuck permanently.', amount: 'Amount', currency: 'Currency', effectiveFrom: 'Effective from', effectiveUntil: 'Effective until', feeAllLevels: 'All levels (general)', feeInForce: 'In force', feeOpenEnded: 'no end date', feeChoosePathway: 'Choose the pathway first to list its levels.',
    examples: 'Examples, one per line', extensions: 'Allowed extensions', maxSize: 'Maximum size (MB)', minimum: 'Minimum items', maximum: 'Maximum items', files: 'Accept files', urls: 'Accept URLs', requiredDefault: 'Required by default',
    criteria: 'Rubric criteria', addCriterion: 'Add criterion', competency: 'Competency', maximumScore: 'Maximum score', passScore: 'Pass score', required: 'Required', evidenceCategories: 'Standard evidence categories', members: 'Committee members', addMember: 'Add member', member: 'Member', role: 'Role',
    draft: 'Draft', published: 'Published', retired: 'Retired', chair: 'Chair', committeeMember: 'Member', secretary: 'Secretary', requiresGapPlan: 'Requires a competency-gap plan', credentialEligible: 'Eligible for credential issuance',
    achievedBehavior: 'Achieved', developmentRequired: 'Development programme required', limitedCompletion: 'Limited completion required', notAchievedBehavior: 'Not achieved', approveBehavior: 'Approve', conditionalBehavior: 'Conditional approval', remediationBehavior: 'Remediation required', rejectBehavior: 'Reject', reassignBehavior: 'Reassign',
    saved: 'Configuration saved.', deleted: 'Record deleted.', confirmDelete: 'Confirm deletion', confirmText: 'This record will be deleted if it is not referenced by operational data.', deactivateHint: 'Historical definitions are protected; deactivate them instead of deleting them.',
    workflowTitle: 'Status reference', workflowHint: 'Application workflow remains separate from evidence state and committee authority.', appealDays: 'Appeal window (days)', requireVerified: 'Require verified evidence for assessment', saveSettings: 'Save the journey rules', fixedUploadPolicy: 'Runtime upload policy is fixed', fixedUploadPolicyHint: '50 MiB per file. Formats: PDF, JPG, JPEG, PNG, DOCX, XLSX, PPTX, MP4, and MP3. These limits are enforced by both the platform and the API.',
    geminiTitle: 'Gemini evaluation assistant', geminiHint: 'Administrator-controlled only. It receives the rubric and evidence metadata, and — while the switch below is on — the applicant\'s own uploaded files; it cannot verify evidence, adopt an outcome, or make a committee decision.', geminiModel: 'Gemini model', geminiPrompt: 'Advisory evaluation prompt', geminiGovernance: 'The prompt, source of truth, input, and output are snapshotted with every draft. Review them through RPL governance.',
    evidenceDocuments: 'Send documents to Gemini', evidenceDocumentsHint: 'While this is on, the applicant\'s own uploaded files are sent to Gemini on every path that reads them: the case advisory, the dynamic-assessment question generation, the evaluation of the applicant\'s answers, and the Academic RPL admission analysis. Turn it off and every one of those falls back to evidence metadata only — titles, categories and verification state, never file contents. Nothing is refused because of the switch, and every request still records a manifest of what was sent, what was withheld, and why.',
    interviewTitle: 'Interviews', interviewHint: 'How long an applicant has to choose an interview online or at the office, and the office address for interviews held there. The days apply to each new offer; an offer already made keeps its date.', interviewResponseDays: 'Days to choose the interview mode (1 to 60)', interviewResponseDaysInvalid: 'Enter a whole number from 1 to 60.', officeAddressAr: 'Office address in Arabic', officeAddressEn: 'Office address in English', officeAddressHint: "Copied onto each interview at the office when it is scheduled, in the applicant's language; staff may change it for that interview. At most 500 characters per language.", officeAddressTooLong: 'At most 500 characters.',
    cooldownTitle: 'Reapply cooldown after a rejection', cooldownHint: 'A governed setting the owner decides; the code holds no default. The reapply date is frozen onto a case at the moment it is rejected, so changing this later never moves a date a client was given. The cooldown applies to the client across both RPL pathways.', cooldownDays: 'Cooldown (days, 0 to 365)', cooldownScope: 'Which rejections start it', cooldownScopeAll: 'Every RPL rejection, committee and appeal included', cooldownScopeNarrow: 'Screening, interview and quiz declines only', cooldownMissing: 'Not set: every rejection is refused until it is.',
  },
}

/* eslint-disable-next-line react-refresh/only-export-components -- exported so the
   test can prove both language blocks expose the same key set. Copy lookup here
   is a WHOLE-OBJECT fallback (copyByLanguage[language] || copyByLanguage.en) with no
   per-key rescue, so a key present in en and missing in ar renders the literal string
   "undefined" in the language this CMS actually defaults to. */
export const COPY = copyByLanguage

const localized = () => ({ en: '', ar: '' })
// Only the Arabic and English keys of a stored value are loaded, so a save never sends a retired `nl` back (13 Oct 2026).
const arEnOnly = (value, empty) => (value && typeof value === 'object' ? { en: value.en ?? empty.en, ar: value.ar ?? empty.ar } : value)

function emptyForm(resource) {
  return {
    id: null, code: '', slug: '', name: localized(), description: localized(), content: localized(), examples: { en: [], ar: [] },
    rpl_pathway_id: '', rpl_standard_id: '', rpl_level_id: '', parent_id: '', rank: 1, version: 1, sort_order: 0,
    status: 'draft', behavior: resource === 'outcomes' ? 'achieved' : 'approve', is_active: true,
    accepts_files: true, accepts_urls: false, is_required_by_default: false, accepted_extensions: [...EVIDENCE_EXTENSIONS], max_size_kb: 51200, minimum_items: 1, maximum_items: '',
    requires_gap_plan: false, is_credential_eligible: false, amount: '', currency: 'USD', legacy_currency: '', effective_from: '', effective_until: '', quorum: 1,
    evidence_categories: [], criteria: [], members: [],
  }
}

/** A Fees-tab row's amount as Money: the server's `money` (contract S14), else its ledger decimal and currency. */
function feeRowMoney(row) {
  return isMoney(row?.money) ? row.money : moneyFromDecimal(row?.amount, row?.currency)
}

/** A Fees-tab row in another currency than US dollars, above 0: shown, never charged, re-entered in dollars. */
function isLegacyFeeRow(row) {
  const currency = String(row?.money?.currency ?? row?.currency ?? '').toUpperCase()
  return row?.usable === false || (currency !== '' && currency !== 'USD' && (amountMinorOf(feeRowMoney(row)) ?? 0) > 0)
}

/*
 * A Fees-tab row in the form: always US dollars (owner, 17 Oct 2026). A dollar
 * row shows its amount; a row in another currency opens EMPTY, with its old
 * currency named, so staff re-enter the fee in dollars and nothing is converted.
 */
function feeFormFrom(base, row) {
  const legacy = String(row?.currency ?? 'USD').toUpperCase() !== 'USD'
  return { ...base, ...formFields(row), currency: 'USD', legacy_currency: legacy ? String(row.currency).toUpperCase() : '', amount: legacy ? '' : (feeRowMoney(row)?.amount ?? '') }
}

/*
 * A stored row as form values (platform walk, 17 Oct 2026, UI-04 and UI-19): a
 * relation the row does not set (null) is the select's empty choice '', never
 * null, which React refuses on a controlled <select>; a date the API sends as an
 * ISO datetime ("2026-10-17T00:00:00.000000Z") is the yyyy-mm-dd a date input
 * shows, so editing a row keeps its dates.
 */
const SELECT_FIELDS = ['rpl_pathway_id', 'rpl_standard_id', 'rpl_level_id', 'parent_id']
const DATE_FIELDS = ['effective_from', 'effective_until']

function dateInputValue(value) {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(value ?? ''))
  return match ? match[1] : ''
}

function formFields(row) {
  const fields = { ...row }
  for (const key of SELECT_FIELDS) if (key in fields) fields[key] = fields[key] == null ? '' : fields[key]
  for (const key of DATE_FIELDS) if (key in fields) fields[key] = dateInputValue(fields[key])
  return fields
}

function formFrom(resource, row) {
  const base = emptyForm(resource)
  if (resource === 'fee-schedules') return feeFormFrom(base, row)
  return {
    ...base, ...formFields(row),
    name: typeof row.name === 'object' ? arEnOnly(row.name, localized()) : { ...localized(), en: row.name || '' },
    description: typeof row.description === 'object' ? arEnOnly(row.description, localized()) : { ...localized(), en: row.description || '' },
    content: typeof row.content === 'object' ? arEnOnly(row.content, localized()) : { ...localized(), en: row.content || '' },
    examples: typeof row.examples === 'object' ? arEnOnly(row.examples, base.examples) : base.examples,
    evidence_categories: (row.evidence_categories || row.evidenceCategories || []).map((item) => ({ category_id: item.pivot?.rpl_evidence_category_id || item.id || item.category_id, is_required: item.pivot?.is_required ?? true, minimum_items: item.pivot?.minimum_items ?? 1, maximum_items: item.pivot?.maximum_items ?? null })),
    criteria: (row.criteria || []).map((item) => ({ competency_id: item.rpl_competency_id || item.competency_id, code: item.code, title: arEnOnly(item.title || localized(), localized()), description: arEnOnly(item.description || localized(), localized()), maximum_score: item.maximum_score ?? '', pass_score: item.pass_score ?? '', is_required: item.is_required !== false, sort_order: item.sort_order || 0 })),
    members: (row.members || []).map((item) => ({ user_id: item.user_id, role: item.role || 'member', is_active: item.is_active !== false })),
  }
}

function numeric(value) { return value === '' || value == null ? null : Number(value) }
function cleanDate(value) { return value || null }
function behaviorLabel(value, copy) {
  return {
    achieved: copy.achievedBehavior,
    development_required: copy.developmentRequired,
    limited_completion: copy.limitedCompletion,
    not_achieved: copy.notAchievedBehavior,
    approve: copy.approveBehavior,
    conditional: copy.conditionalBehavior,
    remediation: copy.remediationBehavior,
    reject: copy.rejectBehavior,
    reassign: copy.reassignBehavior,
  }[value] || value
}

function payloadFor(resource, form) {
  const named = { code: form.code, name: form.name, description: form.description, is_active: form.is_active }
  switch (resource) {
    case 'pathways': return { ...named, slug: form.slug, sort_order: Number(form.sort_order || 0) }
    case 'levels': return { ...named, rpl_pathway_id: Number(form.rpl_pathway_id), rank: Number(form.rank) }
    case 'standards': return { ...named, rpl_pathway_id: Number(form.rpl_pathway_id), version: Number(form.version), status: form.status, effective_from: cleanDate(form.effective_from), effective_until: cleanDate(form.effective_until), evidence_categories: form.evidence_categories }
    case 'competencies': return { ...named, rpl_standard_id: Number(form.rpl_standard_id), parent_id: numeric(form.parent_id), sort_order: Number(form.sort_order || 0) }
    case 'evidence-categories': return { ...named, examples: form.examples, accepts_files: form.accepts_files, accepts_urls: form.accepts_urls, is_required_by_default: form.is_required_by_default, minimum_items: Number(form.minimum_items || 0), maximum_items: numeric(form.maximum_items), sort_order: Number(form.sort_order || 0) }
    case 'rubrics': return { ...named, rpl_standard_id: Number(form.rpl_standard_id), rpl_level_id: numeric(form.rpl_level_id), version: Number(form.version), status: form.status, criteria: form.criteria.map((item, index) => ({ ...item, competency_id: Number(item.competency_id), maximum_score: numeric(item.maximum_score), pass_score: numeric(item.pass_score), sort_order: index })) }
    case 'declarations': return { code: form.code || 'applicant_declaration', content: form.content, version: Number(form.version), is_active: form.is_active, effective_from: cleanDate(form.effective_from) }
    case 'outcomes': return { ...named, behavior: form.behavior, requires_gap_plan: form.requires_gap_plan, is_credential_eligible: form.is_credential_eligible, sort_order: Number(form.sort_order || 0) }
    case 'committee-actions': return { ...named, behavior: form.behavior, sort_order: Number(form.sort_order || 0) }
    // US dollars only, the amount as an integer of US cents (contract S14; owner, 17 Oct 2026).
    case 'fee-schedules': return { rpl_pathway_id: Number(form.rpl_pathway_id), rpl_level_id: numeric(form.rpl_level_id), amount_minor: feeScheduleAmountMinor(form), currency: 'USD', is_active: form.is_active, effective_from: cleanDate(form.effective_from), effective_until: cleanDate(form.effective_until) }
    case 'committees': return { ...named, quorum: Number(form.quorum), members: form.members.map((item) => ({ ...item, user_id: Number(item.user_id) })) }
    default: return form
  }
}

export default function RplConfigurationPage() {
  const language = getAdminLanguage()
  const copy = copyByLanguage[language] || copyByLanguage.en
  const isArabic = language === 'ar'
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = TAB_KEYS.includes(searchParams.get('tab')) ? searchParams.get('tab') : DEFAULT_TAB
  const tab = tabs.find((item) => item.key === activeTab) || tabs[0]
  const activeSection = sectionOf(activeTab)
  // Read without requiring the provider, so the page renders in isolation; the server stays the authority.
  const authorization = useContext(AuthorizationContext)
  const canAccess = authorization?.canAccess || (() => false)
  // The settings as last loaded or saved, to tell staff when the journey rules hold unsaved changes.
  const [settingsBaseline, setSettingsBaseline] = useState('')
  const [state, setState] = useState({ loading: true, error: '', rows: [], reference: {}, users: [] })
  const [settings, setSettings] = useState({ appeal_window_days: 15, require_verified_evidence_for_assessment: true, gemini_advisory_model: 'gemini-3.5-flash', gemini_advisory_prompt: '', rpl_advisory_include_evidence_documents: true, rpl_reapply_cooldown_days: '', rpl_reapply_cooldown_scope: '', rpl_document_screening_enabled: false, rpl_document_screening_web_search_enabled: false, rpl_document_screening_model: '', rpl_document_screening_excluded_categories: [], rpl_document_screening_extraction_only_categories: [], rpl_interview_response_days: '', rpl_interview_office_address: { ar: '', en: '' } })
  /*
   * Document screening (owner flow of 12 Oct 2026, P2). A save writes only the
   * screening keys the server returned or an administrator changed: a key the
   * server does not hold is never written with a value nobody saw or chose. An
   * absent extraction-only list saved as [] would put identity documents back
   * under a figure (D20(c)) without anyone deciding so.
   */
  const [screeningKeys, setScreeningKeys] = useState([])
  const [screeningErrors, setScreeningErrors] = useState({})
  const [interviewKeys, setInterviewKeys] = useState([])
  const [interviewErrors, setInterviewErrors] = useState({})
  // Entry-quiz pass mark (owner, 12 Oct 2026, P4): its own state, written only once the server holds it or someone types one.
  const [quizPassMark, setQuizPassMark] = useState(() => readQuizPassMarkSetting({}))
  // Per-level course minimums (owner, 12 Oct 2026, P5): the same rule, the whole map with every level once written.
  const [coursePlanMinimums, setCoursePlanMinimums] = useState(() => readCoursePlanMinimumsSetting({}, []))
  // The minimum after a FAILED entry quiz (owner, 15 Oct 2026, "hybrid"): its own key, the same rule.
  const [failedMinimums, setFailedMinimums] = useState(() => readCoursePlanMinimumsSetting({}, [], COURSE_PLAN_FAILED_MINIMUMS_KEY))
  // The five settings after the entry quiz (owner model of 15 Oct 2026, P6): written only once held or typed.
  const [afterQuiz, setAfterQuiz] = useState(() => readAfterQuizSettings({}))
  // New copy is Arabic and English only (owner, 13 Oct 2026); any other language reads English.
  const screenLanguage = isArabic ? 'ar' : 'en'
  const screeningText = screeningSettingsCopy(screenLanguage)
  const [form, setForm] = useState(() => emptyForm(tab.resource))
  const [formOpen, setFormOpen] = useState(false)
  const [formLanguage, setFormLanguage] = useState(language === 'ar' ? language : 'en')
  const [action, setAction] = useState({ busy: false, error: '', success: '' })
  const [deleteTarget, setDeleteTarget] = useState(null)
  const deleteDialogRef = useModalDialog(Boolean(deleteTarget), () => setDeleteTarget(null))

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      if (tab.wording) {
        setState({ loading: false, error: '', rows: [], reference: {}, users: [] })
        return
      }
      if (tab.settings) {
        // The reference data only lists the categories for the screening controls; the controls still load without it.
        const [settingsResponse, referenceResponse] = await Promise.all([fetchRplSettings(), fetchRplReferenceData().catch(() => ({}))])
        const raw = unwrapApiData(settingsResponse) || {}
        const nextSettings = {
          appeal_window_days: Number(raw.appeal_window_days || 15),
          require_verified_evidence_for_assessment: raw.require_verified_evidence_for_assessment !== false,
          gemini_advisory_model: raw.gemini_advisory_model || 'gemini-3.5-flash',
          gemini_advisory_prompt: raw.gemini_advisory_prompt || '',
          // Reads ON when the row is absent, matching the reader's own default
          // (`?? true`). Defaulting to OFF here would let a save write a
          // restriction nobody asked for.
          rpl_advisory_include_evidence_documents: raw.rpl_advisory_include_evidence_documents !== false,
          // Governed keys (owner, 12 Oct 2026): the API has no default for them,
          // so neither does this form. An absent row shows empty and blocks the
          // save until somebody chooses a value.
          rpl_reapply_cooldown_days: raw.rpl_reapply_cooldown_days ?? '',
          rpl_reapply_cooldown_scope: raw.rpl_reapply_cooldown_scope ?? '',
          rpl_document_screening_enabled: isSwitchedOn(raw.rpl_document_screening_enabled),
          rpl_document_screening_web_search_enabled: isSwitchedOn(raw.rpl_document_screening_web_search_enabled),
          rpl_document_screening_model: typeof raw.rpl_document_screening_model === 'string' ? raw.rpl_document_screening_model : '',
          rpl_document_screening_excluded_categories: Array.isArray(raw.rpl_document_screening_excluded_categories) ? raw.rpl_document_screening_excluded_categories : [],
          rpl_document_screening_extraction_only_categories: Array.isArray(raw.rpl_document_screening_extraction_only_categories) ? raw.rpl_document_screening_extraction_only_categories : [],
          rpl_interview_response_days: raw.rpl_interview_response_days ?? '',
          rpl_interview_office_address: readOfficeAddress(raw.rpl_interview_office_address),
        }
        setSettings(nextSettings)
        setScreeningKeys(SCREENING_SETTING_KEYS.filter((key) => raw[key] != null))
        setScreeningErrors({})
        setInterviewKeys(INTERVIEW_SETTING_KEYS.filter((key) => raw[key] != null))
        setInterviewErrors({})
        const nextLevels = minimumLevels(unwrapCollection(unwrapApiData(referenceResponse)?.pathways || []).flatMap((pathway) => pathway.levels || []))
        const nextQuizPassMark = readQuizPassMarkSetting(raw)
        const nextMinimums = readCoursePlanMinimumsSetting(raw, nextLevels)
        const nextFailedMinimums = readCoursePlanMinimumsSetting(raw, nextLevels, COURSE_PLAN_FAILED_MINIMUMS_KEY)
        const nextAfterQuiz = readAfterQuizSettings(raw)
        setQuizPassMark(nextQuizPassMark)
        setCoursePlanMinimums(nextMinimums)
        setFailedMinimums(nextFailedMinimums)
        setAfterQuiz(nextAfterQuiz)
        setSettingsBaseline(settingsSnapshotOf(nextSettings, nextQuizPassMark, nextMinimums, nextFailedMinimums, nextAfterQuiz))
        setState({ loading: false, error: '', rows: [], reference: unwrapApiData(referenceResponse) || {}, users: [] })
        return
      }
      const [records, referenceResponse, usersResponse] = await Promise.all([
        fetchRplConfiguration(tab.resource),
        fetchRplReferenceData(),
        tab.resource === 'committees' ? fetchUsers({ per_page: 100 }) : Promise.resolve([]),
      ])
      setState({ loading: false, error: '', rows: unwrapCollection(records), reference: unwrapApiData(referenceResponse) || {}, users: unwrapCollection(usersResponse) })
    } catch (error) { setState((current) => ({ ...current, loading: false, error: readApiError(error) })) }
  }, [tab.resource, tab.settings, tab.wording])

  useEffect(() => { load() }, [load])

  const pathways = unwrapCollection(state.reference.pathways || [])
  const levels = pathways.flatMap((pathway) => pathway.levels || [])
  const standards = pathways.flatMap((pathway) => pathway.standards || [])
  const competencies = standards.flatMap((standard) => standard.competencies || [])
  const evidenceCategories = unwrapCollection(state.reference.evidence_categories || [])

  function changeTab(key) {
    const next = tabs.find((item) => item.key === key)
    setSearchParams({ tab: key }, { replace: true }); setForm(emptyForm(next?.resource)); setFormOpen(false); setAction({ busy: false, error: '', success: '' })
  }

  const settingsSnapshot = settingsSnapshotOf(settings, quizPassMark, coursePlanMinimums, failedMinimums, afterQuiz)
  const settingsDirty = settingsBaseline !== '' && settingsBaseline !== settingsSnapshot

  function updateLocalized(field, value) {
    setForm((current) => ({ ...current, [field]: { ...current[field], [formLanguage]: value } }))
  }

  function openForm(row = null) {
    setForm(row ? formFrom(tab.resource, row) : emptyForm(tab.resource)); setFormOpen(true); setAction({ busy: false, error: '', success: '' })
  }

  function isValid() {
    // US dollars only: 0, or $1.00 to $1,000,000.00 (owner, 17 Oct 2026), as the API checks.
    if (tab.resource === 'fee-schedules') return Boolean(form.rpl_pathway_id) && feeScheduleFormError(form) === null
    if (tab.resource === 'declarations') return form.content.en && form.content.ar && Number(form.version) >= 1
    if (!form.code || !form.name.en || !form.name.ar) return false
    if (tab.resource === 'pathways') return Boolean(form.slug)
    if (tab.resource === 'levels') return Boolean(form.rpl_pathway_id && Number(form.rank) >= 1)
    if (tab.resource === 'standards') return Boolean(form.rpl_pathway_id && Number(form.version) >= 1)
    if (tab.resource === 'competencies') return Boolean(form.rpl_standard_id)
    if (tab.resource === 'rubrics') return Boolean(form.rpl_standard_id) && form.criteria.every((item) => item.competency_id && item.code && item.title?.en && item.title?.ar)
    if (tab.resource === 'committees') return Number(form.quorum) >= 1 && form.members.every((item) => item.user_id)
    return true
  }

  async function saveRecord() {
    setAction({ busy: true, error: '', success: '' })
    try {
      const payload = payloadFor(tab.resource, form)
      if (form.id) await updateRplConfiguration(tab.resource, form.id, payload)
      else await createRplConfiguration(tab.resource, payload)
      setFormOpen(false); setForm(emptyForm(tab.resource)); setAction({ busy: false, error: '', success: copy.saved }); await load()
    } catch (error) { setAction({ busy: false, error: readApiError(error), success: '' }) }
  }

  async function removeRecord() {
    if (!deleteTarget) return
    setAction({ busy: true, error: '', success: '' })
    try { await deleteRplConfiguration(tab.resource, deleteTarget.id); setDeleteTarget(null); setAction({ busy: false, error: '', success: copy.deleted }); await load() } catch (error) { setDeleteTarget(null); setAction({ busy: false, error: readApiError(error), success: '' }) }
  }

  function updateScreening(key, next) {
    setSettings((current) => ({ ...current, [key]: typeof next === 'function' ? next(current[key]) : next }))
    setScreeningKeys((current) => (current.includes(key) ? current : [...current, key]))
    setScreeningErrors((current) => {
      if (!current[key]) return current
      const { [key]: _cleared, ...rest } = current
      return rest
    })
  }

  function toggleScreeningCategory(key, code) {
    updateScreening(key, (current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code]))
  }

  function updateInterview(key, next, errorKey = key) {
    setSettings((current) => ({ ...current, [key]: typeof next === 'function' ? next(current[key]) : next }))
    setInterviewKeys((current) => (current.includes(key) ? current : [...current, key]))
    setInterviewErrors((current) => {
      const cleared = Object.fromEntries(Object.entries(current).filter(([field]) => field !== errorKey && field !== key))
      return Object.keys(cleared).length === Object.keys(current).length ? current : cleared
    })
  }

  const officeAddressTooLong = (language) => settings.rpl_interview_office_address[language].trim().length > CASE_DECISION_LIMITS.officeAddressMax
  const isInterviewSettingsValid = (!interviewKeys.includes('rpl_interview_response_days') || isInterviewResponseDaysValid(settings.rpl_interview_response_days))
    && (!interviewKeys.includes('rpl_interview_office_address') || (!officeAddressTooLong('ar') && !officeAddressTooLong('en')))

  function interviewPayload() {
    const values = {
      rpl_interview_response_days: Number(settings.rpl_interview_response_days),
      rpl_interview_office_address: { ar: settings.rpl_interview_office_address.ar.trim(), en: settings.rpl_interview_office_address.en.trim() },
    }
    return Object.fromEntries(INTERVIEW_SETTING_KEYS.filter((key) => interviewKeys.includes(key)).map((key) => [key, values[key]]))
  }

  const screeningModel = String(settings.rpl_document_screening_model ?? '').trim()
  const isScreeningModelValid = !screeningKeys.includes('rpl_document_screening_model') || (screeningModel.length >= 1 && screeningModel.length <= SCREENING_MODEL_MAX_LENGTH)

  function screeningPayload() {
    const values = {
      rpl_document_screening_enabled: Boolean(settings.rpl_document_screening_enabled),
      rpl_document_screening_web_search_enabled: Boolean(settings.rpl_document_screening_web_search_enabled),
      rpl_document_screening_model: screeningModel,
      rpl_document_screening_excluded_categories: [...settings.rpl_document_screening_excluded_categories],
      rpl_document_screening_extraction_only_categories: [...settings.rpl_document_screening_extraction_only_categories],
    }
    return Object.fromEntries(SCREENING_SETTING_KEYS.filter((key) => screeningKeys.includes(key)).map((key) => [key, values[key]]))
  }

  async function saveSettings() {
    setAction({ busy: true, error: '', success: '' })
    setScreeningErrors({})
    setInterviewErrors({})
    setQuizPassMark((current) => ({ ...current, error: '' }))
    setCoursePlanMinimums((current) => ({ ...current, errors: { general: '', levels: {} } }))
    setFailedMinimums((current) => ({ ...current, errors: { general: '', levels: {} } }))
    setAfterQuiz((current) => ({ ...current, errors: {} }))
    try {
      await updateRplSettings({
        appeal_window_days: Number(settings.appeal_window_days),
        require_verified_evidence_for_assessment: Boolean(settings.require_verified_evidence_for_assessment),
        gemini_advisory_model: settings.gemini_advisory_model.trim(),
        gemini_advisory_prompt: settings.gemini_advisory_prompt.trim(),
        rpl_advisory_include_evidence_documents: Boolean(settings.rpl_advisory_include_evidence_documents),
        rpl_reapply_cooldown_days: Number(settings.rpl_reapply_cooldown_days),
        rpl_reapply_cooldown_scope: settings.rpl_reapply_cooldown_scope,
        ...screeningPayload(),
        ...interviewPayload(),
        ...quizPassMarkPayload(quizPassMark),
        ...coursePlanMinimumsPayload(coursePlanMinimums),
        ...coursePlanMinimumsPayload(failedMinimums),
        ...afterQuizSettingsPayload(afterQuiz),
      })
      setSettingsBaseline(settingsSnapshot)
      setAction({ busy: false, error: '', success: copy.saved })
    } catch (error) {
      // The web-search 422 (active declaration below version 2) is also shown under its own switch.
      setScreeningErrors(screeningFieldErrors(error))
      // And an interview setting's 422 under its own field.
      setInterviewErrors(settingFieldErrors(error, INTERVIEW_ERROR_KEYS))
      setQuizPassMark((current) => ({ ...current, error: quizPassMarkFieldError(error) }))
      setCoursePlanMinimums((current) => ({ ...current, errors: coursePlanMinimumsFieldErrors(error) }))
      setFailedMinimums((current) => ({ ...current, errors: coursePlanMinimumsFieldErrors(error, COURSE_PLAN_FAILED_MINIMUMS_KEY) }))
      setAfterQuiz((current) => ({ ...current, errors: afterQuizSettingsFieldErrors(error) }))
      setAction({ busy: false, error: readApiError(error), success: '' })
    }
  }

  function screeningCategoryFieldset(key, legend, hint) {
    const selected = settings[key]
    const otherKey = key === 'rpl_document_screening_excluded_categories' ? 'rpl_document_screening_extraction_only_categories' : 'rpl_document_screening_excluded_categories'
    const active = evidenceCategories.filter((category) => category?.code && category.is_active !== false)
    const activeCodes = new Set(active.map((category) => category.code))
    // A stored code that is no longer an active category stays visible, so it can be unticked; the server refuses it on save.
    const options = [
      ...active.map((category) => ({ code: category.code, label: localize(category.name, screenLanguage) || category.code, inactive: false })),
      ...selected.filter((code) => !activeCodes.has(code)).map((code) => ({ code, label: code, inactive: active.length > 0 })),
    ]
    /*
     * Identity documents are always excluded or extraction-only (D20(c)): never a
     * percentage, as declaration v2 tells applicants, and the server refuses a save
     * that leaves them in neither list. So identity cannot be unticked here until
     * it is ticked in the other list; moving it is "tick there, then untick here".
     */
    const isLocked = (code) => code === SCREENING_IDENTITY_CATEGORY && activeCodes.has(code) && selected.includes(code) && !settings[otherKey].includes(code)
    const locked = options.some((option) => isLocked(option.code))
    return (
      <fieldset>
        <legend className="font-semibold">{legend}</legend>
        <p className="mt-1 leading-6 text-[var(--color-text-muted)]">{hint}</p>
        {options.length ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {options.map((option) => <label key={option.code} className={`flex items-start gap-2 rounded-xl border p-3 ${isLocked(option.code) ? 'cursor-not-allowed' : 'cursor-pointer'} ${option.inactive ? 'border-red-200 bg-red-50' : 'border-[var(--color-border)]'}`}><input type="checkbox" className="mt-1" checked={selected.includes(option.code)} disabled={isLocked(option.code)} onChange={() => toggleScreeningCategory(key, option.code)} /><span><span className="block">{option.label}</span><code className="text-xs text-[var(--color-text-muted)]">{option.code}</code>{option.inactive ? <span className="block text-xs text-red-700">{screeningText.inactiveCategory}</span> : null}</span></label>)}
          </div>
        ) : null}
        {locked ? <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">{screeningText.identityLocked}</p> : null}
        {!active.length ? <p className="mt-2 text-xs text-amber-800">{screeningText.noCategories}</p> : null}
        {screeningErrors[key] ? <p className="mt-2 whitespace-pre-line text-sm text-[var(--color-danger)]">{screeningErrors[key]}</p> : null}
      </fieldset>
    )
  }

  function renderScreeningSettings() {
    const webSearchErrorId = 'rpl-screening-web-search-error'
    return (
      <section aria-labelledby="rpl-screening-settings-title" className="space-y-4 rounded-2xl border border-[var(--color-border)] p-5 text-sm">
        <div><h3 id="rpl-screening-settings-title" className="font-bold">{screeningText.title}</h3><p className="mt-1 leading-6 text-[var(--color-text-muted)]">{screeningText.hint}</p></div>
        <label className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] p-4"><input type="checkbox" className="mt-1" checked={settings.rpl_document_screening_enabled} onChange={(event) => updateScreening('rpl_document_screening_enabled', event.target.checked)} /><span><strong className="block">{screeningText.enabled}</strong><span className="mt-1 block leading-6 text-[var(--color-text-muted)]">{screeningText.enabledHint}</span></span></label>
        {/* The screen reads documents through the same kill switch as the advisory, and refuses (reading_disabled) while it is off. */}
        {settings.rpl_document_screening_enabled && !settings.rpl_advisory_include_evidence_documents ? <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 leading-6 text-amber-900">{screeningText.readingOff}</p> : null}
        <div>
          <label className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] p-4"><input type="checkbox" className="mt-1" checked={settings.rpl_document_screening_web_search_enabled} aria-invalid={screeningErrors.rpl_document_screening_web_search_enabled ? true : undefined} aria-describedby={screeningErrors.rpl_document_screening_web_search_enabled ? webSearchErrorId : undefined} onChange={(event) => updateScreening('rpl_document_screening_web_search_enabled', event.target.checked)} /><span><strong className="block">{screeningText.webSearch}</strong><span className="mt-1 block leading-6 text-[var(--color-text-muted)]">{screeningText.webSearchHint}</span></span></label>
          {screeningErrors.rpl_document_screening_web_search_enabled ? <p id={webSearchErrorId} className="mt-2 whitespace-pre-line text-sm text-[var(--color-danger)]">{screeningErrors.rpl_document_screening_web_search_enabled}</p> : null}
        </div>
        <Input label={screeningText.model} maxLength={SCREENING_MODEL_MAX_LENGTH} value={settings.rpl_document_screening_model} hint={screeningText.modelHint} error={!isScreeningModelValid ? screeningText.modelRequired : screeningErrors.rpl_document_screening_model} onChange={(event) => updateScreening('rpl_document_screening_model', event.target.value)} />
        {screeningCategoryFieldset('rpl_document_screening_excluded_categories', screeningText.excluded, screeningText.excludedHint)}
        {screeningCategoryFieldset('rpl_document_screening_extraction_only_categories', screeningText.extractionOnly, screeningText.extractionOnlyHint)}
      </section>
    )
  }

  function renderInterviewSettings() {
    const days = settings.rpl_interview_response_days
    const daysError = interviewKeys.includes('rpl_interview_response_days') && !isInterviewResponseDaysValid(days) ? copy.interviewResponseDaysInvalid : interviewErrors.rpl_interview_response_days
    const addressError = (language) => (officeAddressTooLong(language) ? copy.officeAddressTooLong : interviewErrors[`rpl_interview_office_address.${language}`])
    const setAddress = (language, value) => updateInterview('rpl_interview_office_address', (current) => ({ ...current, [language]: value }), `rpl_interview_office_address.${language}`)
    return (
      <section aria-labelledby="rpl-interview-settings-title" className="space-y-4 rounded-2xl border border-[var(--color-border)] p-5 text-sm">
        <div><h3 id="rpl-interview-settings-title" className="font-bold">{copy.interviewTitle}</h3><p className="mt-1 leading-6 text-[var(--color-text-muted)]">{copy.interviewHint}</p></div>
        <Input type="number" min={CASE_DECISION_LIMITS.responseDaysMin} max={CASE_DECISION_LIMITS.responseDaysMax} step="1" label={copy.interviewResponseDays} value={days} error={daysError} onChange={(event) => updateInterview('rpl_interview_response_days', event.target.value)} />
        <div className="grid gap-4 lg:grid-cols-2">
          <Textarea dir="rtl" lang="ar" rows={3} label={copy.officeAddressAr} value={settings.rpl_interview_office_address.ar} error={addressError('ar')} onChange={(event) => setAddress('ar', event.target.value)} />
          <Textarea dir="ltr" lang="en" rows={3} label={copy.officeAddressEn} value={settings.rpl_interview_office_address.en} error={addressError('en')} onChange={(event) => setAddress('en', event.target.value)} />
        </div>
        <p className="leading-6 text-[var(--color-text-muted)]">{copy.officeAddressHint}</p>
        {interviewErrors.rpl_interview_office_address ? <p className="whitespace-pre-line text-sm text-[var(--color-danger)]">{interviewErrors.rpl_interview_office_address}</p> : null}
      </section>
    )
  }

  const pathwayName = (id) => localize(pathways.find((item) => Number(item.id) === Number(id))?.name, language)
  const levelName = (id) => localize(levels.find((item) => Number(item.id) === Number(id))?.name, language)
  const feeDate = (value) => (value ? formatLocalizedDate(value, language, { dateStyle: 'medium', timeZone: 'UTC' }) : '')

  // The Fees tab names each row by its pathway and level (UI-04): the generic code/name columns read "USD | $ 0.00" on every row.
  const feeColumns = [
    { key: 'pathway', label: copy.pathway, render: (row) => <span className="font-semibold">{pathwayName(row.rpl_pathway_id) || `#${row.rpl_pathway_id}`}</span> },
    { key: 'level', label: copy.level, render: (row) => (row.rpl_level_id == null || row.rpl_level_id === '' ? <span className="text-[var(--color-text-muted)]">{copy.feeAllLevels}</span> : <span>{levelName(row.rpl_level_id) || `#${row.rpl_level_id}`}</span>) },
    { key: 'amount', label: copy.amount, render: (row) => <div><span className="font-bold"><bdi dir="ltr">{formatMoney(feeRowMoney(row), language)}</bdi></span>{isLegacyFeeRow(row) ? <p className="mt-1"><Badge variant="warning">{copy.feeLegacyCurrency.replace('{currency}', String(row.money?.currency ?? row.currency ?? ''))}</Badge></p> : null}</div> },
    { key: 'in_force', label: copy.feeInForce, render: (row) => <span className="text-sm text-[var(--color-text-muted)]">{row.effective_from || row.effective_until ? `${feeDate(row.effective_from) || '—'} – ${feeDate(row.effective_until) || copy.feeOpenEnded}` : '—'}</span> },
  ]

  // The levels table names each level's pathway (F-9): both pathways use the same level names.
  const levelColumns = () => { const [code, name, ...rest] = genericColumns(); return [code, name, { key: 'pathway', label: copy.pathway, render: (row) => pathwayName(row.rpl_pathway_id) || '—' }, ...rest] }
  const columns = tab.resource === 'fee-schedules' ? [...feeColumns, ...genericColumns().slice(2)] : tab.resource === 'levels' ? levelColumns() : genericColumns()
  const statusLabel = (value) => (RECORD_STATUSES.includes(value) ? copy.statusLabels[value] : <bdi>{value}</bdi>)

  function genericColumns() { return [
    { key: 'code', label: copy.code, render: (row) => <code className="rounded-lg bg-[var(--color-surface-muted)] px-2 py-1 text-xs font-semibold">{row.code || row.currency || `#${row.id}`}</code> },
    { key: 'name', label: copy.name, render: (row) => <div><span className="font-bold">{localize(row.name || row.content, language) || (row.amount != null || row.money ? <bdi dir="ltr">{formatMoney(feeRowMoney(row), language)}</bdi> : '—')}</span>{tab.resource === 'fee-schedules' && isLegacyFeeRow(row) ? <p className="mt-1"><Badge variant="warning">{copy.feeLegacyCurrency.replace('{currency}', String(row.money?.currency ?? row.currency ?? ''))}</Badge></p> : null}<p className="mt-1 max-w-lg text-xs leading-5 text-[var(--color-text-muted)]">{localize(row.description, language)}</p></div> },
    { key: 'status', label: copy.status, render: (row) => row.status ? <Badge variant={row.status === 'published' ? 'success' : 'neutral'}>{statusLabel(row.status)}</Badge> : <Badge variant={row.is_active !== false ? 'success' : 'neutral'}>{row.is_active !== false ? copy.active : copy.inactive}</Badge> },
    { key: 'actions', label: copy.actionsLabel, render: (row) => <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => openForm(row)}><Pencil size={15} />{copy.edit}</Button>{!tab.immutable ? <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(row)}><Trash2 size={15} /><span className="sr-only">{copy.delete}</span></Button> : null}</div> },
  ] }

  function relationFields() {
    return <>
      {['levels', 'standards', 'fees'].includes(activeTab) ? <Select label={copy.pathway} value={form.rpl_pathway_id ?? ''} onChange={(event) => setForm((current) => ({ ...current, rpl_pathway_id: event.target.value, rpl_level_id: '' }))}><option value="">—</option>{pathways.map((item) => <option key={item.id} value={item.id}>{localize(item.name, language)}</option>)}</Select> : null}
      {['competencies', 'rubrics'].includes(activeTab) ? <Select label={copy.standard} value={form.rpl_standard_id ?? ''} onChange={(event) => setForm((current) => ({ ...current, rpl_standard_id: event.target.value }))}><option value="">—</option>{standards.map((item) => <option key={item.id} value={item.id}>{localize(item.name, language)} · v{item.version}</option>)}</Select> : null}
      {/* A fee's levels are its pathway's own; a rubric lists every level, each naming its pathway, since both pathways use the same level names (UI-04). */}
      {activeTab === 'fees' ? <Select label={copy.level} value={form.rpl_level_id ?? ''} hint={!form.rpl_pathway_id ? copy.feeChoosePathway : undefined} onChange={(event) => setForm((current) => ({ ...current, rpl_level_id: event.target.value }))}><option value="">{copy.feeAllLevels}</option>{levels.filter((item) => form.rpl_pathway_id && Number(item.rpl_pathway_id) === Number(form.rpl_pathway_id)).map((item) => <option key={item.id} value={item.id}>{localize(item.name, language)} · {pathwayName(item.rpl_pathway_id)}</option>)}</Select> : null}
      {activeTab === 'rubrics' ? <Select label={copy.level} value={form.rpl_level_id ?? ''} onChange={(event) => setForm((current) => ({ ...current, rpl_level_id: event.target.value }))}><option value="">—</option>{levels.map((item) => <option key={item.id} value={item.id}>{localize(item.name, language)} · {pathwayName(item.rpl_pathway_id)}</option>)}</Select> : null}
    </>
  }

  function resourceFields() {
    if (activeTab === 'pathways') return <><Input label={copy.slug} value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} /><Input type="number" min="0" label={copy.order} value={form.sort_order} onChange={(event) => setForm((current) => ({ ...current, sort_order: event.target.value }))} /></>
    if (activeTab === 'levels') return <Input type="number" min="1" label={copy.rank} value={form.rank} onChange={(event) => setForm((current) => ({ ...current, rank: event.target.value }))} />
    if (activeTab === 'standards' || activeTab === 'rubrics') return <><Input type="number" min="1" label={copy.version} value={form.version} onChange={(event) => setForm((current) => ({ ...current, version: event.target.value }))} /><Select label={copy.status} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}><option value="draft">{copy.draft}</option><option value="published">{copy.published}</option><option value="retired">{copy.retired}</option></Select></>
    if (activeTab === 'categories') return <><Textarea dir={formLanguage === 'ar' ? 'rtl' : 'ltr'} rows={4} label={copy.examples} value={(form.examples?.[formLanguage] || []).join('\n')} onChange={(event) => setForm((current) => ({ ...current, examples: { ...current.examples, [formLanguage]: event.target.value.split('\n').filter(Boolean) } }))} /><div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900 lg:col-span-2"><strong className="block">{copy.fixedUploadPolicy}</strong>{copy.fixedUploadPolicyHint}</div><Input type="number" min="0" label={copy.minimum} value={form.minimum_items} onChange={(event) => setForm((current) => ({ ...current, minimum_items: event.target.value }))} /><Input type="number" min="1" label={copy.maximum} value={form.maximum_items} onChange={(event) => setForm((current) => ({ ...current, maximum_items: event.target.value }))} /></>
    if (activeTab === 'declarations') return <><Input type="number" min="1" label={copy.version} value={form.version} onChange={(event) => setForm((current) => ({ ...current, version: event.target.value }))} /><Input type="date" label={copy.effectiveFrom} value={form.effective_from || ''} onChange={(event) => setForm((current) => ({ ...current, effective_from: event.target.value }))} /></>
    if (activeTab === 'outcomes' || activeTab === 'actions') return <Select label={copy.behavior} value={form.behavior} onChange={(event) => setForm((current) => ({ ...current, behavior: event.target.value }))}>{(activeTab === 'outcomes' ? ['achieved', 'development_required', 'limited_completion', 'not_achieved'] : ['approve', 'conditional', 'remediation', 'reject', 'reassign']).map((value) => <option key={value} value={value}>{behaviorLabel(value, copy)}</option>)}</Select>
    if (activeTab === 'fees') return feeFields()
    if (activeTab === 'committees') return <><Input type="number" min="1" max="1" label={copy.quorum} value={form.quorum} onChange={(event) => setForm((current) => ({ ...current, quorum: event.target.value }))} /><p className="text-xs text-amber-800">{copy.quorumSingleOnly}</p></>
    return <Input type="number" min="0" label={copy.order} value={form.sort_order} onChange={(event) => setForm((current) => ({ ...current, sort_order: event.target.value }))} />
  }

  // The Fees tab (owner, 17 Oct 2026): one fee in US dollars, for the committee path
  // and the final-exam path alike; a client paying in pounds pays it at the rate when he pays.
  function feeFields() {
    const error = feeScheduleFormError(form)
    const typed = String(form.amount ?? '').trim() !== ''
    return <>
      <p className="self-end text-sm font-semibold text-[var(--color-text-muted)]">{copy.feeCurrencyUsd}</p>
      <MoneyInput currency="USD" language={language} label={copy.feeAmountUsd} value={form.amount} error={typed && error === 'amount' ? copy.feeAmountInvalid : undefined} onChange={(value) => setForm((current) => ({ ...current, amount: value }))} />
      {form.legacy_currency ? <p role="note" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900 lg:col-span-2">{copy.feeLegacyCurrency.replace('{currency}', form.legacy_currency)}</p> : null}
      <Input type="date" label={copy.effectiveFrom} value={form.effective_from || ''} onChange={(event) => setForm((current) => ({ ...current, effective_from: event.target.value }))} />
      <Input type="date" label={copy.effectiveUntil} value={form.effective_until || ''} onChange={(event) => setForm((current) => ({ ...current, effective_until: event.target.value }))} />
    </>
  }

  function nestedFields() {
    if (activeTab === 'standards') return <fieldset><legend className="mb-3 font-bold">{copy.evidenceCategories}</legend><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{evidenceCategories.map((category) => { const selected = form.evidence_categories.some((item) => Number(item.category_id) === Number(category.id)); return <label key={category.id} className="flex cursor-pointer gap-2 rounded-xl border border-[var(--color-border)] p-3 text-sm"><input type="checkbox" checked={selected} onChange={() => setForm((current) => ({ ...current, evidence_categories: selected ? current.evidence_categories.filter((item) => Number(item.category_id) !== Number(category.id)) : [...current.evidence_categories, { category_id: category.id, is_required: true, minimum_items: category.minimum_items || 1, maximum_items: category.maximum_items || null }] }))} /><span>{localize(category.name, language)}</span></label> })}</div></fieldset>
    if (activeTab === 'rubrics') return <fieldset><div className="mb-3 flex items-center justify-between gap-3"><legend className="font-bold">{copy.criteria}</legend><Button size="sm" variant="outline" onClick={() => setForm((current) => ({ ...current, criteria: [...current.criteria, { competency_id: '', code: '', title: localized(), description: localized(), maximum_score: 100, pass_score: 60, is_required: true, sort_order: current.criteria.length }] }))}><Plus size={15} />{copy.addCriterion}</Button></div><div className="space-y-3">{form.criteria.map((item, index) => <div key={`${item.code}-${index}`} className="grid gap-3 rounded-xl border border-[var(--color-border)] p-4 lg:grid-cols-2"><Select label={copy.competency} value={item.competency_id} onChange={(event) => setForm((current) => ({ ...current, criteria: current.criteria.map((row, rowIndex) => rowIndex === index ? { ...row, competency_id: event.target.value } : row) }))}><option value="">—</option>{competencies.filter((competency) => !form.rpl_standard_id || Number(competency.rpl_standard_id) === Number(form.rpl_standard_id)).map((competency) => <option key={competency.id} value={competency.id}>{localize(competency.name, language)}</option>)}</Select><Input label={copy.code} value={item.code} onChange={(event) => setForm((current) => ({ ...current, criteria: current.criteria.map((row, rowIndex) => rowIndex === index ? { ...row, code: event.target.value } : row) }))} /><Input label={copy.name} value={item.title?.[formLanguage] || ''} onChange={(event) => setForm((current) => ({ ...current, criteria: current.criteria.map((row, rowIndex) => rowIndex === index ? { ...row, title: { ...row.title, [formLanguage]: event.target.value } } : row) }))} /><div className="grid grid-cols-2 gap-3"><Input type="number" label={copy.maximumScore} value={item.maximum_score} onChange={(event) => setForm((current) => ({ ...current, criteria: current.criteria.map((row, rowIndex) => rowIndex === index ? { ...row, maximum_score: event.target.value } : row) }))} /><Input type="number" label={copy.passScore} value={item.pass_score} onChange={(event) => setForm((current) => ({ ...current, criteria: current.criteria.map((row, rowIndex) => rowIndex === index ? { ...row, pass_score: event.target.value } : row) }))} /></div><div className="flex items-center justify-between lg:col-span-2"><label className="flex items-center gap-2"><input type="checkbox" checked={item.is_required} onChange={(event) => setForm((current) => ({ ...current, criteria: current.criteria.map((row, rowIndex) => rowIndex === index ? { ...row, is_required: event.target.checked } : row) }))} />{copy.required}</label><Button size="sm" variant="ghost" onClick={() => setForm((current) => ({ ...current, criteria: current.criteria.filter((_, rowIndex) => rowIndex !== index) }))}><Trash2 size={15} />{copy.delete}</Button></div></div>)}</div></fieldset>
    if (activeTab === 'committees') return <fieldset><div className="mb-3 flex items-center justify-between gap-3"><legend className="font-bold">{copy.members}</legend><Button size="sm" variant="outline" onClick={() => setForm((current) => ({ ...current, members: [...current.members, { user_id: '', role: 'member', is_active: true }] }))}><Plus size={15} />{copy.addMember}</Button></div><div className="space-y-3">{form.members.map((item, index) => <div key={index} className="grid gap-3 rounded-xl border border-[var(--color-border)] p-4 sm:grid-cols-[minmax(0,1fr)_180px_auto]"><Select label={copy.member} value={item.user_id} onChange={(event) => setForm((current) => ({ ...current, members: current.members.map((row, rowIndex) => rowIndex === index ? { ...row, user_id: event.target.value } : row) }))}><option value="">—</option>{state.users.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.email}</option>)}</Select><Select label={copy.role} value={item.role} onChange={(event) => setForm((current) => ({ ...current, members: current.members.map((row, rowIndex) => rowIndex === index ? { ...row, role: event.target.value } : row) }))}><option value="chair">{copy.chair}</option><option value="member">{copy.committeeMember}</option><option value="secretary">{copy.secretary}</option></Select><Button className="self-end" size="sm" variant="ghost" onClick={() => setForm((current) => ({ ...current, members: current.members.filter((_, rowIndex) => rowIndex !== index) }))}><Trash2 size={15} /></Button></div>)}</div></fieldset>
    return null
  }

  function renderForm() {
    const contentField = activeTab === 'declarations' ? 'content' : 'name'
    return <Card><CardHeader className="border-b border-[var(--color-border)]"><div className="flex items-center justify-between gap-3"><CardTitle>{form.id ? copy.edit : copy.add}</CardTitle><Button size="sm" variant="ghost" onClick={() => setFormOpen(false)} aria-label={copy.cancel}><X size={17} /></Button></div></CardHeader><CardContent className="space-y-5 pt-6"><div className="flex gap-2">{['en', 'ar'].map((locale) => <button key={locale} type="button" onClick={() => setFormLanguage(locale)} className={`rounded-full px-4 py-2 text-sm font-semibold ${formLanguage === locale ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]'}`}>{locale.toUpperCase()}</button>)}</div><div className="grid gap-4 lg:grid-cols-2">{activeTab !== 'fees' ? <Input label={copy.code} value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} /> : null}{relationFields()}{activeTab !== 'fees' ? <Input dir={formLanguage === 'ar' ? 'rtl' : 'ltr'} label={activeTab === 'declarations' ? copy.descriptionField : copy.name} value={form[contentField]?.[formLanguage] || ''} onChange={(event) => updateLocalized(contentField, event.target.value)} /> : null}{!['fees', 'declarations'].includes(activeTab) ? <Textarea dir={formLanguage === 'ar' ? 'rtl' : 'ltr'} rows={3} label={copy.descriptionField} value={form.description?.[formLanguage] || ''} onChange={(event) => updateLocalized('description', event.target.value)} /> : null}{resourceFields()}</div>{activeTab === 'categories' ? <div className="grid gap-3 sm:grid-cols-3"><label className="flex items-center gap-2 rounded-xl border p-3"><input type="checkbox" checked={form.accepts_files} onChange={(event) => setForm((current) => ({ ...current, accepts_files: event.target.checked }))} />{copy.files}</label><label className="flex items-center gap-2 rounded-xl border p-3"><input type="checkbox" checked={form.accepts_urls} onChange={(event) => setForm((current) => ({ ...current, accepts_urls: event.target.checked }))} />{copy.urls}</label><label className="flex items-center gap-2 rounded-xl border p-3"><input type="checkbox" checked={form.is_required_by_default} onChange={(event) => setForm((current) => ({ ...current, is_required_by_default: event.target.checked }))} />{copy.requiredDefault}</label></div> : null}{activeTab === 'outcomes' ? <div className="grid gap-3 sm:grid-cols-2"><label className="flex items-center gap-2 rounded-xl border p-3"><input type="checkbox" checked={form.requires_gap_plan} onChange={(event) => setForm((current) => ({ ...current, requires_gap_plan: event.target.checked }))} />{copy.requiresGapPlan}</label><label className="flex items-center gap-2 rounded-xl border p-3"><input type="checkbox" checked={form.is_credential_eligible} onChange={(event) => setForm((current) => ({ ...current, is_credential_eligible: event.target.checked }))} />{copy.credentialEligible}</label></div> : null}{!['standards', 'rubrics'].includes(activeTab) ? <label className="flex w-fit items-center gap-2 rounded-xl border p-3"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} />{copy.active}</label> : null}{nestedFields()}<div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setFormOpen(false)}>{copy.cancel}</Button><Button onClick={saveRecord} disabled={action.busy || !isValid()}>{action.busy ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />}{copy.save}</Button></div></CardContent></Card>
  }

  /*
   * The journey rules (D-18): one card per stage, in the order a case meets them,
   * each with its anchor; the controls, keys and the one save request are as
   * before. The save sits in a bar that stays in view and says when something is
   * not saved yet.
   */
  function settingsCard(id, children, { muted = false, hint } = {}) {
    return (
      <Card id={`settings-${id}`} className={`scroll-mt-24 ${muted ? 'bg-[var(--color-surface-muted)]' : ''}`}>
        <CardHeader className="border-b border-[var(--color-border)]"><CardTitle>{copy.cards[id]}</CardTitle>{hint ? <p className="mt-2 text-sm text-[var(--color-text-muted)]">{hint}</p> : null}</CardHeader>
        <CardContent className="space-y-5 pt-6">{children}</CardContent>
      </Card>
    )
  }

  function renderSettings() {
    const ready = !(Number(settings.appeal_window_days) < 1 || Number(settings.appeal_window_days) > 180 || settings.gemini_advisory_prompt.trim().length < 200 || !isReapplyCooldownValid(settings) || !isScreeningModelValid || !isInterviewSettingsValid || !isQuizPassMarkReady(quizPassMark) || !isCoursePlanMinimumsReady(coursePlanMinimums) || !isCoursePlanMinimumsReady(failedMinimums) || !isAfterQuizSettingsReady(afterQuiz))
    return (
      <div className="space-y-6">
        <SectionAnchorNav ariaLabel={copy.jumpTo} title={copy.jumpTo} sections={SETTINGS_ANCHORS.map((id) => ({ id: `settings-${id}`, label: copy.anchors[id] }))} />
        {settingsCard('intake', <>
          {/* The reapply cooldown (owner, 12 Oct 2026). Governed: no default here or in the API, and the date is frozen onto each rejected case, so an edit only affects rejections made after it. */}
          <section className="space-y-4 text-sm"><div><h3 className="font-bold">{copy.cooldownTitle}</h3><p className="mt-1 leading-6 text-[var(--color-text-muted)]">{copy.cooldownHint}</p></div><div className="grid gap-4 sm:grid-cols-2"><Input type="number" min="0" max="365" step="1" label={copy.cooldownDays} value={settings.rpl_reapply_cooldown_days} error={settings.rpl_reapply_cooldown_days === '' ? copy.cooldownMissing : undefined} onChange={(event) => setSettings((current) => ({ ...current, rpl_reapply_cooldown_days: event.target.value }))} /><Select label={copy.cooldownScope} value={settings.rpl_reapply_cooldown_scope} error={settings.rpl_reapply_cooldown_scope === '' ? copy.cooldownMissing : undefined} onChange={(event) => setSettings((current) => ({ ...current, rpl_reapply_cooldown_scope: event.target.value }))}><option value="" disabled>—</option><option value="all_rejections">{copy.cooldownScopeAll}</option><option value="screening_interview_quiz_declines">{copy.cooldownScopeNarrow}</option></Select></div></section>
          <label className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] p-4 text-sm"><input type="checkbox" checked={settings.require_verified_evidence_for_assessment} onChange={(event) => setSettings((current) => ({ ...current, require_verified_evidence_for_assessment: event.target.checked }))} />{copy.requireVerified}</label>
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sm leading-6 text-sky-900"><strong className="block text-base">{copy.fixedUploadPolicy}</strong><span>{copy.fixedUploadPolicyHint}</span></div>
        </>)}
        {settingsCard('screening', <>
          {renderScreeningSettings()}
          {/* The privacy kill switch: whether the applicant's own files leave the platform for the model. */}
          <label className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><input type="checkbox" className="mt-1" checked={settings.rpl_advisory_include_evidence_documents} onChange={(event) => setSettings((current) => ({ ...current, rpl_advisory_include_evidence_documents: event.target.checked }))} /><span><strong className="block">{copy.evidenceDocuments}</strong><span className="mt-1 block leading-6">{copy.evidenceDocumentsHint}</span></span></label>
        </>)}
        {settingsCard('interview', renderInterviewSettings())}
        {settingsCard('entry-quiz', <>
          <QuizPassMarkSetting language={screenLanguage} state={quizPassMark} onChange={(value) => setQuizPassMark({ value, include: true, error: '' })} />
          <section className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950"><div><h3 className="font-bold">{copy.geminiOnAssessment}</h3><p className="mt-1 leading-6">{copy.geminiHint}</p></div><Input label={copy.geminiModel} value={settings.gemini_advisory_model} onChange={(event) => setSettings((current) => ({ ...current, gemini_advisory_model: event.target.value }))} /><Textarea rows={14} label={copy.geminiPrompt} value={settings.gemini_advisory_prompt} onChange={(event) => setSettings((current) => ({ ...current, gemini_advisory_prompt: event.target.value }))} /><p className="text-xs leading-5">{copy.geminiGovernance}</p></section>
        </>)}
        {settingsCard('course-plan', <>
          <CoursePlanMinimumsSetting language={screenLanguage} levels={minimumLevels(levels)} state={coursePlanMinimums} onChange={(code, value) => setCoursePlanMinimums((current) => changeCoursePlanMinimum(current, code, value))} />
          <CoursePlanMinimumsSetting variant="failed" language={screenLanguage} levels={minimumLevels(levels)} state={failedMinimums} onChange={(code, value) => setFailedMinimums((current) => changeCoursePlanMinimum(current, code, value))} />
        </>)}
        {settingsCard('after-quiz', <AfterQuizSettings language={screenLanguage} state={afterQuiz} onChange={(key, value) => setAfterQuiz((current) => changeAfterQuizSetting(current, key, value))} />)}
        {settingsCard('preflow', <Input type="number" min="1" max="180" label={copy.appealDays} value={settings.appeal_window_days} onChange={(event) => setSettings((current) => ({ ...current, appeal_window_days: event.target.value }))} />, { muted: true, hint: copy.preflowHint })}
        <details id="settings-statuses" className="scroll-mt-24 rounded-2xl border border-[var(--color-border)] bg-white p-5">
          <summary className="cursor-pointer text-base font-bold text-[var(--color-text)]">{copy.cards.statuses}</summary>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">{copy.workflowHint}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Object.keys(APPLICATION_STATUS).map((status, index) => <div key={status} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] p-3"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-surface-muted)] text-xs font-bold">{index + 1}</span><RplStatusBadge status={status} language={language} /></div>)}</div>
        </details>
        <div data-testid="settings-save-bar" style={{ position: 'sticky', bottom: 0 }} className="z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-white/95 p-3 shadow-[var(--shadow-floating)] backdrop-blur">
          <span role="status" className={`text-sm font-semibold ${settingsDirty ? 'text-amber-700' : 'text-transparent'}`}>{settingsDirty ? copy.unsaved : ''}</span>
          <Button onClick={saveSettings} disabled={action.busy || !ready}><Save size={17} />{copy.saveSettings}</Button>
        </div>
      </div>
    )
  }

  /* The header's links (§3.4): the rules reference and the exchange rate, each for whoever may open it. */
  function headerLinks() {
    const links = []
    if (canAccess(getRouteAccess('/rpl/source-of-truth'))) links.push(<Link key="rules" to="/rpl/source-of-truth" className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-3.5 py-2 text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]"><BookOpenCheck size={16} aria-hidden="true" />{copy.rulesReference}</Link>)
    if (canAccess(getRouteAccess('/finance/exchange-rate'))) links.push(<Link key="rate" to={canAccess(getRouteAccess('/finance')) ? '/finance?tab=exchange_rate' : '/finance/exchange-rate'} className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-3.5 py-2 text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]"><ArrowLeftRight size={16} aria-hidden="true" />{copy.exchangeRate}</Link>)
    return links.length ? <>{links}</> : null
  }

  const sectionLabel = (key) => ({ journey: copy.workflow, fees: copy.fees, wording: copy.certificate_wording, levels: copy.sectionLevels, preflow: copy.sectionPreflow })[key]

  return (
    <section dir={isArabic ? 'rtl' : 'ltr'} className="space-y-7">
      <PageHeader title={copy.title} description={copy.description} actions={headerLinks()} />
      <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-white p-2">
        <nav className="flex min-w-max gap-1" aria-label={copy.sectionsLabel}>
          {SECTIONS.map((section) => {
            const active = section.key === activeSection.key
            return <button key={section.key} type="button" onClick={() => changeTab(section.tabs[0])} className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${active ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]'}`} aria-current={active ? 'page' : undefined}>{sectionLabel(section.key)}</button>
          })}
        </nav>
      </div>
      {activeSection.tabs.length > 1 ? (
        <div className="overflow-x-auto">
          <nav className="flex min-w-max gap-1" aria-label={copy.tabsLabel}>
            {activeSection.tabs.map((key) => {
              const item = tabs.find((candidate) => candidate.key === key)
              const Icon = item.icon
              const active = key === activeTab
              return <button key={key} type="button" onClick={() => changeTab(key)} className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold ${active ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]'}`} aria-current={active ? 'page' : undefined}><Icon size={16} />{copy[key]}</button>
            })}
          </nav>
        </div>
      ) : null}
      {action.error || action.success ? <div role="alert" className={`rounded-2xl border px-4 py-3 text-sm ${action.error ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>{action.error || action.success}</div> : null}
      <RplPageState loading={state.loading} error={state.error} onRetry={load} language={language}>
        {tab.wording ? <CertificateWordingPanel language={screenLanguage} /> : tab.settings ? renderSettings() : <div className="space-y-6"><div className="flex items-center justify-between gap-4">{tab.immutable ? <p className="text-sm text-[var(--color-text-muted)]">{copy.deactivateHint}</p> : <span />}<Button onClick={() => openForm()}><Plus size={17} />{copy.add}</Button></div>{activeTab === 'fees' ? <p className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900">{copy.feesFinalExamHint}</p> : null}{formOpen ? renderForm() : null}<DataTableShell title={copy[activeTab]} description={copy.description} columns={columns} rows={state.rows} emptyText={copy.empty} /></div>}
      </RplPageState>
      {deleteTarget ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#031C2C]/65 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteTarget(null) }}>
          <div ref={deleteDialogRef} tabIndex={-1} role="alertdialog" aria-modal="true" aria-labelledby="rpl-delete-title" className="w-full max-w-md outline-none">
            <Card className="w-full">
              <CardContent className="p-6">
                <h2 id="rpl-delete-title" className="text-xl font-bold">{copy.confirmDelete}</h2>
                <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{copy.confirmText}</p>
                <div className="mt-6 flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setDeleteTarget(null)}>{copy.cancel}</Button>
                  <Button variant="danger" onClick={removeRecord} disabled={action.busy}><Trash2 size={17} />{copy.delete}</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </section>
  )
}
