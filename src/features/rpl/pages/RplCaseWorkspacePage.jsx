import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  Gavel,
  GraduationCap,
  History,
  ListChecks,
  LoaderCircle,
  RefreshCw,
  Save,
  Scale,
  ScanSearch,
  ShieldCheck,
  UserRoundCheck,
} from 'lucide-react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, PageHeader, Select, Textarea } from '../../../components/ui'
import { readApiError, unwrapApiData, unwrapCollection } from '../../../services/apiResponse'
import { getAdminLanguage } from '../../../services/languageStorage'
import {
  APPLICATION_STATUS,
  CLOSED_APPLICATION_STATUSES,
  EVIDENCE_CATEGORIES,
  getApplicationEvidenceCategories,
  localize,
  readApplicationCompleteness,
  readApplicationDecline,
  readApplicationDeclarationAccepted,
  readDeclineCategories,
  readDeclineRecord,
  timelineEventTitle,
} from '../domain/rpl'
import { CASE_DECISION_PERMISSIONS, caseDecisionCopy } from '../domain/caseDecision'
import {
  SCREENING_PERMISSIONS,
  claimedEmployersCopy,
  fill,
  readClaimedEmployers,
  regionName,
  safeExternalUrl,
  screeningCopy,
} from '../domain/documentScreening'
import { COURSE_PLAN_LIVE_STATUSES, COURSE_PLAN_PERMISSIONS, coursePlanCopy } from '../domain/coursePlan'
import { AFTER_QUIZ_PERMISSIONS, afterQuizCopy } from '../domain/afterQuiz'
import {
  assignRplAssessor,
  acceptRplAssignment,
  closeRplInformationRequest,
  createRplInformationRequest,
  declareRplConflict,
  fetchRplApplication,
  fetchRplAssessments,
  fetchRplAssessors,
  fetchRplAssignments,
  fetchRplEvidence,
  fetchRplReferenceData,
  fetchRplScreenings,
  fetchRplTimeline,
  submitRplCommitteeDecision,
  submitRplInitialReview,
  submitRplQualityReview,
  startAdminRplAssessment,
  startRplAssessment,
  transitionRplApplication,
} from '../services/rplService'
import CompletenessMeter from '../components/CompletenessMeter'
import ChargesPanel from '../components/ChargesPanel'
import CoursePlanEditor from '../components/CoursePlanEditor'
import DeclineApplicationAction from '../components/DeclineApplicationAction'
import DocumentScreeningPanel from '../components/DocumentScreeningPanel'
import InterviewPanel, { InterviewSummary } from '../components/InterviewPanel'
import ScreeningDecisionCard, { ScreeningDecisionEntry, ScreeningDecisionHistory } from '../components/ScreeningDecisionCard'
import EvidenceUploadCenter from '../components/EvidenceUploadCenter'
import ExperienceCertificatePanel from '../components/ExperienceCertificatePanel'
import FinalExamPanel from '../components/FinalExamPanel'
import GapClosurePanel from '../components/GapClosurePanel'
import PaymentReconciliationPanel from '../components/PaymentReconciliationPanel'
import RplPageState from '../components/RplPageState'
import RplStatusBadge from '../components/RplStatusBadge'
import { useModalDialog } from '../../../hooks/useModalDialog'
import { useAuthorization } from '../../auth/context/useAuthorization'
import { formatLocalizedDate, formatLocalizedDateTime } from '../../../utils/localization'

