import { useCallback, useEffect, useState } from "react";
import {
  CheckCheck,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  Pencil,
  Plus,
  RefreshCw,
  Ban,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Textarea,
} from "../../../components/ui";
import {
  approveAllDynamicAssessmentItems,
  approveDynamicAssessmentItem,
  addDynamicAssessmentItem,
  cancelDynamicAssessment,
  createDynamicAssessment,
  exportDynamicAssessment,
  fetchDynamicAssessment,
  fetchDynamicAssessments,
  finalEvaluateDynamicAssessment,
  generateDynamicAssessmentDraft,
  regenerateDynamicAssessmentItem,
  reissueDynamicAssessment,
  rejectDynamicAssessmentItem,
  rescoreDynamicAssessment,
  sendDynamicAssessment,
  updateDynamicAssessmentItem,
} from "../services/rplService";
import AiProvenanceNote from "../../shared/ai/AiProvenanceNote";
import AiRunNotice from "../../shared/ai/AiRunNotice";
import AiServiceBanner from "../../shared/ai/AiServiceBanner";
import { aiCopy } from "../../shared/ai/aiCopy";
import { AI_RUN_WAITING_POLL_MS, aiErrorMessage, aiGenerationOf, hasOwnProvenance, retryTargetOf, runError } from "../../shared/ai/aiState";
import { retryAiGenerationNow } from "../../shared/ai/aiServiceApi";
import { formatLocalizedDateTime } from "../../../utils/localization";
import { answerProgress } from "../domain/answerCompleteness";
import { coursePlanCopy } from "../domain/coursePlan";
import { fill } from "../domain/documentScreening";
import {
  RESCORE_REASON_MAX,
  RESCORE_REASON_MIN,
  TECHNICAL_FAILURE_REASON_MAX,
  TECHNICAL_FAILURE_REASON_MIN,
  canReopenRunningForTechnicalFailure,
  canRescoreEntryQuiz,
  entryQuizCopy,
  entryQuizItemMarks,
  hasQuizResult,
  isCaseClosed,
  isHeardAtExpiry,
  isRescoreReasonValid,
  isTechnicalFailureReasonValid,
  reopenNeedsTechnicalFailure,
  withdrawBlockedByAttempt,
} from "../domain/entryQuiz";
import EntryQuizResultCard, { EntryQuizItemMark } from "./EntryQuizResultCard";
import EvidenceReadinessNotice from "./EvidenceReadinessNotice";

