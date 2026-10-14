import { Input } from '../../../components/ui'
import { fill } from '../domain/documentScreening'
import { QUIZ_PASS_MARK_MAX, QUIZ_PASS_MARK_MIN, isQuizPassMarkValid, quizPassMarkCopy, quizPassMarkExample } from '../domain/entryQuiz'

/*
 * The entry-quiz pass mark on the RPL controls tab (owner, 12 Oct 2026, D12(a)).
 * Saved with the page's existing save; this block only shows and edits it.
 * `state` is { value, include, error } from readQuizPassMarkSetting: a mark the
 * server does not hold is left unwritten until somebody types one, and the
 * block says that every entry quiz is referred to staff meanwhile (R15).
 */
export default function QuizPassMarkSetting({ language, state, onChange }) {
  const copy = quizPassMarkCopy(language)
  const valid = isQuizPassMarkValid(state.value)
  const example = valid ? quizPassMarkExample(state.value) : null
  const missing = !state.include
  const error = state.error || (state.include && !valid ? copy.invalid : '') || (missing ? copy.missing : '')

  return (
    <section aria-labelledby="rpl-quiz-pass-mark-title" className="space-y-4 rounded-2xl border border-[var(--color-border)] p-5 text-sm">
      <div>
        <h3 id="rpl-quiz-pass-mark-title" className="font-bold">{copy.title}</h3>
        <p className="mt-1 leading-6 text-[var(--color-text-muted)]">{copy.hint}</p>
      </div>
      <div className="max-w-sm">
        <Input type="number" inputMode="numeric" min={QUIZ_PASS_MARK_MIN} max={QUIZ_PASS_MARK_MAX} step="1" label={copy.label} value={state.value} error={error || undefined} onChange={(event) => onChange(event.target.value)} />
      </div>
      <p className="font-semibold leading-6">{copy.rule}</p>
      {example ? <p className="leading-6 text-[var(--color-text-muted)]">{fill(copy.example, example)}</p> : null}
    </section>
  )
}
