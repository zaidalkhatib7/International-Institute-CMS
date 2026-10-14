import { ADMIN_LANGUAGE_METADATA, getAdminLanguage, normalizeAdminLanguage } from '../services/languageStorage'

const FALLBACK_ORDER = ['en', 'ar']

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

  // A stored `nl` is never shown: it was retired on 13 Oct 2026 (Arabic and English only).
  const firstNonEmpty = Object.entries(value).find(
    ([key, candidate]) => key !== 'nl' && typeof candidate === 'string' && candidate.trim()
  )?.[1]

  return firstNonEmpty || ''
}

/**
 * Stored English only, with no fallback to another language. An editor's EN field
 * reads this, so text in another language is never pre-filled there and then saved
 * under `en`. A legacy plain string counts as English.
 */
export function readStoredEnglish(value) {
  if (typeof value === 'string') return value
  return typeof value?.en === 'string' ? value.en : ''
}

/**
 * True when an editor's value has text in English or in Arabic. Either language
 * alone is a value: content an AI run authored in Arabic has no English, and an
 * editor must still be able to save it without inventing a translation.
 */
export function hasPlatformText(value) {
  return [value?.en, value?.ar].some((text) => typeof text === 'string' && text.trim() !== '')
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
