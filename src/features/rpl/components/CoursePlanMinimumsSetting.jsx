import { Input } from '../../../components/ui'
import { fill } from '../domain/documentScreening'
import {
  COURSE_PLAN_MINIMUM_MAX,
  COURSE_PLAN_MINIMUM_MIN,
  coursePlanFailedMinimumsCopy,
  coursePlanMinimumsCopy,
  isCoursePlanMinimumValid,
  minimumLevelLabel,
} from '../domain/coursePlan'

/*
 * The per-level course minimums on the RPL controls tab (owner flow of 12 Oct
 * 2026, step 5; D13(b)). Saved with the page's existing save; this block only
 * shows and edits them. `state` comes from readCoursePlanMinimumsSetting: the
 * map is written only once the server holds it or someone types, and then with
 * every level. The owner's 5 / 7 / 10 are a hint, never prefilled. There is no
 * switch for the below-minimum reason: it is always required (D13(b)).
 *
 * variant="failed" is the second row: rpl_course_plan_minimums_failed, the
 * minimum after a FAILED entry quiz (owner, 15 Oct 2026, "hybrid": the gap-closing
 * courses first, then top-ups to this number; 0 means gaps only). Same rules,
 * its own region, labels and ids, so nothing on the page repeats.
 */
export default function CoursePlanMinimumsSetting({ language, levels = [], state, onChange, variant = 'passed' }) {
  const failed = variant === 'failed'
  const copy = failed ? coursePlanFailedMinimumsCopy(language) : coursePlanMinimumsCopy(language)
  const idPrefix = failed ? 'rpl-course-plan-minimum-failed' : 'rpl-course-plan-minimum'
  const titleId = failed ? 'rpl-course-plan-minimums-failed-title' : 'rpl-course-plan-minimums-title'
  const byCode = new Map((Array.isArray(levels) ? levels : []).map((level) => [level?.code, level]))
  const codes = Array.isArray(state?.codes) ? state.codes : []
  const missing = !state?.include

  return (
    <section aria-labelledby={titleId} className="space-y-4 rounded-2xl border border-[var(--color-border)] p-5 text-sm">
      <div>
        <h3 id={titleId} className="font-bold">{copy.title}</h3>
        <p className="mt-1 leading-6 text-[var(--color-text-muted)]">{copy.hint}</p>
      </div>
      {codes.length ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {codes.map((code) => {
            const value = state.values?.[code] ?? ''
            const serverLine = state.errors?.levels?.[code] || ''
            const error = serverLine || (state.include && !isCoursePlanMinimumValid(value) ? copy.invalid : '')
            return (
              <Input
                key={code}
                id={`${idPrefix}-${code}`}
                type="number"
                inputMode="numeric"
                min={COURSE_PLAN_MINIMUM_MIN}
                max={COURSE_PLAN_MINIMUM_MAX}
                step="1"
                label={fill(copy.label, { level: minimumLevelLabel(byCode.get(code) || code, language) })}
                value={value}
                error={error || undefined}
                onChange={(event) => onChange(code, event.target.value)}
              />
            )
          })}
        </div>
      ) : <p className="leading-6 text-amber-800">{copy.noLevels}</p>}
      {missing && codes.length ? <p className="leading-6 text-[var(--color-danger)]">{copy.missing}</p> : null}
      {state?.errors?.general ? <p className="whitespace-pre-line leading-6 text-[var(--color-danger)]">{state.errors.general}</p> : null}
      <p className="leading-6 text-[var(--color-text-muted)]">{copy.ownerValues}</p>
      <p className="font-semibold leading-6">{copy.reasonRule}</p>
    </section>
  )
}
