import { useEffect } from 'react'
import { aiRunPollDelay } from './aiState'

/*
 * READ A QUEUED AI STEP AGAIN UNTIL IT HAS FINISHED (AI-RESILIENCE-SPEC §5.2).
 *
 * Queued or running: every few seconds, as the entry quiz's draft has done
 * since 17 Oct 2026. Waiting to retry: every half minute, since the next try is
 * minutes away. Nothing once the run has finished. `token` is what the reload
 * replaces (the record just read), so each read arms the next one; `runs` may
 * hold several steps of one record, and the soonest wins.
 */
export default function useAiRunPoll(runs, reload, token) {
  const delays = (Array.isArray(runs) ? runs : [runs]).map(aiRunPollDelay).filter((delay) => delay != null)
  const delay = delays.length ? Math.min(...delays) : null

  useEffect(() => {
    if (delay == null || typeof reload !== 'function') return undefined
    const timer = window.setTimeout(() => reload(), delay)
    return () => window.clearTimeout(timer)
  }, [delay, reload, token])
}
