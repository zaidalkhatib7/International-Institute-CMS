import { formatLocalizedDateTime, formatLocalizedList } from '../../../utils/localization'
import { fill } from '../../rpl/domain/documentScreening'
import { aiCopy, familyLabel } from './aiCopy'

/*
 * THE AI SERVICE, READ FROM WHAT THE SERVER SENDS (AI-RESILIENCE-SPEC §5.2, §6.4, §7).
 *
 * Pure functions, tested on their own:
 *
 *   - the banner: which families are degraded, down, or unchecked, from
 *     GET /admin/ai/status (§6.4);
 *   - the provenance of one AI result: the answering model, its place in the
 *     chain and why the first model was passed over, from the `ai_provenance`
 *     object (§7.1) or, for rows made before it, from the older model columns;
 *   - a queued AI step's run state: in flight, waiting to retry, or failed for a
 *     reason the screen can name (§5.2);
 *   - the instant requests' busy answer (HTTP 503 ai_busy_retry_later, §4.4).
 *
 * The platform shows and never decides: the server is the authority on every
 * state, and a value the platform does not recognise is shown as it came.
 */

/*
 * RETRY NOW (§5.2) is the server's own route (aiServiceApi.retryAiGenerationNow,
 * and rplService.retryRplScreeningNow for the document screen), never the step's
 * start request: the run names itself by its kind and subject_id.
 */
const RETRY_KINDS = new Set(['entry_quiz_draft', 'final_evaluation', 'course_plan', 'advisory', 'academic_analysis', 'academic_diagnostic'])

/** `{ kind, subjectId }` of a generation state the server can queue again, or null. */
export function retryTargetOf(run) {
  if (!run || typeof run !== 'object') return null
  const kind = typeof run.kind === 'string' ? run.kind : null
  const subjectId = run.subject_id
  if (!kind || !RETRY_KINDS.has(kind)) return null
  if (subjectId === null || subjectId === undefined || subjectId === '') return null
  return { kind, subjectId }
}

/** How long queued AI work rides out an outage on the server (§5.1, D12), when the status does not say. */
export const AI_RETRY_WINDOW_HOURS = 6

/** The run states of a queued AI step that the platform waits on (§5.2). */
export const AI_RUN_IN_FLIGHT = Object.freeze(['queued', 'running', 'waiting_retry'])

/** How often a panel reads a running step again, and a step waiting to retry (minutes away). */
export const AI_RUN_POLL_MS = 4000
export const AI_RUN_WAITING_POLL_MS = 30000

/*
 * The error codes a failed AI step may carry, by class (§5.2: busy,
 * configuration, refused). The server sends error_class with the code; this map
 * is only the reading for a run that carries the code alone.
 */
const CAPACITY_CODES = new Set([
  'provider_http_429', 'provider_http_500', 'provider_http_502', 'provider_http_503', 'provider_http_504',
  'provider_timeout', 'provider_unreachable', 'ai_busy', 'ai_timeout', 'ai_unavailable_window_exhausted',
  'ai_busy_retry_later', 'ai_chain_exhausted', 'gemini_unavailable', 'gemini_connection',
])
const TIMEOUT_CODES = new Set(['provider_timeout', 'ai_timeout'])
const UNREACHABLE_CODES = new Set(['provider_unreachable', 'gemini_connection'])
const CONFIGURATION_CODES = new Set([
  'ai_chain_not_configured', 'model_unavailable', 'identity_mismatch', 'unnamed_model', 'responding_model_mismatch',
  'responding_model_unnamed', 'quota', 'tier_refused', 'provider_not_configured', 'model_set_by_chain',
])
const REFUSED_CODES = new Set(['ai_request_refused', 'request_refused', 'blocked'])

