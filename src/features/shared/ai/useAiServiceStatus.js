import { useCallback, useEffect, useState } from 'react'
import { unwrapApiData } from '../../../services/apiResponse'
import { hasAdminToken } from '../../../services/tokenStorage'
import { fetchAiServiceStatus } from './aiServiceApi'

/*
 * THE AI SERVICE STATUS, READ ONCE FOR THE WHOLE PAGE (AI-RESILIENCE-SPEC §6.5).
 *
 * The same pattern as useWorkCounts: one module-level cached read shared by
 * every banner on the page (Today, and each panel that starts AI work), polled
 * every two minutes while the page is visible. The status is the same for every
 * member of staff and holds no client data, so it is not keyed by user. It is
 * read only while someone is signed in: without a session the read would only
 * be refused. A failed read shows nothing, never an error: the banner is a
 * help, and the AI service page has its own loading and failure states.
 */

export const AI_STATUS_TTL_MS = 60_000
export const AI_STATUS_POLL_MS = 120_000

const store = { entry: null, version: 0 }
const listeners = new Set()

function notify() {
  store.version += 1
  listeners.forEach((listener) => listener(store.version))
}

function load(force = false) {
  const entry = store.entry
  if (!force && entry && Date.now() - entry.at < AI_STATUS_TTL_MS) return entry.promise
  const promise = fetchAiServiceStatus().then(
    (payload) => {
      if (store.entry?.promise === promise) {
        store.entry = { ...store.entry, settled: true, ok: true, value: unwrapApiData(payload) || null, settledAt: Date.now() }
        notify()
      }
      return payload
    },
    (error) => {
      if (store.entry?.promise === promise) {
        // The last good status stays on screen; a failed read never clears a banner into an error.
        store.entry = { ...store.entry, settled: true, ok: false, settledAt: Date.now() }
        notify()
      }
      throw error
    },
  )
  store.entry = { at: Date.now(), promise, settled: false, ok: null, value: entry?.value ?? null, settledAt: entry?.settledAt ?? null }
  return promise
}

/** Forget the cached status (tests, and a sign-out). */
export function resetAiServiceStatus() {
  store.entry = null
  store.version = 0
}

/** Read the status again now (the AI service page's Refresh). */
export function refreshAiServiceStatus() {
  if (!hasAdminToken()) return Promise.resolve(null)
  return load(true).catch(() => null)
}

/**
 * `{ status, loading, failed, refreshedAt, refresh }`. `status` is the payload's
 * data (§6.4) or null; `loading` is true until the first read settles.
 * `enabled: false` reads nothing (a caller handed the status by its parent).
 */
export default function useAiServiceStatus({ enabled = true } = {}) {
  const [, setVersion] = useState(store.version)

  useEffect(() => {
    listeners.add(setVersion)
    return () => listeners.delete(setVersion)
  }, [])

  useEffect(() => {
    if (!enabled || !hasAdminToken()) return undefined
    const first = window.setTimeout(() => load(false).catch(() => {}), 0)
    const tick = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') load(false).catch(() => {})
    }
    const interval = window.setInterval(tick, AI_STATUS_POLL_MS)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(interval)
    }
  }, [enabled])

  const refresh = useCallback(() => refreshAiServiceStatus(), [])
  const entry = enabled ? store.entry : null

  return {
    status: entry?.value ?? null,
    loading: Boolean(enabled && hasAdminToken() && (!entry || (!entry.settled && entry.value == null))),
    failed: Boolean(entry?.settled && entry.ok === false && entry.value == null),
    refreshedAt: entry?.settledAt ? new Date(entry.settledAt) : null,
    refresh,
  }
}
