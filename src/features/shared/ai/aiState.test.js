import { describe, expect, it } from 'vitest'
import { AI_COPY } from './aiCopy'
import {
  aiBusyMessage,
  aiErrorClass,
  aiErrorMessage,
  aiGenerationOf,
  aiRunPollDelay,
  AI_RUN_POLL_MS,
  AI_RUN_WAITING_POLL_MS,
  answeringModel,
  bannerState,
  governedChainSteps,
  hasOwnProvenance,
  isAiBusyRetryLater,
  isAiRunInFlight,
  isModelSetByChain,
  provenanceText,
  readProvenance,
  retryTargetOf,
  screeningFigureModels,
  screeningInstrument,
  triedModelsText,
  waitingRetryLines,
} from './aiState'
import { FALLBACK_PROVENANCE, PRIMARY_PROVENANCE, busyRetryLaterError, degradedStatus, downStatus, okStatus, staleStatus, waitingRun } from '../../../test/aiFixtures'

/*
 * THE AI SERVICE, READ FROM THE SERVER (AI-RESILIENCE-SPEC §5.2, §6.4, §7): the
 * banner's lines, the provenance sentence, the run states and the busy answer,
 * in Arabic and English.
 */

describe('the banner state', () => {
  it('says nothing while every family is ok and the monitor runs', () => {
    expect(bannerState(okStatus(), { language: 'en' })).toBeNull()
    expect(bannerState(null)).toBeNull()
  })

  it('is amber on a backup model and names the serving model', () => {
    const state = bannerState(degradedStatus(), { language: 'en' })
    expect(state.severity).toBe('degraded')
    expect(state.lines[0].text).toBe('The AI service is running on a backup model for: Case file analysis. Serving now: gemini-3.1-pro-preview. Every result shows the model that made it.')
    expect(bannerState(degradedStatus(), { language: 'ar' }).lines[0].text).toBe('خدمة الذكاء الاصطناعي تعمل الآن بنموذج احتياطي في: تحليل ملفات الطلبات. النموذج العامل: gemini-3.1-pro-preview. كل نتيجة تُظهر النموذج الذي أعدّها.')
  })

  it('is red when no model of a family answers; each queued job waits up to the window from when IT was queued, so no single end time is given', () => {
    // Fix review of 23 Oct 2026: the earliest incident + 6 h was wrong both ways.
    const state = bannerState(downStatus(), { language: 'en' })
    expect(state.severity).toBe('down')
    expect(state.lines[0].text).toBe('The AI service is unavailable for: Package and content authoring. Each queued AI job retries automatically for up to 6 hours from when it was queued; you can continue by hand.')
    expect(bannerState(downStatus(), { language: 'ar' }).lines[0].text).toBe('خدمة الذكاء الاصطناعي غير متاحة الآن في: إعداد الحزم والمحتوى. يُعاد كل عمل مجدول تلقائيًا مدة تصل إلى 6 ساعات من وقت طلبه، ويمكنك المتابعة يدويًا.')
    // The server's window_hours is the figure.
    expect(bannerState({ ...downStatus(), window_hours: 3 }, { language: 'en' }).lines[0].text).toContain('for up to 3 hours from when it was queued')
  })

  it('is grey when the monitor has not checked, with the minutes, a count agreeing in Arabic', () => {
    const status = staleStatus()
    const now = Date.parse(status.checked_at) + 45 * 60000
    expect(bannerState(status, { language: 'en', now })).toEqual({ severity: 'stale', lines: [{ kind: 'stale', text: 'The AI service has not been checked for 45 minutes.' }] })
    expect(bannerState(status, { language: 'ar', now }).lines[0].text).toBe('لم يُفحص وضع خدمة الذكاء الاصطناعي منذ 45 دقيقة.')
    const fiveMinutes = Date.parse(status.checked_at) + 5 * 60000
    expect(bannerState(status, { language: 'ar', now: fiveMinutes }).lines[0].text).toBe('لم يُفحص وضع خدمة الذكاء الاصطناعي منذ 5 دقائق.')
    expect(bannerState({ ...staleStatus(), checked_at: null }, { language: 'en' }).lines[0].text).toBe('The AI service has not been checked yet.')
  })

  it('looks only at the families a screen uses', () => {
    expect(bannerState(degradedStatus(), { families: ['authoring', 'interactive'], language: 'en' })).toBeNull()
    expect(bannerState(downStatus(), { families: ['case_analysis'], language: 'en' })).toBeNull()
    expect(bannerState(downStatus(), { families: ['authoring'], language: 'en' }).severity).toBe('down')
  })

  it('shows red and amber together, red first, when one family is down and another degraded', () => {
    const status = downStatus()
    status.families[0] = degradedStatus().families[0]
    const state = bannerState(status, { language: 'en' })
    expect(state.severity).toBe('down')
    expect(state.lines.map((line) => line.kind)).toEqual(['down', 'degraded'])
  })
})

