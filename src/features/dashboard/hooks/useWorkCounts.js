import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { readPagination, unwrapApiData, unwrapCollection } from '../../../services/apiResponse'
import { useAuthorization } from '../../auth/context/useAuthorization'
import { fetchAcademicApplications } from '../../academicRpl/services/academicRplService'
import { fetchRplAfterQuizAttention, fetchRplApplications, fetchRplChargeQueue, fetchRplDashboard } from '../../rpl/services/rplService'
import { PRE_FLOW_STATUSES, STAFF_TILE_QUEUE_KEYS, queueOf } from '../../rpl/domain/journey'

/*
 * THE WORK WAITING FOR THE VIEWER (PLATFORM-JOURNEY-SPEC §4.1).
 *
 * One reader for Today, the sidebar badges and the bell. Each source is asked
 * only when the viewer holds its permission, and each is one shared promise,
 * cached at module level for the signed-in user only, so the three callers make
 * one request per source. A failed source gives null fields and never an error:
 * a badge that cannot be counted is simply not drawn. While a source is read
 * again its last good value stays on screen.
 *
 *   dashboard  GET /admin/rpl/dashboard            rpl.applications.view
 *   charges    GET /admin/rpl/charges?status=pending  rpl.payments.reconcile without rpl.applications.view
 *   attention  GET /admin/rpl/after-quiz/attention  Today only, rpl.applications.manage
 *   academic   GET /academic-rpl/applications?status=submitted  Today only, rpl.applications.view
 *   assigned   GET /admin/rpl/applications?per_page=1  Today only, a scoped role (assessor, appeal-reviewer)
 *
 * The dashboard and the two paginated reads are counts, polled every minute and
 * on window focus. The charge list and the attention list are full lists the
 * server works out row by row (the attention list draws every final exam's
 * question pools), so they are never polled: they are read on mount and on a
 * route change at most every few minutes, after a case action, and on Refresh.
 */

export const WORK_COUNTS_TTL_MS = 30_000
/** The heavy sources' cache life: read again on a route change only after this. */
export const HEAVY_TTL_MS = 180_000
const POLL_MS = 60_000
const HEAVY_SOURCES = new Set(['charges', 'attention'])

const ttlOf = (key) => (HEAVY_SOURCES.has(key) ? HEAVY_TTL_MS : WORK_COUNTS_TTL_MS)

const LOADERS = {
  dashboard: () => fetchRplDashboard(),
  charges: () => fetchRplChargeQueue({ status: 'pending' }),
  attention: () => fetchRplAfterQuizAttention(),
  academic: () => fetchAcademicApplications({ status: 'submitted', per_page: 1 }),
  assigned: () => fetchRplApplications({ per_page: 1 }),
}

const store = { entries: {}, version: 0, userKey: null }
const listeners = new Set()

function notify() {
  store.version += 1
  listeners.forEach((listener) => listener(store.version))
}

function loadSource(key, force) {
  const entry = store.entries[key]
  if (!force && entry && Date.now() - entry.at < ttlOf(key)) return entry.promise
  const promise = LOADERS[key]().then(
    (value) => {
      if (store.entries[key]?.promise === promise) {
        store.entries[key] = { ...store.entries[key], settled: true, ok: true, value, settledAt: Date.now() }
        notify()
      }
      return value
    },
    (error) => {
      if (store.entries[key]?.promise === promise) {
        store.entries[key] = { ...store.entries[key], settled: true, ok: false, value: null, settledAt: Date.now() }
        notify()
      }
      throw error
    },
  )
  store.entries[key] = { at: Date.now(), promise, settled: false, ok: null, value: entry?.value ?? null, settledAt: entry?.settledAt ?? null }
  return promise
}

/** Forget every cached count (tests, and a sign-out). */
export function resetWorkCounts() {
  store.entries = {}
  store.version = 0
  store.userKey = null
}

