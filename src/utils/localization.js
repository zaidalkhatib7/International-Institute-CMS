import { ADMIN_LANGUAGE_METADATA, getAdminLanguage, normalizeAdminLanguage } from '../services/languageStorage'

const FALLBACK_ORDER = ['en', 'ar', 'nl']

export function getCurrentLanguage() {
  return getAdminLanguage()
}

export function isArabicLanguage(language = getCurrentLanguage()) {
  return normalizeAdminLanguage(language) === 'ar'
}

export function pickText(translations = {}, language = getCurrentLanguage()) {
  return readLocalizedValue(translations, language)
}

export function getLocaleForLanguage(language = getCurrentLanguage()) {
  return ADMIN_LANGUAGE_METADATA[normalizeAdminLanguage(language)].locale
}

export function getDirectionForLanguage(language = getCurrentLanguage()) {
  return ADMIN_LANGUAGE_METADATA[normalizeAdminLanguage(language)].direction
}

export function readLocalizedValue(value, preferredLanguage = getCurrentLanguage()) {
  if (!value) return ''
  if (typeof value === 'string') return value

  const language = normalizeAdminLanguage(preferredLanguage)
  const orderedKeys = [language, ...FALLBACK_ORDER].filter(
    (key, index, arr) => key && arr.indexOf(key) === index
  )

  for (const key of orderedKeys) {
    const candidate = value?.[key]
    if (typeof candidate === 'string' && candidate.trim()) return candidate
  }

  const firstNonEmpty = Object.values(value).find(
    (candidate) => typeof candidate === 'string' && candidate.trim()
  )

  return firstNonEmpty || ''
}

export function formatLocalizedNumber(value, language = getCurrentLanguage(), options = {}) {
  return new Intl.NumberFormat(getLocaleForLanguage(language), options).format(Number(value) || 0)
}

export function formatLocalizedDate(value, language = getCurrentLanguage(), options = { dateStyle: 'medium' }) {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(getLocaleForLanguage(language), options).format(date)
}

export function formatLocalizedDateTime(value, language = getCurrentLanguage()) {
  return formatLocalizedDate(value, language, { dateStyle: 'medium', timeStyle: 'short' })
}

export function formatLocalizedList(values = [], language = getCurrentLanguage(), options = {}) {
  return new Intl.ListFormat(getLocaleForLanguage(language), { style: 'long', type: 'conjunction', ...options })
    .format(values.filter(Boolean).map(String))
}
