/*
 * THE AI SERVICE STATUS AS THE SERVER SENDS IT (AI-RESILIENCE-SPEC §6.4), for the
 * tests of the banner, the note, the run notice and the AI service page. Times
 * are relative to now, so "checked two minutes ago" stays true whenever it runs.
 */

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60000).toISOString()
const minutesAhead = (minutes) => new Date(Date.now() + minutes * 60000).toISOString()

export function chain(models, overrides = {}) {
  return models.map((model, index) => ({ position: index + 1, model, state: 'healthy', last_ok_at: minutesAgo(3), p50_latency_ms: 2100, ...(overrides[index + 1] || {}) }))
}

export const CASE_CHAIN = ['gemini-3.6-flash', 'gemini-3.1-pro-preview', 'gemini-3.5-flash-lite']
export const AUTHORING_CHAIN = ['gemini-3.1-pro-preview', 'gemini-3.6-flash', 'gemini-4-argon']
export const INTERACTIVE_CHAIN = ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-pro-preview']

export function okStatus(overrides = {}) {
  return {
    overall: 'ok',
    checked_at: minutesAgo(2),
    monitor_running: true,
    fallback_policy: 'owner_decision_2026_10_23',
    families: [
      { family: 'case_analysis', status: 'ok', serving_model: 'gemini-3.6-flash', chain: chain(CASE_CHAIN) },
      { family: 'web_search', status: 'ok', serving_model: 'gemini-3.6-flash', chain: chain(CASE_CHAIN) },
      { family: 'authoring', status: 'ok', serving_model: 'gemini-3.1-pro-preview', chain: chain(AUTHORING_CHAIN) },
      { family: 'interactive', status: 'ok', serving_model: 'gemini-3.6-flash', chain: chain(INTERACTIVE_CHAIN) },
    ],
    open_incidents: [],
    queued_waiting: { rpl_document_screening: 0, entry_quiz_draft: 0, course_plan: 0 },
    ...overrides,
  }
}

/** case_analysis on its second model: step 1 busy (503) and paused for ten minutes. */
export function degradedStatus() {
  const status = okStatus({ overall: 'degraded', queued_waiting: { rpl_document_screening: 3, entry_quiz_draft: 1, course_plan: 0 } })
  status.families[0] = {
    family: 'case_analysis',
    status: 'degraded',
    serving_model: 'gemini-3.1-pro-preview',
    chain: chain(CASE_CHAIN, { 1: { state: 'open_circuit', until: minutesAhead(10), last_outcome: 'busy', last_http_status: 503, last_failure_at: minutesAgo(1), last_ok_at: minutesAgo(90) } }),
  }
  return status
}

/** authoring with no model answering, and its open incident. */
export function downStatus() {
  const status = okStatus({ overall: 'down' })
  status.families[2] = {
    family: 'authoring',
    status: 'down',
    serving_model: null,
    chain: chain(AUTHORING_CHAIN, { 1: { state: 'open_circuit', last_outcome: 'timeout' }, 2: { state: 'open_circuit', last_outcome: 'busy', last_http_status: 503 }, 3: { state: 'failing', last_outcome: 'busy', last_http_status: 429 } }),
  }
  status.open_incidents = [{ id: 12, family: 'authoring', kind: 'down', status: 'open', opened_at: minutesAgo(20), summary: 'Every authoring model is busy.' }]
  return status
}

/** No probe for 45 minutes: the monitor is not running. */
export function staleStatus() {
  return okStatus({ overall: 'unknown', monitor_running: false, checked_at: minutesAgo(45), families: okStatus().families.map((entry) => ({ ...entry, status: 'unknown' })) })
}

/** A result made by the second model of case_analysis, the first passed over as busy. */
export const FALLBACK_PROVENANCE = Object.freeze({
  task: 'rpl.course_plan',
  family: 'case_analysis',
  chain: CASE_CHAIN,
  chain_sha: '3f9c0a1b2c4d',
  fallback_policy: 'owner_decision_2026_10_23',
  primary_model: 'gemini-3.6-flash',
  requested_model: 'gemini-3.1-pro-preview',
  answering_model: 'gemini-3.1-pro-preview',
  position: 2,
  used_fallback: true,
  attempt_count: 3,
  passed_over: [{ model: 'gemini-3.6-flash', outcome: 'busy', http_status: 503 }],
  requested_tier: 'standard',
  served_tier: 'standard',
  answered_at: '2026-10-23T12:41:07Z',
})

export const PRIMARY_PROVENANCE = Object.freeze({
  ...FALLBACK_PROVENANCE,
  requested_model: 'gemini-3.6-flash',
  answering_model: 'gemini-3.6-flash',
  position: 1,
  used_fallback: false,
  attempt_count: 1,
  passed_over: [],
})

/*
 * A queued AI step waiting to retry (§5.2), exactly as the server sends the run
 * (RplAiGenerationState): it names itself (kind, subject_id), which Retry now
 * needs, and carries the models tried both keyed by model (`models`) and as a
 * list (`attempts`).
 */
export function waitingRun(overrides = {}) {
  return {
    kind: 'entry_quiz_draft',
    subject_id: 7,
    run_id: 'run-waiting-1',
    status: 'waiting_retry',
    next_attempt_at: minutesAhead(5),
    attempt: 2,
    max_attempts: 11,
    window_ends_at: minutesAhead(355),
    error: {
      code: 'ai_busy',
      class: 'busy',
      messages: ['Every model of the AI chain was busy (gemini-3.6-flash, gemini-3.1-pro-preview).'],
      models: { 'gemini-3.6-flash': { outcome: 'busy', http_status: 503 }, 'gemini-3.1-pro-preview': { outcome: 'timeout', http_status: null } },
      attempts: [{ model: 'gemini-3.6-flash', outcome: 'busy', http_status: 503 }, { model: 'gemini-3.1-pro-preview', outcome: 'timeout', http_status: null }],
    },
    ...overrides,
  }
}

/** The instant requests' busy answer (§4.4), as AiChainExhausted::render() sends it. */
export function busyRetryLaterError() {
  return {
    response: {
      status: 503,
      data: {
        message: 'The AI service is busy right now.',
        code: 'ai_busy_retry_later',
        errors: { ai_busy_retry_later: ['The AI service is busy right now.'] },
        reason_codes: { 'gemini-3.6-flash': { outcome: 'busy', http_status: 503 }, 'gemini-3.5-flash-lite': { outcome: 'timeout', http_status: null } },
        models: [{ model: 'gemini-3.6-flash', outcome: 'busy', http_status: 503 }, { model: 'gemini-3.5-flash-lite', outcome: 'timeout', http_status: null }],
        call_id: 'call-1',
      },
    },
  }
}