/** busy | configuration | refused | null, from a run's error_class or, failing that, its code. */
export function aiErrorClass(code, errorClass = null) {
  if (['busy', 'configuration', 'refused'].includes(errorClass)) return errorClass
  if (!code) return null
  if (CAPACITY_CODES.has(code)) return 'busy'
  if (CONFIGURATION_CODES.has(code)) return 'configuration'
  if (REFUSED_CODES.has(code)) return 'refused'
  return null
}

/** Whether a failure was the provider's capacity (busy, slow, unreachable), so the work may simply be run again later. */
export function isCapacityFailure(code, errorClass = null) {
  return aiErrorClass(code, errorClass) === 'busy'
}

/** The staff sentence for an AI error code, or null for a code this table does not know. */
export function aiErrorMessage(code, errorClass, language) {
  const copy = aiCopy(language).errors
  if (code === 'ai_unavailable_window_exhausted') return copy.windowExhausted
  if (TIMEOUT_CODES.has(code)) return copy.timeout
  if (UNREACHABLE_CODES.has(code)) return copy.unreachable
  const kind = aiErrorClass(code, errorClass)
  if (kind === 'busy') return copy.busy
  if (kind === 'configuration') return copy.configuration
  if (kind === 'refused') return copy.refused
  return null
}

/** A run's error code and class, from the flat fields of §5.2 or the older `error: {code}` object. */
export function runError(run) {
  if (!run || typeof run !== 'object') return { code: null, errorClass: null, messages: [] }
  const code = run.error_code || run.error?.code || run.refusal_code || null
  const errorClass = run.error_class || run.error?.class || null
  const messages = Array.isArray(run.error?.messages) ? run.error.messages.filter((line) => typeof line === 'string' && line.trim()) : []
  return { code, errorClass, messages }
}

export function isAiRunInFlight(run) {
  return AI_RUN_IN_FLIGHT.includes(run?.status)
}

export function isWaitingRetry(run) {
  return run?.status === 'waiting_retry'
}

/** How long a panel waits before reading the run again, or null when there is nothing to wait for. */
export function aiRunPollDelay(run) {
  if (isWaitingRetry(run)) return AI_RUN_WAITING_POLL_MS
  if (run?.status === 'queued' || run?.status === 'running') return AI_RUN_POLL_MS
  return null
}

/*
 * The generation state of one AI step on the record it belongs to. The entry
 * quiz's draft has carried `generation` since 17 Oct 2026 (G4) and the course
 * plan `generation.run`; the steps queued in Release G carry
 * `{kind}_generation`, or `generations[kind]`.
 */
export function aiGenerationOf(subject, kind) {
  if (!subject || typeof subject !== 'object') return null
  const candidates = [subject[`${kind}_generation`], subject.generations?.[kind]]
  return candidates.find((value) => value && typeof value === 'object') || null
}

/** The parts of the waiting sentence, each filled only when the server sent its value. */
export function waitingRetryLines(run, language) {
  const copy = aiCopy(language).run
  const lines = [copy.waiting]
  if (run?.next_attempt_at) lines.push(fill(copy.nextTry, { time: formatLocalizedDateTime(run.next_attempt_at, language) }))
  if (run?.attempt != null && run?.max_attempts != null) lines.push(fill(copy.tryCount, { attempt: run.attempt, max: run.max_attempts }))
  if (run?.window_ends_at) lines.push(fill(copy.until, { time: formatLocalizedDateTime(run.window_ends_at, language) }))
  lines.push(copy.byHand)
  return lines
}

/*
 * The models tried, as a list of { model, outcome, http_status }: the server sends
 * a list (`attempts`, `models` on the 503) and, beside it, the same keyed by model
 * name (`models`: { "gemini-3.6-flash": { outcome, http_status } }). Either reads.
 */
export function modelEntries(value) {
  if (Array.isArray(value)) return value.map((entry) => (typeof entry === 'string' ? { model: entry } : entry))
  if (value && typeof value === 'object') {
    return Object.entries(value).map(([model, last]) => ({ model, ...(last && typeof last === 'object' ? last : {}) }))
  }
  return []
}

