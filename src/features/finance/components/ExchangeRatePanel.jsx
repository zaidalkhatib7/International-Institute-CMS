import { useCallback, useContext, useEffect, useState } from 'react'
import { ArrowLeftRight, BadgeCheck, LoaderCircle, TriangleAlert } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Textarea } from '../../../components/ui'
import { AuthorizationContext } from '../../auth/context/authorizationContext'
import { readApiError, unwrapApiData } from '../../../services/apiResponse'
import { formatLocalizedDateTime } from '../../../utils/localization'
import { exchangeRateText, formatMoneyInline, money, sypPreview } from '../../../utils/money'
import { fill } from '../../rpl/domain/documentScreening'
import {
  PREVIEW_USD_MINOR,
  RATE_NOTE_MAX,
  canManageExchangeRate,
  exchangeRateCopy,
  isRateNoteValid,
  needsLargeChangeConfirmation,
  parseRateInput,
  rateChangePercent,
} from '../domain/exchangeRate'
import { fetchExchangeRates, setExchangeRate } from '../services/financeService'

/*
 * THE EXCHANGE RATE (owner decisions of 17 Oct 2026; contract S1, S2).
 *
 * Everyone with a finance or payment role reads the rate in force and its
 * append-only history; there is no control to edit or delete a rate, because
 * the API has none. Only the owner's role (or a role given
 * finance.exchange_rates.manage by data) sees the form that sets a new one: the
 * rate, its source, a preview of what a dollar price becomes, and a tick for the
 * first rate and any change of 20% or more. The form sends the id of the rate it
 * was opened on; if someone set another meanwhile, the server answers 409, the
 * panel reloads and keeps what was typed. The panel loads itself.
 */

function readHistory(history) {
  const page = history && typeof history === 'object' && !Array.isArray(history) ? history : { data: Array.isArray(history) ? history : [] }
  return {
    rows: Array.isArray(page.data) ? page.data : [],
    page: Number(page.current_page ?? 1) || 1,
    lastPage: Number(page.last_page ?? 1) || 1,
  }
}

