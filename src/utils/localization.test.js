import { afterEach, describe, expect, it } from 'vitest'
import {
  formatLocalizedDate,
  formatLocalizedList,
  formatLocalizedNumber,
  getDirectionForLanguage,
  getLocaleForLanguage,
  readLocalizedValue,
  readStoredEnglish,
} from './localization'
import { getAdminLanguage, normalizeAdminLanguage, setAdminLanguage } from '../services/languageStorage'
import { apiConfig } from '../config/api'

describe('administration localization contract', () => {
  afterEach(() => {
    localStorage.clear()
    document.documentElement.lang = 'en'
    document.documentElement.dir = 'ltr'
  })

  it('normalizes regional language tags to the two supported interface languages', () => {
    expect(normalizeAdminLanguage('ar-EG')).toBe('ar')
    expect(normalizeAdminLanguage('en-GB')).toBe('en')
    expect(normalizeAdminLanguage('de-DE')).toBe('ar')
  })

  it('reads a retired nl as English and writes the stored value back once', () => {
    expect(normalizeAdminLanguage('nl')).toBe('en')
    expect(normalizeAdminLanguage('nl-NL')).toBe('en')

    localStorage.setItem(apiConfig.languageStorageKey, 'nl')
    expect(getAdminLanguage()).toBe('en')
    expect(localStorage.getItem(apiConfig.languageStorageKey)).toBe('en')
    expect(getLocaleForLanguage()).toBe('en-GB')
    expect(getDirectionForLanguage()).toBe('ltr')
  })

  it('updates document language and direction atomically', () => {
    setAdminLanguage('ar-EG')
    expect(document.documentElement.lang).toBe('ar')
    expect(document.documentElement.dir).toBe('rtl')

    setAdminLanguage('en-GB')
    expect(document.documentElement.lang).toBe('en')
    expect(document.documentElement.dir).toBe('ltr')

    setAdminLanguage('nl')
    expect(document.documentElement.lang).toBe('en')
    expect(document.documentElement.dir).toBe('ltr')
    expect(localStorage.getItem(apiConfig.languageStorageKey)).toBe('en')
  })

  it('uses a deterministic requested-language then English fallback chain', () => {
    const value = { ar: 'العربية', en: 'English' }
    expect(readLocalizedValue(value, 'ar')).toBe('العربية')
    expect(readLocalizedValue(value, 'en')).toBe('English')
    expect(readLocalizedValue({ ar: value.ar }, 'en')).toBe('العربية')
    expect(readLocalizedValue({ en: value.en }, 'ar')).toBe('English')
  })

  it('never shows a stored nl value', () => {
    expect(readLocalizedValue({ ar: 'العربية', en: 'English', nl: 'Nederlands' }, 'nl')).toBe('English')
    expect(readLocalizedValue({ nl: 'Nederlands' }, 'en')).toBe('')
  })

  it('fills an editor EN field with stored English only', () => {
    expect(readStoredEnglish({ en: 'English', ar: 'العربية' })).toBe('English')
    expect(readStoredEnglish({ ar: 'العربية', nl: 'Nederlands' })).toBe('')
    expect(readStoredEnglish('A legacy plain title')).toBe('A legacy plain title')
    expect(readStoredEnglish(null)).toBe('')
  })

  it('formats direction, locale, dates, numbers, and lists for each interface language', () => {
    expect(getDirectionForLanguage('ar')).toBe('rtl')
    expect(getDirectionForLanguage('en')).toBe('ltr')
    expect(getLocaleForLanguage('ar')).toBe('ar-EG')
    expect(getLocaleForLanguage('en')).toBe('en-GB')
    expect(formatLocalizedDate('2026-07-18T12:00:00Z', 'en')).toContain('2026')
    expect(formatLocalizedNumber(1234, 'ar')).not.toBe('1,234')
    expect(formatLocalizedList(['A', 'B'], 'ar')).toContain('و')
  })
})
