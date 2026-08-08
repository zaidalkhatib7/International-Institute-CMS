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
  sendDynamicAssessment,
  updateDynamicAssessmentItem,
} from "../services/rplService";
import { formatLocalizedDateTime } from "../../../utils/localization";
import { answerProgress } from "../domain/answerCompleteness";
import EvidenceReadinessNotice from "./EvidenceReadinessNotice";

const copyByLanguage = {
  ar: {
    title: "التقييم الديناميكي (25–50 سؤالًا)",
    intro:
      "يولّد Gemini مسودة أسئلة فردية من ملفات المتقدم نفسها ومن فجوات الأدلة، ثم تراجعها وتعدّلها وتعتمدها قبل الإرسال. لا يُرسل أي سؤال تلقائيًا، ولا يجري أي تقييم قبل أن يجيب المتقدم عن كل الأسئلة.",
    create: "إنشاء التقييم الديناميكي",
    generate: "توليد الأسئلة عبر Gemini",
    regenerateAll: "إعادة توليد المسودة كاملة",
    generating: "جارٍ التوليد… قد يستغرق حتى دقيقتين",
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
    send: "إرسال إلى المتقدم",
    addManual: "إضافة سؤال يدوي",
    addPlaceholder: "نص السؤال اليدوي…",
    add: "إضافة",
    purpose: "الغرض",
    tooFew: "تحذير: أقل من 25 سؤالًا معتمدًا — لا يمكن الإرسال.",
    tooMany: "تحذير: أكثر من 50 سؤالًا معتمدًا — لا يمكن الإرسال.",
    issuedAt: "أُرسل في",
    timeLimit: "المدة",
    minutes: "دقيقة",
    openedAt: "فتحه المتقدم في",
    dueAt: "الموعد النهائي",
    answeredAt: "سلّم الإجابات في",
    answer: "إجابة المتقدم",
    noAnswer: "لم يُجب بعد",
    progressTitle: "الإجابات الواردة",
    progressIssued: "مُرسل",
    progressAnswered: "مُجاب",
    progressOutstanding: "بلا إجابة",
    progressComplete: "أُجيب عن كل سؤال مُرسل.",
    progressIncomplete:
      "لا يُقيّم Gemini إلا بعد الإجابة عن كل سؤال مُرسل. أعد فتح النافذة إذا احتاج المتقدم مزيدًا من الوقت.",
    progressNotSubmitted: "كل الأسئلة لها إجابات، لكن المتقدم لم يسلّمها بعد.",
    finalBlocked: "يبقى التقييم النهائي مغلقًا حتى يُجاب عن كل سؤال مُرسل.",
    reissue: "إعادة الفتح للمتقدم",
    reissueTitle: "إعادة فتح نافذة الإجابة",
    reissueWhyExpired: "أُغلقت نافذة الإجابة ولم يُكمل المتقدم.",
    reissueWhyNeverOpened:
      "أُرسل التقييم ولم يفتحه المتقدم مطلقًا، فلم تبدأ المدة الزمنية أصلًا.",
    reissueWhyIncomplete: "هذا التقييم مُعلَّم «تمت الإجابة» ولا تزال فيه أسئلة بلا إجابة.",
    reissueReason: "السبب — يُسجَّل في سجل التدقيق",
    reissuePlaceholder: "مثال: انقطع اتصال المتقدم أثناء النافذة.",
    reissueNote:
      "تُحفظ مجموعة الأسئلة وكل إجابة سبق تقديمها. يستأنف المتقدم من حيث توقف ويحصل على نافذة زمنية جديدة كاملة.",
    reissueConfirm: "إعادة الفتح",
    reissueCancel: "إلغاء",
    reissueDone: "أُعيد فتح التقييم مع الاحتفاظ بالإجابات السابقة.",
    withdraw: "سحب مجموعة الأسئلة",
    withdrawTitle: "سحب تقييم لن يُكمله المتقدم",
    withdrawWhy:
      "ما دامت هناك أسئلة مُرسلة بلا إجابة، يبقى تحليل Gemini مغلقًا على هذه الحالة. السحب هو المخرج حين لا ينوي المتقدم الإجابة.",
    withdrawNote:
      "لا يُحذف شيء: تبقى الأسئلة وأي إجابات جزئية في السجل. المجموعة المسحوبة لم تُجب، فهي لا تُحتسب دليلًا ولا فجوة، ولا تفتح تقييمًا لم يُسمع فيه المتقدم.",
    withdrawReason: "السبب — يُسجَّل في سجل التدقيق",
    withdrawPlaceholder: "مثال: انسحب المتقدم ولن يجيب.",
    withdrawConfirm: "سحب",
    withdrawDone: "سُحبت مجموعة الأسئلة؛ حُفظت الأسئلة وأي إجابات في السجل.",
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
      issued: "مُرسل للمتقدم",
      answered: "تمت الإجابة",
      assessed: "تم التقييم",
      rejected: "مرفوض",
      superseded: "مستبدل",
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
    title: "Dynamic assessment (25–50 questions)",
    intro:
      "Gemini drafts individualised questions from the applicant's own uploaded documents and the evidence gaps; you review, edit, and approve before sending. Nothing is sent automatically, and no evaluation runs until the applicant has answered every question.",
    create: "Create dynamic assessment",
    generate: "Generate questions with Gemini",
    regenerateAll: "Regenerate full draft",
    generating: "Generating… this can take up to two minutes",
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
    reissueReason: "Reason — recorded in the audit trail",
    reissuePlaceholder: "For example: the applicant lost connection during the window.",
    reissueNote:
      "The question set and every answer already given are kept. The applicant resumes where they stopped and gets a full new window.",
    reissueConfirm: "Reopen",
    reissueCancel: "Cancel",
    reissueDone: "The assessment was reopened; previous answers were kept.",
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
  nl: {
    title: "Dynamische beoordeling (25–50 vragen)",
    intro:
      "Gemini stelt geïndividualiseerde conceptvragen op uit de geüploade documenten van de aanvrager en de bewijshiaten; u beoordeelt, bewerkt en keurt goed vóór verzending. Er wordt niets automatisch verzonden en er volgt geen evaluatie voordat de aanvrager alle vragen heeft beantwoord.",
    create: "Dynamische beoordeling aanmaken",
    generate: "Vragen genereren met Gemini",
    regenerateAll: "Volledig concept opnieuw genereren",
    generating: "Genereren… dit kan tot twee minuten duren",
    recommended: "Door Gemini aanbevolen aantal",
    approved: "goedgekeurd",
    pending: "in afwachting",
    rejected: "afgewezen",
    empty: "Nog geen vragen. Genereer eerst het concept met Gemini.",
    edit: "Bewerken",
    save: "Opslaan",
    cancel: "Annuleren",
    approve: "Goedkeuren",
    reject: "Afwijzen",
    regenerate: "Opnieuw genereren",
    approveAll: "Alles goedkeuren",
    send: "Naar aanvrager sturen",
    addManual: "Handmatige vraag toevoegen",
    addPlaceholder: "Tekst van de handmatige vraag…",
    add: "Toevoegen",
    purpose: "Doel",
    tooFew: "Waarschuwing: minder dan 25 goedgekeurde vragen — verzenden geblokkeerd.",
    tooMany: "Waarschuwing: meer dan 50 goedgekeurde vragen — verzenden geblokkeerd.",
    issuedAt: "Verzonden op",
    timeLimit: "Tijdslimiet",
    minutes: "min",
    openedAt: "Geopend door aanvrager op",
    dueAt: "Deadline",
    answeredAt: "Antwoorden ingediend op",
    answer: "Antwoord van aanvrager",
    noAnswer: "Nog niet beantwoord",
    progressTitle: "Ontvangen antwoorden",
    progressIssued: "verzonden",
    progressAnswered: "beantwoord",
    progressOutstanding: "open",
    progressComplete: "Elke verzonden vraag is beantwoord.",
    progressIncomplete:
      "Gemini beoordeelt pas nadat elke verzonden vraag is beantwoord. Heropen het venster als de aanvrager meer tijd nodig heeft.",
    progressNotSubmitted:
      "Alle vragen hebben een antwoord, maar de aanvrager heeft ze nog niet ingediend.",
    finalBlocked:
      "De definitieve evaluatie blijft gesloten tot elke verzonden vraag is beantwoord.",
    reissue: "Heropenen voor de aanvrager",
    reissueTitle: "Antwoordvenster heropenen",
    reissueWhyExpired: "Het antwoordvenster is gesloten en de aanvrager was niet klaar.",
    reissueWhyNeverOpened:
      "De toets is verzonden en nooit geopend, dus de tijd is nooit gaan lopen.",
    reissueWhyIncomplete:
      "Deze toets staat op beantwoord terwijl er nog vragen open zijn.",
    reissueReason: "Reden — vastgelegd in het auditspoor",
    reissuePlaceholder:
      "Bijvoorbeeld: de aanvrager verloor de verbinding tijdens het venster.",
    reissueNote:
      "De vragenset en elk reeds gegeven antwoord blijven behouden. De aanvrager gaat verder waar hij stopte en krijgt een volledig nieuw venster.",
    reissueConfirm: "Heropenen",
    reissueCancel: "Annuleren",
    reissueDone: "De toets is heropend; eerdere antwoorden zijn behouden.",
    withdraw: "Vragenset intrekken",
    withdrawTitle: "Een toets intrekken die de aanvrager niet afmaakt",
    withdrawWhy:
      "Zolang verzonden vragen onbeantwoord blijven, blijft de Gemini-analyse gesloten voor deze zaak. Intrekken is de uitweg wanneer de aanvrager niet gaat antwoorden.",
    withdrawNote:
      "Er wordt niets verwijderd: de vragen en eventuele deelantwoorden blijven vastgelegd. Een ingetrokken set is nooit beantwoord en telt dus niet als bewijs en niet als hiaat, en kan geen evaluatie openen van een aanvrager die niet is gehoord.",
    withdrawReason: "Reden — vastgelegd in het auditspoor",
    withdrawPlaceholder: "Bijvoorbeeld: de aanvrager heeft zich teruggetrokken.",
    withdrawConfirm: "Intrekken",
    withdrawDone: "De vragenset is ingetrokken; de vragen en antwoorden zijn bewaard.",
    finalEvaluate: "Definitieve adviserende evaluatie (Gemini)",
    finalTitle: "Definitieve evaluatie — adviserend, in afwachting van beoordeling",
    summary: "Samenvatting",
    competencyEvals: "Voorgestelde competentie-evaluaties",
    gaps: "Voorgestelde hiaten",
    contradictions: "Tegenstrijdigheden",
    nextSteps: "Volgende stappen",
    confidence: "Vertrouwen",
    statusLabels: {
      draft: "Concept",
      pending_review: "In afwachting",
      approved: "Goedgekeurd",
      issued: "Verzonden",
      answered: "Beantwoord",
      assessed: "Beoordeeld",
      rejected: "Afgewezen",
      superseded: "Vervangen",
    },
    typeLabels: {
      knowledge: "Kennis",
      analytical: "Analytisch",
      scenario: "Scenario",
      case_study: "Casestudy",
      situational_judgement: "Situationeel oordeel",
      experience_anchored: "Ervaringsgebonden",
      evidence_clarification: "Bewijsverduidelijking",
      practical_task: "Praktische taak",
      structured_interview: "Gestructureerd interview",
      evidence_explanation: "Bewijstoelichting",
      other: "Overig",
    },
  },
};

/* eslint-disable-next-line react-refresh/only-export-components -- exported so the
   test can prove all three language blocks expose the same key set. Copy lookup is
   a WHOLE-OBJECT fallback (copyByLanguage[language] || copyByLanguage.en) with no
   per-key rescue, so a key present in en and missing in ar renders "undefined" in
   the language this CMS defaults to. */
export const COPY = copyByLanguage;

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
}) {
  const copy = copyByLanguage[language] || copyByLanguage.en;
  const isArabic = language === "ar";
  const [state, setState] = useState({ loading: true, error: "", assessment: null });
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState({ error: "", success: "" });
  const [editing, setEditing] = useState({ id: null, text: "" });
  const [manualText, setManualText] = useState("");
  const [reissueDraft, setReissueDraft] = useState({ open: false, reason: "" });
  const [withdrawDraft, setWithdrawDraft] = useState({ open: false, reason: "" });

  const load = useCallback(async () => {
    try {
      const listResponse = await fetchDynamicAssessments({ rpl_assessment_id: assessmentId });
      const existing = (listResponse?.data || [])[0];
      if (!existing) {
        setState({ loading: false, error: "", assessment: null });
        return;
      }
      const fullResponse = await fetchDynamicAssessment(existing.id);
      setState({ loading: false, error: "", assessment: fullResponse?.data || null });
    } catch (error) {
      setState({ loading: false, error: apiError(error, "Load failed"), assessment: null });
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
    } catch (error) {
      setNotice({ error: apiError(error, "Action failed"), success: "" });
    } finally {
      setBusy("");
    }
  }

  const assessment = state.assessment;
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
   * still answerable and must not be disturbed.
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
  const canReissue = windowClosed || neverOpened || answeredIncomplete;
  // Withdrawal applies only to a delivered set still awaiting answers. An
  // applicant who HAS answered has been heard, and withdrawing that would
  // discard the very thing the ordering rule protects.
  const canWithdraw = assessment?.status === "issued" && !progress.isComplete;
  const reissueWhy = windowClosed
    ? copy.reissueWhyExpired
    : neverOpened
      ? copy.reissueWhyNeverOpened
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
        <p className="text-sm leading-6 text-[var(--color-text-muted)]">{copy.intro}</p>
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

            {!isIssued ? (
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => run("generate", () => generateDynamicAssessmentDraft(assessment.id))}
                  disabled={busy !== ""}
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
                      disabled={busy !== "" || pendingCount === 0}
                    >
                      <CheckCheck size={17} />
                      {copy.approveAll} ({pendingCount})
                    </Button>
                    <Button
                      onClick={() => run("send", () => sendDynamicAssessment(assessment.id))}
                      disabled={busy !== "" || approvedCount < 25 || approvedCount > 50 || pendingCount > 0}
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
                  {progress.isComplete
                    ? progress.reasonCode === "answers_not_submitted"
                      ? copy.progressNotSubmitted
                      : copy.progressComplete
                    : copy.progressIncomplete}
                </p>
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
                {reissueDraft.open ? (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      rows={2}
                      label={copy.reissueReason}
                      placeholder={copy.reissuePlaceholder}
                      value={reissueDraft.reason}
                      onChange={(event) =>
                        setReissueDraft({ open: true, reason: event.target.value })
                      }
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          run(
                            "reissue",
                            async () => {
                              await reissueDynamicAssessment(assessment.id, {
                                reason: reissueDraft.reason.trim(),
                              });
                              setReissueDraft({ open: false, reason: "" });
                            },
                            copy.reissueDone,
                          )
                        }
                        disabled={busy !== "" || reissueDraft.reason.trim() === ""}
                      >
                        <RotateCcw size={15} />
                        {copy.reissueConfirm}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReissueDraft({ open: false, reason: "" })}
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
                    onClick={() => setReissueDraft({ open: true, reason: "" })}
                    disabled={busy !== ""}
                  >
                    <RotateCcw size={15} />
                    {copy.reissue}
                  </Button>
                )}
              </section>
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
                <Button
                  onClick={() => run("final", () => finalEvaluateDynamicAssessment(assessment.id))}
                  /*
                   * The owner's ordering rule, enforced twice on purpose. The
                   * server refuses this call on a partially answered set; the
                   * button refuses to offer it, so nobody spends two minutes
                   * waiting for a governed refusal.
                   */
                  disabled={busy !== "" || !progress.isComplete}
                >
                  <Sparkles size={17} />
                  {busy === "final" ? copy.generating : copy.finalEvaluate}
                </Button>
                {!progress.isComplete ? (
                  <p className="text-sm leading-6 text-amber-800">{copy.finalBlocked}</p>
                ) : null}
              </div>
            ) : null}

            {finalAdvisory ? (
              <div className="space-y-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950">
                <strong className="block">{copy.finalTitle}</strong>
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
                  </div>

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
                          disabled={busy !== ""}
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
                          disabled={busy !== "" || item.status === "rejected"}
                        >
                          <CheckCircle2 size={15} />
                          {copy.approve}
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing({ id: item.id, text: promptText(item.prompt, language) })}
                        disabled={busy !== "" || item.status === "rejected"}
                      >
                        <Pencil size={15} />
                        {copy.edit}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => run("regenerate", () => regenerateDynamicAssessmentItem(item.id))}
                        disabled={busy !== "" || item.status === "rejected" || !item.is_ai_generated}
                      >
                        <RefreshCw size={15} />
                        {copy.regenerate}
                      </Button>
                      {item.status !== "rejected" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => run("reject", () => rejectDynamicAssessmentItem(item.id))}
                          disabled={busy !== ""}
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
      </CardContent>
    </Card>
  );
}
