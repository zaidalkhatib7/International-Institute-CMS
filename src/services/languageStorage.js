import { apiConfig } from '../config/api'

const SUPPORTED_LANGUAGES = ['ar', 'en']
const DEFAULT_LANGUAGE = 'ar'
// `nl` was retired on 13 Oct 2026 (Arabic and English only). A stored or requested
// `nl` reads English, which keeps the left-to-right layout its reader already had.
const RETIRED_TO_ENGLISH = ['nl']

export const ADMIN_LANGUAGE_METADATA = Object.freeze({
  ar: Object.freeze({ code: 'ar', locale: 'ar-EG', direction: 'rtl', nativeName: 'العربية' }),
  en: Object.freeze({ code: 'en', locale: 'en-GB', direction: 'ltr', nativeName: 'English' }),
})

export function normalizeAdminLanguage(language) {
  const normalized = String(language || '').trim().toLowerCase().split(/[-_]/)[0]
  if (RETIRED_TO_ENGLISH.includes(normalized)) return 'en'
  return SUPPORTED_LANGUAGES.includes(normalized) ? normalized : DEFAULT_LANGUAGE
}

export function getAdminLanguage() {
  const saved = localStorage.getItem(apiConfig.languageStorageKey)
  if (!saved) return DEFAULT_LANGUAGE
  const normalized = normalizeAdminLanguage(saved)
  if (saved !== normalized) {
    // Write the normalised value back once, so a retired `nl` is not kept in the browser.
    try {
      localStorage.setItem(apiConfig.languageStorageKey, normalized)
    } catch {
      // Storage can refuse writes (private mode, blocked site data); the normalised value still applies.
    }
  }
  return normalized
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
