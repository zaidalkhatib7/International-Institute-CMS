import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarPlus,
  ClipboardCheck,
  Download,
  Eye,
  LoaderCircle,
  Plus,
  Save,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserRoundCheck,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTableShell,
  Input,
  PageHeader,
  SectionAnchorNav,
  Select,
  StatCard,
  Textarea,
} from "../../../components/ui";
import {
  readApiError,
  unwrapApiData,
  unwrapCollection,
} from "../../../services/apiResponse";
import { getAdminLanguage } from "../../../services/languageStorage";
import { isEvidenceEligibleForAssessment, localize } from "../domain/rpl";
import {
  fetchRplAssessment,
  fetchRplAssessments,
  fetchRplReferenceData,
  generateRplAiAdvisory,
  acknowledgeRplAiAdvisory,
  exportRplAiAdvisory,
  saveRplAssessmentFindings,
  saveRplGapAnalysis,
  scheduleRplInterview,
  submitRplAssessmentReport,
} from "../services/rplService";
import DynamicAssessmentPanel from "../components/DynamicAssessmentPanel";
import RplPageState from "../components/RplPageState";
import RplStatusBadge from "../components/RplStatusBadge";
import {
  formatLocalizedDate,
  formatLocalizedDateTime,
} from "../../../utils/localization";
import { useAuthorization } from "../../auth/context/useAuthorization";