describe('the provenance of one result', () => {
  it('reads a primary answer as "Made by"', () => {
    expect(provenanceText(readProvenance(PRIMARY_PROVENANCE), 'en')).toBe('Made by gemini-3.6-flash')
    expect(provenanceText(readProvenance(PRIMARY_PROVENANCE), 'ar')).toBe('أعدّه: gemini-3.6-flash')
  })

  it('reads a fallback answer with its step, the first model and why it was passed over', () => {
    expect(provenanceText(readProvenance(FALLBACK_PROVENANCE), 'en')).toBe('Made by fallback model gemini-3.1-pro-preview (step 2 of 3); the first model gemini-3.6-flash was busy.')
    expect(provenanceText(readProvenance(FALLBACK_PROVENANCE), 'ar')).toBe('أعدّه النموذج الاحتياطي gemini-3.1-pro-preview (الخطوة 2 من 3)؛ النموذج الأول gemini-3.6-flash كان مشغولًا.')
  })

  it.each([
    ['timeout', 'not answering in time', 'لم يُجب في الوقت المحدد'],
    ['timeout_budget', 'not answering in time', 'لم يُجب في الوقت المحدد'],
    ['connection', 'not answering in time', 'لم يُجب في الوقت المحدد'],
    ['model_unavailable', 'unavailable', 'غير متاح'],
    ['skipped_open_circuit', 'busy', 'مشغولًا'],
    ['invalid_reply', 'not giving a usable answer', 'لم يُعطِ إجابة صالحة'],
  ])('names a %s first model in both languages', (outcome, en, ar) => {
    const read = readProvenance({ ...FALLBACK_PROVENANCE, passed_over: [{ model: 'gemini-3.6-flash', outcome }] })
    expect(provenanceText(read, 'en')).toMatch(new RegExp(`was ${en}\\.$`))
    expect(provenanceText(read, 'ar')).toMatch(new RegExp(`كان ${ar}\\.$`))
  })

  it.each([
    ['identity_mismatch', 'unavailable', 'غير متاح'],
    ['model_unavailable', 'unavailable', 'غير متاح'],
    ['unnamed_model', 'unavailable', 'غير متاح'],
    ['busy', 'busy', 'مشغولًا'],
    ['timeout', 'not answering in time', 'لم يُجب في الوقت المحدد'],
  ])('names a first model skipped for a circuit opened by %s by that reason, not "busy"', (circuitReason, en, ar) => {
    // Fix review of 23 Oct 2026: a circuit opened for a configuration fault stays
    // open an hour, and every result in it said the first model "was busy".
    const read = readProvenance({ ...FALLBACK_PROVENANCE, passed_over: [{ model: 'gemini-3.6-flash', outcome: 'skipped_open_circuit', http_status: null, circuit_reason: circuitReason }] })
    expect(provenanceText(read, 'en')).toMatch(new RegExp(`was ${en}\\.$`))
    expect(provenanceText(read, 'ar')).toMatch(new RegExp(`كان ${ar}\\.$`))
  })

  it('reads the older columns of a row made before the provenance object', () => {
    expect(provenanceText(readProvenance(null, { model: 'gemini-flash-latest' }), 'en')).toBe('Made by gemini-flash-latest')
    expect(provenanceText(readProvenance(null, { ai_model: 'gemini-2.5-flash', responding_model: 'gemini-2.5-flash', used_fallback_model: true }), 'en')).toBe('Made by fallback model gemini-2.5-flash.')
    expect(readProvenance(null, {})).toBeNull()
  })

  it('reads a result written by hand', () => {
    expect(provenanceText(readProvenance({ source: 'manual' }), 'en')).toBe('Written by hand')
    expect(provenanceText(readProvenance({ basis: 'manual' }), 'ar')).toBe('كُتب يدويًا')
  })

  it('gives the answering model for comparing two runs', () => {
    expect(answeringModel(FALLBACK_PROVENANCE)).toBe('gemini-3.1-pro-preview')
    expect(answeringModel(null, { responding_model: 'gemini-3.6-flash', model: 'gemini-3.1-pro-preview' })).toBe('gemini-3.6-flash')
    expect(answeringModel({ source: 'manual' })).toBeNull()
  })
})

