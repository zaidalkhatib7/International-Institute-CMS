import { getAdminLanguage } from '../services/languageStorage'

const FALLBACK_ORDER = ['en', 'ar', 'nl']

export function getCurrentLanguage() {
  return getAdminLanguage()
}

export function isArabicLanguage(language = getCurrentLanguage()) {
  return language === 'ar'
}

export function pickText(translations = {}, language = getCurrentLanguage()) {
  return translations?.[language] || translations?.en || ''
}

export function getLocaleForLanguage(language = getCurrentLanguage()) {
  if (language === 'ar') return 'ar-EG'
  if (language === 'nl') return 'nl-NL'
  return 'en-GB'
}

export function readLocalizedValue(value, preferredLanguage = getCurrentLanguage()) {
  if (!value) return ''
  if (typeof value === 'string') return value

  const orderedKeys = [preferredLanguage, ...FALLBACK_ORDER].filter(
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