const copyByLanguage = {
  ar: {
    title: "لوحة المقيّم",
    description:
      "إدارة الملفات المحالة، مراجعة الأدلة، تعبئة المعايير، وجدولة المقابلات ورفع التوصية.",
    assigned: "الملفات المحالة",
    inProgress: "قيد التقييم",
    dueSoon: "تستحق قريبًا",
    completed: "تقارير مكتملة",
    search: "بحث في الملفات المحالة...",
    all: "جميع الحالات",
    case: "الملف",
    applicant: "المتقدم",
    assessor: "المقيّم",
    due: "الموعد",
    status: "الحالة",
    action: "الإجراء",
    open: "فتح التقييم",
    empty: "لا توجد ملفات تقييم مطابقة.",
    back: "العودة إلى لوحة المقيّم",
    assessment: "نموذج التقييم الرقمي",
    noAuthority:
      "صلاحية المقيّم تنتهي عند رفع التقرير والتوصية. لا يمكنه إصدار قرار اعتماد أو شهادة.",
    criteria: "معايير التقييم",
    criterion: "المعيار",
    weight: "الحد الأقصى",
    score: "النقاط",
    notes: "التعليل المهني",
    outcome: "نتيجة المعيار",
    evidenceMapping: "الأدلة المستند إليها",
    saveRubric: "حفظ نتائج التقييم",
    saved: "تم حفظ نتائج التقييم.",
    noCriteria: "لم تتم إضافة معايير إلى هذا النموذج بعد.",
    evidence: "أدلة الملف",
    noEvidence: "لا توجد أدلة مرتبطة بالتقييم.",
    interview: "جدولة مقابلة مهنية",
    interviewAt: "موعد المقابلة",
    method: "نمط المقابلة",
    location: "المكان أو رابط الاجتماع",
    interviewNotes: "تعليمات المقابلة",
    schedule: "حفظ الموعد",
    scheduled: "تمت جدولة المقابلة.",
    report: "تقرير المقيّم والتوصية",
    recommendation: "التوصية المهنية المفصلة",
    recommendLevel: "المستوى الموصى به",
    findings: "ملخص النتائج المهنية",
    gap: "تحليل فجوات الكفاءة",
    gapSummary: "ملخص الفجوات",
    addGap: "إضافة فجوة",
    remediationType: "نوع الاستكمال",
    completion: "برنامج أو خطة الاستكمال",
    saveGap: "حفظ التحليل النهائي",
    gapSaved: "تم حفظ تحليل الفجوات.",
    submit: "رفع التقرير إلى مراجعة الجودة",
    submitted: "تم رفع التقرير إلى مراجعة الجودة.",
    completionDescription: "وصف خطة الاستكمال",
    remove: "إزالة",
    achieved: "موصى بالاعتماد",
    partial: "تحقق جزئي ويتطلب استكمالًا",
    notAchieved: "عدم تحقق الكفاءة",
    loadError: "تعذر تحميل بيانات التقييم.",
    ineligibleEvidence: "غير مؤهل للربط وفق سياسة التحقق الحالية",
    assessmentReference: "تقييم",
    statusAssigned: "مُسند",
    statusInProgress: "قيد التقييم",
    statusSubmitted: "مُرسل",
    statusCompleted: "مكتمل",
    training: "تدريب",
    additionalEvidence: "أدلة إضافية",
    interviewOption: "مقابلة",
    practicalTask: "مهمة عملية",
    experienceOption: "خبرة إضافية",
    online: "عبر الإنترنت",
    phone: "هاتفية",
    inPerson: "حضورية",
    adminNoAuthority:
      "مسودة Gemini استشارية فقط. يراجعها المدير ويعدلها، ولا يمكنها التحقق من الأدلة أو إصدار قرار اعتماد أو شهادة.",
  },
  en: {
    title: "Assessor Workbench",
    description:
      "Manage assigned cases, review evidence, score criteria, schedule interviews, and submit recommendations.",
    assigned: "Assigned cases",
    inProgress: "In assessment",
    dueSoon: "Due soon",
    completed: "Reports completed",
    search: "Search assigned cases...",
    all: "All statuses",
    case: "Case",
    applicant: "Applicant",
    assessor: "Assessor",
    due: "Due date",
    status: "Status",
    action: "Action",
    open: "Open assessment",
    empty: "No assessment cases match the filters.",
    back: "Back to assessor workbench",
    assessment: "Digital assessment form",
    noAuthority:
      "The assessor authority ends with the submitted report and recommendation. The assessor cannot issue an accreditation decision or certificate.",
    criteria: "Assessment criteria",
    criterion: "Criterion",
    weight: "Maximum",
    score: "Score",
    notes: "Professional rationale",
    outcome: "Criterion outcome",
    evidenceMapping: "Supporting evidence",
    saveRubric: "Save assessment findings",
    saved: "Assessment findings saved.",
    noCriteria: "No criteria have been added to this rubric yet.",
    evidence: "Case evidence",
    noEvidence: "No evidence is mapped to this assessment.",
    interview: "Schedule professional interview",
    interviewAt: "Interview date and time",
    method: "Interview mode",
    location: "Location or meeting link",
    interviewNotes: "Interview instructions",
    schedule: "Save schedule",
    scheduled: "Interview scheduled.",
    report: "Assessor report and recommendation",
    recommendation: "Detailed professional recommendation",
    recommendLevel: "Recommended level",
    findings: "Professional findings summary",
    gap: "Competency gap analysis",
    gapSummary: "Gap-analysis summary",
    addGap: "Add gap item",
    remediationType: "Remediation type",
    completion: "Completion program or plan",
    saveGap: "Save final gap analysis",
    gapSaved: "Gap analysis saved.",
    submit: "Submit report to quality review",
    submitted: "Report submitted to independent quality review.",
    completionDescription: "Completion-plan description",
    remove: "Remove",
    achieved: "Recommend accreditation",
    partial: "Partially achieved; completion required",
    notAchieved: "Competency not achieved",
    loadError: "Unable to load assessment data.",
    ineligibleEvidence:
      "Not eligible for mapping under the current verification policy",
    assessmentReference: "Assessment",
    statusAssigned: "Assigned",
    statusInProgress: "In progress",
    statusSubmitted: "Submitted",
    statusCompleted: "Completed",
    training: "Training",
    additionalEvidence: "Additional evidence",
    interviewOption: "Interview",
    practicalTask: "Practical task",
    experienceOption: "Additional experience",
    online: "Online",
    phone: "Phone",
    inPerson: "In person",
    adminNoAuthority:
      "The Gemini draft is advisory only. The administrator must review and edit it; it cannot verify evidence, issue accreditation, or create a certificate.",
  },
  nl: {
    title: "Werkruimte beoordelaar",
    description:
      "Beheer toegewezen dossiers, bewijs, criteria, interviews en aanbevelingen.",
    assigned: "Toegewezen dossiers",
    inProgress: "In beoordeling",
    dueSoon: "Binnenkort vervallen",
    completed: "Rapporten voltooid",
    search: "Zoek toegewezen dossiers...",
    all: "Alle statussen",
    case: "Dossier",
    applicant: "Aanvrager",
    assessor: "Beoordelaar",
    due: "Deadline",
    status: "Status",
    action: "Actie",
    open: "Beoordeling openen",
    empty: "Geen beoordelingen komen overeen met de filters.",
    back: "Terug naar beoordelaarswerkruimte",
    assessment: "Digitaal beoordelingsformulier",
    noAuthority:
      "De bevoegdheid van de beoordelaar eindigt bij het rapport en de aanbeveling. De beoordelaar kan geen accreditatiebesluit nemen of certificaat uitgeven.",
    criteria: "Beoordelingscriteria",
    criterion: "Criterium",
    weight: "Maximum",
    score: "Score",
    notes: "Professionele onderbouwing",
    outcome: "Uitkomst criterium",
    evidenceMapping: "Ondersteunend bewijs",
    saveRubric: "Bevindingen opslaan",
    saved: "Bevindingen opgeslagen.",
    noCriteria: "Er zijn nog geen criteria aan deze rubric toegevoegd.",
    evidence: "Dossierbewijs",
    noEvidence: "Er is geen bewijs gekoppeld.",
    interview: "Professioneel gesprek plannen",
    interviewAt: "Datum en tijd",
    method: "Gespreksvorm",
    location: "Locatie of vergaderlink",
    interviewNotes: "Instructies",
    schedule: "Planning opslaan",
    scheduled: "Gesprek gepland.",
    report: "Rapport en aanbeveling",
    recommendation: "Uitgebreide professionele aanbeveling",
    recommendLevel: "Aanbevolen niveau",
    findings: "Samenvatting professionele bevindingen",
    gap: "Analyse competentiegaten",
    gapSummary: "Samenvatting hiaten",
    addGap: "Hiaat toevoegen",
    remediationType: "Type aanvulling",
    completion: "Aanvullingsprogramma of plan",
    saveGap: "Definitieve analyse opslaan",
    gapSaved: "Analyse opgeslagen.",
    submit: "Rapport naar kwaliteitsbeoordeling sturen",
    submitted: "Rapport naar onafhankelijke kwaliteitsbeoordeling gestuurd.",
    completionDescription: "Beschrijving aanvullingsplan",
    remove: "Verwijderen",
    achieved: "Accreditatie aanbevelen",
    partial: "Gedeeltelijk behaald; aanvulling nodig",
    notAchieved: "Competentie niet behaald",
    loadError: "Kan beoordelingsgegevens niet laden.",
    ineligibleEvidence:
      "Niet geschikt voor koppeling volgens het huidige verificatiebeleid",
    assessmentReference: "Beoordeling",
    statusAssigned: "Toegewezen",
    statusInProgress: "In behandeling",
    statusSubmitted: "Ingediend",
    statusCompleted: "Voltooid",
    training: "Training",
    additionalEvidence: "Aanvullend bewijs",
    interviewOption: "Gesprek",
    practicalTask: "Praktijkopdracht",
    experienceOption: "Aanvullende ervaring",
    online: "Online",
    phone: "Telefonisch",
    inPerson: "Op locatie",
    adminNoAuthority:
      "Het Gemini-concept is uitsluitend adviserend. De beheerder moet het beoordelen en bewerken; het kan geen bewijs verifiëren, accreditatie verlenen of certificaat maken.",
  },
};

function applicantOf(row) {
  return (
    row.application?.applicant ||
    row.application?.user ||
    row.applicant ||
    row.user ||
    {}
  );
}

// Gemini advisory fields are stored as returned by the model, so a field the UI
// expects to be an array can arrive as a string (strings pass `?.length` but
// crash on `.join`/`.map`). Normalize defensively: arrays pass through, empty
// values become [], and scalars become a one-item list.
function asList(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === "") return [];
  return [String(value)];
}

