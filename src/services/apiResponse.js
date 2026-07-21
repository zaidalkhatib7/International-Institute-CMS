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
  nl: {
    request: 'Het verzoek kon niet worden voltooid.',
    network: 'Kan geen verbinding maken met de server. Controleer de verbinding en probeer opnieuw.',
    timeout: 'Het verzoek duurde langer dan verwacht. Probeer het opnieuw.',
    unavailable: 'De dienst is tijdelijk niet beschikbaar. Probeer het over een ogenblik opnieuw.',
    unauthorized: 'Uw sessie is verlopen. Meld u opnieuw aan.',
    forbidden: 'U hebt geen toestemming om deze actie uit te voeren.',
    notFound: 'Het gevraagde record kon niet worden gevonden.',
    invalid: 'De actie kon niet worden voltooid. Controleer de gegevens en vereisten en probeer opnieuw.',
    conflict: 'Deze actie conflicteert met de huidige status van het record. Vernieuw de pagina en probeer opnieuw.',
    server: 'Er is een onverwachte serverfout opgetreden. Probeer het later opnieuw.',
  },
}

export function readApiError(error, fallback, language = getAdminLanguage()) {
  const copy = genericErrors[language] || genericErrors.en
  if (error?.code === 'ECONNABORTED' || /timeout/i.test(error?.message || '')) return copy.timeout
  if (!error?.response || /network error/i.test(error?.message || '')) return copy.network
  const status = Number(error?.response?.status)
  if ([502, 503, 504].includes(status)) return copy.unavailable

  const message = error?.response?.data?.message || error?.message
  if (language === 'en') return readLocalized(message, language) || fallback || copy.request
  if (typeof message === 'object') {
    const localizedMessage = readLocalized(message, language)
    if (localizedMessage) return localizedMessage
  }
  if (language === 'ar' && typeof message === 'string' && /[\u0600-\u06ff]/.test(message)) return message
  if (fallback) return fallback

  if (status === 401) return copy.unauthorized
  if (status === 403) return copy.forbidden
  if (status === 404) return copy.notFound
  if (status === 409) return copy.conflict
  if (status === 422) return copy.invalid
  if (status >= 500) return copy.server
  return copy.request
}

export function readLocalized(value, language = 'ar') {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value)

  return value?.[language] || value?.en || value?.ar || value?.nl || ''
}
