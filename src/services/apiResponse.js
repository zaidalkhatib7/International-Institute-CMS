import { getAdminLanguage } from './languageStorage'

export function unwrapApiData(payload) {
  return payload?.data ?? payload
}

export function unwrapCollection(payload) {
  const data = unwrapApiData(payload)

  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(payload?.data?.data)) return payload.data.data

  return []
}

export function readPagination(payload) {
  const data = unwrapApiData(payload)

  return {
    currentPage: Number(data?.current_page ?? 1),
    lastPage: Number(data?.last_page ?? 1),
    perPage: Number(data?.per_page ?? 0),
    total: Number(data?.total ?? unwrapCollection(payload).length),
  }
}

const genericErrors = {
  ar: {
    request: 'تعذر إكمال الطلب.',
    network: 'تعذر الاتصال بالخادم. تحقق من الاتصال ثم أعد المحاولة.',
    timeout: 'استغرق الطلب وقتًا أطول من المتوقع. أعد المحاولة.',
    unavailable: 'الخدمة غير متاحة مؤقتًا. أعد المحاولة بعد قليل.',
    unauthorized: 'انتهت جلسة الدخول. سجّل الدخول مرة أخرى.',
    forbidden: 'ليست لديك صلاحية تنفيذ هذا الإجراء.',
    notFound: 'تعذر العثور على السجل المطلوب.',
    invalid: 'تعذر إكمال الإجراء. تحقق من البيانات والمتطلبات ثم أعد المحاولة.',
    conflict: 'يتعارض هذا الإجراء مع الحالة الحالية للسجل. حدّث الصفحة ثم أعد المحاولة.',
    server: 'حدث خطأ غير متوقع في الخادم. أعد المحاولة لاحقًا.',
  },
  en: {
    request: 'The request could not be completed.',
    network: 'Could not connect to the server. Check the connection and try again.',
    timeout: 'The request took longer than expected. Please try again.',
    unavailable: 'The service is temporarily unavailable. Please try again shortly.',
    unauthorized: 'Your session has expired. Sign in again.',
    forbidden: 'You do not have permission to perform this action.',
    notFound: 'The requested record could not be found.',
    invalid: 'The action could not be completed. Check the data and requirements, then try again.',
    conflict: 'This action conflicts with the record’s current state. Refresh and try again.',
    server: 'An unexpected server error occurred. Please try again later.',
  },
}

/**
 * Every distinct validation message the server sent, as one readable block.
 *
 * Laravel returns `errors` as {field: [messages]}. Flattened and de-duplicated,
 * because the top-level `message` is only the first one plus "(and 2 more
 * errors)" — and the ones it drops are usually the actionable ones.
 */
/*
 * FIXED SERVER LINES THE PLATFORM KNOWS (platform walk, 17 Oct 2026, UI-13).
 *
 * The rule above stands: a 422's own words are shown, whatever their language.
 * A line the server writes from a fixed template, though, has an Arabic reading
 * here, so the Arabic platform does not show it in English. A line not listed
 * is shown as the server wrote it.
 */
const KNOWN_SERVER_LINES = [
  {
    pattern: /^Published package v(.+) is immutable\. Create a new version to modify content\.$/,
    ar: (match) => `الإصدار ${match[1]} من هذه الحقيبة منشور ومحتواه ثابت: افتح إصدارًا جديدًا من الحقيبة لتعديل المحتوى.`,
  },
  /*
   * The first path's fixed lines met on the walk of 18 Oct 2026: Gemini without a
   * key (course plan, entry quiz, screening), and an office draft sent before it
   * is complete (RplCompletenessService::assertReadyForSubmission).
   */
  {
    pattern: /^Gemini is not configured in the backend environment\.$/,
    ar: () => 'لم يُضبط Gemini على الخادم، فلا يمكن تشغيله الآن. اطلب من مسؤول المنصة ضبطه ثم أعد المحاولة.',
  },
  {
    pattern: /^Gemini model is not configured in the backend environment\.$/,
    ar: () => 'لم يُحدَّد نموذج Gemini على الخادم. اطلب من مسؤول المنصة ضبطه ثم أعد المحاولة.',
  },
  {
    pattern: /^The RPL application is incomplete\. Choose the target accreditation level, upload the required evidence \(an identity document and either a CV or a professional experience document\), and accept the current declaration\.$/,
    ar: () => 'الطلب غير مكتمل: اختر المستوى المطلوب، وارفع الوثائق المطلوبة (وثيقة هوية، وسيرة ذاتية أو وثيقة خبرة مهنية)، واقبل الإقرار الحالي.',
  },
  {
    pattern: /^Current completion is ([\d.]+)% \((\d+) of (\d+) requirements complete\)\.$/,
    ar: (match) => `نسبة الاكتمال الآن ${match[1]}٪ (اكتمل ${match[2]} من ${match[3]} متطلبات).`,
  },
  {
    pattern: /^All open information requests must be resolved before assessment\.$/,
    ar: () => 'أغلق طلبات المعلومات المفتوحة كلها قبل التقييم.',
  },
  {
    pattern: /^The applicable RPL fee must be reconciled before the application can be submitted\.$/,
    ar: () => 'يجب تأكيد دفع الرسوم المستحقة قبل إرسال الطلب.',
  },
]

