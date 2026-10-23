import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, CircleAlert, Hourglass, ListOrdered, RefreshCw, ShieldCheck } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, PageHeader } from '../../../components/ui'
import { readApiError, unwrapApiData } from '../../../services/apiResponse'
import { getAdminLanguage } from '../../../services/languageStorage'
import { formatLocalizedDateTime, formatLocalizedNumber } from '../../../utils/localization'
import { fill } from '../../rpl/domain/documentScreening'
import AiServiceBanner from '../../shared/ai/AiServiceBanner'
import { aiCopy, familyLabel } from '../../shared/ai/aiCopy'
import { fetchAiServiceHistory, fetchAiServiceStatus } from '../../shared/ai/aiServiceApi'
import { statusFamilies } from '../../shared/ai/aiState'

/*
 * THE AI SERVICE PAGE (AI-RESILIENCE-SPEC §6.5, D20), at /settings/ai-service,
 * readable by every member of staff.
 *
 * What the models behind the platform are doing, from the health monitor and
 * the platform's own traffic: the overall state and when it was last checked;
 * the fallback policy; each family's chain of models in order, the state of each
 * step and which one serves now; the queued AI work waiting to retry; a
 * seven-day availability bar per model, by hour; and the incidents. The status
 * holds no client data: model names, outcomes, times and counts only.
 *
 * Read-only by design (D17): the order of a chain is changed on the server.
 */

const STATUS_VARIANT = { ok: 'success', degraded: 'warning', down: 'danger', unknown: 'neutral' }
const STEP_VARIANT = { healthy: 'success', open_circuit: 'danger', half_open: 'warning', failing: 'danger', unknown: 'neutral' }
const HISTORY_DAYS = 7
const HOUR_MS = 3600000

function stepModel(step) {
  return typeof step === 'string' ? step : step?.model || ''
}

