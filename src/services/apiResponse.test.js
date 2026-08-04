import { describe, expect, it } from 'vitest'
import { readApiError } from './apiResponse'

function responseError(status, message) {
  return {
    message: 'Request failed',
    response: {
      status,
      data: { message },
    },
  }
}

describe('localized API error contract', () => {
  it('does not expose an English validation or database error in Arabic', () => {
    const message = readApiError(
      responseError(422, 'SQLSTATE[HY000]: General error: no such column'),
      undefined,
      'ar',
    )

    expect(message).toContain('تعذر إكمال الإجراء')
    expect(message).not.toContain('SQLSTATE')
  })

  it('returns a safe Dutch authorization message', () => {
    expect(readApiError(responseError(403, 'Forbidden'), undefined, 'nl')).toBe(
      'U hebt geen toestemming om deze actie uit te voeren.',
    )
  })

  it('preserves detailed backend messages in the English interface', () => {
    expect(readApiError(responseError(422, 'A published rubric is required.'), undefined, 'en')).toBe(
      'A published rubric is required.',
    )
  })

  it('prefers the translated meaning of a known status over the caller’s generic fallback', () => {
    /*
     * This asserted the opposite until the fallback was deliberately moved
     * BELOW the status branches — see the comment in readApiError. Practically
     * every caller passes a fallback, so while it came first none of the
     * status sentences were ever reachable in ar or nl, and a precise 403 or
     * 409 surfaced as whatever generic line the page happened to supply.
     *
     * A 409 now says what a conflict IS. The caller's fallback still wins when
     * the status says nothing useful — the case below.
     */
    expect(readApiError(responseError(409, 'The application is locked.'), 'الطلب مقفل.', 'ar')).toBe(
      'يتعارض هذا الإجراء مع الحالة الحالية للسجل. حدّث الصفحة ثم أعد المحاولة.',
    )
  })

  it('falls back to the caller’s sentence when the status carries no meaning', () => {
    expect(readApiError(responseError(418, 'I am a teapot.'), 'الطلب مقفل.', 'ar')).toBe('الطلب مقفل.')
  })

  it('localizes network failures independently of backend content', () => {
    expect(readApiError({ message: 'Network Error' }, undefined, 'nl')).toContain(
      'Kan geen verbinding maken',
    )
  })

  it('accepts translated message objects returned by the API', () => {
    const error = responseError(422, {
      ar: 'البيانات غير مكتملة.',
      en: 'The data is incomplete.',
      nl: 'De gegevens zijn onvolledig.',
    })

    expect(readApiError(error, undefined, 'ar')).toBe('البيانات غير مكتملة.')
    expect(readApiError(error, undefined, 'nl')).toBe('De gegevens zijn onvolledig.')
  })
})