const geminiCopyByLanguage = {
  ar: {
    title: "تقييم Gemini الاستشاري",
    notice:
      "ينشئ Gemini مسودة استشارية جديدة بلغة الواجهة الحالية من معايير الملف وبيانات الأدلة وحالة التحقق. لا يستخدم ملفات خامًا ولا يصدر قرار اعتماد.",
    question: "سؤال أو توجيه للمدير",
    placeholder: "مثال: قيّم فجوات الأدلة مقابل معايير التقييم المنشورة.",
    generate: "إنشاء مسودة Gemini",
    generatedSuccess:
      "تم إنشاء مسودة Gemini باللغة المطلوبة. راجعها وعدّلها قبل استخدامها.",
    acknowledged: "تمت المراجعة",
    acknowledge: "تأكيد مراجعة المدير",
    acknowledgeSuccess: "تم توثيق مراجعة المدير لمسودة Gemini.",
    criterion: "استشارة المعيار",
    gaps: "فجوات الأدلة",
    courses: "البرامج المقترحة من مكتبة سد فجوات الكفاءات",
    targetLevel: "هدف الاعتماد الذي اختاره المتقدم",
    targetMethod:
      "يُقيّم Gemini الأدلة بصرامة المستوى المستهدف، ثم يختار فقط البرامج اللازمة لسد الفجوات المثبتة دون عدد ثابت أو دورات غير لازمة.",
    currentReadiness: "الجاهزية الحالية وفق الأدلة",
    readinessReady: "جاهز للمستوى المستهدف",
    readinessPartiallyReady: "جاهز جزئيًا ويحتاج إلى سد فجوات",
    readinessNotReady: "غير جاهز حاليًا للمستوى المستهدف",
  },
  en: {
    title: "Gemini advisory evaluation",
    notice:
      "Gemini generates a new advisory draft in the current interface language from this case’s rubric, evidence metadata, and verification state. It never receives raw files and cannot make an accreditation decision.",
    question: "Question or direction for the administrator",
    placeholder:
      "For example: identify evidence gaps against the published rubric.",
    generate: "Generate Gemini draft",
    generatedSuccess:
      "The Gemini draft was generated in the requested language. Review and edit it before use.",
    acknowledged: "Reviewed",
    acknowledge: "Confirm administrator review",
    acknowledgeSuccess:
      "The administrator review of the Gemini draft was recorded.",
    criterion: "Criterion advice",
    gaps: "Evidence gaps",
    courses: "Recommended programmes from the Competency Gap Learning Library",
    targetLevel: "Applicant-selected accreditation target",
    targetMethod:
      "Gemini applies the rigor of this target and selects only the programmes justified by demonstrated gaps—without fixed course counts or unnecessary learning.",
    currentReadiness: "Current evidence-based readiness",
    readinessReady: "Ready for the target level",
    readinessPartiallyReady: "Partially ready; competency gaps remain",
    readinessNotReady: "Not currently ready for the target level",
  },
  nl: {
    title: "Gemini-adviesbeoordeling",
    notice:
      "Gemini maakt in de huidige interfacetaal een nieuw adviesconcept op basis van de rubric, bewijsmetadata en verificatiestatus. Ruwe bestanden worden nooit verzonden en Gemini kan geen accreditatiebesluit nemen.",
    question: "Vraag of richting voor de beheerder",
    placeholder:
      "Bijvoorbeeld: identificeer bewijshiaten ten opzichte van de gepubliceerde rubric.",
    generate: "Gemini-concept genereren",
    generatedSuccess:
      "Het Gemini-concept is in de gevraagde taal gegenereerd. Beoordeel en bewerk het vóór gebruik.",
    acknowledged: "Beoordeeld",
    acknowledge: "Beheerdersbeoordeling bevestigen",
    acknowledgeSuccess:
      "De beheerdersbeoordeling van het Gemini-concept is vastgelegd.",
    criterion: "Criteriumadvies",
    gaps: "Bewijshiaten",
    courses:
      "Aanbevolen programma’s uit de leerbibliotheek voor competentiekloven",
    targetLevel: "Door de aanvrager gekozen accreditatiedoel",
    targetMethod:
      "Gemini past de strengheid van dit doel toe en kiest uitsluitend programma’s die door aantoonbare hiaten worden gerechtvaardigd, zonder vaste aantallen.",
    currentReadiness: "Huidige gereedheid op basis van bewijs",
    readinessReady: "Gereed voor het doelniveau",
    readinessPartiallyReady:
      "Gedeeltelijk gereed; er blijven competentiehiaten",
    readinessNotReady: "Momenteel niet gereed voor het doelniveau",
  },
};

const geminiStatusCopyByLanguage = {
  ar: {
    gemini_disabled:
      "توليد تقييم Gemini متوقف حاليًا من إعدادات RPL. فعّله من إعدادات RPL ثم أعد المحاولة.",
    gemini_not_configured:
      "مفتاح Gemini غير مهيأ في الخادم. يجب على مسؤول النظام إكمال إعداد الاتصال.",
    route_mismatch:
      "لم يعد المتقدم مستوفيًا لأي مسار RPL (مثلاً بانتظار التحقق من الثانوية). راجع المؤهلات ومسار الطلب أولًا.",
    gemini_connection:
      "تعذر الاتصال بخدمة Gemini. تحقق من اتصال الخادم ثم أعد المحاولة.",
    gemini_unavailable:
      "خدمة Gemini غير متاحة مؤقتًا أو أن النموذج المحدد غير متاح. راجع نموذج Gemini في الإعدادات أو أعد المحاولة لاحقًا.",
    gemini_unexpected:
      "تعذر على Gemini إنشاء مسودة التقييم. أعد المحاولة، وإذا استمرت المشكلة فراجع سجل الخادم.",
    gemini_invalid_response:
      "أعاد Gemini استجابة غير صالحة. أعد إنشاء المسودة.",
    gemini_incomplete_response:
      "أعاد Gemini مسودة ناقصة لا تستوفي قالب RPL المعتمد. أعد إنشاء المسودة.",
    target_level_required:
      "يجب تحديد هدف الاعتماد الذي اختاره المتقدم: ممارس مهني أو ممارس مهني متقدم أو خبير مهني، قبل تشغيل Gemini.",
  },
  en: {
    gemini_disabled:
      "Gemini evaluation generation is disabled in RPL settings. Enable it before trying again.",
    gemini_not_configured:
      "The Gemini API key is not configured on the server. A system administrator must complete the connection setup.",
    route_mismatch:
      "The applicant no longer satisfies any RPL route (for example, secondary verification is pending). Review the qualifications and application route first.",
    gemini_connection:
      "The server could not connect to Gemini. Check server connectivity and try again.",
    gemini_unavailable:
      "Gemini or the selected model is temporarily unavailable. Review the configured model or try again later.",
    gemini_unexpected:
      "Gemini could not create the evaluation draft. Try again and inspect the server log if the problem continues.",
    gemini_invalid_response:
      "Gemini returned an invalid response. Generate the draft again.",
    gemini_incomplete_response:
      "Gemini returned an incomplete draft that does not satisfy the approved RPL schema. Generate it again.",
    target_level_required:
      "Select the applicant’s desired accreditation target—Practitioner, Advanced Practitioner, or Expert—before running Gemini.",
  },
  nl: {
    gemini_disabled:
      "Het genereren van Gemini-beoordelingen is uitgeschakeld in de RPL-instellingen. Schakel dit eerst in.",
    gemini_not_configured:
      "De Gemini API-sleutel is niet op de server geconfigureerd. Een systeembeheerder moet de verbinding voltooien.",
    route_mismatch:
      "De aanvrager voldoet niet langer aan een RPL-route (bijvoorbeeld: verificatie van het middelbareschooldiploma is in behandeling). Controleer eerst de kwalificaties en aanvraagroute.",
    gemini_connection:
      "De server kon geen verbinding maken met Gemini. Controleer de serververbinding en probeer opnieuw.",
    gemini_unavailable:
      "Gemini of het gekozen model is tijdelijk niet beschikbaar. Controleer het ingestelde model of probeer later opnieuw.",
    gemini_unexpected:
      "Gemini kon het beoordelingsconcept niet maken. Probeer opnieuw en controleer het serverlogboek als dit aanhoudt.",
    gemini_invalid_response:
      "Gemini gaf een ongeldig antwoord. Genereer het concept opnieuw.",
    gemini_incomplete_response:
      "Gemini gaf een onvolledig concept dat niet aan het goedgekeurde RPL-schema voldoet. Genereer het opnieuw.",
    target_level_required:
      "Selecteer vóór Gemini het gewenste accreditatiedoel: Practitioner, Advanced Practitioner of Expert.",
  },
};