const copyByLanguage = {
  ar: {
    title: "اختبار الدخول (25–50 سؤالًا)",
    intro:
      "يولّد Gemini مسودة أسئلة فردية من ملفات العميل نفسها ومن فجوات الأدلة، ثم تراجعها وتعدّلها وتعتمدها قبل الإرسال. لا يُرسل أي سؤال تلقائيًا، ولا يجري أي تقييم قبل أن يجيب العميل عن كل الأسئلة.",
    create: "إنشاء اختبار الدخول",
    generate: "توليد الأسئلة عبر Gemini",
    regenerateAll: "إعادة توليد المسودة كاملة",
    generating: "جارٍ التوليد… قد يستغرق حتى دقيقتين",
    generationQueued:
      "طُلب التوليد وينتظر أن يبدأه الخادم. تتحقق هذه الصفحة منه كل بضع ثوانٍ، ويتوقف اعتماد الأسئلة وتعديلها ورفضها وإرسال المجموعة حتى ينتهي.",
    generationRunning:
      "يولّد الخادم الأسئلة الآن، وقد يستغرق ذلك بضع دقائق. تتحقق هذه الصفحة منه كل بضع ثوانٍ، ويتوقف اعتماد الأسئلة وتعديلها ورفضها وإرسال المجموعة حتى ينتهي.",
    generationFailed: "لم يكتمل آخر توليد، ولم يُحفظ منه شيء. يمكنك أن تبدأه من جديد.",
    recommended: "العدد الموصى به من Gemini",
    approved: "معتمدة",
    pending: "بانتظار المراجعة",
    rejected: "مرفوضة",
    empty: "لا توجد أسئلة بعد. ابدأ بتوليد المسودة عبر Gemini.",
    edit: "تعديل",
    save: "حفظ",
    cancel: "إلغاء",
    approve: "اعتماد",
    reject: "رفض",
    regenerate: "إعادة توليد",
    approveAll: "اعتماد الكل",
    send: "إرسال إلى العميل",
    addManual: "إضافة سؤال يدوي",
    addPlaceholder: "نص السؤال اليدوي…",
    add: "إضافة",
    purpose: "الغرض",
    tooFew: "تحذير: أقل من 25 سؤالًا معتمدًا — لا يمكن الإرسال.",
    tooMany: "تحذير: أكثر من 50 سؤالًا معتمدًا — لا يمكن الإرسال.",
    issuedAt: "أُرسل في",
    timeLimit: "المدة",
    minutes: "دقيقة",
    openedAt: "فتحه العميل في",
    dueAt: "الموعد النهائي",
    answeredAt: "سلّم الإجابات في",
    answer: "إجابة العميل",
    noAnswer: "لم يُجب بعد",
    progressTitle: "الإجابات الواردة",
    progressIssued: "مُرسل",
    progressAnswered: "مُجاب",
    progressOutstanding: "بلا إجابة",
    progressComplete: "أُجيب عن كل سؤال مُرسل.",
    progressIncomplete:
      "لا يُقيّم Gemini إلا بعد الإجابة عن كل سؤال مُرسل. أعد فتح النافذة إذا احتاج العميل مزيدًا من الوقت.",
    progressNotSubmitted: "كل الأسئلة لها إجابات، لكن العميل لم يسلّمها بعد.",
    finalBlocked: "يبقى التقييم النهائي مغلقًا حتى يُجاب عن كل سؤال مُرسل.",
    reissue: "إعادة الفتح للعميل",
    reissueTitle: "إعادة فتح نافذة الإجابة",
    reissueWhyExpired: "أُغلقت نافذة الإجابة ولم يُكمل العميل.",
    reissueWhyNeverOpened:
      "أُرسل التقييم ولم يفتحه العميل مطلقًا، فلم تبدأ المدة الزمنية أصلًا.",
    reissueWhyIncomplete: "هذا التقييم مُعلَّم «تمت الإجابة» ولا تزال فيه أسئلة بلا إجابة.",
    reissueWhyRunning:
      "لا تزال نافذة الإجابة جارية. لا يُعاد فتحها إلا لعطل تقني موثّق أبلغ عنه العميل: تُحفظ الإجابات المقدَّمة، ويتوقف العدّ، ويمنح البدء التالي نافذة كاملة.",
    reissueReason: "السبب — يُسجَّل في سجل التدقيق",
    reissuePlaceholder: "مثال: انقطع اتصال العميل أثناء النافذة.",
    reissueNote:
      "تُحفظ مجموعة الأسئلة وكل إجابة سبق تقديمها. يستأنف العميل من حيث توقف ويحصل على نافذة زمنية جديدة كاملة.",
    reissueConfirm: "إعادة الفتح",
    reissueCancel: "إلغاء",
    reissueDone: "أُعيد فتح التقييم مع الاحتفاظ بالإجابات السابقة.",
    reissueClosedCase:
      "الطلب مغلق، فلا يُعاد فتح أي اختبار للعميل. وتصحّح المنصة الاختبار الذي فتحه عند انتهاء وقته.",
    withdraw: "سحب مجموعة الأسئلة",
    withdrawTitle: "سحب تقييم لن يُكمله العميل",
    withdrawWhy:
      "ما دامت هناك أسئلة مُرسلة بلا إجابة، يبقى تحليل Gemini مغلقًا على هذه الحالة. السحب هو المخرج حين لا ينوي العميل الإجابة.",
    withdrawNote:
      "لا يُحذف شيء: تبقى الأسئلة وأي إجابات جزئية في السجل. المجموعة المسحوبة لم تُجب، فهي لا تُحتسب دليلًا ولا فجوة، ولا تفتح تقييمًا لم يُسمع فيه العميل.",
    withdrawReason: "السبب — يُسجَّل في سجل التدقيق",
    withdrawPlaceholder: "مثال: انسحب العميل ولن يجيب.",
    withdrawConfirm: "سحب",
    withdrawDone: "سُحبت مجموعة الأسئلة؛ حُفظت الأسئلة وأي إجابات في السجل.",
    withdrawnTitle: "مجموعات أسئلة مسحوبة (سجل)",
    withdrawnIntro:
      "هذه المجموعات سُحبت ولم تعد الحالة الحالية لهذا الملف. لم يُحذف شيء: تبقى الأسئلة وأي إجابات جزئية في السجل، والمجموعة المسحوبة لا تُحتسب دليلًا ولا فجوة. أنشئ مجموعة أسئلة جديدة للمتابعة.",
    withdrawnReasonNote:
      "سبب السحب مُسجَّل في سجل التدقيق باسم rpl.dynamic_assessment.cancelled؛ لا يُحفظ على السجل نفسه.",
    withdrawnQuestions: "سؤالًا",
    finalEvaluate: "التقييم النهائي الاستشاري (Gemini)",
    finalTitle: "التقييم النهائي — استشاري وبانتظار مراجعة المدير",
    summary: "الخلاصة",
    competencyEvals: "تقييم الكفاءات المقترح",
    gaps: "فجوات مقترحة",
    contradictions: "تناقضات",
    nextSteps: "الخطوات التالية",
    confidence: "الثقة",
    statusLabels: {
      draft: "مسودة",
      pending_review: "بانتظار المراجعة",
      approved: "معتمد",
      issued: "مُرسل للعميل",
      answered: "تمت الإجابة",
      assessed: "تم التقييم",
      rejected: "مرفوض",
      superseded: "مستبدل",
      cancelled: "مسحوب",
    },
    typeLabels: {
      knowledge: "معرفي",
      analytical: "تحليلي",
      scenario: "سيناريو",
      case_study: "دراسة حالة",
      situational_judgement: "حكم موقفي",
      experience_anchored: "مرتبط بالخبرة",
      evidence_clarification: "استيضاح دليل",
      practical_task: "مهمة عملية",
      structured_interview: "مقابلة منظمة",
      evidence_explanation: "شرح دليل",
      other: "آخر",
    },
  },
  en: {
    title: "Entry quiz (25–50 questions)",
    intro:
      "Gemini drafts individualised questions from the applicant's own uploaded documents and the evidence gaps; you review, edit, and approve before sending. Nothing is sent automatically, and no evaluation runs until the applicant has answered every question.",
    create: "Create the entry quiz",
    generate: "Generate questions with Gemini",
    regenerateAll: "Regenerate full draft",
    generating: "Generating… this can take up to two minutes",
    generationQueued:
      "The generation was asked for and is waiting for the server to start it. This page checks it every few seconds; approving, editing and removing questions and sending the set wait until it finishes.",
    generationRunning:
      "The server is generating the questions; this can take a few minutes. This page checks it every few seconds; approving, editing and removing questions and sending the set wait until it finishes.",
    generationFailed: "The last generation did not finish, and nothing was saved by it. You can start it again.",
    recommended: "Gemini recommended count",
    approved: "approved",
    pending: "pending review",
    rejected: "rejected",
    empty: "No questions yet. Start by generating the draft with Gemini.",
    edit: "Edit",
    save: "Save",
    cancel: "Cancel",
    approve: "Approve",
    reject: "Reject",
    regenerate: "Regenerate",
    approveAll: "Approve all",
    send: "Send to applicant",
    addManual: "Add manual question",
    addPlaceholder: "Manual question text…",
    add: "Add",
    purpose: "Purpose",
    tooFew: "Warning: fewer than 25 approved questions — sending is blocked.",
    tooMany: "Warning: more than 50 approved questions — sending is blocked.",
    issuedAt: "Issued at",
    timeLimit: "Time limit",
    minutes: "min",
    openedAt: "Opened by applicant at",
    dueAt: "Due at",
    answeredAt: "Answers submitted at",
    answer: "Applicant answer",
    noAnswer: "Not answered yet",
    progressTitle: "Answers received",
    progressIssued: "issued",
    progressAnswered: "answered",
    progressOutstanding: "outstanding",
    progressComplete: "Every issued question has been answered.",
    progressIncomplete:
      "Gemini evaluates only after every issued question is answered. Reopen the window if the applicant needs more time.",
    progressNotSubmitted:
      "Every question carries an answer, but the applicant has not submitted them yet.",
    finalBlocked:
      "The final evaluation stays closed until every issued question is answered.",
    reissue: "Reopen for the applicant",
    reissueTitle: "Reopen the answering window",
    reissueWhyExpired: "The answering window closed and the applicant did not finish.",
    reissueWhyNeverOpened:
      "The assessment was sent and the applicant never opened it, so the timer never started.",
    reissueWhyIncomplete:
      "This assessment is marked answered with questions still outstanding.",
    reissueWhyRunning:
      "The answering window is still running. Reopen it only for a documented technical failure the applicant reported: the answers given are kept, the countdown stops, and the next Start gives a full window.",
    reissueReason: "Reason — recorded in the audit trail",
    reissuePlaceholder: "For example: the applicant lost connection during the window.",
    reissueNote:
      "The question set and every answer already given are kept. The applicant resumes where they stopped and gets a full new window.",
    reissueConfirm: "Reopen",
    reissueCancel: "Cancel",
    reissueDone: "The assessment was reopened; previous answers were kept.",
    reissueClosedCase:
      "The case is closed, so nothing is reopened for the applicant. An opened quiz is marked by the platform when its time runs out.",
    withdraw: "Withdraw the question set",
    withdrawTitle: "Withdraw an assessment the applicant will not finish",
    withdrawWhy:
      "While issued questions sit unanswered, Gemini analysis stays closed on this case. Withdrawing is the way out when the applicant is not going to answer.",
    withdrawNote:
      "Nothing is deleted: the questions and any partial answers stay on the record. A withdrawn set was never answered, so it counts neither as evidence nor as a gap, and it cannot open an evaluation of an applicant who was not heard.",
    withdrawReason: "Reason — recorded in the audit trail",
    withdrawPlaceholder: "For example: the applicant withdrew and will not be answering.",
    withdrawConfirm: "Withdraw",
    withdrawDone: "The question set was withdrawn; the questions and any answers were kept.",
    withdrawnTitle: "Withdrawn question sets (history)",
    withdrawnIntro:
      "These sets were withdrawn and are no longer the current state of this case. Nothing was deleted: the questions and any partial answers stay on the record, and a withdrawn set counts neither as evidence nor as a gap. Create a new question set to carry on.",
    withdrawnReasonNote:
      "The reason each set was withdrawn is recorded in the audit trail as rpl.dynamic_assessment.cancelled; it is not stored on the row itself.",
    withdrawnQuestions: "questions",
    finalEvaluate: "Final advisory evaluation (Gemini)",
    finalTitle: "Final evaluation — advisory, pending administrator review",
    summary: "Summary",
    competencyEvals: "Suggested competency evaluations",
    gaps: "Suggested gaps",
    contradictions: "Contradictions",
    nextSteps: "Next steps",
    confidence: "Confidence",
    statusLabels: {
      draft: "Draft",
      pending_review: "Pending review",
      approved: "Approved",
      issued: "Issued to applicant",
      answered: "Answered",
      assessed: "Assessed",
      rejected: "Rejected",
      superseded: "Superseded",
      cancelled: "Withdrawn",
    },
    typeLabels: {
      knowledge: "Knowledge",
      analytical: "Analytical",
      scenario: "Scenario",
      case_study: "Case study",
      situational_judgement: "Situational judgement",
      experience_anchored: "Experience-anchored",
      evidence_clarification: "Evidence clarification",
      practical_task: "Practical task",
      structured_interview: "Structured interview",
      evidence_explanation: "Evidence explanation",
      other: "Other",
    },
  },
};

