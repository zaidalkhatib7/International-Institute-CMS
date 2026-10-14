import { Input } from '../../../components/ui'
import { fill } from '../domain/documentScreening'
import {
  COURSE_PLAN_MINIMUM_MAX,
  COURSE_PLAN_MINIMUM_MIN,
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
 */
export default function CoursePlanMinimumsSetting({ language, levels = [], state, onChange }) {
  const copy = coursePlanMinimumsCopy(language)
  const byCode = new Map((Array.isArray(levels) ? levels : []).map((level) => [level?.code, level]))
  const codes = Array.isArray(state?.codes) ? state.codes : []
  const missing = !state?.include

  return (
    <section aria-labelledby="rpl-course-plan-minimums-title" className="space-y-4 rounded-2xl border border-[var(--color-border)] p-5 text-sm">
      <div>
        <h3 id="rpl-course-plan-minimums-title" className="font-bold">{copy.title}</h3>
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
                id={`rpl-course-plan-minimum-${code}`}
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