/*
 * The counts belong to one signed-in user: when another user reads them (a
 * sign-out and a sign-in in the same tab, by any route), nothing cached for the
 * previous one is ever shown or reused.
 */
function forUser(userKey) {
  if (store.userKey === userKey) return
  store.entries = {}
  store.userKey = userKey
}

let pendingRefresh = null

/**
 * Read every source in use again now (after a case action, so the tiles, the
 * badges and the bell agree with the list the user goes back to). Calls in the
 * same tick share one read; the values on screen stay until the answers arrive.
 */
export function refreshWorkCounts() {
  if (pendingRefresh) return
  pendingRefresh = setTimeout(() => {
    pendingRefresh = null
    Object.keys(store.entries).forEach((key) => {
      loadSource(key, true).catch(() => {})
    })
  }, 0)
}

/** Which sources this viewer may ask, given the permissions they hold. */
export function plannedSources(hasPermission, includeTodayOnly = false) {
  const view = hasPermission('rpl.applications.view')
  const manage = hasPermission('rpl.applications.manage')
  const sources = []
  if (view) sources.push('dashboard')
  if (hasPermission('rpl.payments.reconcile') && !view) sources.push('charges')
  if (includeTodayOnly) {
    if (manage) sources.push('attention')
    if (view) sources.push('academic')
    if (view && !manage && !hasPermission('rpl.quality.approve') && !hasPermission('rpl.committee.decide')) sources.push('assigned')
  }
  return sources
}

const ATTENTION_LISTS = ['final_exam_blocked', 'level_certificates_held', 'level_certificates_fee_unusable', 'paid_charges_on_closed_cases', 'experience_certificates_not_issued']

function numberOrNull(value) {
  const number = Number(value)
  return value == null || Number.isNaN(number) ? null : number
}

/** The counts the callers read, from whatever sources answered. Pure: tested on its own. */
export function deriveWorkCounts(values, hasPermission, sources) {
  const dashboard = values.dashboard ? unwrapApiData(values.dashboard) || null : null
  const queues = dashboard && dashboard.queues && typeof dashboard.queues === 'object' ? dashboard.queues : null
  const may = hasPermission

  let paymentsToConfirm = null
  if (may('rpl.payments.reconcile')) {
    if (sources.includes('dashboard')) paymentsToConfirm = numberOrNull(dashboard?.charges_awaiting_confirmation)
    else if (values.charges) paymentsToConfirm = unwrapCollection(values.charges).filter((row) => row?.route === 'offline' && (row?.status == null || row.status === 'pending')).length
  }
  const experienceToApprove = may('rpl.experience_certificates.approve') ? numberOrNull(dashboard?.experience_certificates_awaiting_approval) : null

  const attentionData = values.attention ? unwrapApiData(values.attention) || {} : null
  const attentionTotal = attentionData ? ATTENTION_LISTS.reduce((sum, key) => sum + (Array.isArray(attentionData[key]) ? attentionData[key].length : 0), 0) : null
  const academicSubmitted = values.academic ? readPagination(values.academic).total : null
  const assignedTotal = values.assigned ? readPagination(values.assigned).total : null

  const casesForYou = queues
    ? STAFF_TILE_QUEUE_KEYS.filter((key) => may(queueOf(key).permission)).reduce((sum, key) => sum + (numberOrNull(queues[key]) ?? 0), 0)
    : null

  const byStatus = dashboard?.applications?.by_status || {}
  const preflowWork = dashboard
    ? PRE_FLOW_STATUSES.reduce((sum, status) => sum + (numberOrNull(byStatus[status]) ?? 0), 0)
      + (numberOrNull(dashboard.open_appeals) ?? 0)
      + (numberOrNull(dashboard.assignments?.pending) ?? 0)
      + (numberOrNull(dashboard.assignments?.active) ?? 0)
    : null

  const committeeQueue = numberOrNull(dashboard?.committee_queue)
  const qualityQueue = numberOrNull(dashboard?.quality_queue)
  const openAppeals = numberOrNull(dashboard?.open_appeals)

  const parts = [
    casesForYou,
    may('rpl.payments.reconcile') ? paymentsToConfirm : null,
    may('rpl.experience_certificates.approve') ? experienceToApprove : null,
    may('rpl.committee.decide') ? committeeQueue : null,
    may('rpl.quality.approve') ? qualityQueue : null,
    may('rpl.appeals.review') ? openAppeals : null,
  ]
  const known = parts.filter((part) => part != null)
  const workTotal = known.length ? known.reduce((sum, part) => sum + part, 0) : null

  return {
    dashboard,
    queues,
    paymentsToConfirm,
    experienceToApprove,
    attentionTotal,
    academicSubmitted,
    assignedTotal,
    casesForYou,
    preflowWork,
    workTotal,
    committee_queue: committeeQueue,
    quality_queue: qualityQueue,
    open_appeals: openAppeals,
    overdue_information_requests: numberOrNull(dashboard?.overdue_information_requests),
  }
}