const copyByLanguage = {
  ar: {
    eyebrow: 'مساحة عمل حالة RPL', title: 'ملف الاعتراف بالخبرة', description: 'ملف تشغيلي موحد يحافظ على فصل التحقق والتقييم وقرار اللجنة.', back: 'العودة إلى الطلبات', refresh: 'تحديث',
    overview: 'نظرة عامة', evidence: 'الأدلة والتحقق', assessment: 'التقييم والمقيّمون', governance: 'اللجنة والجودة', timeline: 'الخط الزمني',
    caseSummary: 'ملخص الملف', applicant: 'المتقدم', reference: 'رقم الطلب', pathway: 'المسار', requestedLevel: 'المستوى المطلوب', experience: 'سنوات الخبرة', submitted: 'تاريخ التقديم', declineReason: 'سبب الرفض', reapplyFrom: 'يمكنه تقديم طلب جديد اعتبارًا من', reapplyDerived: 'محسوب من تاريخ الرفض وإعداد فترة الانتظار الحالي',
    contact: 'بيانات التواصل', email: 'البريد الإلكتروني', phone: 'الهاتف', nationality: 'الجنسية', country: 'بلد الإقامة', profession: 'المجال المهني',
    initialReview: 'المراجعة الإدارية الأولية', accepted: 'مقبول للتحقق', needsInformation: 'معلومات إضافية مطلوبة', rejected: 'مرفوض', subject: 'الموضوع', message: 'الرسالة للمتقدم', dueAt: 'موعد الرد', saveReview: 'حفظ المراجعة', reviewSaved: 'تمت المراجعة الإدارية.', requests: 'طلبات المعلومات الناقصة', createRequest: 'إرسال طلب', requestSaved: 'تم إرسال طلب المعلومات.', closeRequest: 'إغلاق', noRequests: 'لا توجد طلبات مفتوحة.',
    workflow: 'إدارة حالة الطلب', nextStatus: 'الحالة التالية', note: 'ملاحظة انتقال الحالة', saveTransition: 'تحديث الحالة', transitionSaved: 'تم تحديث حالة الطلب.',
    noTransitions: 'لا توجد حالة أخرى يمكن تعيينها من هنا. استخدم إجراءات القرار أو المقابلة أو الرفض.', closedCase: 'هذا الطلب مغلق: لا توجد حالة أخرى يمكن تعيينها له.', declineRecordTitle: 'قرار الرفض', declinedBy: 'رفضه {name} في {at}', declinedAt: 'رُفض في {at}', declineRationale: 'تعليل الرفض (للموظفين فقط، ولا يراه العميل)', applicantCategory: 'ما أُبلغ به المتقدم',
    closingWithdrawsSets: 'تُسحب مع الطلب أي مجموعة أسئلة ما زالت بانتظار الإجابة، ويُصحَّح اختبار الدخول المفتوح الذي يجري وقته عند انتهاء الوقت.',
    assessorTitle: 'إسناد ومتابعة المقيّمين', assessorHint: 'لا يجوز للمقيّم اتخاذ قرار الاعتماد أو إصدار الشهادة.', assessor: 'المقيّم', role: 'الدور', assign: 'إسناد المقيّم', assigned: 'تم إسناد المقيّم.', noAssignments: 'لا يوجد مقيّم مسند حاليًا.', acceptAssignment: 'قبول الإسناد', noConflict: 'لا يوجد تعارض', reportConflict: 'إفصاح عن تعارض', conflictDetails: 'تفاصيل تعارض المصالح', startAssessment: 'بدء التقييم', conflictSaved: 'تم حفظ إفصاح تعارض المصالح.',
    assessments: 'تقارير التقييم', noAssessments: 'لا توجد جلسات تقييم لهذا الملف بعد.', openAssessment: 'فتح التقييم',
    adminEvaluation: 'التقييم الإداري بمساعدة Gemini', adminEvaluationHint: 'لا يلزم إسناد مقيّم خارجي. ينشئ Gemini مسودة، وللمدير الذي بدأها وحده صلاحية مراجعتها وتعديلها وإرسالها.', startAdminEvaluation: 'بدء تقييم المدير', adminEvaluationStarted: 'تم بدء تقييم المدير. أنشئ مسودة Gemini ثم راجعها وعدّلها.',
    primary: 'أساسي', secondary: 'ثانوي', rejectedQuality: 'مرفوض', assessmentReference: 'تقييم', event: 'حدث', pendingAssignment: 'بانتظار القبول', pendingConflict: 'بانتظار إفصاح التعارض', acceptedAssignment: 'مقبول', declinedAssignment: 'مرفوض', completedAssignment: 'مكتمل',
    committeeTitle: 'قرار لجنة الاعتماد', committeeHint: 'يجب أن يبقى القرار منفصلًا عن توصية المقيّم.', decision: 'القرار', recommendedLevel: 'المستوى النهائي', rationale: 'الأسباب والتعليل', submitDecision: 'حفظ قرار اللجنة', decisionSaved: 'تم حفظ قرار اللجنة.',
    qualityTitle: 'مراجعة ضمان الجودة', qualityResult: 'نتيجة المراجعة', approve: 'اعتماد الجودة', return: 'إعادة للعمل', qualityNotes: 'ملاحظات الجودة', saveQuality: 'حفظ مراجعة الجودة', qualitySaved: 'تم حفظ مراجعة الجودة.',
    events: 'سجل الأحداث والتدقيق', emptyTimeline: 'لا توجد أحداث مسجلة بعد.', actor: 'بواسطة',
    loadError: 'تعذر تحميل ملف RPL.', auxiliaryWarning: 'تم تحميل الملف، لكن بعض البيانات المساندة غير متاحة حاليًا.',
  },
  en: {
    eyebrow: 'RPL Case Workspace', title: 'Prior Learning Recognition Case', description: 'A unified operational case that keeps verification, assessment, and committee authority separate.', back: 'Back to applications', refresh: 'Refresh',
    overview: 'Overview', evidence: 'Evidence & verification', assessment: 'Assessment & assessors', governance: 'Committee & quality', timeline: 'Timeline',
    caseSummary: 'Case summary', applicant: 'Applicant', reference: 'Reference', pathway: 'Pathway', requestedLevel: 'Requested level', experience: 'Years of experience', submitted: 'Submitted', declineReason: 'Decline reason', reapplyFrom: 'May open a new request from', reapplyDerived: 'derived from the rejection date and the current cooldown setting',
    contact: 'Contact and profile', email: 'Email', phone: 'Phone', nationality: 'Nationality', country: 'Country of residence', profession: 'Professional field',
    initialReview: 'Initial administrative review', accepted: 'Accepted for verification', needsInformation: 'More information required', rejected: 'Rejected', subject: 'Subject', message: 'Message to applicant', dueAt: 'Response due', saveReview: 'Save review', reviewSaved: 'Initial review completed.', requests: 'Missing-information requests', createRequest: 'Send request', requestSaved: 'Information request sent.', closeRequest: 'Close', noRequests: 'No information requests exist.',
    workflow: 'Application workflow', nextStatus: 'Next status', note: 'Transition note', saveTransition: 'Update status', transitionSaved: 'Application status updated.',
    noTransitions: 'No other status can be set from here. Use the decision, interview or decline actions.', closedCase: 'This case is closed: no further status can be set.', declineRecordTitle: 'The decline', declinedBy: 'Declined by {name} on {at}', declinedAt: 'Declined on {at}', declineRationale: 'Decline rationale (staff only; the applicant never sees it)', applicantCategory: 'What the applicant was told',
    closingWithdrawsSets: 'A question set still awaiting answers is withdrawn with the case; an opened entry quiz whose time is running is marked when its time runs out.',
    assessorTitle: 'Assessor assignment and oversight', assessorHint: 'An assessor cannot make the accreditation decision or issue a certificate.', assessor: 'Assessor', role: 'Role', assign: 'Assign assessor', assigned: 'Assessor assigned.', noAssignments: 'No assessor is currently assigned.', acceptAssignment: 'Accept assignment', noConflict: 'Declare no conflict', reportConflict: 'Report conflict', conflictDetails: 'Conflict-of-interest details', startAssessment: 'Start assessment', conflictSaved: 'Conflict declaration saved.',
    assessments: 'Assessment reports', noAssessments: 'No assessment sessions exist for this case yet.', openAssessment: 'Open assessment', adminEvaluation: 'Gemini-assisted administrator evaluation', adminEvaluationHint: 'No external assessor is required. Gemini prepares a draft; only the administrator who starts it can review, edit, and submit it.', startAdminEvaluation: 'Start administrator evaluation', adminEvaluationStarted: 'Administrator evaluation started. Generate the Gemini draft, then review and edit it.',
    primary: 'Primary', secondary: 'Secondary', rejectedQuality: 'Rejected', assessmentReference: 'Assessment', event: 'Event', pendingAssignment: 'Awaiting acceptance', pendingConflict: 'Awaiting conflict declaration', acceptedAssignment: 'Accepted', declinedAssignment: 'Declined', completedAssignment: 'Completed',
    committeeTitle: 'Accreditation Committee Decision', committeeHint: 'The decision must remain separate from the assessor recommendation.', decision: 'Decision', recommendedLevel: 'Final level', rationale: 'Rationale and reasons', submitDecision: 'Save committee decision', decisionSaved: 'Committee decision saved.',
    qualityTitle: 'Quality assurance review', qualityResult: 'Review result', approve: 'Quality approved', return: 'Return for rework', qualityNotes: 'Quality notes', saveQuality: 'Save quality review', qualitySaved: 'Quality review saved.',
    events: 'Event and audit history', emptyTimeline: 'No events have been recorded.', actor: 'By',
    loadError: 'Unable to load the RPL case.', auxiliaryWarning: 'The case loaded, but some supporting data is temporarily unavailable.',
  },
}

const tabs = [
  { key: 'overview', icon: BriefcaseBusiness },
  { key: 'evidence', icon: FileCheck2 },
  // Document screening (owner flow of 12 Oct 2026, D17(a)): only for rpl.screening.view, and hidden on a 403.
  { key: 'screening', icon: ScanSearch },
  // The staff decision, the interview and their history (owner flow of 12 Oct 2026, P3).
  { key: 'decision', icon: Scale },
  { key: 'assessment', icon: ClipboardCheck },
  // The governed course plan (owner flow of 12 Oct 2026, P5): from the assessment stage, or once the case has a plan.
  { key: 'course_plan', icon: ListChecks },
  // The one final exam after the learning plan (owner model of 15 Oct 2026, P6): from final_exam, or once the case has had one.
  { key: 'final_exam', icon: GraduationCap },
  { key: 'governance', icon: Gavel },
  { key: 'timeline', icon: History },
]

function valueOf(result, fallback) {
  return result.status === 'fulfilled' ? result.value : fallback
}

function applicantOf(application) {
  return application?.applicant || application?.user || application?.professional_profile?.user || {}
}

/** From the final exam on, the plan in the approved slot is closed: its courses are completed, or the case closed (P6). */
const PLAN_CLOSED_STATUSES = ['final_exam', 'completed']

function Definition({ label, value }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{label}</dt><dd className="mt-1 break-words font-semibold text-[var(--color-text)]">{value || '—'}</dd></div>
}

function experiencePeriod(experience, copy, language) {
  const format = (value) => formatLocalizedDate(value, language, { year: 'numeric', month: 'short' })
  if (!experience.started_on && !experience.ended_on && !experience.is_current) return null
  return `${experience.started_on ? format(experience.started_on) : '—'} – ${experience.is_current ? copy.present : experience.ended_on ? format(experience.ended_on) : '—'}`
}

function WebsiteValue({ value }) {
  const href = safeExternalUrl(value)
  if (!href) return <bdi className="break-all">{value}</bdi>
  return <a href={href} target="_blank" rel="noopener noreferrer" className="break-all text-[var(--color-primary)] underline underline-offset-2"><bdi>{value}</bdi></a>
}

function assignmentLabel(value, copy) {
  return {
    pending: copy.pendingAssignment,
    accepted_pending_conflict: copy.pendingConflict,
    accepted: copy.acceptedAssignment,
    declined: copy.declinedAssignment,
    completed: copy.completedAssignment,
    primary: copy.primary,
    secondary: copy.secondary,
  }[value] || value || '—'
}