function readGeminiError(error, language) {
  const translations =
    geminiStatusCopyByLanguage[language] || geminiStatusCopyByLanguage.en;
  const key = Object.keys(error?.response?.data?.errors || {}).find(
    (candidate) => translations[candidate],
  );
  return key
    ? translations[key]
    : readApiError(error, translations.gemini_unexpected, language);
}

export default function RplAssessmentsPage() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const language = getAdminLanguage();
  const isArabic = language === "ar";
  const copy = copyByLanguage[language] || copyByLanguage.en;
  const geminiCopy = geminiCopyByLanguage[language] || geminiCopyByLanguage.en;
  const readinessLabels = {
    ready: geminiCopy.readinessReady,
    partially_ready: geminiCopy.readinessPartiallyReady,
    not_ready: geminiCopy.readinessNotReady,
  };
  const geminiStatusCopy =
    geminiStatusCopyByLanguage[language] || geminiStatusCopyByLanguage.en;
  const { isAdministrator } = useAuthorization();
  const [filters, setFilters] = useState({ search: "", status: "" });
  const [state, setState] = useState({
    loading: true,
    error: "",
    rows: [],
    assessment: null,
    outcomes: [],
    levels: [],
    requireVerifiedEvidence: true,
  });
  const [criteria, setCriteria] = useState([]);
  const [report, setReport] = useState({
    recommendation: "",
    recommended_level_id: "",
    findings_summary: "",
    outcome_id: "",
  });
  const [interview, setInterview] = useState({
    scheduled_at: "",
    mode: "online",
    location_or_url: "",
    notes: "",
  });
  const [gap, setGap] = useState({ summary: "", items: [] });
  const [advisoryQuestion, setAdvisoryQuestion] = useState("");
  const [action, setAction] = useState({ busy: false, error: "", success: "" });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      if (assessmentId) {
        const [assessmentResponse, referenceResponse] = await Promise.all([
          fetchRplAssessment(assessmentId),
          fetchRplReferenceData(),
        ]);
        const assessment = unwrapApiData(assessmentResponse);
        const reference = unwrapApiData(referenceResponse) || {};
        const outcomes = unwrapCollection(reference.outcomes || []);
        const pathways = unwrapCollection(reference.pathways || []);
        const assessmentPathway = assessment.application?.pathway;
        const matchingPathway = pathways.find(
          (pathway) =>
            Number(pathway.id) === Number(assessmentPathway?.id) ||
            pathway.code === assessmentPathway?.code,
        );
        const levels = (matchingPathway?.levels || [])
          .filter((level) => level.is_active !== false)
          .sort((left, right) => Number(left.rank) - Number(right.rank));
        const sourceCriteria =
          assessment.rubric?.criteria || assessment.criteria || [];
        const savedFindings = assessment.findings || [];
        setCriteria(
          sourceCriteria.map((criterion) => {
            const finding =
              savedFindings.find(
                (item) =>
                  Number(item.rpl_rubric_criterion_id) === Number(criterion.id),
              ) || {};
            return {
              ...criterion,
              outcome_id: finding.rpl_outcome_definition_id || "",
              score: finding.score ?? "",
              rationale: finding.rationale || "",
              evidence_ids: finding.evidence_ids || [],
            };
          }),
        );
        const savedReport =
          assessment.latest_report || assessment.latestReport || {};
        setReport({
          recommendation: savedReport.recommendation || "",
          recommended_level_id:
            savedReport.recommended_level_id ||
            assessment.recommended_level_id ||
            "",
          findings_summary:
            savedReport.findings_summary || assessment.summary || "",
          outcome_id:
            savedReport.rpl_outcome_definition_id ||
            assessment.overall_outcome_id ||
            "",
        });
        setState({
          loading: false,
          error: "",
          rows: [],
          assessment,
          outcomes,
          levels,
          requireVerifiedEvidence:
            reference.settings?.require_verified_evidence_for_assessment !==
            false,
        });
      } else {
        const response = await fetchRplAssessments({
          per_page: 100,
          ...(filters.search ? { q: filters.search } : {}),
          ...(filters.status ? { status: filters.status } : {}),
        });
        setState({
          loading: false,
          error: "",
          rows: unwrapCollection(response),
          assessment: null,
          outcomes: [],
          levels: [],
          requireVerifiedEvidence: true,
        });
      }
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: readApiError(error, copy.loadError),
      }));
    }
  }, [assessmentId, copy.loadError, filters.search, filters.status]);

  useEffect(() => {
    const timer = window.setTimeout(load, filters.search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [filters.search, load]);

  async function execute(request, success) {
    setAction({ busy: true, error: "", success: "" });
    try {
      await request();
      setAction({ busy: false, error: "", success });
      return true;
    } catch (error) {
      setAction({ busy: false, error: readApiError(error), success: "" });
      return false;
    }
  }

  async function saveFindings() {
    const availableEvidence =
      state.assessment?.evidence ||
      state.assessment?.application?.evidences ||
      state.assessment?.application?.evidence ||
      [];
    const eligibleEvidenceIds = new Set(
      availableEvidence
        .filter((item) =>
          isEvidenceEligibleForAssessment(item, state.requireVerifiedEvidence),
        )
        .map((item) => Number(item.id)),
    );
    const saved = await execute(
      () =>
        saveRplAssessmentFindings(assessmentId, {
          findings: criteria.map((criterion) => ({
            criterion_id: criterion.id,
            outcome_id: Number(criterion.outcome_id),
            ...(criterion.score === ""
              ? {}
              : { score: Number(criterion.score) }),
            rationale: criterion.rationale,
            evidence_ids: criterion.evidence_ids
              .map(Number)
              .filter((id) => eligibleEvidenceIds.has(id)),
          })),
          summary: report.findings_summary || null,
          ...(report.recommended_level_id
            ? { recommended_level_id: Number(report.recommended_level_id) }
            : {}),
          ...(report.outcome_id
            ? { overall_outcome_id: Number(report.outcome_id) }
            : {}),
        }),
      copy.saved,
    );
    if (saved) load();
  }

  async function saveInterview() {
    if (
      await execute(
        () => scheduleRplInterview(assessmentId, interview),
        copy.scheduled,
      )
    )
      setInterview({
        scheduled_at: "",
        mode: "online",
        location_or_url: "",
        notes: "",
      });
  }

  async function submitReport() {
    const payload = {
      findings_summary: report.findings_summary,
      recommendation: report.recommendation,
      outcome_id: Number(report.outcome_id),
      ...(report.recommended_level_id
        ? { recommended_level_id: Number(report.recommended_level_id) }
        : {}),
    };
    if (
      await execute(
        () => submitRplAssessmentReport(assessmentId, payload),
        copy.submitted,
      )
    )
      load();
  }

  async function saveGap() {
    await execute(
      () =>
        saveRplGapAnalysis(assessmentId, {
          summary: gap.summary || null,
          status: "final",
          items: gap.items.map((item) => ({
            competency_id: Number(item.competency_id),
            description: item.description,
            remediation_type: item.remediation_type,
            is_required: true,
            due_on: item.due_on || null,
            recommendations: item.recommendation_title
              ? [
                  {
                    title: item.recommendation_title,
                    description: item.recommendation_description || null,
                    is_mandatory: true,
                  },
                ]
              : [],
          })),
        }),
      copy.gapSaved,
    );
  }

  async function generateAdvisory() {
    setAction({ busy: true, error: "", success: "" });
    try {
      await generateRplAiAdvisory(assessmentId, {
        assessor_question: advisoryQuestion || null,
      });
      setAction({
        busy: false,
        error: "",
        success: geminiCopy.generatedSuccess,
      });
      setAdvisoryQuestion("");
      load();
    } catch (error) {
      setAction({
        busy: false,
        error: readGeminiError(error, language),
        success: "",
      });
    }
  }

  async function acknowledgeAdvisory(id) {
    const acknowledged = await execute(
      () => acknowledgeRplAiAdvisory(id),
      geminiCopy.acknowledgeSuccess,
    );
    if (acknowledged) load();
  }

  const summary = useMemo(
    () => ({
      assigned: state.rows.length,
      progress: state.rows.filter((row) =>
        ["assigned", "in_progress", "assessment_in_progress"].includes(
          row.status,
        ),
      ).length,
      due: state.rows.filter(
        (row) =>
          row.due_at &&
          new Date(row.due_at) <= new Date(Date.now() + 7 * 86400000),
      ).length,
      complete: state.rows.filter((row) =>
        ["submitted", "completed"].includes(row.status),
      ).length,
    }),
    [state.rows],
  );

  if (!assessmentId) {
    const columns = [
      {
        key: "case",
        label: copy.case,
        render: (row) => (
          <div>
            <span className="font-bold text-[var(--color-primary)]">
              {row.application?.case_reference ||
                row.case_reference ||
                `RPL-${row.application_id}`}
            </span>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {copy.assessmentReference} <bdi>#{row.id}</bdi>
            </p>
          </div>
        ),
      },
      {
        key: "applicant",
        label: copy.applicant,
        render: (row) => {
          const applicant = applicantOf(row);
          return (
            <div>
              <span className="font-semibold">
                {applicant.name || row.applicant_name || "—"}
              </span>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                {applicant.email || "—"}
              </p>
            </div>
          );
        },
      },
      {
        key: "assessor",
        label: copy.assessor,
        render: (row) =>
          row.assignment?.expert?.user?.name ||
          row.assessor?.user?.name ||
          row.assessor_name ||
          "—",
      },
      {
        key: "due",
        label: copy.due,
        render: (row) =>
          formatLocalizedDate(row.assignment?.due_on || row.due_at, language),
      },
      {
        key: "status",
        label: copy.status,
        render: (row) => (
          <RplStatusBadge status={row.status} language={language} />
        ),
      },
      {
        key: "action",
        label: copy.action,
        render: (row) => (
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/rpl/assessments/${row.id}`)}
          >
            <Eye size={16} />
            {copy.open}
          </Button>
        ),
      },
    ];
    return (
      <section dir={isArabic ? "rtl" : "ltr"} className="space-y-7">
        <PageHeader title={copy.title} description={copy.description} />
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
          <StatCard
            title={copy.assigned}
            value={summary.assigned}
            icon={<UserRoundCheck size={21} />}
          />
          <StatCard
            title={copy.inProgress}
            value={summary.progress}
            icon={<ClipboardCheck size={21} />}
          />
          <StatCard
            title={copy.dueSoon}
            value={summary.due}
            icon={<CalendarPlus size={21} />}
          />
          <StatCard
            title={copy.completed}
            value={summary.complete}
            icon={<BadgeCheck size={21} />}
          />
        </div>
        <Card>
          <CardContent className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_280px]">
            <Input
              leftIcon={<Search size={18} />}
              placeholder={copy.search}
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  search: event.target.value,
                }))
              }
            />
            <Select
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  status: event.target.value,
                }))
              }
            >
              <option value="">{copy.all}</option>
              <option value="assigned">{copy.statusAssigned}</option>
              <option value="in_progress">{copy.statusInProgress}</option>
              <option value="submitted">{copy.statusSubmitted}</option>
              <option value="completed">{copy.statusCompleted}</option>
            </Select>
          </CardContent>
        </Card>
        <RplPageState
          loading={state.loading}
          error={state.error}
          onRetry={load}
          language={language}
        >
          <DataTableShell
            title={copy.assigned}
            description={copy.description}
            columns={columns}
            rows={state.rows}
            emptyText={copy.empty}
          />
        </RplPageState>
      </section>
    );
  }

  const assessment = state.assessment || {};
  const requestedTargetLevel = assessment.application?.requested_level;
  const geminiReadiness = assessment.gemini_readiness || {
    available: true,
    reason_code: null,
  };
  const geminiUnavailableMessage =
    !geminiReadiness.available && geminiReadiness.reason_code
      ? geminiStatusCopy[geminiReadiness.reason_code]
      : "";
  const evidence =
    assessment.evidence ||
    assessment.application?.evidences ||
    assessment.application?.evidence ||
    [];
  const applicant = applicantOf(assessment);
  const findingsComplete =
    criteria.length > 0 &&
    criteria.every(
      (criterion) => criterion.outcome_id && criterion.rationale.trim(),
    );
  const reportComplete =
    report.findings_summary.trim().length >= 20 &&
    report.recommendation.trim().length >= 20 &&
    report.outcome_id;

  function updateCriterion(index, field, value) {
    setCriteria((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  }

  function toggleCriterionEvidence(index, evidenceId) {
    setCriteria((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const currentIds = item.evidence_ids.map(Number);
        return {
          ...item,
          evidence_ids: currentIds.includes(Number(evidenceId))
            ? currentIds.filter((id) => id !== Number(evidenceId))
            : [...currentIds, Number(evidenceId)],
        };
      }),
    );
  }

  return (
    <section dir={isArabic ? "rtl" : "ltr"} className="space-y-7">
      <PageHeader
        title={`${copy.assessment} · ${assessment.application?.case_reference || `#${assessmentId}`}`}
        description={applicant.name || applicant.email || copy.description}
        actions={
          <Button
            variant="outline"
            onClick={() => navigate("/rpl/assessments")}
          >
            {isArabic ? <ArrowRight size={17} /> : <ArrowLeft size={17} />}
            {copy.back}
          </Button>
        }
      />
      <RplPageState
        loading={state.loading}
        error={state.error}
        onRetry={load}
        language={language}
      >
        <>
          <SectionAnchorNav
            sections={[
              ...(isAdministrator && assessment.rpl_assessor_assignment_id == null
                ? [{ id: 'sec-gemini', label: geminiCopy.title }]
                : []),
              { id: 'sec-criteria', label: copy.criteria },
              { id: 'sec-evidence', label: copy.evidence },
              { id: 'sec-gap', label: copy.gap },
              { id: 'sec-interview', label: copy.interview },
              { id: 'sec-report', label: copy.report },
            ]}
          />
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <ShieldAlert className="mt-0.5 shrink-0" size={20} />
            <p>
              {assessment.rpl_assessor_assignment_id == null
                ? copy.adminNoAuthority
                : copy.noAuthority}
            </p>
          </div>
          {action.error || action.success ? (
            <div
              role="alert"
              className={`rounded-2xl border px-4 py-3 text-sm ${action.error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}
            >
              {action.error || action.success}
            </div>
          ) : null}
          {isAdministrator && assessment.rpl_assessor_assignment_id == null ? (
            <Card id="sec-gemini" className="scroll-mt-24">
              <CardHeader className="border-b border-[var(--color-border)]">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-600" />
                  <CardTitle>{geminiCopy.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-950">
                  <p className="text-xs font-bold uppercase tracking-wide text-sky-700">
                    {geminiCopy.targetLevel}
                  </p>
                  <p className="mt-2 text-lg font-bold">
                    {requestedTargetLevel
                      ? localize(requestedTargetLevel.name, language)
                      : "—"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-sky-800">
                    {geminiCopy.targetMethod}
                  </p>
                </div>
                <p className="rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                  {geminiCopy.notice}
                </p>
                {geminiUnavailableMessage ? (
                  <div
                    role="status"
                    className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700"
                  >
                    {geminiUnavailableMessage}
                  </div>
                ) : null}
                <Textarea
                  rows={2}
                  label={geminiCopy.question}
                  value={advisoryQuestion}
                  onChange={(event) => setAdvisoryQuestion(event.target.value)}
                  placeholder={geminiCopy.placeholder}
                  disabled={!geminiReadiness.available}
                />
                <Button
                  variant="outline"
                  onClick={generateAdvisory}
                  disabled={
                    action.busy ||
                    assessment.locked_at ||
                    !geminiReadiness.available
                  }
                >
                  <Sparkles size={17} />
                  {geminiCopy.generate}
                </Button>
                {(
                  assessment.ai_advisories ||
                  assessment.aiAdvisories ||
                  []
                ).map((item) => (
                  <article
                    key={item.id}
                    className="space-y-3 rounded-2xl border border-[var(--color-border)] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-bold">
                          Gemini · <bdi>{item.model}</bdi>
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {formatLocalizedDateTime(item.generated_at, language)}
                        </p>
                      </div>
                      {item.acknowledged_at ? (
                        <Badge variant="success">
                          {geminiCopy.acknowledged}
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => acknowledgeAdvisory(item.id)}
                          disabled={action.busy}
                        >
                          {geminiCopy.acknowledge}
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => exportRplAiAdvisory(item.id, "pdf")}
                      >
                        <Download size={15} />
                        PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => exportRplAiAdvisory(item.id, "csv")}
                      >
                        <Download size={15} />
                        CSV
                      </Button>
                    </div>
                    <p className="text-sm font-semibold text-amber-800">
                      {item.advisory?.disclaimer}
                    </p>
                    <p className="text-sm leading-6">
                      {item.advisory?.case_summary}
                    </p>
                    {item.advisory?.target_level_analysis ? (
                      <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
                        <strong>{geminiCopy.currentReadiness}</strong>
                        <p className="mt-1">
                          {readinessLabels[
                            item.advisory.target_level_analysis
                              .current_readiness
                          ] ||
                            item.advisory.target_level_analysis
                              .current_readiness}
                        </p>
                        {asList(item.advisory.target_level_analysis.rationale)
                          .length ? (
                          <p className="mt-2 leading-6">
                            {asList(
                              item.advisory.target_level_analysis.rationale,
                            ).join(" ")}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    {(Array.isArray(item.advisory?.criterion_advice)
                      ? item.advisory.criterion_advice
                      : []
                    ).map((advice) => (
                      <div
                        key={advice.criterion_id}
                        className="rounded-xl bg-[var(--color-surface-muted)] p-3 text-sm"
                      >
                        <strong>
                          {geminiCopy.criterion}{" "}
                          <bdi>#{advice.criterion_id}</bdi>
                        </strong>
                        <p className="mt-1">
                          {asList(advice.assessment_observations).join(" ")}
                        </p>
                        {asList(advice.evidence_gaps).length ? (
                          <p className="mt-1 text-amber-800">
                            {geminiCopy.gaps}:{" "}
                            {asList(advice.evidence_gaps).join(" ")}
                          </p>
                        ) : null}
                      </div>
                    ))}
                    {Array.isArray(item.advisory?.course_recommendations) &&
                    item.advisory.course_recommendations.length ? (
                      <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm">
                        <strong className="block text-sky-900">
                          {geminiCopy.courses}
                        </strong>
                        {item.advisory.course_recommendations.map((course) => (
                          <div
                            key={course.program_id}
                            className="mt-3 rounded-lg bg-white p-3"
                          >
                            <p className="font-semibold">
                              {localize(course.title, language)}
                            </p>
                            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                              <bdi>{course.slug}</bdi>
                            </p>
                            <p className="mt-2 leading-6">{course.reason}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </CardContent>
            </Card>
          ) : null}
          {isAdministrator ? (
            <DynamicAssessmentPanel
              assessmentId={assessmentId}
              language={language}
            />
          ) : null}
          <Card id="sec-criteria" className="scroll-mt-24">
            <CardHeader className="border-b border-[var(--color-border)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>{copy.criteria}</CardTitle>
                <RplStatusBadge
                  status={assessment.status}
                  language={language}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {criteria.length ? (
                criteria.map((criterion, index) => (
                  <article
                    key={criterion.id || index}
                    className="space-y-4 rounded-2xl border border-[var(--color-border)] p-4"
                  >
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_120px_180px] lg:items-end">
                      <div>
                        <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                          {copy.criterion}
                        </p>
                        <p className="mt-2 font-bold text-[var(--color-text)]">
                          {localize(
                            criterion.name || criterion.title,
                            language,
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                          {copy.weight}
                        </p>
                        <p className="mt-2 font-bold">
                          {criterion.maximum_score ??
                            criterion.max_score ??
                            "—"}
                        </p>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        max={
                          criterion.maximum_score || criterion.max_score || 100
                        }
                        label={copy.score}
                        value={criterion.score}
                        onChange={(event) =>
                          updateCriterion(index, "score", event.target.value)
                        }
                      />
                    </div>
                    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
                      <Select
                        label={copy.outcome}
                        value={criterion.outcome_id}
                        onChange={(event) =>
                          updateCriterion(
                            index,
                            "outcome_id",
                            event.target.value,
                          )
                        }
                      >
                        <option value="">—</option>
                        {state.outcomes.map((outcome) => (
                          <option key={outcome.id} value={outcome.id}>
                            {localize(outcome.name, language)}
                          </option>
                        ))}
                      </Select>
                      <Textarea
                        rows={3}
                        label={copy.notes}
                        value={criterion.rationale}
                        onChange={(event) =>
                          updateCriterion(
                            index,
                            "rationale",
                            event.target.value,
                          )
                        }
                      />
                    </div>
                    {evidence.length ? (
                      <fieldset>
                        <legend className="mb-2 text-sm font-semibold text-[var(--color-text)]">
                          {copy.evidenceMapping}
                        </legend>
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                          {evidence.map((item) => {
                            const eligible = isEvidenceEligibleForAssessment(
                              item,
                              state.requireVerifiedEvidence,
                            );
                            return (
                              <label
                                key={item.public_id || item.id}
                                className={`flex items-start gap-2 rounded-xl border border-[var(--color-border)] p-3 text-sm ${eligible ? "cursor-pointer" : "cursor-not-allowed bg-[var(--color-surface-muted)] opacity-70"}`}
                                title={
                                  eligible ? undefined : copy.ineligibleEvidence
                                }
                              >
                                <input
                                  className="mt-1"
                                  type="checkbox"
                                  disabled={!eligible}
                                  checked={
                                    eligible &&
                                    criterion.evidence_ids
                                      .map(Number)
                                      .includes(Number(item.id))
                                  }
                                  onChange={() =>
                                    toggleCriterionEvidence(index, item.id)
                                  }
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate">
                                    {item.title ||
                                      item.media?.original_name ||
                                      `#${item.id}`}
                                  </span>
                                  <span className="mt-1 block">
                                    <RplStatusBadge
                                      status={item.status}
                                      domain="evidence"
                                      language={language}
                                    />
                                  </span>
                                  {!eligible ? (
                                    <span className="mt-1 block text-xs text-[var(--color-text-muted)]">
                                      {copy.ineligibleEvidence}
                                    </span>
                                  ) : null}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>
                    ) : null}
                  </article>
                ))
              ) : (
                <p className="py-8 text-center text-[var(--color-text-muted)]">
                  {copy.noCriteria}
                </p>
              )}
              <div className="flex justify-end">
                <Button
                  onClick={saveFindings}
                  disabled={!findingsComplete || action.busy}
                >
                  {action.busy ? (
                    <LoaderCircle className="animate-spin" size={17} />
                  ) : (
                    <Save size={17} />
                  )}
                  {copy.saveRubric}
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card id="sec-evidence" className="scroll-mt-24">
            <CardHeader className="border-b border-[var(--color-border)]">
              <CardTitle>{copy.evidence}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 pt-6 md:grid-cols-2 xl:grid-cols-3">
              {evidence.length ? (
                evidence.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-[var(--color-border)] p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold">
                        {item.title || item.media?.original_name}
                      </h3>
                      <RplStatusBadge
                        status={item.status}
                        domain="evidence"
                        language={language}
                      />
                    </div>
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                      {item.competency_claim || item.description || "—"}
                    </p>
                  </article>
                ))
              ) : (
                <p className="text-[var(--color-text-muted)]">
                  {copy.noEvidence}
                </p>
              )}
            </CardContent>
          </Card>
          <Card id="sec-gap" className="scroll-mt-24">
            <CardHeader className="border-b border-[var(--color-border)]">
              <div className="flex items-center justify-between gap-3">
                <CardTitle>{copy.gap}</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setGap((current) => ({
                      ...current,
                      items: [
                        ...current.items,
                        {
                          competency_id: criteria[0]?.rpl_competency_id || "",
                          description: "",
                          remediation_type: "training",
                          due_on: "",
                          recommendation_title: "",
                          recommendation_description: "",
                        },
                      ],
                    }))
                  }
                  disabled={!criteria.length}
                >
                  <Plus size={16} />
                  {copy.addGap}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <Textarea
                rows={3}
                label={copy.gapSummary}
                value={gap.summary}
                onChange={(event) =>
                  setGap((current) => ({
                    ...current,
                    summary: event.target.value,
                  }))
                }
              />
              {gap.items.map((item, index) => (
                <div
                  key={index}
                  className="grid gap-4 rounded-2xl border border-[var(--color-border)] p-4 lg:grid-cols-2"
                >
                  <Select
                    label={copy.criterion}
                    value={item.competency_id}
                    onChange={(event) =>
                      setGap((current) => ({
                        ...current,
                        items: current.items.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, competency_id: event.target.value }
                            : row,
                        ),
                      }))
                    }
                  >
                    <option value="">—</option>
                    {criteria
                      .filter((criterion) => criterion.rpl_competency_id)
                      .map((criterion) => (
                        <option
                          key={criterion.rpl_competency_id}
                          value={criterion.rpl_competency_id}
                        >
                          {localize(
                            criterion.title || criterion.name,
                            language,
                          )}
                        </option>
                      ))}
                  </Select>
                  <Select
                    label={copy.remediationType}
                    value={item.remediation_type}
                    onChange={(event) =>
                      setGap((current) => ({
                        ...current,
                        items: current.items.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, remediation_type: event.target.value }
                            : row,
                        ),
                      }))
                    }
                  >
                    <option value="training">{copy.training}</option>
                    <option value="evidence">{copy.additionalEvidence}</option>
                    <option value="interview">{copy.interviewOption}</option>
                    <option value="practical_task">{copy.practicalTask}</option>
                    <option value="experience">{copy.experienceOption}</option>
                  </Select>
                  <Textarea
                    className="lg:col-span-2"
                    rows={3}
                    label={copy.notes}
                    value={item.description}
                    onChange={(event) =>
                      setGap((current) => ({
                        ...current,
                        items: current.items.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, description: event.target.value }
                            : row,
                        ),
                      }))
                    }
                  />
                  <Input
                    label={copy.completion}
                    value={item.recommendation_title}
                    onChange={(event) =>
                      setGap((current) => ({
                        ...current,
                        items: current.items.map((row, rowIndex) =>
                          rowIndex === index
                            ? {
                                ...row,
                                recommendation_title: event.target.value,
                              }
                            : row,
                        ),
                      }))
                    }
                  />
                  <Input
                    type="date"
                    label={copy.due}
                    value={item.due_on}
                    onChange={(event) =>
                      setGap((current) => ({
                        ...current,
                        items: current.items.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, due_on: event.target.value }
                            : row,
                        ),
                      }))
                    }
                  />
                  <Textarea
                    rows={2}
                    label={copy.completionDescription}
                    value={item.recommendation_description}
                    onChange={(event) =>
                      setGap((current) => ({
                        ...current,
                        items: current.items.map((row, rowIndex) =>
                          rowIndex === index
                            ? {
                                ...row,
                                recommendation_description: event.target.value,
                              }
                            : row,
                        ),
                      }))
                    }
                  />
                  <div className="flex items-end justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setGap((current) => ({
                          ...current,
                          items: current.items.filter(
                            (_, rowIndex) => rowIndex !== index,
                          ),
                        }))
                      }
                    >
                      <Trash2 size={16} />
                      {copy.remove}
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex justify-end">
                <Button
                  onClick={saveGap}
                  disabled={
                    action.busy ||
                    !gap.items.length ||
                    gap.items.some(
                      (item) => !item.competency_id || !item.description.trim(),
                    )
                  }
                >
                  <Save size={17} />
                  {copy.saveGap}
                </Button>
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-6 xl:grid-cols-2">
            <Card id="sec-interview" className="scroll-mt-24">
              <CardHeader className="border-b border-[var(--color-border)]">
                <CardTitle>{copy.interview}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <Input
                  type="datetime-local"
                  label={copy.interviewAt}
                  value={interview.scheduled_at}
                  onChange={(event) =>
                    setInterview((current) => ({
                      ...current,
                      scheduled_at: event.target.value,
                    }))
                  }
                />
                <Select
                  label={copy.method}
                  value={interview.mode}
                  onChange={(event) =>
                    setInterview((current) => ({
                      ...current,
                      mode: event.target.value,
                    }))
                  }
                >
                  <option value="online">{copy.online}</option>
                  <option value="phone">{copy.phone}</option>
                  <option value="in_person">{copy.inPerson}</option>
                </Select>
                <Input
                  label={copy.location}
                  value={interview.location_or_url}
                  onChange={(event) =>
                    setInterview((current) => ({
                      ...current,
                      location_or_url: event.target.value,
                    }))
                  }
                />
                <Textarea
                  rows={4}
                  label={copy.interviewNotes}
                  value={interview.notes}
                  onChange={(event) =>
                    setInterview((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                />
                <Button
                  fullWidth
                  onClick={saveInterview}
                  disabled={!interview.scheduled_at || action.busy}
                >
                  <CalendarPlus size={18} />
                  {copy.schedule}
                </Button>
              </CardContent>
            </Card>
            <Card id="sec-report" className="scroll-mt-24">
              <CardHeader className="border-b border-[var(--color-border)]">
                <CardTitle>{copy.report}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <Select
                  label={copy.outcome}
                  value={report.outcome_id}
                  onChange={(event) =>
                    setReport((current) => ({
                      ...current,
                      outcome_id: event.target.value,
                    }))
                  }
                >
                  <option value="">—</option>
                  {state.outcomes.map((outcome) => (
                    <option key={outcome.id} value={outcome.id}>
                      {localize(outcome.name, language)}
                    </option>
                  ))}
                </Select>
                <Select
                  label={copy.recommendLevel}
                  value={report.recommended_level_id}
                  onChange={(event) =>
                    setReport((current) => ({
                      ...current,
                      recommended_level_id: event.target.value,
                    }))
                  }
                >
                  <option value="">—</option>
                  {state.levels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {localize(level.name, language)}
                    </option>
                  ))}
                </Select>
                <Textarea
                  rows={5}
                  label={copy.findings}
                  value={report.findings_summary}
                  onChange={(event) =>
                    setReport((current) => ({
                      ...current,
                      findings_summary: event.target.value,
                    }))
                  }
                />
                <Textarea
                  rows={5}
                  label={copy.recommendation}
                  value={report.recommendation}
                  onChange={(event) =>
                    setReport((current) => ({
                      ...current,
                      recommendation: event.target.value,
                    }))
                  }
                />
                <Button
                  fullWidth
                  onClick={submitReport}
                  disabled={!reportComplete || !findingsComplete || action.busy}
                >
                  <Send size={18} />
                  {copy.submit}
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      </RplPageState>
    </section>
  );
}
