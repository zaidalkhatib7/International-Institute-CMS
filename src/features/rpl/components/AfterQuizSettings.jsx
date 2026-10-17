import { Input, MoneyInput } from '../../../components/ui'
import { formatMoneyInline, sypPreview, toMinor } from '../../../utils/money'
import { useExchangeRate } from '../../finance/hooks/useExchangeRate'
import { fill } from '../domain/documentScreening'
import { AFTER_QUIZ_SETTINGS, afterQuizCopy, isAfterQuizSettingValid } from '../domain/afterQuiz'

/*
 * THE FIVE SETTINGS AFTER THE ENTRY QUIZ on the RPL controls tab (owner model of
 * 15 Oct 2026, P6; 2.2). Saved with the page's existing save; this block only
 * shows and edits them. `state` comes from readAfterQuizSettings: a key is
 * written only once the server holds a value for it or someone types, nothing
 * is prefilled (only the pass mark is seeded, 50), and emptying a nullable key
 * clears it, which stops what it prices or governs.
 *
 * The two prices are US dollars with cents (owner, 17 Oct 2026): a money field,
 * and under it what the price comes to in Syrian pounds at today's rate, a
 * preview only (a client paying in pounds pays the rate in force when he pays).
 * The three others stay whole numbers.
 */
export default function AfterQuizSettings({ language, state, onChange }) {
  const copy = afterQuizCopy(language).settings
  const previewable = AFTER_QUIZ_SETTINGS.some((setting) => setting.kind === 'usd' && String(state?.values?.[setting.key] ?? '').trim() !== '' && isAfterQuizSettingValid(setting.key, state?.values?.[setting.key]))
  const exchange = useExchangeRate({ enabled: previewable })

  return (
    <section aria-labelledby="rpl-after-quiz-settings-title" className="space-y-4 rounded-2xl border border-[var(--color-border)] p-5 text-sm">
      <div>
        <h3 id="rpl-after-quiz-settings-title" className="font-bold">{copy.title}</h3>
        <p className="mt-1 leading-6 text-[var(--color-text-muted)]">{copy.hint}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {AFTER_QUIZ_SETTINGS.map((setting) => {
          const field = copy.fields[setting.id]
          const value = state?.values?.[setting.key] ?? ''
          const included = Boolean(state?.include?.[setting.key])
          const empty = String(value).trim() === ''
          const valid = isAfterQuizSettingValid(setting.key, value)
          let error = state?.errors?.[setting.key] || ''
          if (!error && included && !valid) {
            error = !setting.nullable && empty ? copy.passMarkRequired : setting.kind === 'usd' ? copy.usdInvalid : fill(copy.invalid, { min: setting.min, max: setting.max })
          }
          const hint = empty ? `${copy.notSet} ${field.hint}` : field.hint
          if (setting.kind === 'usd') {
            const preview = !empty && valid && exchange.rate ? sypPreview(toMinor(value, 'USD'), exchange.rate) : null
            return (
              <div key={setting.key} className="space-y-1">
                <MoneyInput
                  id={`rpl-after-quiz-${setting.id}`}
                  currency="USD"
                  language={language}
                  label={field.label}
                  hint={hint}
                  value={value}
                  error={error || undefined}
                  onChange={(next) => onChange(setting.key, next)}
                />
                {preview ? <p className="text-xs text-[var(--color-text-muted)]"><bdi>{fill(copy.atTodaysRate, { syp: formatMoneyInline(preview, language) })}</bdi></p> : null}
              </div>
            )
          }
          return (
            <Input
              key={setting.key}
              id={`rpl-after-quiz-${setting.id}`}
              type="number"
              inputMode="numeric"
              min={setting.min}
              max={setting.max}
              step="1"
              label={field.label}
              hint={hint}
              value={value}
              error={error || undefined}
              onChange={(event) => onChange(setting.key, event.target.value)}
            />
          )
        })}
      </div>
    </section>
  )
}