export default function RplCaseWorkspacePage() {
  const { applicationId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const language = getAdminLanguage()
  const isArabic = language === 'ar'
  const copy = copyByLanguage[language] || copyByLanguage.en
  const { isAdministrator, hasPermission, user } = useAuthorization()
  // New copy is Arabic and English only (owner, 13 Oct 2026); any other language reads English.
  const screenLanguage = isArabic ? 'ar' : 'en'
  const screeningText = screeningCopy(screenLanguage)
  const employersText = claimedEmployersCopy(screenLanguage)
  const canViewScreening = hasPermission(SCREENING_PERMISSIONS.view)
  const canRunScreening = hasPermission(SCREENING_PERMISSIONS.run)
  // The staff decision and the interview (owner flow of 12 Oct 2026, P3): the same staff as the screening, never assessor- or committee-only roles.
  const decisionText = caseDecisionCopy(screenLanguage)
  const canDecide = hasPermission(CASE_DECISION_PERMISSIONS.decide)
  const canManageInterviews = hasPermission(CASE_DECISION_PERMISSIONS.interviews)
  const canRecordLegacyInterviews = hasPermission(CASE_DECISION_PERMISSIONS.legacyInterviews)
  // Who is looking: a legacy interview's outcome is offered only where the server would take it from them.
  const viewer = { id: user?.id ?? null, isAdministrator }
  const canReadSettings = hasPermission(CASE_DECISION_PERMISSIONS.settings)
  const coursePlanText = coursePlanCopy(screenLanguage)
  const afterQuizText = afterQuizCopy(screenLanguage)
  const adminEvaluationCopy = {
    ar: {
      title: '\u0627\u0644\u062a\u0642\u064a\u064a\u0645 \u0627\u0644\u0625\u062f\u0627\u0631\u064a \u0628\u0645\u0633\u0627\u0639\u062f\u0629 Gemini',
      hint: '\u0644\u0627 \u064a\u0644\u0632\u0645 \u0625\u0633\u0646\u0627\u062f \u0645\u0642\u064a\u0651\u0645 \u062e\u0627\u0631\u062c\u064a. \u064a\u0646\u0634\u0626 Gemini \u0645\u0633\u0648\u062f\u0629\u060c \u0648\u0644\u0644\u0645\u062f\u064a\u0631 \u0627\u0644\u0630\u064a \u0628\u062f\u0623\u0647\u0627 \u0648\u062d\u062f\u0647 \u0635\u0644\u0627\u062d\u064a\u0629 \u0645\u0631\u0627\u062c\u0639\u062a\u0647\u0627 \u0648\u062a\u0639\u062f\u064a\u0644\u0647\u0627 \u0648\u0625\u0631\u0633\u0627\u0644\u0647\u0627.',
      start: '\u0628\u062f\u0621 \u062a\u0642\u064a\u064a\u0645 \u0627\u0644\u0645\u062f\u064a\u0631', open: '\u0641\u062a\u062d \u062a\u0642\u064a\u064a\u0645 \u0627\u0644\u0645\u062f\u064a\u0631',
      started: '\u062a\u0645 \u0628\u062f\u0621 \u062a\u0642\u064a\u064a\u0645 \u0627\u0644\u0645\u062f\u064a\u0631. \u0623\u0646\u0634\u0626 \u0645\u0633\u0648\u062f\u0629 Gemini \u062b\u0645 \u0631\u0627\u062c\u0639\u0647\u0627 \u0648\u0639\u062f\u0651\u0644\u0647\u0627.',
    },
    en: { title: 'Gemini-assisted administrator evaluation', hint: 'No external assessor is required. Gemini prepares a draft; only the administrator who starts it can review, edit, and submit it.', start: 'Start administrator evaluation', open: 'Open administrator evaluation', started: 'Administrator evaluation started. Generate the Gemini draft, then review and edit it.' },
  }[language] || copyByLanguage.en
  // `loaded` tells "not read yet" from "read, and empty" (UI-07): until the first answer, no card says no screening has run.
  const [screening, setScreening] = useState({ loading: false, loaded: false, error: '', forbidden: false, items: [] })
  const [state, setState] = useState({ loading: true, error: '', auxiliaryWarning: false, application: null, evidence: [], categories: EVIDENCE_CATEGORIES, timeline: [], assessments: [], assignments: [], assessors: [], levels: [], committees: [], committeeActions: [], outcomes: [], competencyNames: {}, declineCategories: readDeclineCategories(null) })
  // The course plan tab (P5): needs rpl.applications.view, and a 403 from the server removes it.
  const [coursePlanForbidden, setCoursePlanForbidden] = useState(false)
  // The final exam tab (P6): the same rule, and a 403 from the server removes it.
  const [finalExamForbidden, setFinalExamForbidden] = useState(false)
  // Bumped when one after-quiz panel acts, so the others read again (a confirmed payment moves the certificate on).
  const [afterQuizVersion, setAfterQuizVersion] = useState(0)
  // These read `state` and `coursePlanForbidden`, so they stay below both declarations: above
  // them the filter would run during render before they exist and every case would crash.
  const canViewScreeningData = canViewScreening && !screening.forbidden
  const showCoursePlan = hasPermission(COURSE_PLAN_PERMISSIONS.view) && !coursePlanForbidden && (COURSE_PLAN_LIVE_STATUSES.includes(state.application?.status) || state.application?.course_plan?.has_plan === true)
  // after_quiz.final_exam_state 'not_yet' means the case has never been in the final exam, so it adds no tab.
  const finalExamState = state.application?.after_quiz?.final_exam_state
  const showFinalExam = hasPermission(AFTER_QUIZ_PERMISSIONS.view) && !finalExamForbidden && (state.application?.status === 'final_exam' || (finalExamState != null && finalExamState !== 'not_yet'))
  const visibleTabs = tabs.filter((tab) => {
    if (tab.key === 'screening') return canViewScreeningData
    if (tab.key === 'decision') return canDecide || canManageInterviews || canViewScreeningData
    if (tab.key === 'course_plan') return showCoursePlan
    if (tab.key === 'final_exam') return showFinalExam
    return true
  })
  const activeTab = visibleTabs.some((tab) => tab.key === searchParams.get('tab')) ? searchParams.get('tab') : 'overview'
  const [action, setAction] = useState({ busy: false, error: '', success: '' })
  // Bumped whenever the decision, the interview or a decline changes the case, so the lists in the decision tab read again.
  const [caseVersion, setCaseVersion] = useState(0)
  // No preselected target: the choices are whatever the server says the generic route accepts now.
  const [transition, setTransition] = useState({ status: '', reason: '' })
  const [assignment, setAssignment] = useState({ expert_profile_id: '', assignment_role: 'primary' })
  const [initialReview, setInitialReview] = useState({ decision: 'accepted', reason: '', subject: '', message: '', due_at: '' })
  const [informationRequest, setInformationRequest] = useState({ subject: '', message: '', due_at: '' })
  const [committee, setCommittee] = useState({ committee_id: '', action_id: '', outcome_id: '', decided_level_id: '', rationale: '' })
  const [quality, setQuality] = useState({ decision: 'approved', notes: '' })
  const [conflictDialog, setConflictDialog] = useState({ open: false, assignmentId: null, details: '' })
  const closeConflictDialog = () => setConflictDialog({ open: false, assignmentId: null, details: '' })
  const conflictDialogRef = useModalDialog(conflictDialog.open, closeConflictDialog)

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    const results = await Promise.allSettled([
      fetchRplApplication(applicationId),
      fetchRplEvidence({ application_id: applicationId, per_page: 100 }),
      fetchRplReferenceData(),
      fetchRplTimeline(applicationId, { per_page: 100 }),
      fetchRplAssessments({ application_id: applicationId, per_page: 50 }),
      fetchRplAssignments({ application_id: applicationId, per_page: 50 }),
      fetchRplAssessors({ available: 1, per_page: 100 }),
    ])

    if (results[0].status === 'rejected') {
      setState((current) => ({ ...current, loading: false, error: readApiError(results[0].reason, copy.loadError) }))
      return
    }

    const reference = unwrapApiData(valueOf(results[2], {})) || {}
    const application = unwrapApiData(valueOf(results[0], {}))
    const referenceCategories = unwrapCollection(reference.evidence_categories || reference.categories || reference)
    const categories = getApplicationEvidenceCategories(application, referenceCategories.length ? referenceCategories : EVIDENCE_CATEGORIES)
    setState({
      loading: false,
      error: '',
      auxiliaryWarning: results.slice(1).some((result) => result.status === 'rejected'),
      application,
      evidence: unwrapCollection(valueOf(results[1], [])),
      categories,
      levels: unwrapCollection(reference.pathways || []).flatMap((pathway) => pathway.levels || []),
      // The RPL competencies by code, so a plan course names the competency it closes rather than its code (UI-09).
      competencyNames: Object.fromEntries(unwrapCollection(reference.pathways || []).flatMap((pathway) => pathway.standards || []).flatMap((standard) => standard.competencies || []).filter((competency) => competency?.code).map((competency) => [competency.code, competency.name])),
      committees: unwrapCollection(reference.committees || []),
      committeeActions: unwrapCollection(reference.committee_actions || []),
      outcomes: unwrapCollection(reference.outcomes || []),
      declineCategories: readDeclineCategories(reference),
      timeline: unwrapCollection(valueOf(results[3], [])),
      assessments: unwrapCollection(valueOf(results[4], [])),
      assignments: unwrapCollection(valueOf(results[5], [])),
      assessors: unwrapCollection(valueOf(results[6], [])),
    })
  }, [applicationId, copy.loadError])

  useEffect(() => {
    const timer = window.setTimeout(load, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  /*
   * Document screening (D17(a)) loads on its own, outside the case load: an
   * account without rpl.screening.view never asks, and a 403 from the server,
   * which is the authority on that permission, removes the tab instead of
   * showing an error or the "supporting data unavailable" warning.
   */
  const loadScreenings = useCallback(async () => {
    if (!canViewScreening) return
    setScreening((current) => ({ ...current, loading: true, error: '' }))
    try {
      const response = await fetchRplScreenings(applicationId)
      setScreening({ loading: false, loaded: true, error: '', forbidden: false, items: unwrapCollection(response) })
    } catch (error) {
      if (Number(error?.response?.status) === 403) setScreening({ loading: false, loaded: true, error: '', forbidden: true, items: [] })
      else setScreening((current) => ({ ...current, loading: false, loaded: true, error: readApiError(error, screeningText.loadError) }))
    }
  }, [applicationId, canViewScreening, screeningText.loadError])

  useEffect(() => {
    const timer = window.setTimeout(loadScreenings, 0)
    return () => window.clearTimeout(timer)
  }, [loadScreenings])

  const onCoursePlanForbidden = useCallback(() => setCoursePlanForbidden(true), [])
  const onFinalExamForbidden = useCallback(() => setFinalExamForbidden(true), [])

  const application = state.application || {}
  const administratorAssessment = state.assessments.find((assessment) => assessment.rpl_assessor_assignment_id === null)
  const applicant = applicantOf(application)
  const reference = application.case_reference || application.reference_number || application.case_number || `RPL-${application.id || applicationId}`
  const declarationAccepted = readApplicationDeclarationAccepted(application)
  // Frozen on the case when it was rejected (owner, 12 Oct 2026); null on any other case.
  // A case rejected before the stamp existed shows the date the API derives for it, marked as such.
  const decline = readApplicationDecline(application, language, state.declineCategories)
  /*
   * The next-status select offers only what the generic route accepts now
   * (owner flow of 12 Oct 2026). A move that needs a decision, an interview or
   * a decline record is left out: those have their own controls. An API that
   * does not send the list yet keeps the old full list; it still refuses.
   */
  const nextStatuses = Array.isArray(application.allowed_transitions) ? application.allowed_transitions.filter(Boolean) : Object.keys(APPLICATION_STATUS)
  const selectedNextStatus = nextStatuses.includes(transition.status) ? transition.status : ''
  // With nothing to set: a course-plan status points to the course plan tab, where its acts are (P5);
  // there no decision, interview or decline applies. Every other status keeps P3's sentence.
  // A closed case points to no action at all: the decision, interview and decline actions are not possible on it (UI-10).
  const noTransitionsHint = CLOSED_APPLICATION_STATUSES.includes(application.status) ? copy.closedCase : ({ course_plan_review: coursePlanText.noTransitionsReview, course_plan_active: coursePlanText.noTransitionsActive, final_exam: afterQuizText.finalExam.noTransitions }[application.status] || copy.noTransitions)
  const declineRecord = readDeclineRecord(application, state.timeline)

  const tabLabels = useMemo(() => ({ overview: copy.overview, evidence: copy.evidence, screening: screeningText.tab, decision: decisionText.tab, assessment: copy.assessment, course_plan: coursePlanText.tab, final_exam: afterQuizText.finalExam.tab, governance: copy.governance, timeline: copy.timeline }), [copy, screeningText.tab, decisionText.tab, coursePlanText.tab, afterQuizText.finalExam.tab])

  /*
   * After a decision, an interview step or a decline: the case and its timeline
   * are read again without the full-page loading state, so the panel that acted
   * keeps its place and the banner keeps its message.
   */
  const refreshCase = useCallback(async () => {
    const [applicationResult, timelineResult] = await Promise.allSettled([
      fetchRplApplication(applicationId),
      fetchRplTimeline(applicationId, { per_page: 100 }),
    ])
    setState((current) => ({
      ...current,
      application: applicationResult.status === 'fulfilled' ? unwrapApiData(applicationResult.value) : current.application,
      timeline: timelineResult.status === 'fulfilled' ? unwrapCollection(timelineResult.value) : current.timeline,
    }))
  }, [applicationId])

  function caseChanged({ message, failed = false, reloadLists = true } = {}) {
    setAction({ busy: false, error: failed ? message : '', success: failed ? '' : message })
    if (reloadLists) setCaseVersion((current) => current + 1)
    refreshCase()
  }

  function screeningDecided({ assessment, message, failed }) {
    // "Pass to quiz and start the assessment": the assessment opens where it is worked on.
    if (assessment?.id) {
      navigate(`/rpl/assessments/${assessment.id}`)
      return
    }
    caseChanged({ message, failed })
  }

  /*
   * The course plan editor loads its own data and is never part of load(). When
   * one of its acts moves the case (generate, first approval, discard of a first
   * draft) the case and its timeline are read again and the editor's sentence
   * shows; the decision tab's lists are not touched.
   */
  function coursePlanChanged({ message } = {}) {
    caseChanged({ message: message || '', reloadLists: false })
  }

  async function runAction(request, success, after) {
    setAction({ busy: true, error: '', success: '' })
    try {
      const response = unwrapApiData(await request())
      setAction({ busy: false, error: '', success })
      after?.(response)
      return response
    } catch (error) {
      setAction({ busy: false, error: readApiError(error), success: '' })
      return null
    }
  }

  async function updateStatus() {
    if (!selectedNextStatus) return
    const response = await runAction(() => transitionRplApplication(applicationId, { status: selectedNextStatus, reason: transition.reason }), copy.transitionSaved)
    if (response) {
      setTransition({ status: '', reason: '' })
      // Re-read the case: the next allowed moves depend on the status just set.
      refreshCase()
    }
  }

  async function assignAssessor() {
    if (!assignment.expert_profile_id) return
    const response = await runAction(() => assignRplAssessor(applicationId, assignment), copy.assigned)
    if (response) load()
  }

  async function saveInitialReview() {
    const payload = {
      decision: initialReview.decision,
      reason: initialReview.reason || null,
      ...(initialReview.decision === 'needs_information' ? { subject: initialReview.subject, message: initialReview.message, due_at: initialReview.due_at || null } : {}),
    }
    const response = await runAction(() => submitRplInitialReview(applicationId, payload), copy.reviewSaved)
    if (response) load()
  }

  async function sendInformationRequest() {
    const response = await runAction(() => createRplInformationRequest(applicationId, { ...informationRequest, due_at: informationRequest.due_at || null }), copy.requestSaved)
    if (response) { setInformationRequest({ subject: '', message: '', due_at: '' }); load() }
  }

  async function closeInformationRequest(id) {
    const response = await runAction(() => closeRplInformationRequest(id), copy.closeRequest)
    if (response) load()
  }

  async function acceptAssignment(id) {
    const response = await runAction(() => acceptRplAssignment(id), copy.acceptAssignment)
    if (response) load()
  }

  async function declareNoConflict(id) {
    const response = await runAction(() => declareRplConflict(id, { has_conflict: false }), copy.conflictSaved)
    if (response) load()
  }

  async function declareConflict() {
    const response = await runAction(() => declareRplConflict(conflictDialog.assignmentId, { has_conflict: true, relationship_types: ['other'], details: conflictDialog.details }), copy.conflictSaved)
    if (response) { setConflictDialog({ open: false, assignmentId: null, details: '' }); load() }
  }

  async function startAssessment(id) {
    const response = await runAction(() => startRplAssessment(id), copy.startAssessment)
    if (response) { load(); if (response.id) navigate(`/rpl/assessments/${response.id}`) }
  }

  async function startAdminEvaluation() {
    const response = await runAction(() => startAdminRplAssessment(applicationId), adminEvaluationCopy.started)
    if (response?.id) navigate(`/rpl/assessments/${response.id}`)
    else if (response) load()
  }

  async function saveCommittee() {
    const response = await runAction(() => submitRplCommitteeDecision(applicationId, {
      committee_id: Number(committee.committee_id),
      action_id: Number(committee.action_id),
      ...(committee.outcome_id ? { outcome_id: Number(committee.outcome_id) } : {}),
      ...(committee.decided_level_id ? { decided_level_id: Number(committee.decided_level_id) } : {}),
      rationale: committee.rationale,
    }), copy.decisionSaved)
    if (response) load()
  }

  async function saveQuality() {
    const latestReport = state.assessments.map((assessment) => assessment.latest_report || assessment.latestReport).find(Boolean)
    const response = await runAction(() => submitRplQualityReview(applicationId, {
      ...(latestReport?.id ? { report_id: latestReport.id } : {}),
      decision: quality.decision,
      notes: quality.notes || null,
    }), copy.qualitySaved)
    if (response) load()
  }

  /*
   * The employers the case claims (owner flow of 12 Oct 2026), shown nowhere
   * before. A submitted case reads the list frozen at submit, which is what the
   * screen compares against; a draft reads the live profile, labelled as such.
   */
  function renderClaimedEmployers() {
    const claimed = readClaimedEmployers(application)
    return (
      <Card>
        <CardHeader className="border-b border-[var(--color-border)]"><CardTitle>{employersText.title}</CardTitle>{claimed.source ? <p className="mt-2 text-sm text-[var(--color-text-muted)]">{claimed.source === 'snapshot' ? employersText.snapshotHint : employersText.profileHint}</p> : null}</CardHeader>
        <CardContent className="space-y-4 pt-6">
          {claimed.items.length ? claimed.items.map((experience, index) => (
            <article key={experience.id || index} className="rounded-2xl border border-[var(--color-border)] p-4">
              <h3 dir="auto" className="font-bold text-[var(--color-text)]">{experience.organization || '—'}</h3>
              <dl className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Definition label={employersText.jobTitle} value={experience.job_title} />
                <Definition label={employersText.period} value={experiencePeriod(experience, employersText, screenLanguage)} />
                <Definition label={employersText.country} value={experience.country ? regionName(experience.country, screenLanguage) : null} />
                <Definition label={employersText.city} value={experience.city} />
                <Definition label={employersText.website} value={experience.website ? <WebsiteValue value={experience.website} /> : null} />
                <Definition label={employersText.registrationNumber} value={experience.registration_number ? <bdi>{experience.registration_number}</bdi> : null} />
              </dl>
            </article>
          )) : <p className="text-sm text-[var(--color-text-muted)]">{employersText.empty}</p>}
        </CardContent>
      </Card>
    )
  }

  /*
   * Where the case stands on its course plan (P5), from the case detail's
   * course_plan summary: awaiting a plan, a draft awaiting approval, a version in
   * force. Each line opens the course plan tab.
   */
  function renderCoursePlanNotice() {
    const summary = application.course_plan
    if (!showCoursePlan || !summary || typeof summary !== 'object') return null
    const live = summary.draft_version != null || summary.in_force_version != null
    const lines = []
    if (application.status === 'assessment_in_progress' && ['passed', 'failed'].includes(summary.entry_quiz_result) && !live) lines.push(coursePlanText.awaitingPlan)
    if (summary.draft_version != null) lines.push(fill(coursePlanText.awaitingApproval, { version: summary.draft_version }))
    // The summary's in_force_version is the plan in the approved slot, which a closed plan keeps: from the final exam on, it is closed (UI-17).
    if (summary.in_force_version != null) lines.push(fill(PLAN_CLOSED_STATUSES.includes(application.status) ? coursePlanText.closedPlan : coursePlanText.inForce, { version: summary.in_force_version }))
    if (!lines.length) return null
    return (
      <Card>
        <CardHeader className="border-b border-[var(--color-border)]"><CardTitle>{coursePlanText.title}</CardTitle></CardHeader>
        <CardContent className="space-y-3 pt-6">
          {lines.map((line) => <div key={line} className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm leading-6">{line}</p><Button size="sm" variant="outline" onClick={() => setSearchParams({ tab: 'course_plan' })}><ListChecks size={16} />{coursePlanText.openPlan}</Button></div>)}
        </CardContent>
      </Card>
    )
  }

  /*
   * After the entry quiz (owner model of 15 Oct 2026, P6): the case's payments
   * and the Experience Confirmation Certificate, each loading itself (never in
   * load()). Shown once the case detail carries its after_quiz summary AND the
   * case has reached the entry quiz's result (or already holds a charge or a
   * completion route), so a case still in intake never shows two empty panels.
   * An act re-reads the case and its timeline and tells the other panel to read
   * again.
   */
  const afterQuizChanged = useCallback(() => {
    setAfterQuizVersion((current) => current + 1)
    refreshCase()
  }, [refreshCase])

  function renderAfterQuiz() {
    const summary = application.after_quiz
    if (!summary || typeof summary !== 'object' || !hasPermission(AFTER_QUIZ_PERMISSIONS.view)) return null
    const reached = ['passed', 'failed'].includes(application.course_plan?.entry_quiz_result) || Number(summary.charges_pending) > 0 || Boolean(summary.completion_route) || ['final_exam', 'credential_pending'].includes(application.status)
    if (!reached) return null
    return (
      <>
        <ChargesPanel applicationId={applicationId} language={screenLanguage} canReconcile={hasPermission(AFTER_QUIZ_PERMISSIONS.reconcile)} canRefund={hasPermission(AFTER_QUIZ_PERMISSIONS.refund)} refreshKey={afterQuizVersion} onChanged={afterQuizChanged} />
        <ExperienceCertificatePanel applicationId={applicationId} language={screenLanguage} canApprove={hasPermission(AFTER_QUIZ_PERMISSIONS.approve)} refreshKey={afterQuizVersion} onChanged={afterQuizChanged} />
      </>
    )
  }

  function renderFinalExam() {
    return <FinalExamPanel applicationId={applicationId} language={screenLanguage} canManage={hasPermission(AFTER_QUIZ_PERMISSIONS.manage)} refreshKey={afterQuizVersion} onChanged={afterQuizChanged} onForbidden={onFinalExamForbidden} />
  }

  function renderCoursePlan() {
    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <CoursePlanEditor applicationId={applicationId} application={application} evidence={state.evidence} competencyNames={state.competencyNames} canManage={hasPermission(COURSE_PLAN_PERMISSIONS.manage)} language={screenLanguage} onCaseChanged={coursePlanChanged} onForbidden={onCoursePlanForbidden} />
        <div><GapClosurePanel applicationPublicId={applicationId} language={screenLanguage} crossCheck /></div>
      </div>
    )
  }

  function declineRecordLine(record) {
    const at = record.at ? formatLocalizedDateTime(record.at, language) : ''
    return record.by ? fill(copy.declinedBy, { name: record.by, at: at || '—' }) : fill(copy.declinedAt, { at })
  }

  function renderOverview() {
    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b border-[var(--color-border)]"><CardTitle>{copy.caseSummary}</CardTitle></CardHeader>
            <CardContent className="pt-6">
              <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <Definition label={copy.applicant} value={applicant.name || application.applicant_name} />
                <Definition label={copy.reference} value={reference} />
                <Definition label={copy.pathway} value={localize(application.pathway?.name || application.standard?.name, language)} />
                <Definition label={copy.requestedLevel} value={localize(application.requested_level?.name || application.requestedLevel?.name || application.target_level?.name, language) || application.requested_level_code} />
                <Definition label={copy.experience} value={application.years_of_experience ?? applicant.years_of_experience} />
                <Definition label={copy.submitted} value={formatLocalizedDateTime(application.submitted_at, language)} />
                {decline ? <Definition label={copy.declineReason} value={decline.reason} /> : null}
                {declineRecord?.rationale ? <Definition label={copy.declineRationale} value={<span dir="auto" className="whitespace-pre-wrap">{declineRecord.rationale}</span>} /> : null}
                {declineRecord && (declineRecord.by || declineRecord.at) ? <Definition label={copy.declineRecordTitle} value={declineRecordLine(declineRecord)} /> : null}
                {decline?.applicantCategoryLabel ? <Definition label={copy.applicantCategory} value={decline.applicantCategoryLabel} /> : null}
                {decline ? <Definition label={copy.reapplyFrom} value={decline.reapplyDerived ? `${formatLocalizedDateTime(decline.reapplyAvailableAt, language)} (${copy.reapplyDerived})` : formatLocalizedDateTime(decline.reapplyAvailableAt, language)} /> : null}
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="border-b border-[var(--color-border)]"><CardTitle>{copy.contact}</CardTitle></CardHeader>
            <CardContent className="pt-6"><dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"><Definition label={copy.email} value={applicant.email} /><Definition label={copy.phone} value={applicant.phone_number || applicant.phone} /><Definition label={copy.nationality} value={applicant.nationality} /><Definition label={copy.country} value={applicant.country_of_residence || applicant.country} /><Definition label={copy.profession} value={applicant.professional_field || application.professional_field} /></dl></CardContent>
          </Card>
          {renderClaimedEmployers()}
          {['submitted', 'administrative_review'].includes(application.status) ? <Card><CardHeader className="border-b border-[var(--color-border)]"><CardTitle>{copy.initialReview}</CardTitle></CardHeader><CardContent className="space-y-4 pt-6"><Select label={copy.decision} value={initialReview.decision} onChange={(event) => setInitialReview((current) => ({ ...current, decision: event.target.value }))}><option value="accepted">{copy.accepted}</option><option value="needs_information">{copy.needsInformation}</option><option value="rejected">{copy.rejected}</option></Select>{initialReview.decision !== 'accepted' ? <Textarea rows={3} label={copy.rationale} value={initialReview.reason} onChange={(event) => setInitialReview((current) => ({ ...current, reason: event.target.value }))} /> : null}{initialReview.decision === 'rejected' ? <p role="note" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">{copy.closingWithdrawsSets}</p> : null}{initialReview.decision === 'needs_information' ? <div className="grid gap-4 sm:grid-cols-2"><Input label={copy.subject} value={initialReview.subject} onChange={(event) => setInitialReview((current) => ({ ...current, subject: event.target.value }))} /><Input type="datetime-local" label={copy.dueAt} value={initialReview.due_at} onChange={(event) => setInitialReview((current) => ({ ...current, due_at: event.target.value }))} /><Textarea className="sm:col-span-2" rows={4} label={copy.message} value={initialReview.message} onChange={(event) => setInitialReview((current) => ({ ...current, message: event.target.value }))} /></div> : null}<div className="flex justify-end"><Button onClick={saveInitialReview} disabled={action.busy || (initialReview.decision !== 'accepted' && !initialReview.reason.trim()) || (initialReview.decision === 'needs_information' && (!initialReview.subject.trim() || !initialReview.message.trim()))}><Save size={17} />{copy.saveReview}</Button></div></CardContent></Card> : null}
          <Card><CardHeader className="border-b border-[var(--color-border)]"><CardTitle>{copy.requests}</CardTitle></CardHeader><CardContent className="space-y-5 pt-6"><div className="grid gap-4 sm:grid-cols-2"><Input label={copy.subject} value={informationRequest.subject} onChange={(event) => setInformationRequest((current) => ({ ...current, subject: event.target.value }))} /><Input type="datetime-local" label={copy.dueAt} value={informationRequest.due_at} onChange={(event) => setInformationRequest((current) => ({ ...current, due_at: event.target.value }))} /><Textarea className="sm:col-span-2" rows={3} label={copy.message} value={informationRequest.message} onChange={(event) => setInformationRequest((current) => ({ ...current, message: event.target.value }))} /></div><div className="flex justify-end"><Button onClick={sendInformationRequest} disabled={action.busy || !informationRequest.subject.trim() || !informationRequest.message.trim()}>{copy.createRequest}</Button></div><div className="space-y-3">{application.information_requests?.length ? application.information_requests.map((item) => <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{item.subject}</p><p className="mt-1 text-sm text-[var(--color-text-muted)]">{item.message}</p></div><div className="flex items-center gap-2"><Badge variant={item.status === 'closed' ? 'neutral' : 'warning'}>{item.status}</Badge>{item.status !== 'closed' ? <Button size="sm" variant="outline" onClick={() => closeInformationRequest(item.id)}>{copy.closeRequest}</Button> : null}</div></div>) : <p className="text-sm text-[var(--color-text-muted)]">{copy.noRequests}</p>}</div></CardContent></Card>
        </div>
        <div className="space-y-6">
          <CompletenessMeter value={readApplicationCompleteness(application)} categories={state.categories} language={language} />
          {/* The only control anywhere that can set payment_status='paid'.
              Credential issuance is gated on it, and before this panel there
              was no way to release an approved applicant once a fee existed. */}
          <PaymentReconciliationPanel application={application} language={language} onReconciled={load} />
          <Card>
            <CardHeader className="border-b border-[var(--color-border)]"><div className="flex items-center justify-between gap-3"><CardTitle>{copy.workflow}</CardTitle><RplStatusBadge status={application.status} language={language} /></div></CardHeader>
            <CardContent className="space-y-4 pt-6">
              {application.status === 'evidence_verification' && canDecide ? <div className="space-y-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900"><p>{decisionText.awaitingDecision}</p><Button size="sm" onClick={() => setSearchParams({ tab: 'decision' })}><Scale size={16} />{decisionText.goToDecision}</Button></div> : null}
              {application.status === 'interview_required' && canManageInterviews ? <div className="space-y-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900"><p>{decisionText.awaitingInterview}</p><Button size="sm" onClick={() => setSearchParams({ tab: 'decision' })}><CalendarClock size={16} />{decisionText.goToInterview}</Button></div> : null}
              <Select label={copy.nextStatus} value={selectedNextStatus} disabled={!nextStatuses.length} hint={!nextStatuses.length ? noTransitionsHint : undefined} onChange={(event) => setTransition((current) => ({ ...current, status: event.target.value }))}><option value="" disabled>—</option>{nextStatuses.map((value) => <option key={value} value={value}>{localize(APPLICATION_STATUS[value]?.labels, language) || value}</option>)}</Select>
              {/* F2: a case that closes (rejected or withdrawn) withdraws its unanswered question sets; an opened entry quiz keeps its timer. The API lists only withdrawn here (a rejection goes through a governed path), so the intake review card says it for its rejection too. */}
              {['rejected', 'withdrawn'].includes(selectedNextStatus) ? <p role="note" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">{copy.closingWithdrawsSets}</p> : null}
              <Textarea label={copy.note} rows={4} value={transition.reason} onChange={(event) => setTransition((current) => ({ ...current, reason: event.target.value }))} />
              <Button fullWidth onClick={updateStatus} disabled={action.busy || !selectedNextStatus}>{action.busy ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />}{copy.saveTransition}</Button>
              <DeclineApplicationAction applicationId={applicationId} status={application.status} canDecide={canDecide} declineCategories={state.declineCategories} language={screenLanguage} onDeclined={({ message }) => caseChanged({ message })} />
            </CardContent>
          </Card>
          {application.latest_screening_decision || application.active_interview ? (
            <Card>
              <CardHeader className="border-b border-[var(--color-border)]"><CardTitle>{decisionText.latestDecisionTitle}</CardTitle></CardHeader>
              <CardContent className="space-y-4 pt-6">
                {/* The decision and its rationale are for every staff role on the case (D17(a)); the screening figure behind it only for those who may see screens. */}
                {application.latest_screening_decision ? <ScreeningDecisionEntry decision={application.latest_screening_decision} language={screenLanguage} showSnapshot={canViewScreeningData} /> : <p className="text-sm text-[var(--color-text-muted)]">{decisionText.noDecisionYet}</p>}
                {application.active_interview ? <InterviewSummary interview={application.active_interview} language={screenLanguage} /> : null}
              </CardContent>
            </Card>
          ) : null}
          {renderCoursePlanNotice()}
          {renderAfterQuiz()}
        </div>
      </div>
    )
  }

  /*
   * The decision tab (owner flow of 12 Oct 2026, P3): the screening decision
   * while the evidence is under verification, the interview at case level, and
   * the decisions recorded so far. Each part shows itself only to the staff
   * allowed to use it, and the server is the authority on all of them.
   */
  function renderDecision() {
    return (
      <div className="space-y-6">
        <ScreeningDecisionCard applicationId={applicationId} status={application.status} canDecide={canDecide} canViewScreening={canViewScreeningData} canStartAssessment={isAdministrator} screenings={screening.items} screeningsLoading={!screening.loaded || screening.loading} screeningsError={screening.error} declineCategories={state.declineCategories} language={screenLanguage} onDecided={screeningDecided} />
        <InterviewPanel applicationId={applicationId} application={application} canManage={canManageInterviews} canRecordLegacy={canRecordLegacyInterviews} viewer={viewer} canReadSettings={canReadSettings} declineCategories={state.declineCategories} language={screenLanguage} refreshKey={caseVersion} onChanged={({ message }) => caseChanged({ message, reloadLists: false })} />
        {/* A direct decline writes no screening decision: the decline itself is the record staff read here (UI-10). */}
        {declineRecord ? (
          <Card>
            <CardHeader className="border-b border-[var(--color-border)]"><CardTitle>{copy.declineRecordTitle}</CardTitle></CardHeader>
            <CardContent className="space-y-3 pt-6 text-sm">
              {declineRecord.by || declineRecord.at ? <p className="text-xs text-[var(--color-text-muted)]">{declineRecordLine(declineRecord)}</p> : null}
              {declineRecord.rationale ? <div><p className="text-xs font-semibold text-[var(--color-text-muted)]">{copy.declineRationale}</p><p dir="auto" className="mt-1 whitespace-pre-wrap leading-6 text-[var(--color-text)]">{declineRecord.rationale}</p></div> : null}
              {decline?.applicantCategoryLabel ? <div><p className="text-xs font-semibold text-[var(--color-text-muted)]">{copy.applicantCategory}</p><p className="mt-1 leading-6">{decline.applicantCategoryLabel}</p></div> : null}
            </CardContent>
          </Card>
        ) : null}
        <ScreeningDecisionHistory applicationId={applicationId} canView={canViewScreeningData} refreshKey={caseVersion} language={screenLanguage} />
        {!canViewScreeningData && application.latest_screening_decision ? <ScreeningDecisionEntry decision={application.latest_screening_decision} language={screenLanguage} /> : null}
      </div>
    )
  }

  function renderAssessment() {
    return (
      <div className="space-y-6">
        {isAdministrator ? <Card className="border-sky-200 bg-sky-50/60"><CardHeader className="border-b border-sky-100"><CardTitle>{adminEvaluationCopy.title}</CardTitle><p className="mt-2 flex items-center gap-2 text-sm text-[var(--color-text-muted)]"><ShieldCheck size={17} />{adminEvaluationCopy.hint}</p></CardHeader><CardContent className="flex justify-end pt-6">{administratorAssessment ? <Button onClick={() => navigate(`/rpl/assessments/${administratorAssessment.id}`)}><ClipboardCheck size={18} />{adminEvaluationCopy.open}</Button> : <Button onClick={startAdminEvaluation} disabled={action.busy || !['ready_for_assessment', 'remediation_required', 'assessment_in_progress'].includes(application.status)}><ClipboardCheck size={18} />{adminEvaluationCopy.start}</Button>}</CardContent></Card> : null}
        {!isAdministrator ? <Card>
          <CardHeader className="border-b border-[var(--color-border)]"><CardTitle>{copy.assessorTitle}</CardTitle><p className="mt-2 flex items-center gap-2 text-sm text-[var(--color-text-muted)]"><ShieldCheck size={17} />{copy.assessorHint}</p></CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-end">
              <Select label={copy.assessor} value={assignment.expert_profile_id} onChange={(event) => setAssignment((current) => ({ ...current, expert_profile_id: event.target.value }))}><option value="">—</option>{state.assessors.map((assessor) => <option key={assessor.id} value={assessor.id}>{assessor.user?.name || assessor.name || assessor.user?.email}</option>)}</Select>
              <Select label={copy.role} value={assignment.assignment_role} onChange={(event) => setAssignment((current) => ({ ...current, assignment_role: event.target.value }))}><option value="primary">{copy.primary}</option><option value="secondary">{copy.secondary}</option></Select>
              <Button onClick={assignAssessor} disabled={!assignment.expert_profile_id || action.busy}><UserRoundCheck size={18} />{copy.assign}</Button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {state.assignments.length ? state.assignments.map((item) => <div key={item.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4"><div className="flex items-center justify-between gap-3"><span className="font-bold text-[var(--color-text)]">{item.expert?.user?.name || item.assessor?.user?.name || item.assessor_name}</span><Badge variant={item.conflict_declaration?.resolution === 'cleared' ? 'success' : 'warning'}>{assignmentLabel(item.status || item.assignment_role, copy)}</Badge></div><p className="mt-2 text-sm text-[var(--color-text-muted)]">{assignmentLabel(item.assignment_role, copy)}</p><div className="mt-4 flex flex-wrap gap-2">{item.status === 'pending' ? <Button size="sm" variant="outline" onClick={() => acceptAssignment(item.id)}>{copy.acceptAssignment}</Button> : null}{item.status === 'accepted_pending_conflict' ? <><Button size="sm" variant="outline" onClick={() => declareNoConflict(item.id)}>{copy.noConflict}</Button><Button size="sm" variant="ghost" onClick={() => setConflictDialog({ open: true, assignmentId: item.id, details: '' })}>{copy.reportConflict}</Button></> : null}{item.status === 'accepted' && !item.assessment ? <Button size="sm" variant="outline" onClick={() => startAssessment(item.id)}>{copy.startAssessment}</Button> : null}</div></div>) : <p className="text-sm text-[var(--color-text-muted)]">{copy.noAssignments}</p>}
            </div>
          </CardContent>
        </Card> : null}
        <Card>
          <CardHeader className="border-b border-[var(--color-border)]"><CardTitle>{copy.assessments}</CardTitle></CardHeader>
          <CardContent className="space-y-4 pt-6">{state.assessments.length ? state.assessments.map((item) => <article key={item.id} className="flex flex-col gap-4 rounded-2xl border border-[var(--color-border)] p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{item.reference_number || <>{copy.assessmentReference} <bdi>#{item.id}</bdi></>}</h3><RplStatusBadge status={item.status} language={language} /></div><p className="mt-2 text-sm text-[var(--color-text-muted)]">{item.assignment?.expert?.user?.name || item.assessor_name || '—'}</p></div><Button variant="outline" onClick={() => navigate(`/rpl/assessments/${item.id}`)}>{copy.openAssessment}</Button></article>) : <p className="py-8 text-center text-[var(--color-text-muted)]">{copy.noAssessments}</p>}</CardContent>
        </Card>
      </div>
    )
  }

  function renderGovernance() {
    return (
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="border-b border-[var(--color-border)]"><CardTitle>{copy.committeeTitle}</CardTitle><p className="mt-2 text-sm text-[var(--color-text-muted)]">{copy.committeeHint}</p></CardHeader>
          <CardContent className="space-y-4 pt-6">
            <Select label={copy.committeeTitle} value={committee.committee_id} onChange={(event) => setCommittee((current) => ({ ...current, committee_id: event.target.value }))}><option value="">—</option>{state.committees.map((item) => <option key={item.id} value={item.id}>{localize(item.name, language)}</option>)}</Select>
            <Select label={copy.decision} value={committee.action_id} onChange={(event) => setCommittee((current) => ({ ...current, action_id: event.target.value }))}><option value="">—</option>{state.committeeActions.map((item) => <option key={item.id} value={item.id}>{localize(item.name, language)}</option>)}</Select>
            <Select label={copy.recommendedLevel} value={committee.decided_level_id} onChange={(event) => setCommittee((current) => ({ ...current, decided_level_id: event.target.value }))}><option value="">—</option>{state.levels.map((level) => <option key={level.id} value={level.id}>{localize(level.name, language)}</option>)}</Select>
            <Select label={copy.qualityResult} value={committee.outcome_id} onChange={(event) => setCommittee((current) => ({ ...current, outcome_id: event.target.value }))}><option value="">—</option>{state.outcomes.map((outcome) => <option key={outcome.id} value={outcome.id}>{localize(outcome.name, language)}</option>)}</Select>
            <Textarea label={copy.rationale} rows={6} value={committee.rationale} onChange={(event) => setCommittee((current) => ({ ...current, rationale: event.target.value }))} />
            <Button fullWidth onClick={saveCommittee} disabled={action.busy || !committee.committee_id || !committee.action_id || committee.rationale.trim().length < 20}><Gavel size={18} />{copy.submitDecision}</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="border-b border-[var(--color-border)]"><CardTitle>{copy.qualityTitle}</CardTitle></CardHeader>
          <CardContent className="space-y-4 pt-6">
            <Select label={copy.qualityResult} value={quality.decision} onChange={(event) => setQuality((current) => ({ ...current, decision: event.target.value }))}><option value="approved">{copy.approve}</option><option value="returned">{copy.return}</option><option value="rejected">{copy.rejectedQuality}</option></Select>
            <Textarea label={copy.qualityNotes} rows={9} value={quality.notes} onChange={(event) => setQuality((current) => ({ ...current, notes: event.target.value }))} />
            <Button fullWidth onClick={saveQuality} disabled={action.busy || (quality.decision !== 'approved' && !quality.notes.trim())}><BadgeCheck size={18} />{copy.saveQuality}</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  function renderTimeline() {
    return <Card><CardHeader className="border-b border-[var(--color-border)]"><CardTitle>{copy.events}</CardTitle></CardHeader><CardContent className="pt-7">{state.timeline.length ? <ol className="relative space-y-6 before:absolute before:bottom-2 before:start-[17px] before:top-2 before:w-px before:bg-[var(--color-border)]">{state.timeline.map((event, index) => <li key={event.id || index} className="relative flex gap-4"><span className="relative z-10 mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white"><CheckCircle2 size={17} /></span><div className="min-w-0 flex-1 rounded-2xl border border-[var(--color-border)] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold text-[var(--color-text)]">{timelineEventTitle(event, language) || copy.event}</h3><time className="text-xs text-[var(--color-text-muted)]">{formatLocalizedDateTime(event.created_at, language)}</time></div>{event.description || event.notes ? <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{localize(event.description || event.notes, language)}</p> : null}{/* The note or rationale staff recorded with the move (a decline's rationale among them): staff-only, and this timeline is staff's (UI-10). */}{!event.description && !event.notes && typeof event.reason === 'string' && event.reason.trim() ? <p dir="auto" className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--color-text-muted)]">{event.reason}</p> : null}{event.actor ? <p className="mt-2 text-xs text-[var(--color-text-muted)]">{copy.actor}: {event.actor.name || event.actor.email}</p> : null}</div></li>)}</ol> : <p className="py-12 text-center text-[var(--color-text-muted)]">{copy.emptyTimeline}</p>}</CardContent></Card>
  }

  return (
    <section dir={isArabic ? 'rtl' : 'ltr'} className="space-y-7">
      <PageHeader title={`${copy.title} · ${reference}`} description={copy.description} actions={<><Button variant="outline" onClick={() => navigate('/rpl/applications')}>{isArabic ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}{copy.back}</Button><Button variant="outline" onClick={() => { load(); loadScreenings(); setCaseVersion((current) => current + 1) }}><RefreshCw size={17} />{copy.refresh}</Button></>} />

      <RplPageState loading={state.loading} error={state.error} onRetry={load} language={language}>
        <>
          <Card className="border-0 bg-[var(--color-primary)] text-white">
            <CardContent className="p-6 sm:p-7">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div><p className="text-sm font-semibold text-white/65">{copy.eyebrow}</p><div className="mt-2 flex flex-wrap items-center gap-3"><h2 className="text-2xl font-bold sm:text-3xl">{applicant.name || application.applicant_name || reference}</h2><RplStatusBadge status={application.status} language={language} /></div><p className="mt-2 text-sm text-white/70">{applicant.email || localize(application.pathway?.name, language)}</p></div>
                <div className="rounded-2xl bg-white/10 px-5 py-4"><p className="text-xs font-semibold uppercase tracking-wide text-white/60">{copy.reference}</p><p className="mt-1 text-xl font-bold">{reference}</p></div>
              </div>
            </CardContent>
          </Card>

          {state.auxiliaryWarning ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{copy.auxiliaryWarning}</div> : null}
          {action.error || action.success ? <div role="alert" className={`whitespace-pre-line [unicode-bidi:plaintext] rounded-2xl border px-4 py-3 text-sm ${action.error ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>{action.error || action.success}</div> : null}

          <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-white p-2">
            <nav className="flex min-w-max gap-1" aria-label={copy.title}>{visibleTabs.map((tab) => { const Icon = tab.icon; const active = activeTab === tab.key; return <button key={tab.key} type="button" onClick={() => setSearchParams({ tab: tab.key })} className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${active ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]'}`} aria-current={active ? 'page' : undefined}><Icon size={17} />{tabLabels[tab.key]}</button> })}</nav>
          </div>

          {activeTab === 'overview' ? renderOverview() : null}
          {activeTab === 'evidence' ? <EvidenceUploadCenter applicationId={applicationId} evidence={state.evidence} categories={state.categories} completeness={readApplicationCompleteness(application)} declarationAccepted={declarationAccepted} language={language} canReview onEvidenceChange={(next) => setState((current) => ({ ...current, evidence: next }))} onCompletenessChange={(next) => setState((current) => ({ ...current, application: { ...current.application, completeness: next, completeness_percentage: next?.percentage } }))} onDeclarationChange={(accepted) => setState((current) => ({ ...current, application: { ...current.application, completeness: { ...(current.application?.completeness || {}), declaration: { ...(current.application?.completeness?.declaration || {}), accepted } } } }))} onRefreshRequested={load} /> : null}
          {activeTab === 'screening' ? <DocumentScreeningPanel applicationId={applicationId} screenings={screening.items} loading={screening.loading} error={screening.error} canRun={canRunScreening} categories={state.categories} language={screenLanguage} onReload={loadScreenings} onScreeningAdded={(created) => setScreening((current) => ({ ...current, items: [created, ...current.items.filter((item) => item.public_id !== created.public_id)] }))} onScreeningUpdated={(updated) => setScreening((current) => ({ ...current, items: current.items.map((item) => (item.public_id === updated.public_id ? updated : item)) }))} /> : null}
          {activeTab === 'decision' ? renderDecision() : null}
          {activeTab === 'assessment' ? renderAssessment() : null}
          {activeTab === 'course_plan' ? renderCoursePlan() : null}
          {activeTab === 'final_exam' ? renderFinalExam() : null}
          {activeTab === 'governance' ? renderGovernance() : null}
          {activeTab === 'timeline' ? renderTimeline() : null}
        </>
      </RplPageState>
      {conflictDialog.open ? (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-[#031C2C]/65 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeConflictDialog() }}>
          <div ref={conflictDialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="rpl-conflict-title" className="w-full max-w-lg outline-none">
            <Card className="w-full">
              <CardHeader className="border-b border-[var(--color-border)]">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle id="rpl-conflict-title">{copy.reportConflict}</CardTitle>
                  <Button size="sm" variant="ghost" onClick={closeConflictDialog}>{copy.closeRequest}</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                <Textarea rows={6} label={copy.conflictDetails} value={conflictDialog.details} onChange={(event) => setConflictDialog((current) => ({ ...current, details: event.target.value }))} />
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={closeConflictDialog}>{copy.back}</Button>
                  <Button variant="danger" onClick={declareConflict} disabled={action.busy || !conflictDialog.details.trim()}>{copy.reportConflict}</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </section>
  )
}
