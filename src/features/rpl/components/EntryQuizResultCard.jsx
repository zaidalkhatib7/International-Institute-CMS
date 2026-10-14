import { Badge, Button } from "../../../components/ui";
import { formatLocalizedDateTime } from "../../../utils/localization";
import { coursePlanCopy } from "../domain/coursePlan";
import { fill, humanizeCode } from "../domain/documentScreening";
import {
  entryQuizCopy,
  entryQuizItemMark,
  formatQuizPercent,
  readEntryQuiz,
  referralReasonText,
} from "../domain/entryQuiz";

/*
 * THE ENTRY QUIZ RESULT (owner flow of 12 Oct 2026, P4).
 *
 * The platform's mark, frozen when the quiz closed: correct over scored, the
 * percentage (display only), the pass mark it was judged by and the strict
 * "more than" rule, the result, how the quiz closed, and each question's mark.
 * Staff-only: the applicant sees only passed / not passed and the percentage.
 *
 * `onOpenCoursePlan` (P5): a passed or failed result leads to the course plan
 * (D11: a failed client gets the gap-closing courses), so the card offers a way
 * there. A callback, not a link: the panel's tests render without a router.
 */

const RESULT_VARIANT = { passed: "success", failed: "danger", referred: "warning" };
const MARK_VARIANT = { correct: "success", incorrect: "danger", unanswered: "neutral", unmarkable: "warning" };

export function EntryQuizItemMark({ mark, language }) {
  const copy = entryQuizCopy(language);
  if (!mark) return null;

  return <Badge variant={MARK_VARIANT[mark] || "neutral"}>{copy.marks[mark] || mark}</Badge>;
}

export default function EntryQuizResultCard({ assessment, items = [], language, onOpenCoursePlan }) {
  const copy = entryQuizCopy(language);
  const quiz = readEntryQuiz(assessment);

  if (quiz.state === "none") return null;

  if (quiz.state !== "scored") {
    const text = { not_sent: copy.notSent, not_scored: copy.notScored, awaiting: copy.awaiting }[quiz.state];
    return (
      <p
        data-entry-quiz-state={quiz.state}
        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-sm leading-6 text-[var(--color-text-muted)]"
      >
        {text}
      </p>
    );
  }

  const result = quiz.result;
  const outcome = ["passed", "failed", "referred"].includes(result.result) ? result.result : null;
  const percent = formatQuizPercent(result.percent);
  const mark = result.pass_mark_applied;
  const reason = outcome === "referred" ? referralReasonText(result.referral_reason, copy) : "";
  const positions = new Map(items.map((item, index) => [String(item.id), index + 1]));
  const rows = Array.isArray(result.items) ? result.items.filter((row) => row?.item_ref != null) : [];

  return (
    <section
      aria-label={copy.title}
      className={`space-y-3 rounded-2xl border p-4 text-sm ${
        outcome === "passed"
          ? "border-green-200 bg-green-50 text-green-950"
          : outcome === "failed"
            ? "border-red-200 bg-red-50 text-red-950"
            : "border-amber-200 bg-amber-50 text-amber-950"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong>{copy.title}</strong>
        <Badge variant={RESULT_VARIANT[outcome] || "neutral"}>
          {outcome ? copy.resultLabels[outcome] : humanizeCode(result.result)}
        </Badge>
      </div>

      <p className="leading-6">
        {result.scored_item_count != null && result.correct_item_count != null ? (
          <span>
            {fill(copy.correctOfScored, {
              correct: result.correct_item_count,
              scored: result.scored_item_count,
            })}
          </span>
        ) : null}
        {percent != null ? (
          <>
            {" · "}
            <bdi className="font-semibold">{fill(copy.percent, { percent })}</bdi>
          </>
        ) : null}
      </p>

      {mark != null ? (
        <p className="leading-6">
          {result.pass_comparison === "greater_than" ? (
            <>
              {fill(copy.passMark, { mark })} <span>{fill(copy.passMarkStrict, { mark })}</span>
            </>
          ) : (
            fill(copy.passMarkOther, { mark, comparison: humanizeCode(result.pass_comparison) || "—" })
          )}
        </p>
      ) : null}

      {outcome ? <p className="leading-6">{copy.resultExplanation[outcome]}</p> : null}
      {reason ? <p className="leading-6">{fill(copy.referralReason, { reason })}</p> : null}

      {onOpenCoursePlan && (outcome === "passed" || outcome === "failed") ? (
        <div>
          <Button size="sm" variant="outline" onClick={onOpenCoursePlan}>
            {coursePlanCopy(language).openPlan}
          </Button>
        </div>
      ) : null}

      <p className="flex flex-wrap gap-x-4 gap-y-1 leading-6">
        {result.closed_by ? (
          <span>
            {copy.closedByLabel}: {copy.closedBy[result.closed_by] || humanizeCode(result.closed_by)}
          </span>
        ) : null}
        {result.scored_at ? (
          <span>
            {copy.scoredAt}: {formatLocalizedDateTime(result.scored_at, language)}
          </span>
        ) : null}
      </p>

      {rows.length ? (
        <div>
          <strong className="block">{copy.marksTitle}</strong>
          <ol aria-label={copy.marksTitle} className="mt-2 flex flex-wrap gap-2">
            {rows.map((row, index) => {
              const position = positions.get(String(row.item_ref)) ?? index + 1;
              return (
                <li
                  key={String(row.item_ref)}
                  className="flex items-center gap-1.5 rounded-xl bg-white/70 px-2 py-1"
                >
                  <bdi className="text-xs font-bold">#{position}</bdi>
                  <EntryQuizItemMark mark={entryQuizItemMark(row)} language={language} />
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}

      <p className="text-xs leading-5 opacity-80">{copy.gateNote}</p>
      <p className="text-xs leading-5 opacity-80">{copy.frozen}</p>
    </section>
  );
}