describe('a queued step\'s run', () => {
  it('is in flight while queued, running or waiting to retry, and is read again at its own pace', () => {
    expect(['queued', 'running', 'waiting_retry'].map((status) => isAiRunInFlight({ status }))).toEqual([true, true, true])
    expect(isAiRunInFlight({ status: 'failed' })).toBe(false)
    expect(aiRunPollDelay({ status: 'running' })).toBe(AI_RUN_POLL_MS)
    expect(aiRunPollDelay({ status: 'waiting_retry' })).toBe(AI_RUN_WAITING_POLL_MS)
    expect(aiRunPollDelay({ status: 'completed' })).toBeNull()
  })

  it('says when the next try is, which try, until when, and that the work can go on by hand', () => {
    const lines = waitingRetryLines(waitingRun(), 'en')
    expect(lines[0]).toBe('The AI service is busy, so this work is waiting to retry on its own.')
    expect(lines.some((line) => line.startsWith('Next try: '))).toBe(true)
    expect(lines).toContain('This is try 2 of 11.')
    expect(lines.some((line) => /^It keeps trying until .+; nothing needs to be done\.$/.test(line))).toBe(true)
    expect(lines.at(-1)).toBe('You can continue by hand meanwhile.')
    expect(waitingRetryLines(waitingRun(), 'ar')).toContain('هذه المحاولة 2 من 11.')
  })

  it('names the models it tried and what each answered', () => {
    expect(triedModelsText(waitingRun(), 'en')).toBe('Models tried: gemini-3.6-flash (Busy, status 503) and gemini-3.1-pro-preview (Did not answer in time).')
    expect(triedModelsText({ status: 'waiting_retry' }, 'en')).toBeNull()
  })

  it('reads the models tried as the server keys them by model name, too (fix review of 23 Oct 2026)', () => {
    const keyed = { status: 'waiting_retry', error: { code: 'ai_busy', models: { 'gemini-3.6-flash': { outcome: 'busy', http_status: 503 }, 'gemini-3.5-flash-lite': { outcome: 'timeout', http_status: null } } } }
    expect(triedModelsText(keyed, 'en')).toBe('Models tried: gemini-3.6-flash (Busy, status 503) and gemini-3.5-flash-lite (Did not answer in time).')
  })

  it('knows the run Retry now restarts by its own kind and subject, and only those kinds', () => {
    expect(retryTargetOf(waitingRun({ kind: 'course_plan', subject_id: 31 }))).toEqual({ kind: 'course_plan', subjectId: 31 })
    expect(retryTargetOf(waitingRun({ kind: 'academic_diagnostic', subject_id: 0 }))).toEqual({ kind: 'academic_diagnostic', subjectId: 0 })
    expect(retryTargetOf({ status: 'waiting_retry' })).toBeNull()
    expect(retryTargetOf(waitingRun({ kind: 'something_else' }))).toBeNull()
    expect(retryTargetOf(waitingRun({ subject_id: null }))).toBeNull()
    expect(retryTargetOf(null)).toBeNull()
  })

  it.each([
    ['provider_http_503', null, 'busy'],
    ['ai_busy', null, 'busy'],
    ['provider_timeout', null, 'timeout'],
    ['provider_unreachable', null, 'unreachable'],
    ['ai_unavailable_window_exhausted', null, 'windowExhausted'],
    ['model_unavailable', null, 'configuration'],
    ['ai_request_refused', null, 'refused'],
    ['something_new', 'busy', 'busy'],
  ])('words the code %s (%s)', (code, errorClass, key) => {
    expect(aiErrorMessage(code, errorClass, 'en')).toBe(AI_COPY.en.errors[key])
    expect(aiErrorMessage(code, errorClass, 'ar')).toBe(AI_COPY.ar.errors[key])
  })

  it('leaves a code it does not know to the panel', () => {
    expect(aiErrorMessage('generation_error', null, 'en')).toBeNull()
    expect(aiErrorClass('generation_error')).toBeNull()
  })

  it('finds a step\'s run on its record, under either name', () => {
    expect(aiGenerationOf({ final_evaluation_generation: { status: 'queued' } }, 'final_evaluation')).toEqual({ status: 'queued' })
    expect(aiGenerationOf({ generations: { advisory: { status: 'running' } } }, 'advisory')).toEqual({ status: 'running' })
    expect(aiGenerationOf({}, 'advisory')).toBeNull()
    expect(aiGenerationOf(null, 'advisory')).toBeNull()
  })
})

