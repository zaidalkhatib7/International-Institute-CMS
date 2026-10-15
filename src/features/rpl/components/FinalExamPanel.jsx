import { useCallback, useEffect, useRef, useState } from 'react'
import { Award, Ban, GraduationCap, LoaderCircle, RotateCcw, TriangleAlert } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Textarea } from '../../../components/ui'
import { readApiError, unwrapApiData } from '../../../services/apiResponse'
import { formatLocalizedDateTime } from '../../../utils/localization'
import { fill } from '../domain/documentScreening'
import { formatQuizPercent } from '../domain/entryQuiz'
import { coursePlanCopy, itemHolds } from '../domain/coursePlan'
import {
  AFTER_QUIZ_LIMITS,
  afterQuizCopy,
  chargeStatusLabel,
  finalExamStateLabel,
  formatChargeAmount,
  isAfterQuizReasonValid,
  isReopenableTry,
  isVoidableTry,
  levelCertificateStateLabel,
  programTitle,
  shortHash,
} from '../domain/afterQuiz'
import { fetchRplFinalExam, reopenRplFinalExamTry, voidRplFinalExamTry } from '../services/rplService'

/*
 * THE FINAL EXAM ON THE CASE (owner model of 15 Oct 2026, P6; K4-K9, K13, K19).
 *
 * After every course of the approved plan, ONE final exam: a balanced draw of
 * the same number of approved questions from each studied course, three tries a
 * round, then a wait and a paid retake for three more. The platform marks it in
 * PHP on the exact fraction, strictly above the mark frozen on the try. A pass
 * issues the level certificate automatically (no staff approval, assessor report,
 * quality review or committee); with a certification fee above 0 it is issued
 * once that fee is paid (owner, 15 Oct 2026). A governance hold parks the
 * certificate, never refuses it.
 *
 * Staff see what the client never does: the per-item correctness, the draw, the
 * fingerprints and the holds. Staff with rpl.applications.manage void a REFERRED
 * try (a platform fault, never counted against the client) or reopen an opened,
 * unmarked try after a documented technical failure, each with a reason.
 */

const STATE_VARIANT = { not_yet: 'neutral', available: 'info', in_progress: 'warning', waiting: 'warning', retake_due: 'warning', blocked: 'danger', passed: 'success', closed: 'neutral' }
const ROUND_VARIANT = { open: 'info', exhausted: 'warning', passed: 'success', closed: 'neutral' }
const RESULT_VARIANT = { passed: 'success', failed: 'danger', referred: 'warning' }
const LEVEL_VARIANT = { not_due: 'neutral', queued: 'info', fee_unusable: 'danger', held: 'warning', awaiting_fee: 'warning', issued: 'success' }

function Line({ children }) {
  return <p className="text-xs leading-5 text-[var(--color-text-muted)]">{children}</p>
}

function itemMark(item) {
  if (!item?.answered) return 'unanswered'
  return item.correct === true ? 'correct' : 'incorrect'
}

