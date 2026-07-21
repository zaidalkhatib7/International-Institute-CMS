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
  createDynamicAssessment,
  exportDynamicAssessment,
  fetchDynamicAssessment,
  fetchDynamicAssessments,
  finalEvaluateDynamicAssessment,
  generateDynamicAssessmentDraft,
  regenerateDynamicAssessmentItem,
  rejectDynamicAssessmentItem,
  sendDynamicAssessment,
  updateDynamicAssessmentItem,
} from "../services/rplService";
import { formatLocalizedDateTime } from "../../../utils/localization";

const copyByLanguage = {
  ar: {
    title: "التقييم الديناميكي (25–50 سؤالًا)",
    intro:
      "يولّد Gemini مسودة أسئلة فردية من ملف المتقدم وفجوات الأدلة، ثم تراجعها وتعدّلها وتعتمدها قبل الإرسال. لا يُرسل أي سؤال تلقائيًا.",
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
      "Gemini drafts individualized questions from the applicant profile and evidence gaps; you review, edit, and approve before sending. Nothing is sent automatically.",
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
      "Gemini stelt geïndividualiseerde conceptvragen op; u beoordeelt, bewerkt en keurt goed vóór verzending. Er wordt niets automatisch verzonden.",
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

function apiError(error, fallback) {
  const data = error?.response?.data;
  if (data?.errors) {
    const first = Object.values(data.errors).flat()[0];
    if (first) return String(first);
  }
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

export default function DynamicAssessmentPanel({ assessmentId, language }) {
  const copy = copyByLanguage[language] || copyByLanguage.en;
  const isArabic = language === "ar";
  const [state, setState] = useState({ loading: true, error: "", assessment: null });
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState({ error: "", success: "" });
  const [editing, setEditing] = useState({ id: null, text: "" });
  const [manualText, setManualText] = useState("");

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
            className={`rounded-xl border p-3 text-sm ${notice.error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}
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
                {assessment.answers_submitted_at ? (
                  <span>{copy.answeredAt}: {formatLocalizedDateTime(assessment.answers_submitted_at, language)}</span>
                ) : null}
              </div>
            ) : null}

            {assessment.status === "answered" ? (
              <Button
                onClick={() => run("final", () => finalEvaluateDynamicAssessment(assessment.id))}
                disabled={busy !== ""}
              >
                <Sparkles size={17} />
                {busy === "final" ? copy.generating : copy.finalEvaluate}
              </Button>
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
                      {item.response?.answer ? String(item.response.answer) : copy.noAnswer}
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