describe('the instant requests\' busy answer', () => {
  it('names the models from the keyed reason_codes when the answer carries no list', () => {
    const error = busyRetryLaterError()
    delete error.response.data.models
    expect(aiBusyMessage(error, 'en')).toBe('The AI service is busy right now (Google reported high demand on gemini-3.6-flash and gemini-3.5-flash-lite). Nothing was saved. Try again in a few minutes, or continue by hand.')
  })

  it('is the 503 ai_busy_retry_later, with the models named', () => {
    expect(isAiBusyRetryLater(busyRetryLaterError())).toBe(true)
    expect(aiBusyMessage(busyRetryLaterError(), 'en')).toBe('The AI service is busy right now (Google reported high demand on gemini-3.6-flash and gemini-3.5-flash-lite). Nothing was saved. Try again in a few minutes, or continue by hand.')
    expect(aiBusyMessage(busyRetryLaterError(), 'ar')).toMatch(/^خدمة الذكاء الاصطناعي مشغولة الآن \(أبلغت Google عن ضغط مرتفع على gemini-3\.6-flash و\s?gemini-3\.5-flash-lite\)\. لم يُحفظ شيء\./)
  })

  it('is nothing else: another 503, a 422 or a network failure', () => {
    expect(aiBusyMessage({ response: { status: 503, data: { message: 'Down for maintenance' } } }, 'en')).toBeNull()
    expect(aiBusyMessage({ response: { status: 422, data: { code: 'ai_busy_retry_later' } } }, 'en')).toBeNull()
    expect(aiBusyMessage(new Error('Network Error'), 'en')).toBeNull()
    expect(aiBusyMessage({ response: { status: 503, data: { errors: { ai_busy_retry_later: ['Busy.'] } } } }, 'en')).toBe(AI_COPY.en.errors.busyRetryLaterNoModels)
  })

  it('knows the settings refusal of a model key', () => {
    expect(isModelSetByChain({ response: { status: 422, data: { code: 'model_set_by_chain' } } })).toBe(true)
    expect(isModelSetByChain({ response: { status: 422, data: { errors: { gemini_advisory_model: ['model_set_by_chain: The model is set by the server\'s AI model chain.'] } } } })).toBe(true)
    expect(isModelSetByChain({ response: { status: 422, data: { errors: { appeal_window_days: ['Too long.'] } } } })).toBe(false)
  })
})