export default function FinalExamPanel({ applicationId, language, canManage = false, refreshKey = 0, onChanged, onForbidden }) {
  const copy = afterQuizCopy(language)
  const text = copy.finalExam
  const planText = coursePlanCopy(language)
  const [state, setState] = useState({ loading: true, error: '', exam: null })
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState({ error: '', success: '' })
  const [form, setForm] = useState(null)
  const callbacks = useRef({ onChanged, onForbidden })
  useEffect(() => {
    callbacks.current = { onChanged, onForbidden }
  }, [onChanged, onForbidden])

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!applicationId) return
    if (!silent) setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const exam = unwrapApiData(await fetchRplFinalExam(applicationId))
      setState({ loading: false, error: '', exam: exam && typeof exam === 'object' ? exam : null })
    } catch (error) {
      // The server is the authority on who may read it: a 403 removes the tab.
      if (Number(error?.response?.status) === 403) {
        setState({ loading: false, error: '', exam: null })
        callbacks.current.onForbidden?.()
        return
      }
      setState((current) => ({ ...current, loading: false, error: readApiError(error, copy.common.loadError, language) }))
    }
  }, [applicationId, copy.common.loadError, language])

  useEffect(() => {
    const timer = window.setTimeout(() => load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const firstKey = useRef(refreshKey)
  useEffect(() => {
    if (refreshKey === firstKey.current) return undefined
    const timer = window.setTimeout(() => load({ silent: true }), 0)
    return () => window.clearTimeout(timer)
  }, [refreshKey, load])

  async function submit() {
    if (!form) return
    const key = form.action
    setBusy(key)
    setNotice({ error: '', success: '' })
    try {
      const request = key === 'void' ? voidRplFinalExamTry : reopenRplFinalExamTry
      const data = unwrapApiData(await request(form.verificationId, { reason: form.reason.trim() }))
      setForm(null)
      setNotice({ error: '', success: key === 'void' ? text.voided : text.reopened })
      if (data && typeof data === 'object' && data.state) setState((current) => ({ ...current, exam: data }))
      load({ silent: true })
      callbacks.current.onChanged?.()
    } catch (error) {
      // A refusal (try_not_referred, try_not_reopenable) means the screen is out of date: say so and reload, keeping the reason.
      setNotice({ error: readApiError(error, copy.common.failed, language), success: '' })
      if (Number(error?.response?.status) === 422) load({ silent: true })
    } finally {
      setBusy('')
    }
  }

  const exam = state.exam
  const can = (flag) => canManage && exam?.can?.[flag] === true

  function blockedSentence() {
    if (!exam?.blocked_reason) return null
    const course = exam.blocked_program?.official_code || programTitle(exam.blocked_program, language)
    const sentence = text.blocked[exam.blocked_reason]
    return <p role="note" className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm leading-6 text-amber-900"><TriangleAlert size={16} className="mt-1 shrink-0" aria-hidden="true" /><span>{sentence ? fill(sentence, { course }) : exam.blocked_reason}</span></p>
  }

  function renderSettings() {
    const settings = exam?.settings || {}
    const value = (raw, format = (input) => input) => (raw == null || raw === '' ? copy.common.notSet : format(raw))
    return (
      <section aria-label={text.settings} className="space-y-1 rounded-xl bg-[var(--color-surface-muted)] p-3">
        <strong className="block text-sm">{text.settings}</strong>
        <Line>{fill(text.passMark, { value: value(settings.pass_mark_percent) })}</Line>
        <Line>{fill(text.questionsPerCourse, { value: value(settings.questions_per_course) })}</Line>
        <Line>{fill(text.waitDays, { value: value(settings.retake_wait_days) })}</Line>
        <Line>{fill(text.retakeFee, { value: value(settings.retake_fee_points, (points) => formatChargeAmount(points, 'POINTS', language)) })}</Line>
      </section>
    )
  }

  function renderCourses() {
    const courses = Array.isArray(exam?.courses) ? exam.courses : []
    if (!courses.length) return null
    const k = exam?.settings?.questions_per_course
    return (
      <section aria-label={text.courses} className="space-y-2">
        <strong className="block text-sm">{text.courses}</strong>
        <ul className="space-y-2">
          {courses.map((course) => {
            const holds = itemHolds(course)
            const short = k != null && course.eligible_question_count != null && Number(course.eligible_question_count) < Number(k)
            return (
              <li key={course.program?.id ?? course.enrollment_id} className="space-y-1 rounded-xl border border-[var(--color-border)] p-3 text-sm">
                <p dir="auto" className="font-semibold">{programTitle(course.program, language)}</p>
                <Line><bdi>{fill(text.course, { code: course.program?.official_code || '—', enrollment: course.enrollment_id ?? '—', version: course.enrolled_package_version || '—', at: course.completed_at ? formatLocalizedDateTime(course.completed_at, language) : '—' })}</bdi></Line>
                {course.eligible_question_count != null ? <p className={`text-xs leading-5 ${short ? 'font-semibold text-amber-900' : 'text-[var(--color-text-muted)]'}`}>{short ? fill(text.eligibleShort, { count: course.eligible_question_count, k }) : fill(text.eligible, { count: course.eligible_question_count })}</p> : null}
                {holds.length ? <p className="text-xs font-semibold leading-5 text-amber-900">{planText.itemOnHold} {fill(planText.holdBlocks, { blocks: holds.map((hold) => planText.holdLabels[hold] || hold).join(' · ') })}</p> : null}
              </li>
            )
          })}
        </ul>
      </section>
    )
  }

  function renderActionForm(attempt) {
    const isVoid = form.action === 'void'
    const typed = String(form.reason ?? '').trim() !== ''
    const title = isVoid ? text.void : text.reopen
    return (
      <section aria-label={title} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm">
        <strong className="block">{title}</strong>
        <p className="leading-6 text-[var(--color-text-muted)]">{isVoid ? text.voidHint : text.reopenHint}</p>
        <Textarea id={`final-exam-${form.action}-${attempt.verification_id}`} rows={3} label={copy.common.reason} hint={copy.common.reasonHint} value={form.reason} maxLength={AFTER_QUIZ_LIMITS.reasonMax} error={typed && !isAfterQuizReasonValid(form.reason) ? copy.common.reasonInvalid : undefined} disabled={Boolean(busy)} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} />
        <div className="flex flex-wrap justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => setForm(null)} disabled={Boolean(busy)}>{copy.common.cancel}</Button>
          <Button size="sm" variant={isVoid ? 'danger' : 'primary'} onClick={submit} disabled={Boolean(busy) || !isAfterQuizReasonValid(form.reason)}>{busy ? <LoaderCircle className="animate-spin" size={15} /> : isVoid ? <Ban size={15} /> : <RotateCcw size={15} />}{isVoid ? text.voidSubmit : text.reopenSubmit}</Button>
        </div>
      </section>
    )
  }

  function renderTry(attempt) {
    const at = (value) => formatLocalizedDateTime(value, language)
    const manifest = attempt?.manifest || null
    const items = Array.isArray(attempt?.items) ? attempt.items : []
    const showVoid = can('void') && isVoidableTry(attempt)
    const showReopen = can('reopen') && isReopenableTry(attempt)
    const formOpen = form?.verificationId === attempt.verification_id
    const label = fill(text.tryLabel, { number: attempt.try_number ?? '—' })
    return (
      <li key={attempt.verification_id} aria-label={label} className="space-y-2 rounded-xl border border-[var(--color-border)] p-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <strong>{label}</strong>
          {attempt.status ? <Badge variant={attempt.status === 'cancelled' ? 'neutral' : 'info'}>{text.tryStatuses[attempt.status] || attempt.status}</Badge> : null}
          {attempt.result ? <Badge variant={RESULT_VARIANT[attempt.result] || 'neutral'}>{text.results[attempt.result] || attempt.result}</Badge> : null}
        </div>
        {attempt.opened_at ? <Line>{fill(text.openedAt, { at: at(attempt.opened_at) })}</Line> : null}
        {attempt.due_at ? <Line>{fill(text.dueAt, { at: at(attempt.due_at) })}</Line> : null}
        {attempt.quiz_scored_at ? <Line>{fill(text.scoredAt, { at: at(attempt.quiz_scored_at) })}</Line> : null}
        {attempt.percent != null ? <p className="font-semibold">{fill(text.percent, { percent: formatQuizPercent(attempt.percent) ?? '—', mark: attempt.pass_mark_applied ?? '—' })}</p> : null}
        {attempt.closed_by === 'timer_expired' ? <Line>{text.closedByTimer}</Line> : null}
        {attempt.referral_reason ? <Line>{fill(text.referral, { reason: String(attempt.referral_reason).replaceAll('_', ' ') })}</Line> : null}
        {attempt.issued_snapshot_sha256 ? <Line><span title={attempt.issued_snapshot_sha256}>{fill(text.snapshot, { sha: shortHash(attempt.issued_snapshot_sha256) })}</span></Line> : null}
        {manifest ? (
          <details className="rounded-xl bg-[var(--color-surface-muted)] p-3">
            <summary className="cursor-pointer text-xs font-semibold">{text.manifest}</summary>
            <div className="mt-2 space-y-1">
              {manifest.seed != null ? <Line>{fill(text.seed, { seed: manifest.seed })}</Line> : null}
              {(Array.isArray(manifest.per_course) ? manifest.per_course : []).map((row) => {
                const excluded = Object.entries(row?.excluded || {}).filter(([, count]) => Number(count) > 0).map(([reason, count]) => `${reason.replaceAll('_', ' ')} ${count}`)
                return (
                  <div key={row.program_id}>
                    <Line>{fill(text.perCourse, { program: row.program_id, k: row.k ?? '—', eligible: row.eligible ?? '—' })}</Line>
                    {excluded.length ? <Line>{fill(text.excluded, { list: excluded.join(' · ') })}</Line> : null}
                  </div>
                )
              })}
            </div>
          </details>
        ) : null}
        {items.length ? (
          <details className="rounded-xl bg-[var(--color-surface-muted)] p-3">
            <summary className="cursor-pointer text-xs font-semibold">{text.items}</summary>
            <ol className="mt-2 grid gap-1 sm:grid-cols-2">
              {items.map((item) => {
                const mark = itemMark(item)
                return <li key={item.item_ref} className="flex items-center justify-between gap-2 text-xs"><span>{fill(text.item, { ref: item.item_ref, program: item.program_id ?? '—' })}</span><Badge variant={mark === 'correct' ? 'success' : mark === 'incorrect' ? 'danger' : 'neutral'}>{text.marks[mark]}</Badge></li>
              })}
            </ol>
          </details>
        ) : null}
        {(showVoid || showReopen) && !formOpen ? (
          <div className="flex flex-wrap justify-end gap-2">
            {showVoid ? <Button size="sm" variant="outline" onClick={() => setForm({ action: 'void', verificationId: attempt.verification_id, reason: '' })} disabled={Boolean(busy)}><Ban size={15} />{text.void}</Button> : null}
            {showReopen ? <Button size="sm" variant="outline" onClick={() => setForm({ action: 'reopen', verificationId: attempt.verification_id, reason: '' })} disabled={Boolean(busy)}><RotateCcw size={15} />{text.reopen}</Button> : null}
          </div>
        ) : null}
        {formOpen ? renderActionForm(attempt) : null}
      </li>
    )
  }

  function renderRounds() {
    const rounds = Array.isArray(exam?.rounds) ? exam.rounds : []
    return (
      <section aria-label={text.rounds} className="space-y-3">
        <strong className="block text-sm">{text.rounds}</strong>
        {!rounds.length ? <p className="text-sm text-[var(--color-text-muted)]">{text.noRounds}</p> : null}
        {rounds.map((round) => {
          const at = (value) => formatLocalizedDateTime(value, language)
          const tries = Array.isArray(round.tries) ? round.tries : []
          return (
            <article key={round.round_number} aria-label={fill(text.round, { number: round.round_number })} className="space-y-2 rounded-2xl border border-[var(--color-border)] p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-bold">{fill(text.round, { number: round.round_number })}</h4>
                {round.kind ? <Badge variant="neutral">{text.kinds[round.kind] || round.kind}</Badge> : null}
                {round.status ? <Badge variant={ROUND_VARIANT[round.status] || 'neutral'}>{text.roundStatuses[round.status] || round.status}</Badge> : null}
                {round.tries_allowed != null ? <span className="text-xs text-[var(--color-text-muted)]">{fill(text.triesAllowed, { count: round.tries_allowed })}</span> : null}
              </div>
              {round.exhausted_at ? <Line>{fill(text.exhaustedAt, { at: at(round.exhausted_at) })}</Line> : null}
              {round.retake_wait_days_applied != null ? <Line>{fill(text.waitApplied, { days: round.retake_wait_days_applied })}</Line> : null}
              {round.eligible_from ? <Line>{fill(text.eligibleFrom, { at: at(round.eligible_from) })}</Line> : null}
              {round.passed_at ? <Line>{fill(text.passedAt, { at: at(round.passed_at) })}</Line> : null}
              {round.charge ? <Line><bdi>{`${copy.chargeTypes.final_exam_retake}: ${formatChargeAmount(round.charge.amount, round.charge.currency, language)} · ${chargeStatusLabel(round.charge.status, language)}`}</bdi></Line> : null}
              {tries.length ? <ol className="space-y-2">{tries.map(renderTry)}</ol> : null}
            </article>
          )
        })}
      </section>
    )
  }

  function renderLevelCertificate() {
    const level = exam?.level_certificate
    if (!level || typeof level !== 'object') return null
    const holds = Array.isArray(level.holds) ? level.holds : []
    const at = (value) => formatLocalizedDateTime(value, language)
    return (
      <section aria-label={text.level.title} className="space-y-2 rounded-2xl border border-[var(--color-border)] p-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="flex items-center gap-2 font-bold"><Award size={16} aria-hidden="true" />{text.level.title}</h4>
          <Badge variant={LEVEL_VARIANT[level.state] || 'neutral'}>{levelCertificateStateLabel(level.state, language)}</Badge>
        </div>
        {level.state === 'held' ? <p className="leading-6 text-amber-900">{text.level.held}</p> : null}
        {holds.length ? <ul className="space-y-1">{holds.map((hold) => <li key={hold.hold_id}><Line><bdi>{fill(text.level.hold, { id: hold.hold_id, program: hold.program_code || '—', version: hold.package_version || '—' })}</bdi></Line></li>)}</ul> : null}
        {level.state === 'fee_unusable' ? <p className="leading-6 text-red-800">{text.level.feeUnusable}</p> : null}
        {level.state === 'awaiting_fee' ? <p className="leading-6 text-amber-900">{text.level.feeDue}</p> : null}
        {Number(level.certification_fee_points) > 0 ? <Line><bdi>{fill(text.level.feePoints, { amount: formatChargeAmount(level.certification_fee_points, 'POINTS', language) })}</bdi></Line> : null}
        {level.charge ? <Line><bdi>{fill(text.level.charge, { amount: formatChargeAmount(level.charge.amount, level.charge.currency, language), status: chargeStatusLabel(level.charge.status, language) })}</bdi></Line> : null}
        {level.outbox ? <Line>{fill(text.level.outbox, { status: level.outbox.status || '—', attempts: level.outbox.attempts ?? 0 })}</Line> : null}
        {level.outbox?.last_error ? <Line><span dir="auto">{fill(text.level.lastError, { error: level.outbox.last_error })}</span></Line> : null}
        {level.outbox?.available_at && level.state !== 'issued' ? <Line>{fill(text.level.availableAt, { at: at(level.outbox.available_at) })}</Line> : null}
        {level.certificate ? <p className="font-semibold"><bdi>{fill(text.level.certificate, { number: level.certificate.number, at: at(level.certificate.issued_at) })}</bdi></p> : null}
      </section>
    )
  }

  function renderBody() {
    if (state.loading) return <p role="status" className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]"><LoaderCircle className="animate-spin" size={16} />{copy.common.loading}</p>
    if (state.error && !exam) return <div className="space-y-2"><p className="whitespace-pre-line text-sm text-[var(--color-danger)]">{state.error}</p><Button size="sm" variant="outline" onClick={() => load()}>{copy.common.retry}</Button></div>
    if (!exam) return null
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={STATE_VARIANT[exam.state] || 'neutral'}>{finalExamStateLabel(exam.state, language)}</Badge>
          {exam.plan ? <span className="text-xs text-[var(--color-text-muted)]">{fill(text.plan, { version: exam.plan.version ?? '—', at: exam.plan.closed_at ? formatLocalizedDateTime(exam.plan.closed_at, language) : '—' })}</span> : null}
        </div>
        {blockedSentence()}
        {renderLevelCertificate()}
        {renderSettings()}
        {renderCourses()}
        {renderRounds()}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="border-b border-[var(--color-border)]">
        <CardTitle className="flex items-center gap-2"><GraduationCap size={20} aria-hidden="true" />{text.title}</CardTitle>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{text.autoIssue}</p>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {notice.error ? <p role="alert" className="whitespace-pre-line [unicode-bidi:plaintext] rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{notice.error}</p> : null}
        {notice.success ? <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{notice.success}</p> : null}
        {renderBody()}
      </CardContent>
    </Card>
  )
}