export default function ExchangeRatePanel({ language, canManage, showHeader = true }) {
  const copy = exchangeRateCopy(language)
  const authorization = useContext(AuthorizationContext)
  const mayManage = canManage ?? canManageExchangeRate(authorization)
  const [page, setPage] = useState(1)
  const [state, setState] = useState({ loading: true, error: '', current: null, rows: [], page: 1, lastPage: 1 })
  const [form, setForm] = useState({ rate: '', note: '', confirm: false })
  const [forcedConfirm, setForcedConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState({ error: '', success: '' })

  const load = useCallback(async (target = 1) => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const data = unwrapApiData(await fetchExchangeRates({ page: target })) || {}
      const history = readHistory(data.history)
      setState({ loading: false, error: '', current: data.current && typeof data.current === 'object' ? data.current : null, ...history, page: history.page })
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: readApiError(error, copy.loadError, language) }))
    }
  }, [copy.loadError, language])

  useEffect(() => {
    const timer = window.setTimeout(() => load(page), 0)
    return () => window.clearTimeout(timer)
  }, [load, page])

  const current = state.current
  const typedRate = parseRateInput(form.rate)
  const rateTyped = String(form.rate).trim() !== ''
  const noteTyped = String(form.note).trim() !== ''
  const tickNeeded = typedRate != null && (forcedConfirm || needsLargeChangeConfirmation(current, typedRate))
  const percent = typedRate != null ? rateChangePercent(current, typedRate) : null
  const ready = typedRate != null && isRateNoteValid(form.note) && (!tickNeeded || form.confirm) && !busy

  async function submit() {
    if (!ready) return
    setBusy(true)
    setNotice({ error: '', success: '' })
    try {
      await setExchangeRate({
        syp_per_usd: typedRate,
        note: form.note.trim(),
        expected_current_rate_id: current?.id ?? null,
        confirm_large_change: Boolean(tickNeeded && form.confirm),
      })
      setForm({ rate: '', note: '', confirm: false })
      setForcedConfirm(false)
      setNotice({ error: '', success: copy.saved })
      setPage(1)
      load(1)
    } catch (error) {
      const status = Number(error?.response?.status)
      const code = error?.response?.data?.code
      const reason = error?.response?.data?.reason_code
      if (status === 409 && code === 'exchange_rate_changed') {
        // Never the generic conflict line: say what happened, keep what was typed, reload.
        setNotice({ error: copy.stale, success: '' })
        setForm((currentForm) => ({ ...currentForm, confirm: false }))
        load(1)
      } else if (status === 422 && reason === 'rate_change_needs_confirmation') {
        setForcedConfirm(true)
        setNotice({ error: copy.needsConfirmation, success: '' })
      } else {
        setNotice({ error: readApiError(error, copy.loadError, language), success: '' })
      }
    } finally {
      setBusy(false)
    }
  }

  function renderPreview() {
    if (typedRate == null) return null
    const price = formatMoneyInline(money(PREVIEW_USD_MINOR, 'USD'), language)
    const after = formatMoneyInline(sypPreview(PREVIEW_USD_MINOR, typedRate), language)
    const before = current ? formatMoneyInline(sypPreview(PREVIEW_USD_MINOR, current), language) : null
    return (
      <div className="space-y-1 rounded-xl bg-[var(--color-surface-muted)] p-3 text-sm">
        <p><bdi>{before ? fill(copy.preview, { price, new: after, old: before }) : fill(copy.previewFirst, { price, new: after })}</bdi></p>
        {percent != null ? <p className="text-xs text-[var(--color-text-muted)]"><bdi>{fill(copy.change, { percent })}</bdi></p> : null}
      </div>
    )
  }

  function renderForm() {
    if (!mayManage) return <p className="text-xs leading-5 text-[var(--color-text-muted)]">{copy.ownerOnly}</p>
    const tickText = current ? fill(copy.bigChange, { percent: percent ?? '—', old: exchangeRateText(current, language), new: exchangeRateText(typedRate, language) }) : copy.firstRate
    return (
      <section aria-label={copy.changeTitle} className="space-y-3 rounded-2xl border border-[var(--color-border)] p-4 text-sm">
        <strong className="block">{copy.changeTitle}</strong>
        <div className="grid gap-3 md:grid-cols-2">
          <Input id="exchange-rate-value" dir="ltr" inputMode="decimal" autoComplete="off" label={copy.newRate} value={form.rate} error={rateTyped && typedRate == null ? copy.newRateInvalid : undefined} onChange={(event) => { setForm((currentForm) => ({ ...currentForm, rate: event.target.value, confirm: false })); setForcedConfirm(false) }} />
          <Textarea id="exchange-rate-note" rows={2} label={copy.note} value={form.note} maxLength={RATE_NOTE_MAX} error={noteTyped && !isRateNoteValid(form.note) ? copy.noteInvalid : undefined} onChange={(event) => setForm((currentForm) => ({ ...currentForm, note: event.target.value }))} />
        </div>
        {renderPreview()}
        {tickNeeded ? (
          <div role="note" className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900">
            <p className="flex items-start gap-2 leading-6"><TriangleAlert size={16} className="mt-1 shrink-0" aria-hidden="true" /><bdi>{tickText}</bdi></p>
            <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={form.confirm} onChange={(event) => setForm((currentForm) => ({ ...currentForm, confirm: event.target.checked }))} />{copy.confirmTick}</label>
          </div>
        ) : null}
        <div className="flex justify-end">
          <Button size="sm" onClick={submit} disabled={!ready}>{busy ? <LoaderCircle className="animate-spin" size={15} /> : <BadgeCheck size={15} />}{busy ? copy.saving : copy.submit}</Button>
        </div>
      </section>
    )
  }

  function renderHistory() {
    const at = (value) => formatLocalizedDateTime(value, language)
    return (
      <section aria-label={copy.history} className="space-y-2">
        <strong className="block text-sm">{copy.history}</strong>
        <p className="text-xs leading-5 text-[var(--color-text-muted)]">{copy.historyHint}</p>
        {!state.rows.length ? <p className="text-sm text-[var(--color-text-muted)]">{copy.historyEmpty}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm" aria-label={copy.history}>
              <thead>
                <tr className="border-b border-[var(--color-border)] text-start text-xs text-[var(--color-text-muted)]">
                  <th className="px-3 py-2 text-start">{copy.from}</th>
                  <th className="px-3 py-2 text-start">{copy.rate}</th>
                  <th className="px-3 py-2 text-start">{copy.changeColumn}</th>
                  <th className="px-3 py-2 text-start">{copy.setByColumn}</th>
                  <th className="px-3 py-2 text-start">{copy.sourceColumn}</th>
                </tr>
              </thead>
              <tbody>
                {state.rows.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--color-border)] last:border-b-0">
                    <td className="px-3 py-2">{at(row.effective_from)}{row.is_current ? <Badge className="ms-2" variant="success">{copy.inForce}</Badge> : null}</td>
                    <td className="px-3 py-2"><bdi>{exchangeRateText(row, language)}</bdi></td>
                    <td className="px-3 py-2"><bdi dir="ltr">{row.change_percent != null ? `${row.change_percent}%` : '—'}</bdi></td>
                    <td className="px-3 py-2">{row.set_by?.name || '—'}</td>
                    <td className="px-3 py-2"><span dir="auto">{row.note || '—'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {state.lastPage > 1 ? (
          <div className="flex items-center justify-end gap-2 text-xs">
            <Button size="sm" variant="outline" disabled={state.page <= 1 || state.loading} onClick={() => setPage(Math.max(1, state.page - 1))}>{copy.previous}</Button>
            <span>{fill(copy.page, { page: state.page, last: state.lastPage })}</span>
            <Button size="sm" variant="outline" disabled={state.page >= state.lastPage || state.loading} onClick={() => setPage(Math.min(state.lastPage, state.page + 1))}>{copy.next}</Button>
          </div>
        ) : null}
      </section>
    )
  }

  return (
    <Card>
      {/* On its own page the page header already names the rate and explains it; the panel does not say it twice. */}
      {showHeader ? (
        <CardHeader className="border-b border-[var(--color-border)]">
          <CardTitle className="flex items-center gap-2"><ArrowLeftRight size={20} aria-hidden="true" />{copy.title}</CardTitle>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{copy.hint}</p>
        </CardHeader>
      ) : null}
      <CardContent className="space-y-5 pt-6">
        {notice.error ? <p role="alert" className="whitespace-pre-line [unicode-bidi:plaintext] rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{notice.error}</p> : null}
        {notice.success ? <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{notice.success}</p> : null}
        {state.loading && !current && !state.rows.length ? <p role="status" className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]"><LoaderCircle className="animate-spin" size={16} /></p> : null}
        {!state.loading && state.error ? <div className="space-y-2"><p className="whitespace-pre-line text-sm text-[var(--color-danger)]">{state.error}</p><Button size="sm" variant="outline" onClick={() => load(page)}>{copy.retry}</Button></div> : null}
        {!state.error && !state.loading ? (
          current ? (
            <section aria-label={copy.current} className="space-y-1 rounded-2xl border border-[var(--color-border)] p-4">
              <p className="text-xs font-semibold text-[var(--color-text-muted)]">{copy.current}</p>
              <p className="text-2xl font-bold text-[var(--color-primary)]"><bdi>{exchangeRateText(current, language)}</bdi></p>
              <p className="text-xs text-[var(--color-text-muted)]">{fill(copy.setBy, { name: current.set_by?.name || '—', at: formatLocalizedDateTime(current.effective_from, language) })}</p>
              {current.note ? <p className="text-xs text-[var(--color-text-muted)]"><span dir="auto">{fill(copy.source, { note: current.note })}</span></p> : null}
            </section>
          ) : <p role="note" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-semibold leading-6 text-red-800">{copy.noRate}</p>
        ) : null}
        {!state.error && !state.loading ? renderForm() : null}
        {!state.error ? renderHistory() : null}
      </CardContent>
    </Card>
  )
}
