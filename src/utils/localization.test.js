import { afterEach, describe, expect, it } from 'vitest'
import {
  formatLocalizedDate,
  formatLocalizedList,
  formatLocalizedNumber,
  getDirectionForLanguage,
  getLocaleForLanguage,
  readLocalizedValue,
} from './localization'
import { normalizeAdminLanguage, setAdminLanguage } from '../services/languageStorage'

describe('administration localization contract', () => {
  afterEach(() => {
    localStorage.clear()
    document.documentElement.lang = 'en'
    document.documentElement.dir = 'ltr'
  })

  it('normalizes regional language tags to the three supported interface languages', () => {
    expect(normalizeAdminLanguage('ar-EG')).toBe('ar')
    expect(normalizeAdminLanguage('en-GB')).toBe('en')
    expect(normalizeAdminLanguage('nl-NL')).toBe('nl')
    expect(normalizeAdminLanguage('de-DE')).toBe('ar')
  })

  it('updates document language and direction atomically', () => {
    setAdminLanguage('ar-EG')
    expect(document.documentElement.lang).toBe('ar')
    expect(document.documentElement.dir).toBe('rtl')

    setAdminLanguage('nl-NL')
    expect(document.documentElement.lang).toBe('nl')
    expect(document.documentElement.dir).toBe('ltr')
  })

  it('uses a deterministic requested-language then English fallback chain', () => {
    const value = { ar: 'العربية', en: 'English', nl: 'Nederlands' }
    expect(readLocalizedValue(value, 'nl')).toBe('Nederlands')
    expect(readLocalizedValue({ ar: value.ar, en: value.en }, 'nl')).toBe('English')
    expect(readLocalizedValue({ ar: value.ar }, 'nl')).toBe('العربية')
  })

  it('formats direction, locale, dates, numbers, and lists for each interface language', () => {
    expect(getDirectionForLanguage('ar')).toBe('rtl')
    expect(getDirectionForLanguage('nl')).toBe('ltr')
    expect(getLocaleForLanguage('nl')).toBe('nl-NL')
    expect(formatLocalizedDate('2026-07-18T12:00:00Z', 'nl')).toContain('2026')
    expect(formatLocalizedNumber(1234, 'ar')).not.toBe('1,234')
    expect(formatLocalizedList(['A', 'B'], 'ar')).toContain('و')
  })
})