describe('the screen\'s figure, the questions\' own makers and the governed chain (fix review of 23 Oct 2026)', () => {
  it('reads the models a screen\'s figure stands on, pass 2\'s only when the server counts it', () => {
    expect(screeningFigureModels({ figure_models: { pass_1: 'gemini-3.6-flash', pass_2: 'gemini-3.5-flash-lite' } })).toEqual(['gemini-3.6-flash', 'gemini-3.5-flash-lite'])
    expect(screeningFigureModels({ figure_models: { pass_1: 'gemini-3.6-flash', pass_2: null } })).toEqual(['gemini-3.6-flash'])
    expect(screeningInstrument({ figure_models: { pass_1: 'a', pass_2: 'b' } })).toBe('a + b')
    // A run from before figure_models: pass 1's answering model.
    expect(screeningFigureModels({ ai_provenance: { pass_1: FALLBACK_PROVENANCE } })).toEqual(['gemini-3.1-pro-preview'])
    expect(screeningFigureModels({ responding_model: 'gemini-2.5-flash' })).toEqual(['gemini-2.5-flash'])
    expect(screeningInstrument({})).toBeNull()
  })

  it('gives a question its own note only when another call made it', () => {
    const set = { ai_provenance: { ...PRIMARY_PROVENANCE, call_id: 'c-1' } }
    expect(hasOwnProvenance({ ai_provenance: { ...PRIMARY_PROVENANCE, call_id: 'c-1' } }, set)).toBe(false)
    expect(hasOwnProvenance({ ai_provenance: { ...FALLBACK_PROVENANCE, call_id: 'c-2' } }, set)).toBe(true)
    expect(hasOwnProvenance({ ai_provenance: FALLBACK_PROVENANCE }, { ai_provenance: PRIMARY_PROVENANCE })).toBe(true)
    expect(hasOwnProvenance({ ai_provenance: PRIMARY_PROVENANCE }, { ai_provenance: PRIMARY_PROVENANCE })).toBe(false)
    expect(hasOwnProvenance({ ai_provenance: PRIMARY_PROVENANCE }, {})).toBe(true)
    expect(hasOwnProvenance({}, set)).toBe(false)
  })

  it('reads the governed chain where the server sends it', () => {
    expect(governedChainSteps({ model: 'gemini-3.6-flash', model_chain: { chain: ['gemini-3.6-flash', 'gemini-3.1-pro-preview', 'gemini-3.5-flash-lite'] } })).toEqual(['gemini-3.6-flash', 'gemini-3.1-pro-preview', 'gemini-3.5-flash-lite'])
    expect(governedChainSteps({ chain: [{ model: 'a' }, 'b'] })).toEqual(['a', 'b'])
    expect(governedChainSteps({ model: 'gemini-3.6-flash' })).toEqual([])
  })
})

describe('the copy', () => {
  it('has the same keys in Arabic and English, and no RPL, API or CMS in Arabic', () => {
    const keys = (value, prefix = '') => Object.entries(value).flatMap(([key, entry]) => (entry && typeof entry === 'object' ? keys(entry, `${prefix}${key}.`) : [`${prefix}${key}`])).sort()
    expect(keys(AI_COPY.ar)).toEqual(keys(AI_COPY.en))
    const strings = (value) => Object.values(value).flatMap((entry) => (entry && typeof entry === 'object' ? strings(entry) : [entry]))
    for (const text of strings(AI_COPY.ar)) expect(text).not.toMatch(/RPL|\bAPI\b|CMS|undefined/)
    expect(JSON.stringify(AI_COPY)).not.toMatch(/"nl"/)
  })
})
