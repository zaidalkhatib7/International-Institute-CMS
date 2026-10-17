import { useCallback, useEffect, useRef, useState } from 'react'
import { Banknote, BadgeCheck, LoaderCircle, RotateCcw, TriangleAlert, XCircle } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, MoneyInput, Select, Textarea } from '../../../components/ui'
import { readApiError, unwrapCollection } from '../../../services/apiResponse'
import { formatLocalizedDateTime } from '../../../utils/localization'
import { formatRecordedDate } from '../../../utils/businessDate'
import { formatMoneyInline } from '../../../utils/money'
import { fill } from '../domain/documentScreening'
import {
  AFTER_QUIZ_LIMITS,
  OFFLINE_METHODS,
  afterQuizCopy,
  cancelCategoriesFor,
  chargePriceLine,
  chargeRouteLabel,
  chargeStatusLabel,
  chargeTitle,
  confirmFormErrors,
  confirmPayload,
  emptyConfirmForm,
  hasPaidChargeForSlot,
  isAfterQuizReasonValid,
  isConfirmFormValid,
  isConfirmableCharge,
  isStaleConflict,
  personName,
  rateMissing,
  rateUnchanged,
  serverAllows,
  settingMissingName,
  todayIso,
} from '../domain/afterQuiz'
import { cancelRplCharge, confirmRplChargePayment, fetchRplCharges, refundRplCharge } from '../services/rplService'

/*
 * THE CASE'S PAYMENTS AFTER THE ENTRY QUIZ (owner model of 15 Oct 2026, P6).
 *
 * The Experience Confirmation Certificate, a final-exam retake and the level
 * certification fee are each a charge with ONE price in US dollars (owner, 17
 * Oct 2026), paid from the client's dollar or pound balance or outside the
 * platform; a pound amount is frozen with the dollar price and the rate when he
 * pays from his balance or asks to pay outside. Staff with
 * rpl.payments.reconcile confirm an outside payment only for that exact amount
 * in that currency (M12), or cancel the request; finance.manage refunds a paid
 * charge the server says is refundable. The panel
 * loads itself, never inside the case load; a 403 on the read hides it. A stale
 * write (409 rpl_charge_stale) says so, keeps what was typed and reloads.
 */

const STATUS_VARIANT = { pending: 'warning', paid: 'success', cancelled: 'neutral', refunded: 'neutral' }

function Line({ children }) {
  return <p className="text-xs leading-5 text-[var(--color-text-muted)]">{children}</p>
}

function ReasonField({ id, label, hint, value, onChange, disabled, invalidText }) {
  const typed = String(value ?? '').trim() !== ''
  return <Textarea id={id} rows={3} label={label} hint={hint} value={value} maxLength={AFTER_QUIZ_LIMITS.reasonMax} error={typed && !isAfterQuizReasonValid(value) ? invalidText : undefined} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
}

