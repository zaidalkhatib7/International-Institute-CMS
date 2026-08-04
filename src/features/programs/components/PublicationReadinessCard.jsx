import { CheckCircle2, ChevronLeft, ChevronRight, Circle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui";
import {
  CONTENT_STATUS_FIX_ROUTE,
  READINESS_FIX,
  readinessLabel,
} from "../domain/catalogReadiness";

/*
 * WHY THIS PROGRAMME WILL NOT PUBLISH — answered before you click, not after.
 *
 * A competency-gap programme activates only when all fifteen catalogue checks
 * pass AND content_status is 'published'. The server has always returned that
 * verdict on every fetch, as `catalog_readiness`. This editor never showed it,
 * so the only way to discover a gap was to click activate and read:
 *
 *   "Complete and publish the programme content before activation.
 *    (and 4 more errors)"
 *
 * — Laravel's top-level `message`, which is the first error plus a count. The
 * four it dropped were the ones naming what was missing.
 *
 * Two of the fixes are not on this editor at all: RPL pathway mapping and
 * content_status are editable only in the competency-gap library. Each row
 * therefore carries the way to reach its own fix, because "competency mapping:
 * missing" with no route is a riddle, not a checklist.
 */

const COPY = {
  ar: {
    title: "جاهزية النشر",
    ready: "مكتملة — يمكن تفعيل البرنامج",
    notReady: "لا يمكن التفعيل بعد",
    of: "من",
    statusLabel: "حالة المحتوى",
    statusBlocked: "يجب أن تكون «منشور» قبل التفعيل",
    fix: "إصلاح",
    hint: "التفعيل يتطلب اجتياز كل البنود وحالة محتوى «منشور». البنود الناقصة أولاً.",
    published: "منشور",
  },
  en: {
    title: "Publication readiness",
    ready: "Complete — the programme can be activated",
    notReady: "Cannot be activated yet",
    of: "of",
    statusLabel: "Content status",
    statusBlocked: 'must be "published" before activation',
    fix: "Fix",
    hint: 'Activation needs every check passed and a content status of "published". Missing items are listed first.',
    published: "published",
  },
  nl: {
    title: "Publicatiegereedheid",
    ready: "Compleet — het programma kan worden geactiveerd",
    notReady: "Kan nog niet worden geactiveerd",
    of: "van",
    statusLabel: "Contentstatus",
    statusBlocked: 'moet "published" zijn vóór activering',
    fix: "Herstellen",
    hint: 'Activering vereist dat alle checks slagen en de contentstatus "published" is. Ontbrekende items staan bovenaan.',
    published: "published",
  },
};

export default function PublicationReadinessCard({
  readiness,
  contentStatus,
  language,
  onGoToTab,
}) {
  const navigate = useNavigate();
  const copy = COPY[language] || COPY.en;

  // Nothing to show for a programme the gate does not apply to.
  if (!readiness?.checklist) return null;

  const rtl = language === "ar";
  const entries = Object.entries(readiness.checklist);
  // Missing first — the passing rows are reassurance, the failing ones are work.
  const ordered = [
    ...entries.filter(([, ok]) => !ok),
    ...entries.filter(([, ok]) => ok),
  ];
  const statusOk = contentStatus === "published";
  const percentage = readiness.percentage ?? 0;

  return (
    <Card>
      <CardHeader className="border-b border-[var(--color-border)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{copy.title}</CardTitle>
          <Badge
            variant={readiness.is_ready && statusOk ? "success" : "warning"}
          >
            {readiness.is_ready && statusOk ? copy.ready : copy.notReady}
          </Badge>
        </div>
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <b>{percentage}%</b>
            <span className="text-[var(--color-text-muted)]">
              {readiness.completed_count ?? 0} {copy.of}{" "}
              {readiness.total_count ?? entries.length}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
            <div
              className={`h-full rounded-full ${readiness.is_ready ? "bg-emerald-500" : "bg-amber-500"}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">{copy.hint}</p>
        </div>
      </CardHeader>

      <CardContent className="space-y-1 p-3">
        {/* content_status is a gate in its own right, separate from the fifteen
            checks, and it is not editable on this screen. */}
        {!statusOk ? (
          <Row
            ok={false}
            label={`${copy.statusLabel}: ${contentStatus || "—"} — ${copy.statusBlocked}`}
            actionLabel={copy.fix}
            rtl={rtl}
            onClick={() => navigate(CONTENT_STATUS_FIX_ROUTE)}
          />
        ) : null}

        {ordered.map(([key, ok]) => {
          const fix = READINESS_FIX[key];

          return (
            <Row
              key={key}
              ok={ok}
              label={readinessLabel(key, language)}
              actionLabel={copy.fix}
              rtl={rtl}
              onClick={
                ok || !fix
                  ? null
                  : fix.route
                    ? () => navigate(fix.route())
                    : () => onGoToTab?.(fix.tab)
              }
            />
          );
        })}
      </CardContent>
    </Card>
  );
}

function Row({ ok, label, actionLabel, onClick, rtl }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 ${
        ok ? "" : "bg-amber-50"
      }`}
    >
      <span className="flex min-w-0 items-center gap-2 text-sm">
        {ok ? (
          <CheckCircle2
            size={16}
            className="shrink-0 text-emerald-600"
            aria-hidden="true"
          />
        ) : (
          <Circle
            size={16}
            className="shrink-0 text-amber-600"
            aria-hidden="true"
          />
        )}
        <span className={ok ? "text-[var(--color-text-muted)]" : "font-medium"}>
          {label}
        </span>
      </span>
      {onClick ? (
        <Button size="sm" variant="ghost" onClick={onClick}>
          {actionLabel}
          {rtl ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
        </Button>
      ) : null}
    </div>
  );
}