function number(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

/** The history's per-model rows, whatever the list is called: `[{ model, watched, buckets }]`. */
function historyModels(history) {
  const raw = history?.models ?? history?.series ?? []
  const rows = Array.isArray(raw) ? raw : Object.entries(raw).map(([model, value]) => ({ model, ...(Array.isArray(value) ? { hours: value } : value) }))
  return rows
    .filter((row) => row && typeof row === 'object' && row.model)
    .map((row) => ({ model: row.model, watched: row.watched === true || row.in_chain === false, buckets: (Array.isArray(row.hours) ? row.hours : Array.isArray(row.buckets) ? row.buckets : []).filter((bucket) => bucket && typeof bucket === 'object') }))
}

function bucketTime(bucket) {
  const at = Date.parse(bucket.hour || bucket.at || bucket.bucket || bucket.from || '')
  return Number.isFinite(at) ? Math.floor(at / HOUR_MS) * HOUR_MS : null
}

/** One model's hours over the period, oldest first, ending at the current hour: `{ at, ok, total }`. */
function timeline(buckets, days, now) {
  const end = Math.floor(now / HOUR_MS) * HOUR_MS
  const byHour = new Map()
  for (const bucket of buckets) {
    const at = bucketTime(bucket)
    if (at == null) continue
    const current = byHour.get(at) || { ok: 0, total: 0 }
    byHour.set(at, {
      ok: current.ok + number(bucket.probes_ok) + number(bucket.traffic_ok),
      total: current.total + number(bucket.probes_total) + number(bucket.traffic_total),
    })
  }
  const slots = []
  for (let index = days * 24 - 1; index >= 0; index -= 1) {
    const at = end - index * HOUR_MS
    slots.push({ at, ...(byHour.get(at) || { ok: 0, total: 0 }) })
  }
  return slots
}

function cellTone(slot) {
  if (!slot.total) return 'bg-[var(--color-border)]'
  if (slot.ok >= slot.total) return 'bg-green-500'
  if (slot.ok === 0) return 'bg-red-500'
  return 'bg-amber-400'
}

function StepState({ step, copy, language }) {
  const state = step?.state || 'unknown'
  return (
    <span className="flex flex-wrap items-center gap-2">
      <Badge variant={STEP_VARIANT[state] || 'neutral'}>{copy.states[state] || String(state).replaceAll('_', ' ')}</Badge>
      {state === 'open_circuit' && step.until ? <span className="text-xs text-[var(--color-text-muted)]">{fill(copy.until, { time: formatLocalizedDateTime(step.until, language) })}</span> : null}
    </span>
  )
}

function FamilyCard({ entry, copy, language }) {
  const steps = Array.isArray(entry.chain) ? entry.chain : []
  const serving = entry.serving_model
  return (
    <Card role="region" aria-label={familyLabel(entry.family, language)} data-family={entry.family}>
      <CardHeader className="border-b border-[var(--color-border)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-lg">{familyLabel(entry.family, language)}</CardTitle>
          <Badge variant={STATUS_VARIANT[entry.status] || 'neutral'}>{copy.statuses[entry.status] || entry.status || copy.statuses.unknown}</Badge>
        </div>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">{serving ? <>{fill(copy.servingModel, { model: '' })}<bdi className="font-semibold text-[var(--color-text)]">{serving}</bdi></> : entry.status === 'down' ? copy.noServing : null}</p>
      </CardHeader>
      <CardContent className="overflow-x-auto pt-4">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              {[copy.columns.position, copy.columns.model, copy.columns.state, copy.columns.lastOk, copy.columns.lastFailure, copy.columns.latency].map((heading) => <th key={heading} scope="col" className="px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{heading}</th>)}
            </tr>
          </thead>
          <tbody>
            {steps.map((step, index) => {
              const model = stepModel(step)
              const failure = step?.last_failure_at ? [formatLocalizedDateTime(step.last_failure_at, language), step.last_outcome ? copy.outcomes[step.last_outcome] || step.last_outcome : null, step.last_http_status ? fill(copy.httpStatus, { status: step.last_http_status }) : null].filter(Boolean).join(' · ') : '—'
              return (
                <tr key={`${model}-${index}`} data-step={step?.position ?? index + 1} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="px-3 py-2 font-semibold">{formatLocalizedNumber(step?.position ?? index + 1, language)}</td>
                  <td className="px-3 py-2"><bdi className="font-mono text-xs">{model}</bdi></td>
                  <td className="px-3 py-2"><StepState step={typeof step === 'object' ? step : {}} copy={copy} language={language} /></td>
                  <td className="px-3 py-2 text-xs">{step?.last_ok_at ? formatLocalizedDateTime(step.last_ok_at, language) : '—'}</td>
                  <td className="px-3 py-2 text-xs">{failure}</td>
                  <td className="px-3 py-2 text-xs">{step?.p50_latency_ms != null ? fill(copy.seconds, { value: formatLocalizedNumber(number(step.p50_latency_ms) / 1000, language, { maximumFractionDigits: 1 }) }) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

function HistoryRow({ row, days, now, copy, language }) {
  const slots = timeline(row.buckets, days, now)
  const ok = slots.reduce((sum, slot) => sum + slot.ok, 0)
  const total = slots.reduce((sum, slot) => sum + slot.total, 0)
  return (
    <li data-history-model={row.model} className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="flex flex-wrap items-center gap-2"><bdi className="font-mono text-xs font-semibold">{row.model}</bdi>{row.watched ? <Badge variant="info">{copy.watched}</Badge> : null}</span>
        <span className="text-xs text-[var(--color-text-muted)]">{total ? fill(copy.availability, { percent: formatLocalizedNumber(Math.round((ok / total) * 1000) / 10, language) }) : copy.historyEmpty}</span>
      </div>
      <div className="flex h-5 w-full gap-px overflow-hidden rounded-md" aria-hidden="true">
        {slots.map((slot) => {
          const time = formatLocalizedDateTime(new Date(slot.at), language)
          return <span key={slot.at} title={slot.total ? fill(copy.hourTitle, { time, ok: slot.ok, total: slot.total }) : fill(copy.hourNoData, { time })} className={`h-full min-w-0 flex-1 ${cellTone(slot)}`} />
        })}
      </div>
    </li>
  )
}

export default function AiServicePage() {
  const language = getAdminLanguage() === 'ar' ? 'ar' : 'en'
  const copy = aiCopy(language).page
  const [state, setState] = useState({ loading: true, error: '', status: null })
  const [history, setHistory] = useState({ loading: true, error: '', data: null })
  const [now, setNow] = useState(() => Date.now())

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    setHistory((current) => ({ ...current, loading: true, error: '' }))
    setNow(Date.now())
    const [statusResult, historyResult] = await Promise.allSettled([fetchAiServiceStatus(), fetchAiServiceHistory(HISTORY_DAYS)])
    if (statusResult.status === 'fulfilled') setState({ loading: false, error: '', status: unwrapApiData(statusResult.value) || null })
    // A 403 or a network failure says so in the reader's language; anything else is the page's own line, never server internals.
    else setState((current) => ({ ...current, loading: false, error: [401, 403].includes(Number(statusResult.reason?.response?.status)) || !statusResult.reason?.response ? readApiError(statusResult.reason, copy.loadError, language) : copy.loadError }))
    if (historyResult.status === 'fulfilled') setHistory({ loading: false, error: '', data: unwrapApiData(historyResult.value) || null })
    else setHistory((current) => ({ ...current, loading: false, error: copy.historyError }))
  }, [copy.historyError, copy.loadError, language])

  useEffect(() => {
    const timer = window.setTimeout(() => load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const status = state.status
  const families = statusFamilies(status)
  const rows = useMemo(() => historyModels(history.data), [history.data])
  const incidents = useMemo(() => {
    const listed = Array.isArray(history.data?.incidents) ? history.data.incidents : []
    const open = Array.isArray(status?.open_incidents) ? status.open_incidents : []
    const seen = new Set()
    return [...open, ...listed].filter((incident) => {
      if (!incident || typeof incident !== 'object') return false
      const key = incident.id ?? `${incident.family}-${incident.kind}-${incident.opened_at}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [history.data, status])
  const waiting = Object.entries(status?.queued_waiting || {}).filter(([, count]) => Number.isFinite(Number(count)))
  const waitingTotal = waiting.reduce((sum, [, count]) => sum + Number(count), 0)
  const overall = status?.overall || 'unknown'
  const policyDisabled = status?.fallback_policy === 'disabled'

  return (
    <div dir={language === 'ar' ? 'rtl' : 'ltr'} className="space-y-7">
      <PageHeader
        title={copy.title}
        description={copy.subtitle}
        meta={status ? <span className="text-xs text-[var(--color-text-muted)]">{status.checked_at ? fill(copy.lastChecked, { time: formatLocalizedDateTime(status.checked_at, language) }) : copy.neverChecked}</span> : null}
        actions={<Button variant="outline" onClick={() => load()} disabled={state.loading} aria-busy={state.loading ? 'true' : undefined}><RefreshCw size={17} className={state.loading ? 'animate-spin' : ''} />{copy.refresh}</Button>}
      />

      {state.loading && !status ? <p role="status" className="text-sm text-[var(--color-text-muted)]">{copy.loading}</p> : null}
      {state.error ? (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
          <span className="whitespace-pre-line">{state.error}</span>
          <Button size="sm" variant="outline" onClick={() => load()}>{copy.retry}</Button>
        </div>
      ) : null}

      {status ? (
        <>
          <AiServiceBanner status={status} language={language} showLink={false} />

          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="flex flex-wrap items-center gap-3">
                <Activity size={22} aria-hidden="true" className="text-[var(--color-primary)]" />
                <span className="text-sm font-semibold text-[var(--color-text-muted)]">{copy.overall}</span>
                <span data-overall={overall}><Badge variant={STATUS_VARIANT[overall] || 'neutral'}>{copy.statuses[overall] || overall}</Badge></span>
              </div>
              {status.monitor_running === false ? <p className="flex items-start gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-sm leading-6"><CircleAlert size={16} aria-hidden="true" className="mt-1 shrink-0" />{copy.monitorStopped}</p> : null}
              <p data-policy={status.fallback_policy || ''} className="flex items-start gap-2 text-sm leading-6 text-[var(--color-text)]"><ShieldCheck size={16} aria-hidden="true" className="mt-1 shrink-0 text-[var(--color-success)]" />{policyDisabled ? copy.policyDisabled : copy.policy}</p>
            </CardContent>
          </Card>

          <section aria-labelledby="ai-chains-title" className="space-y-3">
            <div>
              <h2 id="ai-chains-title" className="flex items-center gap-2 text-base font-bold text-[var(--color-text)]"><ListOrdered size={18} aria-hidden="true" />{copy.chainsTitle}</h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">{copy.chainsHint}</p>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {families.map((entry) => <FamilyCard key={entry.family} entry={entry} copy={copy} language={language} />)}
            </div>
          </section>

          <section aria-labelledby="ai-waiting-title" className="space-y-3">
            <div>
              <h2 id="ai-waiting-title" className="flex items-center gap-2 text-base font-bold text-[var(--color-text)]"><Hourglass size={18} aria-hidden="true" />{copy.waitingTitle}</h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">{copy.waitingHint}</p>
            </div>
            {waitingTotal ? (
              <ul className="flex flex-wrap gap-2">
                {waiting.filter(([, count]) => Number(count) > 0).map(([kind, count]) => (
                  <li key={kind} data-waiting={kind} className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-3.5 py-1.5 text-sm font-semibold">
                    <span>{copy.waitingKinds[kind] || kind.replaceAll('_', ' ')}</span>
                    <span className="rounded-full bg-amber-100 px-2 text-xs text-amber-900">{formatLocalizedNumber(count, language)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-[var(--color-text-muted)]">{copy.waitingNone}</p>}
          </section>
        </>
      ) : null}

      <section aria-labelledby="ai-history-title" className="space-y-3">
        <div>
          <h2 id="ai-history-title" className="text-base font-bold text-[var(--color-text)]">{copy.historyTitle}</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{copy.historyHint}</p>
        </div>
        <Card>
          <CardContent className="space-y-4 p-6">
            {history.loading && !history.data ? <p role="status" className="text-sm text-[var(--color-text-muted)]">{copy.historyLoading}</p> : null}
            {history.error ? <p className="text-sm text-red-700">{history.error}</p> : null}
            {!history.loading && !history.error && !rows.length ? <p className="text-sm text-[var(--color-text-muted)]">{copy.historyEmpty}</p> : null}
            {rows.length ? <ul className="space-y-4">{rows.map((row) => <HistoryRow key={row.model} row={row} days={Number(history.data?.days) || HISTORY_DAYS} now={now} copy={copy} language={language} />)}</ul> : null}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="ai-incidents-title" className="space-y-3">
        <h2 id="ai-incidents-title" className="text-base font-bold text-[var(--color-text)]">{copy.incidentsTitle}</h2>
        <Card>
          <CardContent className="overflow-x-auto p-6">
            {incidents.length ? (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    {[copy.incidentColumns.family, copy.incidentColumns.kind, copy.incidentColumns.status, copy.incidentColumns.opened, copy.incidentColumns.resolved, copy.incidentColumns.summary].map((heading) => <th key={heading} scope="col" className="px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{heading}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((incident, index) => {
                    const open = incident.status !== 'resolved' && !incident.resolved_at
                    return (
                      <tr key={incident.id ?? index} data-incident={incident.id ?? index} className="border-b border-[var(--color-border)] last:border-0">
                        <td className="px-3 py-2">{incident.family ? familyLabel(incident.family, language) : '—'}</td>
                        <td className="px-3 py-2">{copy.incidentKinds[incident.kind] || incident.kind || '—'}</td>
                        <td className="px-3 py-2"><Badge variant={open ? 'danger' : 'neutral'}>{open ? copy.incidentStatus.open : copy.incidentStatus.resolved}</Badge></td>
                        <td className="px-3 py-2 text-xs">{incident.opened_at ? formatLocalizedDateTime(incident.opened_at, language) : '—'}</td>
                        <td className="px-3 py-2 text-xs">{incident.resolved_at ? formatLocalizedDateTime(incident.resolved_at, language) : '—'}</td>
                        <td className="px-3 py-2 text-xs" dir="auto">{incident.summary || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : <p className="text-sm text-[var(--color-text-muted)]">{copy.incidentsNone}</p>}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