function firstModelEntries(...values) {
  for (const value of values) {
    const entries = modelEntries(value).filter((entry) => entry && typeof entry === 'object' && nonEmpty(entry.model))
    if (entries.length) return entries
  }
  return []
}

/** The models a waiting or failed run tried, each with what it answered: "gemini-3.6-flash (Busy, status 503)". */
export function triedModelsText(run, language) {
  const error = run?.last_error && typeof run.last_error === 'object' ? run.last_error : run?.error && typeof run.error === 'object' ? run.error : null
  const entries = firstModelEntries(error?.attempts, error?.models, error?.passed_over)
  const page = aiCopy(language).page
  const parts = entries
    .filter((entry) => entry && typeof entry === 'object' && nonEmpty(entry.model))
    .map((entry) => {
      const outcome = entry.outcome ? page.outcomes[entry.outcome] || String(entry.outcome).replaceAll('_', ' ') : null
      const status = entry.http_status ? fill(page.httpStatus, { status: entry.http_status }) : null
      const detail = [outcome, status].filter(Boolean).join(language === 'ar' ? '، ' : ', ')
      return detail ? `${entry.model} (${detail})` : entry.model
    })
  return parts.length ? fill(aiCopy(language).run.modelsTried, { models: formatLocalizedList(parts, language) }) : null
}

/* ---------------------------------------------------------------- provenance */

