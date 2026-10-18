import { useState } from 'react'
import { BadgeCheck, Banknote, Loader2 } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, MoneyInput, Select, Textarea } from '../../../components/ui'
import { reconcileRplPayment } from '../services/rplService'
import { readApiError } from '../../../services/apiResponse'
import { businessTodayIso, formatRecordedDate } from '../../../utils/businessDate'
import { amountMinorOf, exchangeRateText, formatMoney, formatMoneyInline, isMoney, moneyFromDecimal, readsLeftToRight, toMinor } from '../../../utils/money'
import { rateMissing } from '../domain/afterQuiz'

/*
 * RECORDING THAT THE CERTIFICATE FEE WAS PAID.
 *
 * `POST /applications/{id}/payment-reconciliation` existed with no caller
 * anywhere in the platform. It is the ONLY code path that sets
 * `payment_status = 'paid'`, and RplWorkflowService refuses credential issuance
 * until it is. There is no checkout, no order flow and no gateway webhook.
 *
 * With the seeded fee at 0 the gate never fires, so nothing is broken today.
 * But the Fees tab lets an administrator type a number, and from that moment
 * every approved applicant stops at DecisionIssued with no operator control
 * anywhere in the product to release them. Under the free-assessment /
 * paid-certificate model this is the revenue path.
 *
 * The endpoint is idempotent, row-locked and audited, and it detects a
 * reference already used on another order. So this panel stays thin: collect
 * the fields, show the refusal verbatim when it comes, and never try to decide
 * anything itself.
 *
 * Owner model of 15 Oct 2026 (P6): this is the COMMITTEE PATH's certification
 * fee only, so it is titled that way and never mistaken for the payments after
 * the entry quiz (the Experience Confirmation Certificate, a final-exam retake
 * and the level certification fee on the final-exam path), which are charges in
 * their own panel.
 *
 * Owner decisions of 17 Oct 2026 (contract S17): the fee is in US dollars. Staff
 * record the currency the client paid in, and the amount, which must be exactly
 * what the server says is due: the dollar amount, or the pounds at the rate in
 * force now (committee_fee_due, read with the case). A mismatch is refused (422
 * amount_mismatch) and the due amount is read again; with no rate set, pounds
 * cannot be recorded (503 exchange_rate_missing).
 */

const COPY = {
  ar: {
    title: 'رسوم الشهادة (مسار اللجنة السابق)',
    subtitle: 'سجّل الدفعة المستلمة خارج المنصة. إصدار الشهادة يبقى موقوفًا حتى تُسجَّل. لمسار اللجنة فقط: مدفوعات ما بعد اختبار الدخول، ومنها رسوم شهادة المستوى في مسار الاختبار النهائي، تُؤكَّد في لوحة المدفوعات.',
    paid: 'مدفوعة',
    pending: 'بانتظار الدفع',
    noFee: 'لا توجد رسوم مستحقة على هذه الحالة.',
    provider: 'وسيلة الدفع',
    bank_transfer: 'حوالة بنكية',
    cash: 'نقدًا',
    syriatel_cash: 'سيريتل كاش',
    mtn_cash: 'MTN كاش',
    external_gateway: 'بوابة دفع خارجية',
    manual_reconciliation: 'تسوية يدوية',
    reference: 'المرجع',
    referencePlaceholder: 'رقم الحوالة أو الإيصال (3 أحرف على الأقل)',
    paidAt: 'تاريخ الدفع',
    notes: 'ملاحظات',
    record: 'سجّل الدفعة',
    recording: 'جارٍ التسجيل…',
    recorded: 'تم تسجيل الدفعة.',
    amount: 'المبلغ',
    idempotent: 'التسجيل غير قابل للتكرار: المرجع نفسه لا يُحتسب مرتين، ومرجع مستخدَم في طلب آخر يُرفض.',
    paidIn: 'العملة المدفوعة',
    usd: 'بالدولار الأمريكي',
    syp: 'بالليرة السورية',
    due: 'المبلغ المستحق: {amount}',
    dueSyp: 'المبلغ المستحق: {amount} ({usd} بسعر {rate}، مقرّبًا إلى أقرب ليرة)',
    amountPaid: 'المبلغ المدفوع',
    amountInvalidUsd: 'أدخل مبلغًا بالدولار الأمريكي بخانتين عشريتين على الأكثر، مثل 49.99.',
    amountInvalidSyp: 'أدخل عددًا صحيحًا من الليرات السورية، مثل 125000.',
    amountMustMatch: 'يجب أن يساوي المبلغ المدفوع المبلغ المستحق بهذه العملة.',
    mismatchReloaded: 'لا يطابق المبلغ المستحق الآن، فأُعيد تحميله. راجع المبلغ ثم أعد المحاولة.',
    noRate: 'لم يُضبط سعر صرف: لا يمكن تسجيل دفعة بالليرة السورية حتى يُضبط. ولا يتأثر الدفع بالدولار.',
  },
  en: {
    title: 'Certificate fee (pre-flow committee path)',
    subtitle: 'Record a payment received outside the platform. Credential issuance stays blocked until it is recorded. Committee path only: the payments after the entry quiz, the level certification fee of the final-exam path included, are confirmed in the payments panel.',
    paid: 'Paid',
    pending: 'Awaiting payment',
    noFee: 'This case has no payable fee.',
    provider: 'Method',
    bank_transfer: 'Bank transfer',
    cash: 'Cash',
    syriatel_cash: 'Syriatel Cash',
    mtn_cash: 'MTN Cash',
    external_gateway: 'External gateway',
    manual_reconciliation: 'Manual reconciliation',
    reference: 'Reference',
    referencePlaceholder: 'Transfer or receipt number (at least 3 characters)',
    paidAt: 'Date paid',
    notes: 'Notes',
    record: 'Record the payment',
    recording: 'Recording…',
    recorded: 'Payment recorded.',
    amount: 'Amount',
    idempotent: 'Recording is idempotent: the same reference is never counted twice, and a reference already used on another order is refused.',
    paidIn: 'Paid in',
    usd: 'US dollars',
    syp: 'Syrian pounds',
    due: 'Amount due: {amount}',
    dueSyp: 'Amount due: {amount} ({usd} at {rate}, rounded to the whole pound)',
    amountPaid: 'Amount paid',
    amountInvalidUsd: 'Enter an amount in US dollars with at most two decimals, such as 49.99.',
    amountInvalidSyp: 'Enter a whole number of Syrian pounds, such as 125000.',
    amountMustMatch: 'The amount paid must equal the amount due in this currency.',
    mismatchReloaded: 'That is not the amount due now, so it has been read again. Check the amount, then try again.',
    noRate: 'No exchange rate is set: a payment in Syrian pounds cannot be recorded until one is set. Dollar payments are not affected.',
  },
}

