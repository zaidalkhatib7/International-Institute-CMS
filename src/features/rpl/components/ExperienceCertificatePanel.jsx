import { useCallback, useEffect, useRef, useState } from 'react'
import { Award, BadgeCheck, LoaderCircle, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Select, Textarea } from '../../../components/ui'
import { readApiError, unwrapApiData } from '../../../services/apiResponse'
import { formatLocalizedDateTime } from '../../../utils/localization'
import { formatPrice } from '../../../utils/money'
import { fill } from '../domain/documentScreening'
import { formatQuizPercent } from '../domain/entryQuiz'
import {
  AFTER_QUIZ_LIMITS,
  REFUSAL_CATEGORIES,
  afterQuizCopy,
  chargePriceLine,
  chargeRouteLabel,
  chargeStatusLabel,
  experienceStateLabel,
  isAfterQuizReasonValid,
  isStaleConflict,
  personName,
  serverAllows,
  settingMissingName,
  shortHash,
} from '../domain/afterQuiz'
import { approveRplExperienceCertificate, fetchRplExperienceCertificate, refuseRplExperienceCertificate } from '../services/rplService'

/*
 * THE EXPERIENCE CONFIRMATION CERTIFICATE ON THE CASE (owner model of 15 Oct
 * 2026, P6; K11, K12).
 *
 * Only a client whose entry quiz passed may buy it; the client chooses to stop
 * (the case closes with it) or continue. After payment, ONE member of staff with
 * rpl.experience_certificates.approve approves the issue (the same person may
 * have confirmed the payment) or refuses it with a reason and a category, which
 * returns the payment. It is issued with the approved wording frozen at approval
 * and is never the level certificate. The panel loads itself; a 403 hides it.
 */

const STATE_VARIANT = { not_eligible: 'neutral', unavailable: 'warning', available: 'info', awaiting_payment: 'warning', awaiting_issue: 'info', issued: 'success' }
const STATUS_VARIANT = { requested: 'warning', approved: 'info', issued: 'success', refused: 'danger', cancelled: 'neutral' }

function Line({ children }) {
  return <p className="text-xs leading-5 text-[var(--color-text-muted)]">{children}</p>
}

function CertificateRow({ row, copy, language }) {
  const text = copy.experience
  const at = (value) => formatLocalizedDateTime(value, language)
  const quiz = row?.entry_quiz
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={STATUS_VARIANT[row.status] || 'neutral'}>{text.statuses[row.status] || row.status}</Badge>
        {row.client_choice ? <span className="text-sm font-semibold">{text.choice}: {text.choices[row.client_choice] || row.client_choice}</span> : null}
      </div>
      {row.choice_changed_at ? <Line>{fill(text.choiceChanged, { at: at(row.choice_changed_at) })}</Line> : null}
      {quiz ? <Line>{fill(text.entryQuiz, { percent: formatQuizPercent(quiz.percent) ?? '—', mark: quiz.pass_mark_applied ?? '—' })}</Line> : null}
      {row.charge ? <Line><bdi>{fill(text.charge, { amount: chargePriceLine(row.charge, language), route: chargeRouteLabel(row.charge, language), status: chargeStatusLabel(row.charge.status, language) })}</bdi></Line> : null}
      {row.approved_at ? <Line>{fill(text.approvedBy, { name: personName(row.approved_by, language), at: at(row.approved_at) })}</Line> : null}
      {row.wording ? <Line><span title={row.wording.sha256 || undefined}>{fill(text.frozenWording, { version: row.wording.version ?? '—', sha: shortHash(row.wording.sha256) })}</span></Line> : null}
      {row.refused_at ? <Line>{fill(text.refusedBy, { name: personName(row.refused_by, language), at: at(row.refused_at) })}{row.refusal_category ? ` · ${text.refusalCategories[row.refusal_category] || row.refusal_category}` : ''}</Line> : null}
      {row.refusal_reason ? <Line><span dir="auto">{fill(text.refusalReason, { reason: row.refusal_reason })}</span></Line> : null}
      {row.certificate ? <p className="text-sm font-semibold"><bdi>{fill(text.certificate, { number: row.certificate.number, at: at(row.certificate.issued_at) })}</bdi> <Link className="text-[var(--color-primary)] underline underline-offset-2" to="/certificates">{text.openCertificates}</Link></p> : null}
      {row.case_closed_at ? <Line>{fill(text.caseClosed, { at: at(row.case_closed_at) })}</Line> : null}
      {row.stop_not_applied_reason ? <Line>{text.stopNotApplied[row.stop_not_applied_reason] || row.stop_not_applied_reason}</Line> : null}
    </div>
  )
}

