import { useCallback, useEffect, useState } from 'react'
import { LoaderCircle, Minus, Plus, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Select } from '../../../components/ui'
import Money from '../../../components/Money'
import { readApiError } from '../../../services/apiResponse'
import { formatLocalizedDate, formatLocalizedDateTime } from '../../../utils/localization'
import { LEGACY_POINTS } from '../../../utils/money'
import { LEDGER_FILTERS, fillWallet, ledgerKindLabel, walletBalances, walletCopy } from '../domain/wallet'
import { fetchUserWalletTransactions } from '../services/usersService'

/*
 * THE CLIENT'S WALLET ON HIS WORKSPACE (owner decisions of 17 Oct 2026).
 *
 * The two balances (contract S6 wallet_balances), the Top up and Deduct acts for
 * finance.manage, and the staff ledger (S5) with a filter by currency and for the
 * earlier records. A movement written before 17 Oct 2026 is in points: it is
 * shown muted, as history, under one line that says what became of the points.
 * The ledger loads itself; a 403 hides it.
 */

function ledgerParams(filter, page) {
  const currency = filter === 'legacy' ? LEGACY_POINTS : filter === 'all' ? null : filter
  return { ...(currency ? { currency } : {}), page }
}

function readPage(payload) {
  const page = payload?.data && !Array.isArray(payload.data) ? payload.data : payload
  return {
    rows: Array.isArray(page?.data) ? page.data : Array.isArray(payload?.data) ? payload.data : [],
    page: Number(page?.current_page ?? 1) || 1,
    lastPage: Number(page?.last_page ?? 1) || 1,
  }
}

function isLegacyRow(row) {
  return (row?.currency || row?.amount?.currency) === LEGACY_POINTS
}