export default function ChargesPanel({ applicationId, language, canReconcile = false, canRefund = false, refreshKey = 0, onChanged }) {
  const copy = afterQuizCopy(language)
  const text = copy.charges
  const [state, setState] = useState({ loading: true, error: '', forbidden: false, charges: [] })
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState({ error: '', success: '' })
  const [confirmForm, setConfirmForm] = useState(null)
  const [cancelForm, setCancelForm] = useState(null)
  const [refundForm, setRefundForm] = useState(null)
  const onChangedRef = useRef(onChanged)
  useEffect(() => {
    onChangedRef.current = onChanged
  }, [onChanged])

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!applicationId) return
    if (!silent) setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const charges = unwrapCollection(await fetchRplCharges(applicationId))
      setState({ loading: false, error: '', forbidden: false, charges })
    } catch (error) {
      if (Number(error?.response?.status) === 403) setState({ loading: false, error: '', forbidden: true, charges: [] })
      else setState((current) => ({ ...current, loading: false, error: readApiError(error, copy.common.loadError, language) }))
    }
  }, [applicationId, copy.common.loadError, language])

  useEffect(() => {
    const timer = window.setTimeout(() => load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  // Another panel acted on the case: read again without the loading state, so an open form keeps its place.
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
      reset()
      setNotice({ error: '', success: successText })
      load({ silent: true })
      onChangedRef.current?.()
    } catch (error) {
      const missing = settingMissingName(error)
      if (isStaleConflict(error, 'rpl_charge_stale')) {
        // Never the generic conflict line: say what happened, keep what was typed, reload.
        setNotice({ error: text.stale, success: '' })
        load({ silent: true })
      } else if (missing != null) {
        setNotice({ error: fill(copy.common.settingMissing, { setting: missing }), success: '' })
      } else if (rateMissing(error)) {
        setNotice({ error: copy.common.noRate, success: '' })
      } else if (rateUnchanged(error)) {
        // J07-G2: the rate did not change, so the request is not out of date. The reload drops the
        // option; the refused category is cleared too, so the submit button waits for another one
        // (review of the fixes, 17 Oct 2026). The reason staff typed is kept.
        setNotice({ error: text.rateUnchanged, success: '' })
        setCancelForm((current) => (current ? { ...current, category: '' } : current))
        load({ silent: true })
      } else {
        setNotice({ error: readApiError(error, copy.common.failed, language), success: '' })
      }
    } finally {
      setBusy('')
    }
  }

  function confirm(charge) {
    return act('confirm', () => confirmRplChargePayment(charge.public_id, confirmPayload(confirmForm, charge)), text.confirmed, () => setConfirmForm(null))
  }

  function cancel(charge) {
    return act('cancel', () => cancelRplCharge(charge.public_id, { lock_version: charge.lock_version, reason: cancelForm.reason.trim(), category: cancelForm.category }), text.cancelled, () => setCancelForm(null))
  }

  function refund(charge) {
    return act('refund', () => refundRplCharge(charge.public_id, { lock_version: charge.lock_version, reason: refundForm.reason.trim() }), text.refunded, () => setRefundForm(null))
  }

  function renderConfirmForm(charge) {
    const today = todayIso()
    const form = confirmForm
    const errors = confirmFormErrors(form, today, charge)
    const shown = (field) => String(form[field] ?? '').trim() !== '' && errors[field] !== ''
    const set = (field) => (event) => setConfirmForm((current) => ({ ...current, [field]: event.target.value }))
    const id = `charge-confirm-${charge.public_id}`
    // The currency is the charge's own, shown and never chosen; the amount received must be the amount due (S15, M12).
    const currency = charge.amount?.currency
    const amountError = { amount_received: currency === 'SYP' ? text.amountInvalidSyp : text.amountInvalidUsd, amount_mismatch: text.amountMustMatch }[errors.amount_received]
    return (
      <section aria-label={text.confirmTitle} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm">
        <strong className="block">{text.confirmTitle}</strong>
        <p className="leading-6 text-[var(--color-text-muted)]">{text.confirmHint}</p>
        {hasPaidChargeForSlot(state.charges, charge) ? <p role="note" className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 leading-6 text-amber-900"><TriangleAlert size={16} aria-hidden="true" />{text.slotTaken}</p> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Select id={`${id}-method`} label={text.method} value={form.method} onChange={set('method')}>
            {OFFLINE_METHODS.map((method) => <option key={method} value={method}>{copy.methods[method]}</option>)}
          </Select>
          <Input id={`${id}-reference`} label={text.reference} value={form.reference} maxLength={AFTER_QUIZ_LIMITS.referenceMax} error={shown('reference') ? text.referenceInvalid : undefined} onChange={set('reference')} />
          <Input id={`${id}-paid-at`} type="date" max={today} label={text.paidOn} value={form.paid_at} error={shown('paid_at') ? text.paidOnInvalid : undefined} onChange={set('paid_at')} />
          <MoneyInput id={`${id}-amount`} currency={currency} language={language} label={text.amountReceived} value={form.amount_received} error={shown('amount_received') ? amountError : undefined} onChange={(value) => setConfirmForm((current) => ({ ...current, amount_received: value }))} />
        </div>
        <p className="font-semibold"><bdi>{fill(text.amountDue, { amount: chargePriceLine(charge, language) })}</bdi></p>
        <p className="text-xs leading-5 text-[var(--color-text-muted)]">{text.evidenceHint}</p>
        <Textarea id={`${id}-notes`} rows={2} label={text.notes} value={form.notes} maxLength={AFTER_QUIZ_LIMITS.notesMax} error={errors.notes ? text.notesInvalid : undefined} onChange={set('notes')} />
        <div className="flex flex-wrap justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => setConfirmForm(null)} disabled={busy === 'confirm'}>{copy.common.cancel}</Button>
          <Button size="sm" onClick={() => confirm(charge)} disabled={Boolean(busy) || !isConfirmFormValid(form, today, charge)}>{busy === 'confirm' ? <LoaderCircle className="animate-spin" size={15} /> : <BadgeCheck size={15} />}{text.confirmSubmit}</Button>
        </div>
      </section>
    )
  }

  function renderCancelForm(charge) {
    const id = `charge-cancel-${charge.public_id}`
    return (
      <section aria-label={text.cancelTitle} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm">
        <strong className="block">{text.cancelTitle}</strong>
        <p className="leading-6 text-[var(--color-text-muted)]">{text.cancelHint}</p>
        <Select id={`${id}-category`} label={text.category} value={cancelForm.category} onChange={(event) => setCancelForm((current) => ({ ...current, category: event.target.value }))}>
          <option value="" disabled>—</option>
          {cancelCategoriesFor(charge).map((category) => <option key={category} value={category}>{copy.cancelCategories[category]}</option>)}
        </Select>
        <ReasonField id={`${id}-reason`} label={copy.common.reason} hint={copy.common.reasonHint} invalidText={copy.common.reasonInvalid} value={cancelForm.reason} disabled={busy === 'cancel'} onChange={(reason) => setCancelForm((current) => ({ ...current, reason }))} />
        <div className="flex flex-wrap justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => setCancelForm(null)} disabled={busy === 'cancel'}>{copy.common.cancel}</Button>
          <Button size="sm" variant="danger" onClick={() => cancel(charge)} disabled={Boolean(busy) || !cancelForm.category || !isAfterQuizReasonValid(cancelForm.reason)}>{busy === 'cancel' ? <LoaderCircle className="animate-spin" size={15} /> : <XCircle size={15} />}{text.cancelSubmit}</Button>
        </div>
      </section>
    )
  }

  function renderRefundForm(charge) {
    const id = `charge-refund-${charge.public_id}`
    return (
      <section aria-label={text.refundTitle} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm">
        <strong className="block">{text.refundTitle}</strong>
        <p className="leading-6 text-[var(--color-text-muted)]">{text.refundHint}</p>
        <ReasonField id={`${id}-reason`} label={copy.common.reason} hint={copy.common.reasonHint} invalidText={copy.common.reasonInvalid} value={refundForm.reason} disabled={busy === 'refund'} onChange={(reason) => setRefundForm((current) => ({ ...current, reason }))} />
        <div className="flex flex-wrap justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => setRefundForm(null)} disabled={busy === 'refund'}>{copy.common.cancel}</Button>
          <Button size="sm" variant="danger" onClick={() => refund(charge)} disabled={Boolean(busy) || !isAfterQuizReasonValid(refundForm.reason)}>{busy === 'refund' ? <LoaderCircle className="animate-spin" size={15} /> : <RotateCcw size={15} />}{text.refundSubmit}</Button>
        </div>
      </section>
    )
  }

  function renderCharge(charge) {
    const pending = charge.status === 'pending'
    const offlinePending = canReconcile && pending && charge.route === 'offline' && serverAllows(charge, 'confirm', true)
    // A pending request in points from before 17 Oct 2026 is never confirmed: staff cancel it and the client asks again.
    const showConfirm = offlinePending && isConfirmableCharge(charge)
    const showCancel = canReconcile && pending && serverAllows(charge, 'cancel', true)
    // Refund is the server's call (paid, unused, and a purpose refundable this way); the permission is ours.
    const showRefund = canRefund && charge.can?.refund === true
    const confirmOpen = confirmForm?.publicId === charge.public_id
    const cancelOpen = cancelForm?.publicId === charge.public_id
    const refundOpen = refundForm?.publicId === charge.public_id
    const at = (value) => formatLocalizedDateTime(value, language)

    return (
      <article key={charge.public_id} aria-label={chargeTitle(charge, language)} className="space-y-3 rounded-2xl border border-[var(--color-border)] p-4 text-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="font-bold">{chargeTitle(charge, language)}</h4>
            <p className="mt-1 font-semibold"><bdi>{chargePriceLine(charge, language)}</bdi> · {chargeRouteLabel(charge, language)}</p>
          </div>
          <Badge variant={STATUS_VARIANT[charge.status] || 'neutral'}>{chargeStatusLabel(charge.status, language)}</Badge>
        </div>
        <div className="space-y-1">
          {charge.invoice_number ? <Line>{fill(text.invoice, { number: charge.invoice_number })}</Line> : null}
          {charge.requested_at ? <Line>{fill(text.requestedAt, { at: at(charge.requested_at) })}</Line> : null}
          {charge.payer_reference ? <Line><bdi>{fill(text.payerReference, { reference: charge.payer_reference })}</bdi></Line> : null}
          {/* Paid outside: staff entered the DATE paid, on the institute's calendar, recorded as 00:00 UTC of it; it is shown as that date, never as a local time that can fall on the day before (UI-12, J07-G1). */}
          {charge.paid_at ? <Line>{fill(text.paidAt, { at: charge.route === 'offline' ? formatRecordedDate(charge.paid_at, language) : at(charge.paid_at) })}</Line> : null}
          {charge.confirmed_at ? <Line>{fill(text.confirmedBy, { name: personName(charge.confirmed_by, language), at: at(charge.confirmed_at) })}</Line> : null}
          {charge.offline_reference ? <Line><bdi>{fill(text.offlineEvidence, { amount: formatMoneyInline(charge.offline_received, language), method: copy.methods[charge.offline_method] || charge.offline_method || '—', reference: charge.offline_reference })}</bdi></Line> : null}
          {charge.staff_notes ? <Line><span dir="auto">{fill(text.staffNotes, { notes: charge.staff_notes })}</span></Line> : null}
          {charge.consumed_at ? <Line>{fill(text.consumed, { at: at(charge.consumed_at) })}</Line> : null}
          {charge.cancelled_at ? <Line>{fill(text.cancelledBy, { name: personName(charge.cancelled_by, language), at: at(charge.cancelled_at) })}{charge.cancel_category ? ` · ${copy.cancelCategories[charge.cancel_category] || charge.cancel_category}` : ''}</Line> : null}
          {charge.cancel_reason ? <Line><span dir="auto">{fill(text.cancelReason, { reason: charge.cancel_reason })}</span></Line> : null}
          {charge.refunded_at ? <Line>{fill(text.refundedBy, { name: personName(charge.refunded_by, language), at: at(charge.refunded_at) })}</Line> : null}
          {charge.refund_reason ? <Line><span dir="auto">{fill(text.refundReason, { reason: charge.refund_reason })}</span></Line> : null}
        </div>
        {charge.type === 'certification_fee' ? <p className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs leading-5 text-sky-900">{text.certificationFeeNote}</p> : null}
        {offlinePending && !showConfirm ? <p role="note" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs leading-5 text-amber-900">{text.notConfirmable}</p> : null}
        {(showConfirm && !confirmOpen) || (showCancel && !cancelOpen) || (showRefund && !refundOpen) ? (
          <div className="flex flex-wrap justify-end gap-2">
            {showConfirm && !confirmOpen ? <Button size="sm" onClick={() => setConfirmForm({ publicId: charge.public_id, ...emptyConfirmForm() })} disabled={Boolean(busy)}><BadgeCheck size={15} />{text.confirm}</Button> : null}
            {showCancel && !cancelOpen ? <Button size="sm" variant="outline" onClick={() => setCancelForm({ publicId: charge.public_id, reason: '', category: '' })} disabled={Boolean(busy)}><XCircle size={15} />{text.cancel}</Button> : null}
            {showRefund && !refundOpen ? <Button size="sm" variant="outline" onClick={() => setRefundForm({ publicId: charge.public_id, reason: '' })} disabled={Boolean(busy)}><RotateCcw size={15} />{text.refund}</Button> : null}
          </div>
        ) : null}
        {showConfirm && confirmOpen ? renderConfirmForm(charge) : null}
        {showCancel && cancelOpen ? renderCancelForm(charge) : null}
        {showRefund && refundOpen ? renderRefundForm(charge) : null}
      </article>
    )
  }

  if (state.forbidden) return null

  return (
    <Card>
      <CardHeader className="border-b border-[var(--color-border)]">
        <CardTitle className="flex items-center gap-2"><Banknote size={20} aria-hidden="true" />{text.title}</CardTitle>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{text.hint}</p>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {notice.error ? <p role="alert" className="whitespace-pre-line [unicode-bidi:plaintext] rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{notice.error}</p> : null}
        {notice.success ? <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{notice.success}</p> : null}
        {state.loading ? <p role="status" className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]"><LoaderCircle className="animate-spin" size={16} />{copy.common.loading}</p> : null}
        {!state.loading && state.error ? <div className="space-y-2"><p className="whitespace-pre-line text-sm text-[var(--color-danger)]">{state.error}</p><Button size="sm" variant="outline" onClick={() => load()}>{copy.common.retry}</Button></div> : null}
        {!state.loading && !state.error && !state.charges.length ? <p className="text-sm text-[var(--color-text-muted)]">{text.empty}</p> : null}
        {!state.loading && state.charges.length ? <div className="space-y-3">{state.charges.map(renderCharge)}</div> : null}
      </CardContent>
    </Card>
  )
}
