import { useState } from 'react'
import { BadgeCheck, Banknote, Loader2 } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Select, Textarea } from '../../../components/ui'
import { reconcileRplPayment } from '../services/rplService'
import { readApiError } from '../../../services/apiResponse'
import { formatLocalizedDateTime } from '../../../utils/localization'

/*
 * RECORDING THAT THE CERTIFICATE FEE WAS PAID.
 *
 * `POST /applications/{id}/payment-reconciliation` existed with no caller
 * anywhere in the CMS. It is the ONLY code path that sets
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
 * the four fields, show the refusal verbatim when it comes, and never try to
 * decide anything itself.
 */

const COPY = {
  ar: {
    title: 'تسوية رسوم الشهادة',
    subtitle: 'سجّل الدفعة المستلمة خارج المنصة. إصدار الشهادة يبقى موقوفًا حتى تُسجَّل.',
    paid: 'مدفوعة',
    pending: 'بانتظار الدفع',
    noFee: 'لا توجد رسوم مستحقة على هذه الحالة.',
    provider: 'وسيلة الدفع',
    bank_transfer: 'حوالة بنكية',
    cash: 'نقدًا',
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
  },
  en: {
    title: 'Certificate fee reconciliation',
    subtitle: 'Record a payment received outside the platform. Credential issuance stays blocked until it is recorded.',
    paid: 'Paid',
    pending: 'Awaiting payment',
    noFee: 'This case has no payable fee.',
    provider: 'Method',
    bank_transfer: 'Bank transfer',
    cash: 'Cash',
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
  },
  nl: {
    title: 'Afstemming certificaatkosten',
    subtitle: 'Leg een buiten het platform ontvangen betaling vast. Uitgifte blijft geblokkeerd tot dat gebeurd is.',
    paid: 'Betaald',
    pending: 'Wacht op betaling',
    noFee: 'Dit dossier heeft geen te betalen kosten.',
    provider: 'Methode',
    bank_transfer: 'Bankoverschrijving',
    cash: 'Contant',
    external_gateway: 'Externe gateway',
    manual_reconciliation: 'Handmatige afstemming',
    reference: 'Referentie',
    referencePlaceholder: 'Overschrijvings- of bonnummer (minimaal 3 tekens)',
    paidAt: 'Betaaldatum',
    notes: 'Notities',
    record: 'Betaling vastleggen',
    recording: 'Vastleggen…',
    recorded: 'Betaling vastgelegd.',
    amount: 'Bedrag',
    idempotent: 'Vastleggen is idempotent: dezelfde referentie telt nooit dubbel.',
  },
}

const PROVIDERS = ['bank_transfer', 'cash', 'external_gateway', 'manual_reconciliation']

export default function PaymentReconciliationPanel({ application, language = 'en', onReconciled }) {
  const copy = COPY[language] || COPY.en

  const [form, setForm] = useState({
    provider: 'bank_transfer',
    provider_reference: '',
    paid_at: '',
    notes: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!application) return null

  const amount = Number(application.fee_snapshot?.amount ?? 0)
  const currency = application.fee_snapshot?.currency || ''
  const isPaid = application.payment_status === 'paid'

  // No fee, no reconciliation. The endpoint refuses it too (422), so offering
  // the form would only produce a confusing rejection.
  if (amount <= 0 && !isPaid) {
    return (
      <Card>
        <CardHeader className="border-b border-[var(--color-border)]">
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" aria-hidden="true" /> {copy.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-sm text-[var(--color-text-muted)]">{copy.noFee}</p>
        </CardContent>
      </Card>
    )
  }

  async function submit() {
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await reconcileRplPayment(application.public_id, {
        provider: form.provider,
        provider_reference: form.provider_reference.trim(),
        ...(form.paid_at ? { paid_at: form.paid_at } : {}),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      })
      setSuccess(copy.recorded)
      setForm({ provider: 'bank_transfer', provider_reference: '', paid_at: '', notes: '' })
      if (onReconciled) onReconciled()
    } catch (requestError) {
      // 409 carries a real explanation — a reference on another order, or this
      // case reconciled under a different one. Show it verbatim.
      setError(readApiError(requestError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader className="border-b border-[var(--color-border)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" aria-hidden="true" /> {copy.title}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {amount > 0 ? (
              <Badge variant="neutral">
                {copy.amount}: {amount} {currency}
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
          <p className="whitespace-pre-line rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
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
            {application.paid_at
              ? ` · ${formatLocalizedDateTime(application.paid_at, language)}`
              : ''}
          </p>
        ) : (
          <>
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
                  value={form.paid_at}
                  onChange={(event) => setForm((c) => ({ ...c, paid_at: event.target.value }))}
                />
              </label>
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
                disabled={busy || form.provider_reference.trim().length < 3}
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