const FALLBACK_REASON_OF = {
  busy: 'busy',
  quota: 'busy',
  circuit_opened: 'busy',
  timeout: 'timeout',
  timeout_budget: 'timeout',
  connection: 'timeout',
  skipped_budget: 'timeout',
  model_unavailable: 'unavailable',
  identity_mismatch: 'unavailable',
  unnamed_model: 'unavailable',
  invalid_reply: 'unusable',
  no_search: 'unusable',
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

/*
 * Why a step was passed over. A step skipped for its open circuit says why the
 * circuit opened (circuit_reason, fix review of 23 Oct 2026): busy for capacity,
 * unavailable for a model gone or answering as another. A skip that names no
 * reason reads as busy, the breaker's usual cause.
 */
function fallbackReason(entry) {
  if (entry.outcome === 'skipped_open_circuit') {
    return entry.circuit_reason ? FALLBACK_REASON_OF[entry.circuit_reason] || 'unavailable' : 'busy'
  }
  return FALLBACK_REASON_OF[entry.outcome] || 'unavailable'
}

/**
 * One AI result's provenance, as the note shows it:
 * `{ model, primary, position, chainLength, fallback, reason, manual }`, or null when
 * nothing names a model. Reads the `ai_provenance` object (§7.1) first, then the
 * older columns: `responding_model`, `model`, `ai_model`, `used_fallback_model`.
 */
export function readProvenance(source, legacy = {}) {
  const provenance = source && typeof source === 'object' ? source : null
  if (provenance?.source === 'manual' || provenance?.basis === 'manual') return { manual: true, model: null, fallback: false }

  const model = nonEmpty(provenance?.answering_model) || nonEmpty(provenance?.requested_model) || nonEmpty(legacy.responding_model) || nonEmpty(legacy.model) || nonEmpty(legacy.ai_model)
  if (!model) return null

  const chain = Array.isArray(provenance?.chain) ? provenance.chain.filter((name) => nonEmpty(name)) : []
  const position = Number(provenance?.position) || null
  const primary = nonEmpty(provenance?.primary_model) || chain[0] || nonEmpty(legacy.requested_model) || null
  // A row made before the provenance object says so only through used_fallback_model.
  const fallback = provenance
    ? provenance.used_fallback === true || (position != null && position > 1)
    : legacy.used_fallback_model === true

  const passedOver = Array.isArray(provenance?.passed_over) ? provenance.passed_over.filter((entry) => entry && typeof entry === 'object') : []
  const first = passedOver.find((entry) => entry.model === primary) || passedOver[0] || null
  const reason = first ? fallbackReason(first) : null

  return {
    manual: false,
    model,
    primary: fallback ? primary : null,
    position: fallback ? position : null,
    chainLength: chain.length || null,
    fallback,
    reason,
  }
}

/** The note's sentence for a provenance read by readProvenance(), in the language asked. */
export function provenanceText(read, language) {
  if (!read) return ''
  const copy = aiCopy(language).provenance
  if (read.manual) return copy.manual
  if (!read.fallback) return fill(copy.madeBy, { model: read.model })
  if (read.primary && read.position && read.chainLength && read.reason) {
    return fill(copy.madeByFallback, { model: read.model, position: read.position, n: read.chainLength, primary: read.primary, reason: copy.reasons[read.reason] })
  }
  return fill(copy.madeByFallbackShort, { model: read.model })
}

/** The model that answered one result, or null: for comparing two runs' figures. */
export function answeringModel(source, legacy = {}) {
  const read = readProvenance(source, legacy)
  return read && !read.manual ? read.model : null
}

/*
 * THE MODELS A SCREEN'S FIGURE STANDS ON (fix review of 23 Oct 2026). Pass 1's
 * answering model, and pass 2's when an employer search raised a component of
 * the figure: the server says which in figure_models. Two runs' figures compare
 * only when these are the same. A run from before figure_models: pass 1's model.
 */
export function screeningFigureModels(screening) {
  const stated = screening?.figure_models
  if (stated && typeof stated === 'object' && (nonEmpty(stated.pass_1) || nonEmpty(stated.pass_2))) {
    return [nonEmpty(stated.pass_1), nonEmpty(stated.pass_2)].filter(Boolean)
  }
  const one = answeringModel(screening?.ai_provenance?.pass_1, { responding_model: screening?.responding_model, model: screening?.requested_model })
  return one ? [one] : []
}

/** The figure's instrument as one comparable text ("a + b"), or null when no model is named. */
export function screeningInstrument(screening) {
  const models = screeningFigureModels(screening)
  return models.length ? models.join(' + ') : null
}

/*
 * Whether an entry-quiz question names its own maker (fix review of 23 Oct 2026):
 * made by another call than the set's draft, as a question regenerated later,
 * perhaps by another model of the chain. The set's line covers the rest.
 */
export function hasOwnProvenance(item, set) {
  const mine = item?.ai_provenance
  if (!mine || typeof mine !== 'object' || !nonEmpty(mine.answering_model)) return false
  const draft = set?.ai_provenance
  if (!draft || typeof draft !== 'object') return true
  return mine.call_id ? mine.call_id !== draft.call_id : mine.answering_model !== draft.answering_model
}

/*
 * The governed model chain the rules reference shows: gemini_governance.model_chain
 * .chain (ModelChain::describe()), or a top-level chain. Each step a name or { model }.
 */
export function governedChainSteps(gemini) {
  const chain = Array.isArray(gemini?.model_chain?.chain) ? gemini.model_chain.chain : Array.isArray(gemini?.chain) ? gemini.chain : []
  return chain.map((step) => (typeof step === 'string' ? step : step?.model)).filter((name) => nonEmpty(name))
}

/* ---------------------------------------------------------------- the banner */

function minutesSince(value, now) {
  const at = value ? Date.parse(value) : NaN
  return Number.isFinite(at) ? Math.max(0, Math.floor((now - at) / 60000)) : null
}

/** The status payload's families, each `{ family, status, serving_model, chain }`, limited to `only` when given. */
export function statusFamilies(status, only = null) {
  const families = Array.isArray(status?.families) ? status.families.filter((entry) => entry && typeof entry === 'object' && entry.family) : []
  return Array.isArray(only) && only.length ? families.filter((entry) => only.includes(entry.family)) : families
}

/**
 * What the banner says, or null when there is nothing to say (every family
 * concerned is ok and the monitor runs). `{ severity, lines }`: severity is the
 * worst of down (red), degraded (amber) and stale (grey); one line per kind.
 */
export function bannerState(status, { families = null, language = 'en', now = Date.now() } = {}) {
  if (!status || typeof status !== 'object') return null
  const copy = aiCopy(language).banner
  const concerned = statusFamilies(status, families)
  const names = (list) => formatLocalizedList(list.map((entry) => familyLabel(entry.family, language)), language)
  const lines = []

  const down = concerned.filter((entry) => entry.status === 'down')
  if (down.length) {
    // Each queued job waits up to the window from when IT was queued (fix review
    // of 23 Oct 2026): no single end time is true for all of them, so none is shown.
    const hours = Number(status.window_hours) || Number(status.queued_retry_window_hours) || AI_RETRY_WINDOW_HOURS
    lines.push({ kind: 'down', text: fill(copy.down, { families: names(down), hours }) })
  }

  const degraded = concerned.filter((entry) => entry.status === 'degraded')
  if (degraded.length) {
    const serving = [...new Set(degraded.map((entry) => nonEmpty(entry.serving_model)).filter(Boolean))]
    lines.push({ kind: 'degraded', text: fill(copy.degraded, { families: names(degraded), model: serving.length ? formatLocalizedList(serving, language) : '—' }) })
  }

  const unchecked = status.monitor_running === false || status.overall === 'unknown' || concerned.some((entry) => entry.status === 'unknown')
  if (unchecked && !down.length && !degraded.length) {
    const minutes = minutesSince(status.checked_at, now)
    lines.push({ kind: 'stale', text: minutes == null ? copy.staleNever : fill(copy.stale, { minutes }) })
  }

  if (!lines.length) return null
  const severity = lines.some((line) => line.kind === 'down') ? 'down' : lines.some((line) => line.kind === 'degraded') ? 'degraded' : 'stale'
  return { severity, lines }
}

/* ------------------------------------------------- the instant requests' 503 */

/** Whether an error is the instant requests' busy answer (HTTP 503, code ai_busy_retry_later). */
export function isAiBusyRetryLater(error) {
  const data = error?.response?.data
  if (Number(error?.response?.status) !== 503 || !data || typeof data !== 'object') return false
  return data.code === 'ai_busy_retry_later' || data.error === 'ai_busy_retry_later' || data.error?.code === 'ai_busy_retry_later'
    || Boolean(data.errors && Object.prototype.hasOwnProperty.call(data.errors, 'ai_busy_retry_later'))
}

/** The models the busy answer names, from `models`, `attempts`, `passed_over` or `reason_codes` (a list or keyed by model), distinct and in order. */
function busyModels(data) {
  const lists = [data?.models, data?.attempts, data?.passed_over, data?.error?.models, data?.reason_codes]
  const names = lists.flatMap((value) => modelEntries(value)).map((entry) => entry?.model).filter((name) => nonEmpty(name))
  return [...new Set(names)]
}

/** The busy answer's sentence, or null when the error is something else. */
export function aiBusyMessage(error, language) {
  if (!isAiBusyRetryLater(error)) return null
  const copy = aiCopy(language).errors
  const models = busyModels(error.response.data)
  return models.length ? fill(copy.busyRetryLater, { models: formatLocalizedList(models, language) }) : copy.busyRetryLaterNoModels
}

/** Whether a settings save was refused because the model is set by the chain (422 model_set_by_chain, D16). */
export function isModelSetByChain(error) {
  const data = error?.response?.data
  if (Number(error?.response?.status) !== 422 || !data) return false
  if (data.code === 'model_set_by_chain') return true
  return Object.entries(data.errors || {}).some(([key, lines]) => key === 'model_set_by_chain' || [].concat(lines).some((line) => String(line).includes('model_set_by_chain')))
}
