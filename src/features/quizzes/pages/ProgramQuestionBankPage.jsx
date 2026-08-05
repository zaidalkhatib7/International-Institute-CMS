import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Library, Loader2, Search, XCircle } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CoursePicker,
  Input,
  PageHeader,
  Select,
} from "../../../components/ui";
import {
  approveQuestion,
  fetchProgramQuestionBank,
  rejectQuestion,
} from "../services/quizzesService";
import { fetchAdminPrograms } from "../../programs/services/programsService";
import {
  unwrapApiData,
  unwrapCollection,
  readApiError,
  readLocalized,
} from "../../../services/apiResponse";
import { getCurrentLanguage } from "../../../utils/localization";

/*
 * ONE BANK PER COURSE.
 *
 * The old screen made you pick a unit and showed that unit's questions, so an
 * eight-unit course had eight banks and no way to see its questions as one set —
 * which is how anyone reviewing them actually thinks, and how the exam engine
 * already behaves (it selects across every quiz in the programme).
 *
 * So: pick a course, get all of its questions. The unit becomes a column and a
 * filter, never a container.
 *
 * The totals come from the server. A screen that counts "how many are approved"
 * for itself will eventually disagree with the publication gates, and that
 * disagreement is exactly the kind nobody notices until a package will not
 * publish and no one can say why.
 */

const COPY = {
  ar: {
    title: "بنك أسئلة البرنامج",
    subtitle:
      "كل أسئلة الدورة في بنك واحد — الوحدة عمود للتصفية، لا حاوية منفصلة.",
    program: "الدورة",
    choose: "— اختر دورة —",
    search: "ابحث في نص السؤال",
    unit: "الوحدة",
    allUnits: "كل الوحدات",
    status: "حالة المراجعة",
    allStatuses: "كل الحالات",
    total: "إجمالي الأسئلة",
    showing: "المعروض",
    empty: "لا توجد أسئلة في هذه الدورة بعد.",
    noMatch: "لا يوجد سؤال مطابق للتصفية.",
    loading: "جارٍ التحميل…",
    demand: "المستوى المعرفي",
    difficulty: "الصعوبة",
    outcome: "المخرج",
    correct: "الإجابة الصحيحة",
    pickFirst: "اختر دورة لعرض بنك أسئلتها.",
    review: "المراجعة",
    approve: "اعتماد",
    reject: "رفض",
    rejectReason: "سبب الرفض (اختياري، يُسجَّل):",
    reviewed: "روجعت",
    awaiting: "بانتظار المراجعة",
    onlyAwaiting: "اعرض ما ينتظر المراجعة فقط",
    taxonomyBlocked:
      "الاعتماد يتطلب تصنيفًا كاملًا: النوع والسياق والمستوى المعرفي والصعوبة.",
    rateLimited:
      "بلغتَ حد الكتابة (٣٠ في الدقيقة). انتظر قليلًا ثم تابع — لم يضع أي اعتماد.",
    allReviewed: "كل الأسئلة روجعت.",
  },
  en: {
    title: "Programme question bank",
    subtitle:
      "Every question in the course, in one bank — the unit is a column to filter by, not a separate container.",
    program: "Course",
    choose: "— choose a course —",
    search: "Search question text",
    unit: "Unit",
    allUnits: "All units",
    status: "Review status",
    allStatuses: "All statuses",
    total: "Questions in bank",
    showing: "Showing",
    empty: "This course has no questions yet.",
    noMatch: "No question matches the filter.",
    loading: "Loading…",
    demand: "Cognitive demand",
    difficulty: "Difficulty",
    outcome: "Outcome",
    correct: "Correct answer",
    pickFirst: "Choose a course to see its question bank.",
    review: "Review",
    approve: "Approve",
    reject: "Reject",
    rejectReason: "Reason for rejection (optional, recorded):",
    reviewed: "reviewed",
    awaiting: "awaiting review",
    onlyAwaiting: "Show only what awaits review",
    taxonomyBlocked:
      "Approval needs complete taxonomy: format, context, cognitive demand and difficulty.",
    rateLimited:
      "Write limit reached (30 per minute). Pause briefly and continue — no approval was lost.",
    allReviewed: "Every question has been reviewed.",
  },
  nl: {
    title: "Vragenbank van het programma",
    subtitle:
      "Alle vragen van de cursus in één bank — de eenheid is een filterkolom, geen aparte container.",
    program: "Cursus",
    choose: "— kies een cursus —",
    search: "Zoek in vraagtekst",
    unit: "Eenheid",
    allUnits: "Alle eenheden",
    status: "Reviewstatus",
    allStatuses: "Alle statussen",
    total: "Vragen in de bank",
    showing: "Getoond",
    empty: "Deze cursus heeft nog geen vragen.",
    noMatch: "Geen vraag voldoet aan het filter.",
    loading: "Laden…",
    demand: "Cognitief niveau",
    difficulty: "Moeilijkheid",
    outcome: "Uitkomst",
    correct: "Juiste antwoord",
    pickFirst: "Kies een cursus om de vragenbank te zien.",
    review: "Beoordeling",
    approve: "Goedkeuren",
    reject: "Afwijzen",
    rejectReason: "Reden voor afwijzing (optioneel, wordt vastgelegd):",
    reviewed: "beoordeeld",
    awaiting: "wacht op beoordeling",
    onlyAwaiting: "Toon alleen wat op beoordeling wacht",
    taxonomyBlocked:
      "Goedkeuring vereist volledige taxonomie: format, context, cognitief niveau en moeilijkheid.",
    rateLimited:
      "Schrijflimiet bereikt (30 per minuut). Pauzeer even en ga verder — er is niets verloren.",
    allReviewed: "Alle vragen zijn beoordeeld.",
  },
};