export default function ExperienceCertificatePanel({ applicationId, language, canApprove = false, refreshKey = 0, onChanged }) {
  const copy = afterQuizCopy(language)
  const text = copy.experience
  const [state, setState] = useState({ loading: true, error: '', forbidden: false, overview: null })
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState({ error: '', success: '' })
  const [refuseForm, setRefuseForm] = useState(null)
  const onChangedRef = useRef(onChanged)
  useEffect(() => {
    onChangedRef.current = onChanged
  }, [onChanged])

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!applicationId) return
    if (!silent) setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const overview = unwrapApiData(await fetchRplExperienceCertificate(applicationId))
      setState({ loading: false, error: '', forbidden: false, overview: overview && typeof overview === 'object' ? overview : null })
    } catch (error) {
      if (Number(error?.response?.status) === 403) setState({ loading: false, error: '', forbidden: true, overview: null })
      else setState((current) => ({ ...current, loading: false, error: readApiError(error, copy.common.loadError, language) }))
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

  async function act(key, request, successText, reset) {
    setBusy(key)
    setNotice({ error: '', success: '' })
    try {
      await request()
      reset?.()
      setNotice({ error: '', success: successText })
      load({ silent: true })
      onChangedRef.current?.()
    } catch (error) {
      const missing = settingMissingName(error)
      if (isStaleConflict(error, 'rpl_experience_certificate_stale')) {
        setNotice({ error: text.stale, success: '' })
        load({ silent: true })
      } else if (missing != null) {
        setNotice({ error: fill(copy.common.settingMissing, { setting: missing }), success: '' })
      } else {
        setNotice({ error: readApiError(error, copy.common.failed, language), success: '' })
      }
    } finally {
      setBusy('')
    }
  }

  const overview = state.overview
  const current = overview?.current || null
  const history = (Array.isArray(overview?.history) ? overview.history : []).filter((row) => row && row.public_id !== current?.public_id)
  const showApprove = canApprove && current?.status === 'requested' && serverAllows(current, 'approve', current?.charge?.status === 'paid')
  const showRefuse = canApprove && current?.status === 'requested' && serverAllows(current, 'refuse', true)

  function approve() {
    return act('approve', () => approveRplExperienceCertificate(current.public_id, { lock_version: current.lock_version }), text.approved)
  }

  function refuse() {
    return act('refuse', () => refuseRplExperienceCertificate(current.public_id, { lock_version: current.lock_version, reason: refuseForm.reason.trim(), category: refuseForm.category }), text.refused, () => setRefuseForm(null))
  }

  function reasonSentence() {
    if (!overview?.reason_code) return null
    const sentence = overview.state === 'not_eligible' ? text.notEligible[overview.reason_code] : text.unavailable[overview.reason_code]
    return <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-sm leading-6">{sentence || overview.reason_code}</p>
  }

  function renderRefuseForm() {
    const typed = String(refuseForm.reason ?? '').trim() !== ''
    return (
      <section aria-label={text.refuseTitle} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm">
        <strong className="block">{text.refuseTitle}</strong>
        <p className="leading-6 text-[var(--color-text-muted)]">{text.refuseHint}</p>
        <Select id="experience-refuse-category" label={text.category} value={refuseForm.category} onChange={(event) => setRefuseForm((form) => ({ ...form, category: event.target.value }))}>
          <option value="" disabled>—</option>
          {REFUSAL_CATEGORIES.map((category) => <option key={category} value={category}>{text.refusalCategories[category]}</option>)}
        </Select>
        <Textarea id="experience-refuse-reason" rows={3} label={copy.common.reason} hint={copy.common.reasonHint} value={refuseForm.reason} maxLength={AFTER_QUIZ_LIMITS.reasonMax} error={typed && !isAfterQuizReasonValid(refuseForm.reason) ? copy.common.reasonInvalid : undefined} disabled={busy === 'refuse'} onChange={(event) => setRefuseForm((form) => ({ ...form, reason: event.target.value }))} />
        <div className="flex flex-wrap justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => setRefuseForm(null)} disabled={busy === 'refuse'}>{copy.common.cancel}</Button>
          <Button size="sm" variant="danger" onClick={refuse} disabled={Boolean(busy) || !refuseForm.category || !isAfterQuizReasonValid(refuseForm.reason)}>{busy === 'refuse' ? <LoaderCircle className="animate-spin" size={15} /> : <XCircle size={15} />}{text.refuseSubmit}</Button>
        </div>
      </section>
    )
  }

  function renderBody() {
    if (state.loading) return <p role="status" className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]"><LoaderCircle className="animate-spin" size={16} />{copy.common.loading}</p>
    if (state.error && !overview) return <div className="space-y-2"><p className="whitespace-pre-line text-sm text-[var(--color-danger)]">{state.error}</p><Button size="sm" variant="outline" onClick={() => load()}>{copy.common.retry}</Button></div>
    if (!overview) return null
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={STATE_VARIANT[overview.state] || 'neutral'}>{experienceStateLabel(overview.state, language)}</Badge>
        </div>
        {reasonSentence()}
        {overview.eligible !== false ? (
          <div className="space-y-1">
            {/* The live price (contract S18): US dollars, and Syrian pounds at today's rate while a rate is set. */}
            <Line><bdi>{overview.live_price ? fill(text.livePrice, { price: formatPrice(overview.live_price, language) }) : text.priceNotSet}</bdi></Line>
            <Line>{overview.live_wording ? fill(text.liveWording, { version: overview.live_wording.version ?? '—' }) : text.noLiveWording}</Line>
          </div>
        ) : null}
        {current ? <CertificateRow row={current} copy={copy} language={language} /> : null}
        {current && current.status === 'requested' ? <p className="text-xs leading-5 text-[var(--color-text-muted)]">{text.approveHint}</p> : null}
        {(showApprove || (showRefuse && !refuseForm)) ? (
          <div className="flex flex-wrap justify-end gap-2">
            {showApprove ? <Button size="sm" onClick={approve} disabled={Boolean(busy)}>{busy === 'approve' ? <LoaderCircle className="animate-spin" size={15} /> : <BadgeCheck size={15} />}{text.approveSubmit}</Button> : null}
            {showRefuse && !refuseForm ? <Button size="sm" variant="outline" onClick={() => setRefuseForm({ reason: '', category: '' })} disabled={Boolean(busy)}><XCircle size={15} />{text.refuse}</Button> : null}
          </div>
        ) : null}
        {showRefuse && refuseForm ? renderRefuseForm() : null}
        {history.length ? (
          <details className="rounded-2xl border border-[var(--color-border)] p-4 text-sm">
            <summary className="cursor-pointer font-semibold">{text.history} ({history.length})</summary>
            <div className="mt-3 space-y-3">{history.map((row) => <div key={row.public_id} className="rounded-xl bg-[var(--color-surface-muted)] p-3"><CertificateRow row={row} copy={copy} language={language} /></div>)}</div>
          </details>
        ) : null}
      </div>
    )
  }

  if (state.forbidden) return null

  return (
    <Card>
      <CardHeader className="border-b border-[var(--color-border)]">
        <CardTitle className="flex items-center gap-2"><Award size={20} aria-hidden="true" />{text.title}</CardTitle>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{text.hint}</p>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {notice.error ? <p role="alert" className="whitespace-pre-line [unicode-bidi:plaintext] rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{notice.error}</p> : null}
        {notice.success ? <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{notice.success}</p> : null}
        {renderBody()}
      </CardContent>
    </Card>
  )
}