/* eslint-disable-next-line react-refresh/only-export-components -- exported so the
   test can prove both language blocks expose the same key set. Copy lookup is
   a WHOLE-OBJECT fallback (copyByLanguage[language] || copyByLanguage.en) with no
   per-key rescue, so a key present in en and missing in ar renders "undefined" in
   the language this CMS defaults to. */
export const COPY = copyByLanguage;

/*
 * A QUEUED GENERATION (G4, 17 Oct 2026; review round 2). The server answers the
 * generate and regenerate requests at once (202) and runs the model on its queue;
 * the set carries that run under `generation` until it finishes. While it is
 * queued or running, the generated questions it will replace are not approved,
 * edited or removed and the set is not sent (the server refuses each with
 * generation_in_progress): the controls wait with it, and the panel reads the set
 * again every GENERATION_POLL_MS. `abandoned` is a run past the server's window.
 */
export const GENERATION_POLL_MS = 4000;
/*
 * AI RESILIENCE (Release G, AI-RESILIENCE-SPEC §5.2): a run whose whole model
 * chain was busy goes back to the queue as waiting_retry. It is still in flight
 * (a second Generate is refused), the panel says when the next try is and offers
 * Retry now, and it reads the set every half minute rather than every few
 * seconds, since the next try is minutes away. It may wait six hours, so the
 * set's own controls stay open meanwhile (fix review of 23 Oct 2026): approving,
 * editing, rejecting or sending by hand closes the waiting run on the server,
 * and the panel says so before anyone clicks.
 */
const GENERATION_IN_FLIGHT = ["queued", "running", "waiting_retry"];
const GENERATION_ENDED_BADLY = ["failed", "abandoned"];

function pollDelayOf(run) {
  if (run?.status === "waiting_retry") return AI_RUN_WAITING_POLL_MS;
  return GENERATION_IN_FLIGHT.includes(run?.status) ? GENERATION_POLL_MS : null;
}

/** The failure's lines: the AI service's reason in words when its code names one, else the server's own lines. */
function failureLines(run, language) {
  const { code, errorClass, messages } = runError(run);
  const reason = aiErrorMessage(code, errorClass, language);
  return reason ? [reason] : messages;
}

function apiError(error, fallback) {
  const data = error?.response?.data;
  /*
   * EVERY line, not the first one. The refusal that names which documents could
   * not be read arrives as ONE key carrying a headline, a line per withheld
   * file, and the remedy. Showing only the first would drop exactly the part the
   * administrator has to act on — which file to ask the applicant for again.
   */
  const lines = Object.values(data?.errors || {})
    .flat()
    .filter((line) => typeof line === "string" && line.trim() !== "");
  if (lines.length) return lines.join("\n");

  return data?.message || fallback;
}

// `cancelled` is the server's terminal withdrawal state; the screen calls it
// "withdrawn" because nothing is deleted and the row stays on the record.
const isWithdrawn = (row) => row?.status === "cancelled";

function promptText(prompt, language) {
  if (!prompt || typeof prompt !== "object") return String(prompt || "");
  return (
    prompt.generated ||
    prompt[language] ||
    prompt.en ||
    Object.values(prompt).find((value) => typeof value === "string") ||
    ""
  );
}