export default function WalletCard({ userId, user, language, canManage = false, canReadLedger = false }) {
  const copy = walletCopy(language)
  const navigate = useNavigate()
  const balances = walletBalances(user)
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [ledger, setLedger] = useState({ loading: canReadLedger, error: '', forbidden: false, rows: [], page: 1, lastPage: 1 })

  const load = useCallback(async () => {
    if (!canReadLedger || !userId) return
    setLedger((current) => ({ ...current, loading: true, error: '' }))
    try {
      const result = readPage(await fetchUserWalletTransactions(userId, ledgerParams(filter, page)))
      setLedger({ loading: false, error: '', forbidden: false, ...result })
    } catch (error) {
      if (Number(error?.response?.status) === 403) setLedger({ loading: false, error: '', forbidden: true, rows: [], page: 1, lastPage: 1 })
      else setLedger((current) => ({ ...current, loading: false, error: readApiError(error, copy.ledgerFailed, language) }))
    }
  }, [canReadLedger, copy.ledgerFailed, filter, language, page, userId])

  useEffect(() => {
    const timer = window.setTimeout(load, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const at = (value) => (value ? formatLocalizedDateTime(value, language) : '—')
  const showLegacyNote = ledger.rows.some(isLegacyRow) || filter === 'legacy'

  function details(row) {
    const parts = []
    if (row.method) parts.push(copy.methods[row.method] || String(row.method).replaceAll('_', ' '))
    if (row.reference) parts.push(row.reference)
    if (row.received_on) parts.push(formatLocalizedDate(row.received_on, language))
    if (row.subject?.label) parts.push(row.subject.label)
    if (row.description) parts.push(row.description)
    if (row.notes) parts.push(row.notes)
    if (row.recorded_by?.name) parts.push(fillWallet(copy.by, { name: row.recorded_by.name }))
    return parts.join(' · ') || '—'
  }

  function renderLedger() {
    if (!canReadLedger || ledger.forbidden) return null
    return (
      <section aria-label={copy.ledger} className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <strong className="text-sm">{copy.ledger}</strong>
          <div className="w-56">
            <Select label={copy.filter} value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1) }}>
              {LEDGER_FILTERS.map((value) => <option key={value} value={value}>{copy.filters[value]}</option>)}
            </Select>
          </div>
        </div>
        {showLegacyNote ? <p role="note" className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-xs leading-5 text-[var(--color-text-muted)]">{copy.legacyNote}</p> : null}
        {ledger.loading ? <p role="status" className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]"><LoaderCircle className="animate-spin" size={16} /></p> : null}
        {!ledger.loading && ledger.error ? <p className="whitespace-pre-line text-sm text-[var(--color-danger)]">{ledger.error}</p> : null}
        {!ledger.loading && !ledger.error && !ledger.rows.length ? <p className="text-sm text-[var(--color-text-muted)]">{copy.empty}</p> : null}
        {!ledger.loading && !ledger.error && ledger.rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm" aria-label={copy.ledger}>
              <thead>
                <tr className="border-b border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
                  <th className="px-3 py-2 text-start">{copy.date}</th>
                  <th className="px-3 py-2 text-start">{copy.movement}</th>
                  <th className="px-3 py-2 text-start">{copy.amountColumn}</th>
                  <th className="px-3 py-2 text-start">{copy.balanceAfter}</th>
                  <th className="px-3 py-2 text-start">{copy.details}</th>
                </tr>
              </thead>
              <tbody>
                {ledger.rows.map((row) => {
                  const legacy = isLegacyRow(row)
                  return (
                    <tr key={row.id} data-legacy={legacy ? 'true' : undefined} className={`border-b border-[var(--color-border)] last:border-b-0 ${legacy ? 'text-[var(--color-text-muted)] opacity-75' : ''}`}>
                      <td className="px-3 py-2">{at(row.created_at)}</td>
                      <td className="px-3 py-2"><Badge variant={row.direction === 'credit' ? 'success' : 'warning'}>{row.direction === 'credit' ? copy.credit : copy.debit}</Badge> <span>{ledgerKindLabel(row, language)}</span></td>
                      <td className="px-3 py-2"><Money value={row.amount} language={language} /></td>
                      <td className="px-3 py-2"><Money value={row.balance_after} language={language} /></td>
                      <td className="px-3 py-2"><span dir="auto">{details(row)}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}
        {ledger.lastPage > 1 ? (
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="outline" disabled={ledger.page <= 1 || ledger.loading} onClick={() => setPage(Math.max(1, ledger.page - 1))}>{copy.previous}</Button>
            <span className="text-xs">{ledger.page} / {ledger.lastPage}</span>
            <Button size="sm" variant="outline" disabled={ledger.page >= ledger.lastPage || ledger.loading} onClick={() => setPage(Math.min(ledger.lastPage, ledger.page + 1))}>{copy.next}</Button>
          </div>
        ) : null}
      </section>
    )
  }

  return (
    <Card>
      <CardHeader className="border-b border-[var(--color-border)]">
        <CardTitle className="flex items-center gap-2"><Wallet size={20} aria-hidden="true" />{copy.title}</CardTitle>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{copy.hint}</p>
      </CardHeader>
      <CardContent className="space-y-5 p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--color-border)] p-4"><p className="text-xs font-semibold text-[var(--color-text-muted)]">{copy.usdBalance}</p><p className="mt-1 text-2xl font-bold"><Money value={balances.usd} language={language} /></p></div>
          <div className="rounded-2xl border border-[var(--color-border)] p-4"><p className="text-xs font-semibold text-[var(--color-text-muted)]">{copy.sypBalance}</p><p className="mt-1 text-2xl font-bold"><Money value={balances.syp} language={language} /></p></div>
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => navigate(`/users/${userId}/wallet?action=top-up`)}><Plus size={15} />{copy.topUp}</Button>
            <Button size="sm" variant="outline" onClick={() => navigate(`/users/${userId}/wallet?action=deduct`)}><Minus size={15} />{copy.deduct}</Button>
          </div>
        ) : null}
        {renderLedger()}
      </CardContent>
    </Card>
  )
}
