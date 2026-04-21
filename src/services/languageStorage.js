import { apiConfig } from '../config/api'

const SUPPORTED_LANGUAGES = ['en', 'ar', 'nl']
const DEFAULT_LANGUAGE = 'en'

export function getAdminLanguage() {
  const saved = localStorage.getItem(apiConfig.languageStorageKey)
  if (!saved) return DEFAULT_LANGUAGE
  return SUPPORTED_LANGUAGES.includes(saved) ? saved : DEFAULT_LANGUAGE
}

export function setAdminLanguage(language) {
  const normalized = SUPPORTED_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE
  localStorage.setItem(apiConfig.languageStorageKey, normalized)
}

export function getNextAdminLanguage(currentLanguage) {
  const currentIndex = SUPPORTED_LANGUAGES.indexOf(currentLanguage)
  if (currentIndex < 0) return DEFAULT_LANGUAGE
  return SUPPORTED_LANGUAGES[(currentIndex + 1) % SUPPORTED_LANGUAGES.length]
}

export function getSupportedAdminLanguages() {
  return [...SUPPORTED_LANGUAGES]
}
