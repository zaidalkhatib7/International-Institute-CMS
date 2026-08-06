import { describe, expect, it } from 'vitest'
import { copyByLanguage } from './UserWorkspacePage'

/*
 * LOCALE PARITY.
 *
 * The client workspace resolves copy with `copyByLanguage[language] ||
 * copyByLanguage.en` — a whole-object fallback, not a per-key one. So a key
 * added to `en` and forgotten in `nl` does not fall back to English; it
 * resolves to `undefined` and renders as nothing.
 *
 * That shipped. The Professional Academic RPL card was added on 6 Aug with six
 * new keys in `en` and `ar` and none in `nl`, and in Dutch the card rendered an
 * empty heading, an unlabelled dropdown, an icon-only button, and — after
 * creating a real governed case — a success message that never appeared. No
 * test failed, no console error, no build warning. It was only visible to
 * somebody using the CMS in Dutch.
 *
 * These tests are cheap and they close that hole permanently.
 */

const LOCALES = ['en', 'ar', 'nl']

describe('client workspace copy', () => {
  it('defines every supported locale', () => {
    LOCALES.forEach((locale) => {
      expect(copyByLanguage[locale], `missing locale: ${locale}`).toBeTypeOf('object')
    })
  })

  it('carries identical keys in every locale', () => {
    const reference = Object.keys(copyByLanguage.en).sort()

    LOCALES.filter((locale) => locale !== 'en').forEach((locale) => {
      const keys = Object.keys(copyByLanguage[locale]).sort()

      // Reported as two explicit lists rather than a diff, so whoever breaks it
      // can see immediately which side is short and by what.
      const missing = reference.filter((key) => !keys.includes(key))
      const extra = keys.filter((key) => !reference.includes(key))

      expect(missing, `${locale} is missing keys present in en`).toEqual([])
      expect(extra, `${locale} has keys en does not`).toEqual([])
    })
  })

  it('has no empty or whitespace-only string anywhere', () => {
    LOCALES.forEach((locale) => {
      Object.entries(copyByLanguage[locale]).forEach(([key, value]) => {
        if (typeof value !== 'string') return
        expect(value.trim(), `${locale}.${key} is blank`).not.toBe('')
      })
    })
  })

  it('no locale still claims a degree excludes the applicant from RPL', () => {
    /*
     * A degree ROUTES an applicant to the Professional Academic RPL pathway; it
     * does not exclude them from recognition. The English and Arabic strings
     * were corrected on 6 Aug and the Dutch one was missed, so a Dutch assessor
     * was told the opposite of what the platform does — directly above the
     * table where they record the degree.
     */
    const forbidden = [
      /sluit RPL uit/i,          // nl — "excludes RPL"
      /excludes RPL/i,           // en
      /blocks the RPL/i,         // en
      /يمنع مسار RPL/,           // ar — "blocks the RPL route"
      /لا يدخلون RPL/,           // ar — "do not enter RPL"
    ]

    LOCALES.forEach((locale) => {
      Object.entries(copyByLanguage[locale]).forEach(([key, value]) => {
        if (typeof value !== 'string') return
        forbidden.forEach((pattern) => {
          expect(
            pattern.test(value),
            `${locale}.${key} still says a degree excludes RPL: "${value}"`,
          ).toBe(false)
        })
      })
    })
  })
})
