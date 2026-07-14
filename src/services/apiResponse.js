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

export function readApiError(error, fallback = 'Request failed.') {
  const message = error?.response?.data?.message || error?.message
  return message || fallback
}

export function readLocalized(value, language = 'ar') {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value)

  return value?.[language] || value?.ar || value?.en || value?.nl || ''
}
