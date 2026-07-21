import { apiConfig } from '../config/api'

const SUPPORTED_LANGUAGES = ['ar', 'en', 'nl']
const DEFAULT_LANGUAGE = 'ar'

export const ADMIN_LANGUAGE_METADATA = Object.freeze({
  ar: Object.freeze({ code: 'ar', locale: 'ar-EG', direction: 'rtl', nativeName: 'العربية' }),
  en: Object.freeze({ code: 'en', locale: 'en-GB', direction: 'ltr', nativeName: 'English' }),
  nl: Object.freeze({ code: 'nl', locale: 'nl-NL', direction: 'ltr', nativeName: 'Nederlands' }),
})

export function normalizeAdminLanguage(language) {
  const normalized = String(language || '').trim().toLowerCase().split(/[-_]/)[0]
  return SUPPORTED_LANGUAGES.includes(normalized) ? normalized : DEFAULT_LANGUAGE
}

export function getAdminLanguage() {
  const saved = localStorage.getItem(apiConfig.languageStorageKey)
  if (!saved) return DEFAULT_LANGUAGE
  return normalizeAdminLanguage(saved)
}

export function setAdminLanguage(language) {
  const normalized = normalizeAdminLanguage(language)
  localStorage.setItem(apiConfig.languageStorageKey, normalized)
  document.documentElement.lang = normalized
  document.documentElement.dir = ADMIN_LANGUAGE_METADATA[normalized].direction
}

export function getNextAdminLanguage(currentLanguage) {
  const currentIndex = SUPPORTED_LANGUAGES.indexOf(currentLanguage)
  if (currentIndex < 0) return DEFAULT_LANGUAGE
  return SUPPORTED_LANGUAGES[(currentIndex + 1) % SUPPORTED_LANGUAGES.length]
}

export function getSupportedAdminLanguages() {
  return [...SUPPORTED_LANGUAGES]
}