const STATUS_VARIANT = {
  approved: "success",
  rejected: "danger",
  pending_review: "warning",
  ai_draft: "neutral",
  superseded: "neutral",
};

export default function ProgramQuestionBankPage() {
  const language = getCurrentLanguage();
  const copy = COPY[language] || COPY.en;

  const [programs, setPrograms] = useState([]);
  const [programId, setProgramId] = useState("");
  const [bank, setBank] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewError, setReviewError] = useState("");

  useEffect(() => {
    fetchAdminPrograms({ per_page: 200 })
      .then((payload) => setPrograms(unwrapCollection(payload)))
      .catch((e) => setError(readApiError(e)));
  }, []);

  const load = useCallback(async (id) => {
    if (!id) {
      setBank(null);

      return;
    }
    setLoading(true);
    setError("");
    try {
      setBank(unwrapApiData(await fetchProgramQuestionBank(id)));
    } catch (loadError) {
      setError(readApiError(loadError));
      setBank(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(programId);
  }, [programId, load]);

  const questions = useMemo(() => bank?.questions || [], [bank]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return questions.filter((q) => {
      if (unitFilter && String(q.unit_id) !== String(unitFilter)) return false;
      if (statusFilter && q.review_status !== statusFilter) return false;
      if (
        needle &&
        !readLocalized(q.question_text, language).toLowerCase().includes(needle)
      )
        return false;

      return true;
    });
  }, [questions, search, unitFilter, statusFilter, language]);

  const statuses = useMemo(
    () => Object.keys(bank?.by_review_status || {}).filter(Boolean),
    [bank],
  );

  /*
   * REVIEW IS THE BOTTLENECK, SO IT HAPPENS HERE.
   *
   * Approving a question meant opening the per-unit quiz builder and finding it
   * there. At 100–300 questions per unit across a hundred programmes that is the
   * single most expensive interaction in the platform.
   *
   * There is deliberately NO bulk approve. Clearing three hundred AI drafts with
   * one click would make the human-review gate ceremonial, and every publication
   * downstream rests on it being real. The fix is to make ONE review fast, not to
   * make many reviews automatic.
   */
  const awaiting = useMemo(
    () =>
      questions.filter(
        (q) =>
          q.review_status === "ai_draft" ||
          q.review_status === "pending_review",
      ),
    [questions],
  );
  const reviewedCount = questions.length - awaiting.length;

  const TAXONOMY = ["format", "context", "cognitive_demand", "difficulty"];
  /** The server refuses approval without these; say so before the click, not after. */
  const missingTaxonomy = (q) => TAXONOMY.filter((f) => !q[f]);

  const runReview = async (question, action) => {
    setReviewingId(question.id);
    setReviewError("");
    try {
      await action();
      await load(programId);
    } catch (actionError) {
      // 30 writes a minute is the admin-write ceiling. Reviewing at speed will
      // meet it, and "something went wrong" would read as data loss when it is
      // simply a pause.
      setReviewError(
        actionError?.response?.status === 429
          ? copy.rateLimited
          : readApiError(actionError),
      );
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={copy.title} description={copy.subtitle} />

      <Card>
        <CardContent className="space-y-4 p-6">
          <CoursePicker
            programs={programs}
            value={programId}
            onChange={setProgramId}
          />

          {/* Filters only matter once a course is chosen — showing them before
              that is three disabled boxes pretending to be a workspace. */}
          {bank ? (
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                label={copy.search}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" aria-hidden="true" />}
              />

              <Select
                label={copy.unit}
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
              >
                <option value="">{copy.allUnits}</option>
                {(bank.units || []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {readLocalized(u.title, language)} (
                    {bank.by_unit?.[u.id] ?? 0})
                  </option>
                ))}
              </Select>

              <Select
                label={copy.status}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">{copy.allStatuses}</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s} ({bank.by_review_status?.[s] ?? 0})
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          {error ? (
            <p className="whitespace-pre-line text-sm text-red-600">{error}</p>
          ) : null}
          {reviewError ? (
            <p className="whitespace-pre-line rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {reviewError}
            </p>
          ) : null}

          {bank ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="neutral">
                <Library className="h-4 w-4" aria-hidden="true" /> {copy.total}:{" "}
                {bank.total}
              </Badge>
              <Badge variant="neutral">
                {copy.showing}: {visible.length}
              </Badge>
              {/* Review progress, and a one-click way into the queue. Landing on
                  "all 300 questions" when 12 need attention buries the work. */}
              {awaiting.length > 0 ? (
                <>
                  <Badge variant="warning">
                    {reviewedCount}/{questions.length} {copy.reviewed} ·{" "}
                    {awaiting.length} {copy.awaiting}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setStatusFilter("ai_draft")}
                  >
                    {copy.onlyAwaiting}
                  </Button>
                </>
              ) : (
                <Badge variant="success">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />{" "}
                  {copy.allReviewed}
                </Badge>
              )}
              {Object.entries(bank.by_review_status || {}).map(([s, n]) => (
                <Badge key={s} variant={STATUS_VARIANT[s] || "neutral"}>
                  {s}: {n}
                </Badge>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="flex items-center gap-2 p-6 text-sm text-[var(--color-text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{" "}
            {copy.loading}
          </CardContent>
        </Card>
      ) : null}

      {!loading && !programId ? (
        <Card>
          <CardContent className="p-6 text-sm text-[var(--color-text-muted)]">
            {copy.pickFirst}
          </CardContent>
        </Card>
      ) : null}

      {!loading && bank && questions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-[var(--color-text-muted)]">
            {copy.empty}
          </CardContent>
        </Card>
      ) : null}

      {!loading && bank && questions.length > 0 && visible.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-[var(--color-text-muted)]">
            {copy.noMatch}
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-3">
        {visible.map((q, index) => (
          <Card key={q.id}>
            <CardContent className="space-y-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="max-w-3xl text-sm font-medium text-[var(--color-text)]">
                  {index + 1}. {readLocalized(q.question_text, language)}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={STATUS_VARIANT[q.review_status] || "neutral"}>
                    {q.review_status || "—"}
                  </Badge>
                  {/* The unit as a label on the row — the whole point of this screen. */}
                  <Badge variant="neutral">
                    {readLocalized(q.unit_title, language) || "—"}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-[var(--color-text-muted)]">
                <span>
                  {copy.difficulty}: {q.difficulty || "—"}
                </span>
                <span>
                  {copy.demand}: {q.cognitive_demand || "—"}
                </span>
                {q.learning_outcome_code ? (
                  <span>
                    {copy.outcome}: {q.learning_outcome_code}
                  </span>
                ) : null}
              </div>

              {q.review_status === "ai_draft" ||
              q.review_status === "pending_review" ? (
                <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-3">
                  <Button
                    size="sm"
                    disabled={
                      reviewingId === q.id || missingTaxonomy(q).length > 0
                    }
                    onClick={() => runReview(q, () => approveQuestion(q.id))}
                  >
                    {reviewingId === q.id ? (
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    )}
                    {copy.approve}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={reviewingId === q.id}
                    onClick={() => {
                      // Reason is optional server-side but always offered: a
                      // rejection with no stated basis is unreadable later.
                      const reason = window.prompt(copy.rejectReason);
                      if (reason === null) return;
                      runReview(q, () => rejectQuestion(q.id, reason));
                    }}
                  >
                    <XCircle className="h-4 w-4" aria-hidden="true" />{" "}
                    {copy.reject}
                  </Button>

                  {missingTaxonomy(q).length > 0 ? (
                    <span className="text-xs text-amber-700">
                      {copy.taxonomyBlocked} ({missingTaxonomy(q).join(", ")})
                    </span>
                  ) : null}
                </div>
              ) : null}

              {(q.options || []).length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {q.options.map((o) => (
                    <li
                      key={o.id}
                      className={
                        o.is_correct
                          ? "font-medium text-emerald-700"
                          : "text-[var(--color-text-muted)]"
                      }
                    >
                      {o.is_correct ? "✓ " : "• "}
                      {readLocalized(o.text, language)}
                    </li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