const PROVIDERS = ['bank_transfer', 'cash', 'syriatel_cash', 'mtn_cash', 'external_gateway', 'manual_reconciliation']

function emptyForm() {
  return { provider: 'bank_transfer', provider_reference: '', paid_at: '', notes: '', currency_paid: '', amount_paid: '' }
}

function fill(template, values) {
  return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, String(value)), template)
}

export default function PaymentReconciliationPanel({ application, language = 'en', onReconciled }) {
  const copy = COPY[language] || COPY.en

  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!application) return null

  // The fee frozen on the case: a ledger figure in the currency it was set in (history keeps EUR or points).
  const feeMoney = moneyFromDecimal(application.fee_snapshot?.amount ?? 0, application.fee_snapshot?.currency || 'USD')
  const feeAmount = amountMinorOf(feeMoney) ?? 0
  const isPaid = application.payment_status === 'paid'

  // No fee, no reconciliation, and nothing to show (D-28, 18 Oct 2026): the "no fee due"
  // card stood on every case. The endpoint refuses a reconciliation without a fee (422).
  if (feeAmount <= 0 && !isPaid) return null

  // What is due now (S17): the dollar amount, and the pounds at today's rate while a rate is set.
  const due = application.committee_fee_due && typeof application.committee_fee_due === 'object' ? application.committee_fee_due : null
  const dueUsd = isMoney(due?.usd) ? due.usd : feeMoney?.currency === 'USD' ? feeMoney : null
  const dueSyp = isMoney(due?.syp) ? due.syp : null
  const dueFor = { USD: dueUsd, SYP: dueSyp }
  const chosenDue = dueFor[form.currency_paid] || null
  const typedMinor = form.currency_paid ? toMinor(form.amount_paid, form.currency_paid) : null
  const amountTyped = String(form.amount_paid).trim() !== ''
  const amountError = !amountTyped || !form.currency_paid
    ? ''
    : typedMinor == null
      ? (form.currency_paid === 'SYP' ? copy.amountInvalidSyp : copy.amountInvalidUsd)
      : typedMinor !== amountMinorOf(chosenDue) ? copy.amountMustMatch : ''
  const ready = !busy && form.provider_reference.trim().length >= 3 && Boolean(chosenDue) && typedMinor != null && typedMinor === amountMinorOf(chosenDue)

  async function submit() {
    if (!ready) return
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await reconcileRplPayment(application.public_id, {
        provider: form.provider,
        provider_reference: form.provider_reference.trim(),
        ...(form.paid_at ? { paid_at: form.paid_at } : {}),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
        currency_paid: form.currency_paid,
        amount_paid_minor: typedMinor,
      })
      setSuccess(copy.recorded)
      setForm(emptyForm())
      if (onReconciled) onReconciled()
    } catch (requestError) {
      // 409 carries a real explanation — a reference on another order, or this
      // case reconciled under a different one. Show it verbatim.
      if (rateMissing(requestError)) {
        setError(copy.noRate)
      } else if (Number(requestError?.response?.status) === 422 && requestError?.response?.data?.reason_code === 'amount_mismatch') {
        // The amount due moved (the rate changed): read the case again for the new committee_fee_due.
        setError(copy.mismatchReloaded)
        if (onReconciled) onReconciled()
      } else {
        setError(readApiError(requestError))
      }
    } finally {
      setBusy(false)
    }
  }

  function dueLine() {
    if (!chosenDue) return null
    const text = form.currency_paid === 'SYP' && due?.exchange_rate && dueUsd
      ? fill(copy.dueSyp, { amount: formatMoneyInline(chosenDue, language), usd: formatMoneyInline(dueUsd, language), rate: exchangeRateText(due.exchange_rate, language) })
      : fill(copy.due, { amount: formatMoneyInline(chosenDue, language) })
    return <p className="text-sm font-semibold"><bdi>{text}</bdi></p>
  }

  return (
    <Card>
      <CardHeader className="border-b border-[var(--color-border)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" aria-hidden="true" /> {copy.title}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {feeAmount > 0 ? (
              <Badge variant="neutral">
                {copy.amount}: <bdi dir={readsLeftToRight(feeMoney, language) ? 'ltr' : undefined}>{formatMoney(feeMoney, language)}</bdi>
              </Badge>
            ) : null}
            <Badge variant={isPaid ? 'success' : 'warning'}>
              {isPaid ? copy.paid : copy.pending}
            </Badge>
          </div>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-[var(--color-text-muted)]">{copy.subtitle}</p>
      </CardHeader>

      <CardContent className="space-y-3 p-6">
        {error ? (
          <p role="alert" className="whitespace-pre-line rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {success}
          </p>
        ) : null}

        {isPaid ? (
          <p className="flex items-center gap-2 text-sm text-emerald-700">
            <BadgeCheck className="h-4 w-4" aria-hidden="true" />
            {copy.paid}
            {/* The date paid, on the institute's calendar, recorded as 00:00 UTC of it (J07-G1): shown as that date. */}
            {(application.order?.paid_at || application.paid_at)
              ? ` · ${formatRecordedDate(application.order?.paid_at || application.paid_at, language)}`
              : ''}
          </p>
        ) : (
          <>
            <fieldset className="space-y-2">
              <legend className="text-xs text-[var(--color-text-muted)]">{copy.paidIn}</legend>
              <div className="flex flex-wrap gap-3 text-sm">
                {[['USD', copy.usd, dueUsd], ['SYP', copy.syp, dueSyp]].map(([code, label, amount]) => (
                  <label key={code} className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${amount ? 'cursor-pointer border-[var(--color-border)]' : 'cursor-not-allowed border-dashed border-[var(--color-border)] opacity-60'}`}>
                    <input type="radio" name={`committee-fee-currency-${application.public_id}`} value={code} checked={form.currency_paid === code} disabled={!amount} onChange={() => setForm((c) => ({ ...c, currency_paid: code, amount_paid: '' }))} />
                    <span>{label}</span>
                    {amount ? <bdi dir={readsLeftToRight(amount, language) ? 'ltr' : undefined} className="text-[var(--color-text-muted)]">{formatMoney(amount, language)}</bdi> : null}
                  </label>
                ))}
              </div>
              {!dueSyp && dueUsd ? <p className="text-xs text-[var(--color-text-muted)]">{copy.noRate}</p> : null}
            </fieldset>
            {dueLine()}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-[var(--color-text-muted)]">
                {copy.provider}
                <Select
                  value={form.provider}
                  onChange={(event) => setForm((c) => ({ ...c, provider: event.target.value }))}
                >
                  {PROVIDERS.map((provider) => (
                    <option key={provider} value={provider}>{copy[provider]}</option>
                  ))}
                </Select>
              </label>
              <label className="text-xs text-[var(--color-text-muted)]">
                {copy.reference}
                <Input
                  value={form.provider_reference}
                  placeholder={copy.referencePlaceholder}
                  onChange={(event) =>
                    setForm((c) => ({ ...c, provider_reference: event.target.value }))
                  }
                />
              </label>
              <label className="text-xs text-[var(--color-text-muted)]">
                {copy.paidAt}
                <Input
                  type="date"
                  max={businessTodayIso()}
                  value={form.paid_at}
                  onChange={(event) => setForm((c) => ({ ...c, paid_at: event.target.value }))}
                />
              </label>
              <MoneyInput
                currency={form.currency_paid || 'USD'}
                language={language}
                label={copy.amountPaid}
                value={form.amount_paid}
                disabled={!form.currency_paid}
                error={amountError || undefined}
                onChange={(value) => setForm((c) => ({ ...c, amount_paid: value }))}
              />
            </div>
            <Textarea
              rows={2}
              value={form.notes}
              placeholder={copy.notes}
              onChange={(event) => setForm((c) => ({ ...c, notes: event.target.value }))}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={submit}
                disabled={!ready}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Banknote size={16} />
                )}
                {busy ? copy.recording : copy.record}
              </Button>
              <span className="text-xs text-[var(--color-text-muted)]">{copy.idempotent}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