export default function DynamicAssessmentPanel({
  assessmentId,
  language,
  evidence,
  evidenceDocumentsEnabled = true,
  // P5: the evaluation below seeds the course plan; the page decides where "open it" goes.
  onOpenCoursePlan,
  // Called after every act that succeeded (create, generate, approve, send, final
  // evaluation, ...): the case page re-reads the case, so its stepper, its Next
  // step (the case's work_queue) and the work counts follow the quiz.
  onChanged,
}) {
  const copy = copyByLanguage[language] || copyByLanguage.en;
  // The entry-quiz copy (owner, 12 Oct 2026, P4) is Arabic and English only and falls back to English.
  const quizCopy = entryQuizCopy(language);
  const isArabic = language === "ar";
  const [state, setState] = useState({
    loading: true,
    error: "",
    assessment: null,
    withdrawn: [],
  });
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState({ error: "", success: "" });
  const [editing, setEditing] = useState({ id: null, text: "" });
  const [manualText, setManualText] = useState("");
  const [reissueDraft, setReissueDraft] = useState({ open: false, reason: "", technicalFailure: "" });
  const [withdrawDraft, setWithdrawDraft] = useState({ open: false, reason: "" });
  const [rescoreDraft, setRescoreDraft] = useState({ open: false, reason: "" });

  const load = useCallback(async () => {
    try {
      const listResponse = await fetchDynamicAssessments({ rpl_assessment_id: assessmentId });
      /*
       * WHICH ROW IS "CURRENT".
       *
       * The controller index orders `latest('id')` and does NOT exclude
       * withdrawn rows, so the newest row is first and it may well be a
       * withdrawn one. Taking [0] blindly latched the panel onto a terminal
       * container: the Create control is hidden while an assessment is
       * selected, every edit path refuses a withdrawn set, and the case had no
       * way forward — which defeats the escape hatch withdrawal exists to be.
       *
       * `storeForAssessment` picks the newest NON-withdrawn container, so this
       * has to as well; otherwise the panel would show one row and Create would
       * silently act on another. Withdrawn rows become history below.
       */
      const rows = Array.isArray(listResponse?.data) ? listResponse.data : [];
      const current = rows.find((row) => !isWithdrawn(row));
      const withdrawn = rows.filter(isWithdrawn);
      if (!current) {
        setState({ loading: false, error: "", assessment: null, withdrawn });
        return;
      }
      const full = (await fetchDynamicAssessment(current.id))?.data || null;
      // Re-checked on the authoritative read: a set withdrawn by someone else
      // between the list and this fetch would otherwise strand the case in
      // exactly the way the selection above exists to prevent.
      if (isWithdrawn(full)) {
        setState({ loading: false, error: "", assessment: null, withdrawn: [full, ...withdrawn] });
        return;
      }
      setState({ loading: false, error: "", assessment: full, withdrawn });
    } catch (error) {
      setState({
        loading: false,
        error: apiError(error, "Load failed"),
        assessment: null,
        withdrawn: [],
      });
    }
  }, [assessmentId]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(name, action, successMessage = "") {
    setBusy(name);
    setNotice({ error: "", success: "" });
    try {
      await action();
      await load();
      if (successMessage) setNotice({ error: "", success: successMessage });
      onChanged?.({ action: name });
    } catch (error) {
      setNotice({ error: apiError(error, "Action failed"), success: "" });
    } finally {
      setBusy("");
    }
  }

  const assessment = state.assessment;
  const withdrawn = state.withdrawn || [];
  const generation = assessment?.generation || null;
  const generationRunning = GENERATION_IN_FLIGHT.includes(generation?.status);
  const generationWaiting = generation?.status === "waiting_retry";
  const generationEndedBadly = GENERATION_ENDED_BADLY.includes(generation?.status);
  // The draft's own controls: held while another action runs or a worker holds a
  // generation (queued or running). A waiting one does not hold them: continuing
  // by hand closes it (the server's rule), but a new generation is refused.
  const generationHeld = generation?.status === "queued" || generation?.status === "running";
  const draftLocked = busy !== "" || generationHeld;
  const generateLocked = draftLocked || generationWaiting;
  // The final evaluation runs on the queue from Release G (D13): its run, read the same way.
  const finalGeneration = aiGenerationOf(assessment, "final_evaluation");
  const finalRunning = GENERATION_IN_FLIGHT.includes(finalGeneration?.status);
  const finalEndedBadly = GENERATION_ENDED_BADLY.includes(finalGeneration?.status);
  const runCopy = aiCopy(language).run;
  const delays = [pollDelayOf(generation), pollDelayOf(finalGeneration)].filter((delay) => delay != null);
  const pollDelay = delays.length ? Math.min(...delays) : null;

  useEffect(() => {
    if (pollDelay == null) return undefined;
    const timer = window.setTimeout(() => {
      load();
    }, pollDelay);
    return () => window.clearTimeout(timer);
  }, [pollDelay, assessment, load]);
  const items = (assessment?.active_items || []).filter(
    (item) => item.status !== "superseded",
  );
  const approvedCount = items.filter((item) => item.status === "approved").length;
  const pendingCount = items.filter((item) => item.status === "pending_review" || item.status === "draft").length;
  const isIssued = ["issued", "answered", "assessed"].includes(assessment?.status);
  const finalAdvisory = assessment?.final_evaluation?.advisory;
  const progress = answerProgress(assessment);
  /*
   * The states the server will reopen from, mirrored so the control appears
   * exactly where the action exists. An `issued` set inside a running window is
   * still answerable and must not be disturbed, with one exception: an entry quiz
   * the applicant reports a technical failure on reopens for that documented
   * failure (owner D11; E2E-J05-1, 17 Oct 2026).
   *
   * `never opened` is the one that matters most in practice: `due_at` is written
   * when the applicant OPENS the assessment, not when it is sent, so a delivered
   * set nobody opened has no deadline and can never "expire". That is the common
   * shape of an applicant who goes quiet — and while it sits there, every AI
   * evaluation on the case is blocked.
   *
   * `due_at` is a server timestamp compared against the browser clock. A skewed
   * client can hide the control for a minute either side of the deadline; it
   * cannot invent an act, because the server re-evaluates every condition under
   * a row lock before it reopens anything.
   */
  const windowClosed =
    assessment?.status === "issued" &&
    Boolean(assessment.due_at) &&
    new Date(assessment.due_at).getTime() < Date.now();
  const neverOpened = assessment?.status === "issued" && !assessment.due_at;
  const answeredIncomplete =
    ["answered", "assessed"].includes(assessment?.status) && !progress.isComplete;
  /*
   * ONE ATTEMPT (owner, 12 Oct 2026, D11). A set the platform has marked never
   * reopens, so the control is not offered on it; and a set the applicant has
   * already opened reopens only for a documented technical failure, which the
   * server requires as `technical_failure_reason` and audits. The server
   * re-checks both under its lock and answers 422 otherwise.
   */
  /*
   * F4: NOTHING REOPENS ON A CLOSED CASE. The server refuses a reopen once the
   * case is completed, withdrawn or rejected; the show payload carries
   * application.status, so the control is not offered there and a note says why.
   */
  const caseClosed = isCaseClosed(assessment);
  // E2E-J05-1: an entry quiz whose window is still running reopens for a documented technical failure (D11).
  const runningTechnicalFailure = !windowClosed && canReopenRunningForTechnicalFailure(assessment);
  const canReissue = !caseClosed && (windowClosed || neverOpened || answeredIncomplete || runningTechnicalFailure) && !hasQuizResult(assessment);
  const reissueNeedsTechnicalFailure = reopenNeedsTechnicalFailure(assessment);
  const quizMarks = entryQuizItemMarks(assessment);
  // Timer expiry closes the quiz as heard (plan R8 exception; D11(i), on the plan
  // recommendation under the owner flow of 12 Oct 2026); the server's gates agree.
  const heardAtExpiry = isHeardAtExpiry(assessment);
  // Withdrawal applies only to a delivered set still awaiting answers. An
  // applicant who HAS answered has been heard, and withdrawing that would
  // discard the very thing the ordering rule protects.
  const awaitingAnswers = assessment?.status === "issued" && !progress.isComplete;
  // An entry quiz the applicant has opened is the one attempt (owner, 12 Oct
  // 2026, D11): the server refuses to withdraw it, so the control is not offered;
  // the timer or the last answer closes and marks it instead.
  const withdrawBlocked = awaitingAnswers && withdrawBlockedByAttempt(assessment);
  const canWithdraw = awaitingAnswers && !withdrawBlocked;
  // A quiz the platform referred is marked again once staff fix the cause (P4).
  const canRescore = canRescoreEntryQuiz(assessment);
  const reissueWhy = windowClosed
    ? copy.reissueWhyExpired
    : neverOpened
      ? copy.reissueWhyNeverOpened
      : runningTechnicalFailure
        ? copy.reissueWhyRunning
        : copy.reissueWhyIncomplete;

  if (state.loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-[var(--color-text-muted)]">…</CardContent>
      </Card>
    );
  }

  return (
    <Card dir={isArabic ? "rtl" : "ltr"}>
      <CardHeader className="border-b border-[var(--color-border)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-[var(--color-primary)]" />
            <CardTitle>{copy.title}</CardTitle>
          </div>
          {assessment ? (
            <div className="flex flex-wrap items-center gap-2">
              {items.length ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => run("exportPdf", () => exportDynamicAssessment(assessment.id, "pdf"))}
                    disabled={busy !== ""}
                  >
                    <Download size={15} />
                    PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => run("exportCsv", () => exportDynamicAssessment(assessment.id, "csv"))}
                    disabled={busy !== ""}
                  >
                    <Download size={15} />
                    CSV
                  </Button>
                </>
              ) : null}
              <Badge variant={isIssued ? "success" : "warning"}>
                {copy.statusLabels[assessment.status] || assessment.status}
              </Badge>
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        <AiServiceBanner families={["case_analysis"]} language={language} />
        <p className="text-sm leading-6 text-[var(--color-text-muted)]">{copy.intro}</p>
        {/* Which model drafted the questions (AI resilience, §7.3): until Release G it was in the audit only. */}
        {assessment?.ai_provenance && items.length ? <AiProvenanceNote provenance={assessment.ai_provenance} language={language} /> : null}
        {state.error ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {state.error}
          </div>
        ) : null}
        {notice.error || notice.success ? (
          <div
            role="alert"
            /* pre-line: a refusal listing one withheld document per line is
               unreadable as a single run-on paragraph. */
            className={`whitespace-pre-line rounded-xl border p-3 text-sm leading-6 ${notice.error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}
          >
            {notice.error || notice.success}
          </div>
        ) : null}

        {!assessment ? (
          <Button
            onClick={() => run("create", () => createDynamicAssessment(assessmentId))}
            disabled={busy !== ""}
          >
            <Plus size={17} />
            {copy.create}
          </Button>
        ) : (
          <>
            {/* Before the button, never after the attempt: the remedy for an
                unreadable file is to ask the applicant for another one. */}
            {!isIssued ? (
              <EvidenceReadinessNotice
                evidence={evidence}
                language={language}
                enabled={evidenceDocumentsEnabled}
              />
            ) : null}

            {!isIssued && generationWaiting ? (
              <>
                <AiRunNotice
                  run={generation}
                  language={language}
                  onRetryNow={retryTargetOf(generation) ? async () => {
                    await retryAiGenerationNow(generation);
                    await load();
                  } : null}
                />
                <p data-by-hand-stops="true" className="text-xs leading-5 text-amber-900">{runCopy.byHandStops}</p>
              </>
            ) : null}
            {!isIssued && generationRunning && !generationWaiting ? (
              <div
                role="status"
                className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm leading-6 text-sky-950"
              >
                <RefreshCw size={16} className="mt-1 shrink-0 animate-spin" />
                <span>{generation.status === "queued" ? copy.generationQueued : copy.generationRunning}</span>
              </div>
            ) : null}
            {!isIssued && generationEndedBadly ? (
              <div
                role="alert"
                className="whitespace-pre-line rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950"
              >
                {[copy.generationFailed, ...failureLines(generation, language)].join("\n")}
              </div>
            ) : null}

            {!isIssued ? (
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => run("generate", () => generateDynamicAssessmentDraft(assessment.id))}
                  disabled={generateLocked}
                >
                  <Sparkles size={17} />
                  {items.length ? copy.regenerateAll : copy.generate}
                </Button>
                {busy === "generate" ? (
                  <span className="text-sm text-[var(--color-text-muted)]">{copy.generating}</span>
                ) : null}
                {items.length ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => run("approveAll", () => approveAllDynamicAssessmentItems(assessment.id))}
                      disabled={draftLocked || pendingCount === 0}
                    >
                      <CheckCheck size={17} />
                      {copy.approveAll} ({pendingCount})
                    </Button>
                    <Button
                      onClick={() => run("send", () => sendDynamicAssessment(assessment.id))}
                      disabled={draftLocked || approvedCount < 25 || approvedCount > 50 || pendingCount > 0}
                    >
                      <Send size={17} />
                      {copy.send} ({approvedCount})
                    </Button>
                  </>
                ) : null}
              </div>
            ) : null}

            {assessment.recommended_question_count ? (
              <p className="text-sm">
                <strong>{copy.recommended}:</strong> {assessment.recommended_question_count} ·{" "}
                <span className="text-green-700">{approvedCount} {copy.approved}</span> ·{" "}
                <span className="text-amber-700">{pendingCount} {copy.pending}</span>
              </p>
            ) : null}
            {!isIssued && items.length > 0 && approvedCount < 25 ? (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{copy.tooFew}</p>
            ) : null}
            {!isIssued && approvedCount > 50 ? (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{copy.tooMany}</p>
            ) : null}

            {isIssued ? (
              <div className="flex flex-wrap gap-4 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
                <span className="flex items-center gap-1.5">
                  <Send size={15} /> {copy.issuedAt}: {formatLocalizedDateTime(assessment.issued_at, language)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={15} /> {copy.timeLimit}: {assessment.time_limit_minutes} {copy.minutes}
                </span>
                {assessment.opened_at ? (
                  <span>{copy.openedAt}: {formatLocalizedDateTime(assessment.opened_at, language)}</span>
                ) : null}
                {assessment.due_at ? (
                  <span>{copy.dueAt}: {formatLocalizedDateTime(assessment.due_at, language)}</span>
                ) : null}
                {assessment.answers_submitted_at ? (
                  <span>{copy.answeredAt}: {formatLocalizedDateTime(assessment.answers_submitted_at, language)}</span>
                ) : null}
              </div>
            ) : null}

            {/*
              WHY THE GATE HAS NOT OPENED, in numbers.
              The evaluation button below refuses on the same computation the
              server runs. Without these three counts the administrator sees a
              disabled button and no way to tell whether the applicant has
              answered nothing or everything but one.
            */}
            {isIssued ? (
              <section
                aria-label={copy.progressTitle}
                className="rounded-xl border border-[var(--color-border)] p-3 text-sm"
              >
                <strong className="block">{copy.progressTitle}</strong>
                <p className="mt-2">
                  <bdi>{progress.issued}</bdi> {copy.progressIssued} ·{" "}
                  <span className="text-green-700">
                    <bdi>{progress.answered}</bdi> {copy.progressAnswered}
                  </span>{" "}
                  ·{" "}
                  <span className={progress.outstanding ? "text-amber-700" : ""}>
                    <bdi>{progress.outstanding}</bdi> {copy.progressOutstanding}
                  </span>
                </p>
                <div
                  className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-surface-muted)]"
                  role="presentation"
                >
                  <div
                    className="h-full bg-green-600"
                    style={{
                      width: `${progress.issued ? Math.round((progress.answered / progress.issued) * 100) : 0}%`,
                    }}
                  />
                </div>
                <p className="mt-2 leading-6 text-[var(--color-text-muted)]">
                  {heardAtExpiry
                    ? quizCopy.heardAtExpiry
                    : progress.isComplete
                      ? progress.reasonCode === "answers_not_submitted"
                        ? copy.progressNotSubmitted
                        : copy.progressComplete
                      : copy.progressIncomplete}
                </p>
              </section>
            ) : null}

            {/* The platform's mark of an entry quiz (owner, 12 Oct 2026, P4); nothing for any other set. */}
            <EntryQuizResultCard
              assessment={assessment}
              items={items}
              language={language}
              onOpenCoursePlan={onOpenCoursePlan}
            />

            {canRescore ? (
              <section
                aria-label={quizCopy.rescoreTitle}
                className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
              >
                <strong className="block">{quizCopy.rescoreTitle}</strong>
                <p className="mt-1 leading-6">{quizCopy.rescoreWhy}</p>
                {rescoreDraft.open ? (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      rows={2}
                      maxLength={RESCORE_REASON_MAX}
                      label={quizCopy.rescoreReason}
                      placeholder={quizCopy.rescorePlaceholder}
                      hint={fill(quizCopy.rescoreHint, { min: RESCORE_REASON_MIN, max: RESCORE_REASON_MAX })}
                      value={rescoreDraft.reason}
                      onChange={(event) => setRescoreDraft({ open: true, reason: event.target.value })}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          run(
                            "rescore",
                            async () => {
                              await rescoreDynamicAssessment(assessment.id, { reason: rescoreDraft.reason.trim() });
                              setRescoreDraft({ open: false, reason: "" });
                            },
                            quizCopy.rescoreDone,
                          )
                        }
                        disabled={busy !== "" || !isRescoreReasonValid(rescoreDraft.reason)}
                      >
                        <RefreshCw size={15} />
                        {quizCopy.rescoreConfirm}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRescoreDraft({ open: false, reason: "" })}
                        disabled={busy !== ""}
                      >
                        {quizCopy.rescoreCancel}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    className="mt-3"
                    size="sm"
                    variant="outline"
                    onClick={() => setRescoreDraft({ open: true, reason: "" })}
                    disabled={busy !== ""}
                  >
                    <RefreshCw size={15} />
                    {quizCopy.rescore}
                  </Button>
                )}
              </section>
            ) : null}

            {canReissue ? (
              <section
                aria-label={copy.reissueTitle}
                className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
              >
                <strong className="block">{copy.reissueTitle}</strong>
                <p className="mt-1 leading-6">{reissueWhy}</p>
                <p className="mt-1 leading-6">{copy.reissueNote}</p>
                {reissueNeedsTechnicalFailure ? (
                  <p className="mt-1 font-semibold leading-6">{quizCopy.reopenOpenedRule}</p>
                ) : null}
                {reissueDraft.open ? (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      rows={2}
                      label={copy.reissueReason}
                      placeholder={copy.reissuePlaceholder}
                      value={reissueDraft.reason}
                      onChange={(event) =>
                        setReissueDraft((current) => ({ ...current, reason: event.target.value }))
                      }
                    />
                    {reissueNeedsTechnicalFailure ? (
                      <Textarea
                        rows={3}
                        maxLength={TECHNICAL_FAILURE_REASON_MAX}
                        label={quizCopy.technicalFailureReason}
                        placeholder={quizCopy.technicalFailurePlaceholder}
                        hint={fill(quizCopy.technicalFailureHint, {
                          min: TECHNICAL_FAILURE_REASON_MIN,
                          max: TECHNICAL_FAILURE_REASON_MAX,
                        })}
                        value={reissueDraft.technicalFailure}
                        onChange={(event) =>
                          setReissueDraft((current) => ({ ...current, technicalFailure: event.target.value }))
                        }
                      />
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          run(
                            "reissue",
                            async () => {
                              try {
                                await reissueDynamicAssessment(assessment.id, {
                                  reason: reissueDraft.reason.trim(),
                                  ...(reissueNeedsTechnicalFailure
                                    ? { technical_failure_reason: reissueDraft.technicalFailure.trim() }
                                    : {}),
                                });
                              } catch (error) {
                                // A refusal means the screen was out of date (the case may have closed): read the set again.
                                if (Number(error?.response?.status) === 422) load();
                                throw error;
                              }
                              setReissueDraft({ open: false, reason: "", technicalFailure: "" });
                            },
                            copy.reissueDone,
                          )
                        }
                        disabled={
                          busy !== "" ||
                          reissueDraft.reason.trim() === "" ||
                          (reissueNeedsTechnicalFailure &&
                            !isTechnicalFailureReasonValid(reissueDraft.technicalFailure))
                        }
                      >
                        <RotateCcw size={15} />
                        {copy.reissueConfirm}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReissueDraft({ open: false, reason: "", technicalFailure: "" })}
                        disabled={busy !== ""}
                      >
                        {copy.reissueCancel}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    className="mt-3"
                    size="sm"
                    variant="outline"
                    onClick={() => setReissueDraft({ open: true, reason: "", technicalFailure: "" })}
                    disabled={busy !== ""}
                  >
                    <RotateCcw size={15} />
                    {copy.reissue}
                  </Button>
                )}
              </section>
            ) : null}

            {caseClosed && assessment?.status === "issued" ? (
              <p
                role="note"
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm leading-6 text-[var(--color-text-muted)]"
              >
                {copy.reissueClosedCase}
              </p>
            ) : null}

            {withdrawBlocked ? (
              <p className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm leading-6 text-[var(--color-text-muted)]">
                {quizCopy.withdrawBlockedOpened}
              </p>
            ) : null}

            {canWithdraw ? (
              <section
                aria-label={copy.withdrawTitle}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-muted)]"
              >
                <strong className="block text-[var(--color-text)]">{copy.withdrawTitle}</strong>
                <p className="mt-1 leading-6">{copy.withdrawWhy}</p>
                <p className="mt-1 leading-6">{copy.withdrawNote}</p>
                {withdrawDraft.open ? (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      rows={2}
                      label={copy.withdrawReason}
                      placeholder={copy.withdrawPlaceholder}
                      value={withdrawDraft.reason}
                      onChange={(event) =>
                        setWithdrawDraft({ open: true, reason: event.target.value })
                      }
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() =>
                          run(
                            "withdraw",
                            async () => {
                              await cancelDynamicAssessment(assessment.id, {
                                reason: withdrawDraft.reason.trim(),
                              });
                              setWithdrawDraft({ open: false, reason: "" });
                            },
                            copy.withdrawDone,
                          )
                        }
                        disabled={busy !== "" || withdrawDraft.reason.trim() === ""}
                      >
                        <Ban size={15} />
                        {copy.withdrawConfirm}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setWithdrawDraft({ open: false, reason: "" })}
                        disabled={busy !== ""}
                      >
                        {copy.reissueCancel}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    className="mt-3"
                    size="sm"
                    variant="outline"
                    onClick={() => setWithdrawDraft({ open: true, reason: "" })}
                    disabled={busy !== ""}
                  >
                    <Ban size={15} />
                    {copy.withdraw}
                  </Button>
                )}
              </section>
            ) : null}

            {assessment.status === "answered" ? (
              <div className="space-y-2">
                {finalGeneration?.status === "waiting_retry" ? (
                  <AiRunNotice
                    run={finalGeneration}
                    language={language}
                    onRetryNow={retryTargetOf(finalGeneration) ? async () => {
                      await retryAiGenerationNow(finalGeneration);
                      await load();
                    } : null}
                  />
                ) : null}
                {finalRunning && finalGeneration?.status !== "waiting_retry" ? (
                  <p role="status" data-final-generation={finalGeneration.status} className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm leading-6 text-sky-950">
                    <RefreshCw size={16} className="mt-1 shrink-0 animate-spin" />
                    <span>{finalGeneration.status === "queued" ? runCopy.queued : runCopy.running}</span>
                  </p>
                ) : null}
                {finalEndedBadly ? <AiRunNotice run={finalGeneration} language={language} /> : null}
                <Button
                  onClick={() => run("final", () => finalEvaluateDynamicAssessment(assessment.id))}
                  /*
                   * The owner's ordering rule, enforced twice on purpose. The
                   * server refuses this call on a partially answered set; the
                   * button refuses to offer it, so nobody spends two minutes
                   * waiting for a governed refusal.
                   */
                  disabled={busy !== "" || finalRunning || !(progress.isComplete || heardAtExpiry)}
                >
                  <Sparkles size={17} />
                  {busy === "final" ? copy.generating : copy.finalEvaluate}
                </Button>
                {!progress.isComplete && !heardAtExpiry ? (
                  <p className="text-sm leading-6 text-amber-800">{copy.finalBlocked}</p>
                ) : null}
              </div>
            ) : null}

            {finalAdvisory ? (
              <div className="space-y-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950">
                <strong className="block">{copy.finalTitle}</strong>
                <AiProvenanceNote
                  provenance={assessment.final_evaluation?.ai_provenance}
                  legacy={{ model: assessment.final_evaluation?.model, requested_model: assessment.final_evaluation?.requested_model }}
                  language={language}
                />
                <p className="leading-6">{finalAdvisory.disclaimer}</p>
                {finalAdvisory.evaluation_summary ? (
                  <p className="leading-6">
                    <strong>{copy.summary}:</strong> {finalAdvisory.evaluation_summary}
                  </p>
                ) : null}
                {Array.isArray(finalAdvisory.competency_evaluations) && finalAdvisory.competency_evaluations.length ? (
                  <div>
                    <strong>{copy.competencyEvals}:</strong>
                    {finalAdvisory.competency_evaluations.map((row) => (
                      <p key={row.competency_code} className="mt-1.5 leading-6">
                        <bdi className="font-semibold">{row.competency_code}</bdi>
                        {row.suggested_outcome_code ? <> → <bdi>{row.suggested_outcome_code}</bdi></> : null}
                        {" · "}{copy.confidence}: {row.confidence}
                        {Array.isArray(row.rationale) && row.rationale.length ? <> — {row.rationale.join(" ")}</> : null}
                      </p>
                    ))}
                  </div>
                ) : null}
                {Array.isArray(finalAdvisory.gap_analysis_suggestions) && finalAdvisory.gap_analysis_suggestions.length ? (
                  <div>
                    <strong>{copy.gaps}:</strong>
                    {finalAdvisory.gap_analysis_suggestions.map((row, index) => (
                      <p key={index} className="mt-1.5 leading-6">
                        <bdi className="font-semibold">{row.competency_code}</bdi> — {row.gap}
                      </p>
                    ))}
                  </div>
                ) : null}
                {Array.isArray(finalAdvisory.contradictions) && finalAdvisory.contradictions.length ? (
                  <p><strong>{copy.contradictions}:</strong> {finalAdvisory.contradictions.join(" · ")}</p>
                ) : null}
                {Array.isArray(finalAdvisory.suggested_next_steps) && finalAdvisory.suggested_next_steps.length ? (
                  <p><strong>{copy.nextSteps}:</strong> {finalAdvisory.suggested_next_steps.join(" · ")}</p>
                ) : null}
                {onOpenCoursePlan ? (
                  <div>
                    <Button size="sm" variant="outline" onClick={onOpenCoursePlan}>
                      {coursePlanCopy(language).openPlan}
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {items.length === 0 && !isIssued ? (
              <p className="rounded-xl bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-muted)]">
                {copy.empty}
              </p>
            ) : null}

            <div className="space-y-3">
              {items.map((item, index) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-[var(--color-border)] p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-[var(--color-text-muted)]">#{index + 1}</span>
                    <Badge variant="outline">{copy.typeLabels[item.type] || item.type}</Badge>
                    <Badge
                      variant={
                        item.status === "approved"
                          ? "success"
                          : item.status === "rejected"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {copy.statusLabels[item.status] || item.status}
                    </Badge>
                    {item.is_ai_generated ? <Badge variant="outline">AI</Badge> : null}
                    <EntryQuizItemMark mark={quizMarks.get(String(item.id))} language={language} />
                  </div>
                  {/*
                   * A question made by another call than the set's draft (one
                   * regenerated later, perhaps by another model of the chain while
                   * the first was busy) names its own model, and a fallback is
                   * marked (fix review of 23 Oct 2026). The set's line above covers
                   * the questions its draft made.
                   */}
                  {hasOwnProvenance(item, assessment) ? (
                    <div data-item-provenance={item.id} className="mt-2">
                      <AiProvenanceNote provenance={item.ai_provenance} language={language} />
                    </div>
                  ) : null}

                  {editing.id === item.id ? (
                    <div className="mt-3 space-y-2">
                      <Textarea
                        rows={3}
                        value={editing.text}
                        onChange={(event) => setEditing({ id: item.id, text: event.target.value })}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            run("edit", async () => {
                              await updateDynamicAssessmentItem(item.id, { prompt: { generated: editing.text } });
                              setEditing({ id: null, text: "" });
                            })
                          }
                          disabled={draftLocked}
                        >
                          {copy.save}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditing({ id: null, text: "" })}>
                          {copy.cancel}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm leading-7">{promptText(item.prompt, language)}</p>
                  )}

                  {item.purpose ? (
                    <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                      {copy.purpose}: {item.purpose}
                    </p>
                  ) : null}

                  {isIssued ? (
                    <p className="mt-3 rounded-xl bg-[var(--color-surface-muted)] p-3 text-sm leading-6">
                      <strong>{copy.answer}:</strong>{" "}
                      {/* MCQ-ONLY STANDARD: a governed answer is the chosen option id;
                          only pre-standard items carry free text. */}
                      {item.response?.selected_option_id
                        ? `${item.response.selected_option_id}${
                            (item.options || []).find((o) => o.id === item.response.selected_option_id)
                              ? ` — ${(item.options || []).find((o) => o.id === item.response.selected_option_id).text}`
                              : ""
                          }`
                        : item.response?.answer
                          ? String(item.response.answer)
                          : copy.noAnswer}
                    </p>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.status !== "approved" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => run("approve", () => approveDynamicAssessmentItem(item.id))}
                          disabled={draftLocked || item.status === "rejected"}
                        >
                          <CheckCircle2 size={15} />
                          {copy.approve}
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing({ id: item.id, text: promptText(item.prompt, language) })}
                        disabled={draftLocked || item.status === "rejected"}
                      >
                        <Pencil size={15} />
                        {copy.edit}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => run("regenerate", () => regenerateDynamicAssessmentItem(item.id))}
                        disabled={generateLocked || item.status === "rejected" || !item.is_ai_generated}
                      >
                        <RefreshCw size={15} />
                        {copy.regenerate}
                      </Button>
                      {item.status !== "rejected" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => run("reject", () => rejectDynamicAssessmentItem(item.id))}
                          disabled={draftLocked}
                        >
                          <Trash2 size={15} />
                          {copy.reject}
                        </Button>
                      ) : null}
                    </div>
                  )}
                </article>
              ))}
            </div>

            {!isIssued && assessment ? (
              <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-dashed border-[var(--color-border)] p-3">
                <div className="min-w-64 flex-1">
                  <Textarea
                    rows={2}
                    label={copy.addManual}
                    placeholder={copy.addPlaceholder}
                    value={manualText}
                    onChange={(event) => setManualText(event.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    run("add", async () => {
                      await addDynamicAssessmentItem(assessment.id, {
                        type: "analytical",
                        prompt: { generated: manualText },
                      });
                      setManualText("");
                    })
                  }
                  disabled={busy !== "" || !manualText.trim()}
                >
                  <Plus size={15} />
                  {copy.add}
                </Button>
              </div>
            ) : null}
          </>
        )}

        {/*
          HISTORY, NOT CURRENT STATE. Rendered outside the branch above so it
          appears both when the withdrawn set is all there is — beside the
          Create control, which is the way out — and when a replacement set is
          already running. The withdrawal reason lives in the audit trail, not
          on the row, so the screen says where to find it rather than inventing
          a value it was never given.
        */}
        {withdrawn.length ? (
          <section
            aria-label={copy.withdrawnTitle}
            className="rounded-2xl border border-[var(--color-border)] p-4 text-sm text-[var(--color-text-muted)]"
          >
            <strong className="block text-[var(--color-text)]">{copy.withdrawnTitle}</strong>
            <p className="mt-1 leading-6">{copy.withdrawnIntro}</p>
            <ul className="mt-3 space-y-2">
              {withdrawn.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center gap-2 rounded-xl bg-[var(--color-surface-muted)] p-3 leading-6"
                >
                  <Badge variant="neutral">{copy.statusLabels.cancelled}</Badge>
                  <bdi>#{row.id}</bdi>
                  {row.issued_at ? (
                    <span>
                      · {copy.issuedAt}: {formatLocalizedDateTime(row.issued_at, language)}
                    </span>
                  ) : null}
                  {row.items_count != null ? (
                    <span>
                      · <bdi>{row.items_count}</bdi> {copy.withdrawnQuestions}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
            <p className="mt-2 leading-6">{copy.withdrawnReasonNote}</p>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}