export function translateServerLine(line, language = getAdminLanguage()) {
  if (language !== 'ar' || typeof line !== 'string') return line
  for (const known of KNOWN_SERVER_LINES) {
    const match = known.pattern.exec(line.trim())
    if (match) return known.ar(match)
  }
  return line
}

function readValidationDetail(error, language) {
  const errors = error?.response?.data?.errors
  if (! errors || typeof errors !== 'object') return ''

  const seen = new Set()
  for (const value of Object.values(errors)) {
    for (const line of [].concat(value)) {
      if (typeof line === 'string' && line.trim() !== '') seen.add(translateServerLine(line.trim(), language))
    }
  }

  return [...seen].join('\n')
}

export function readApiError(error, fallback, language = getAdminLanguage()) {
  const copy = genericErrors[language] || genericErrors.en
  if (error?.code === 'ECONNABORTED' || /timeout/i.test(error?.message || '')) return copy.timeout
  if (!error?.response || /network error/i.test(error?.message || '')) return copy.network
  const status = Number(error?.response?.status)
  if ([502, 503, 504].includes(status)) return copy.unavailable

  /*
   * A 422 CARRIES THE REASON. SHOW IT, WHATEVER LANGUAGE IT IS IN.
   *
   * Clicking "generate AI package" on a programme with no approved competencies
   * produced "check the data and requirements, then try again" — while the server
   * had actually replied:
   *
   *   PROGRAMME_AUTHORING_NOT_GOVERNANCE_READY: NO APPROVED GOVERNED INPUT ->
   *   NO GENERATE ... zero approved professional competency mappings ...
   *   zero active governed learning outcomes.
   *
   * Three precise, actionable sentences, discarded for a vague one, because the
   * server writes governance errors in English and the operator was reading
   * Arabic. For validation specifically that is the wrong trade: a precise
   * message in the other language beats a fluent message that says nothing. The
   * generic line is kept as a heading so the sentence still opens in the reader's
   * own language.
   */
  if (status === 422) {
    const detail = readValidationDetail(error, language)
    if (detail !== '') return copy.invalid + '\n\n' + detail
  }

  const message = error?.response?.data?.message || error?.message
  if (language === 'en') return readLocalized(message, language) || fallback || copy.request
  if (typeof message === 'object') {
    const localizedMessage = readLocalized(message, language)
    if (localizedMessage) return localizedMessage
  }
  if (language === 'ar' && typeof message === 'string' && /[\u0600-\u06ff]/.test(message)) return message

  /*
   * A KNOWN STATUS BEATS THE CALLER'S GENERIC FALLBACK.
   *
   * `if (fallback) return fallback` used to sit above this block, and since
   * practically every caller passes one, none of these were ever reachable for
   * ar. A deliberate 403 \u2014 "only the owning administrator may access this
   * evaluation" \u2014 surfaced as whatever generic sentence the page happened to
   * supply, in this case "could not load assessment data", which reads like a
   * network fault and sends the reader looking in the wrong place.
   *
   * The page fallback is the right answer only when the status says nothing
   * useful, so it now comes after these rather than instead of them.
   */
  if (status === 401) return copy.unauthorized
  if (status === 403) return copy.forbidden
  if (status === 404) return copy.notFound
  if (status === 409) return copy.conflict
  if (status === 422) return copy.invalid
  if (status >= 500) return copy.server

  if (fallback) return fallback
  return copy.request
}

export function readLocalized(value, language = 'ar') {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value)

  return value?.[language] || value?.en || value?.ar || ''
}