/**
 * `{ loading, refreshing, pendingSources, partial, refreshedAt, dashboard,
 * queues, paymentsToConfirm, experienceToApprove, attentionTotal,
 * academicSubmitted, assignedTotal, casesForYou, preflowWork, workTotal, failed,
 * refresh }`. `failed` lists the sources that did not answer; `pendingSources`
 * the ones with nothing to show yet; `refreshing` is true while any is read.
 */
export default function useWorkCounts({ includeTodayOnly = false } = {}) {
  const { user, hasPermission } = useAuthorization()
  const location = useLocation()
  forUser(user?.id ?? user?.email ?? null)
  const [, setVersion] = useState(store.version)
  const sources = useMemo(() => plannedSources(hasPermission, includeTodayOnly), [hasPermission, includeTodayOnly])
  const sourcesKey = sources.join(',')

  useEffect(() => {
    listeners.add(setVersion)
    return () => listeners.delete(setVersion)
  }, [])

  const run = useCallback((force, lightOnly = false) => {
    const keys = sourcesKey ? sourcesKey.split(',').filter((key) => !lightOnly || !HEAVY_SOURCES.has(key)) : []
    return Promise.allSettled(keys.map((key) => loadSource(key, force)))
  }, [sourcesKey])

  // On mount and on every route change, at most once per cache life (the cache decides).
  useEffect(() => {
    const timer = window.setTimeout(() => run(false), 0)
    return () => window.clearTimeout(timer)
  }, [run, location.pathname])

  // The counts every minute while the page is visible, and when the window comes back into focus.
  useEffect(() => {
    if (!sourcesKey) return undefined
    const tick = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') run(false, true)
    }
    const interval = window.setInterval(tick, POLL_MS)
    const onFocus = () => run(false, true)
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [run, sourcesKey])

  const refresh = useCallback(() => run(true), [run])

  const entries = sources.map((key) => [key, store.entries[key]])
  // A source being read again keeps its last good value; only a failed read clears it.
  const values = Object.fromEntries(entries.map(([key, entry]) => [key, entry && entry.ok !== false ? entry.value : null]))
  // Sources with nothing to show yet (the first read, or a retry after a failure): a placeholder, not a dash.
  const pendingSources = entries.filter(([, entry]) => !entry || (!entry.settled && entry.value == null)).map(([key]) => key)
  const loading = pendingSources.length > 0
  const refreshing = entries.some(([, entry]) => entry && !entry.settled)
  const failed = entries.filter(([, entry]) => entry?.settled && entry.ok === false).map(([key]) => key)
  const settledTimes = entries.map(([, entry]) => entry?.settledAt).filter(Boolean)
  const refreshedAt = settledTimes.length ? new Date(Math.max(...settledTimes)) : null

  return {
    loading,
    refreshing,
    pendingSources,
    partial: failed.length > 0,
    failed,
    refreshedAt,
    sources,
    ...deriveWorkCounts(values, hasPermission, sources),
    refresh,
  }
}
