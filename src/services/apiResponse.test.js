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

  it('returns a safe Arabic authorization message', () => {
    expect(readApiError(responseError(403, 'Forbidden'), undefined, 'ar')).toBe(
      'ليست لديك صلاحية تنفيذ هذا الإجراء.',
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
     * status sentences were ever reachable in ar, and a precise 403 or
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
    expect(readApiError({ message: 'Network Error' }, undefined, 'ar')).toContain(
      'تعذر الاتصال بالخادم',
    )
    expect(readApiError({ message: 'Network Error' }, undefined, 'en')).toContain(
      'Could not connect to the server',
    )
  })

  it('accepts translated message objects returned by the API', () => {
    const error = responseError(422, {
      ar: 'البيانات غير مكتملة.',
      en: 'The data is incomplete.',
      nl: 'De gegevens zijn onvolledig.',
    })

    expect(readApiError(error, undefined, 'ar')).toBe('البيانات غير مكتملة.')
    expect(readApiError(error, undefined, 'en')).toBe('The data is incomplete.')
  })
})

// Walk of 18 Oct 2026: the Arabic platform appended the server's English sentences to its own.
describe('the first path fixed server lines in Arabic', () => {
  function validation(errors) {
    return { message: 'Request failed', response: { status: 422, data: { message: 'Invalid.', errors } } }
  }

  it('reads "Gemini is not configured" in Arabic, and keeps it in English', () => {
    const error = validation({ gemini_not_configured: ['Gemini is not configured in the backend environment.'] })
    const ar = readApiError(error, undefined, 'ar')
    expect(ar).toContain('لم يُضبط Gemini على الخادم')
    expect(ar).not.toMatch(/backend environment/)
    expect(readApiError(error, undefined, 'en')).toContain('Gemini is not configured in the backend environment.')
  })

  it('reads an incomplete office draft and its completion in Arabic, with the figures', () => {
    const ar = readApiError(validation({
      application: ['The RPL application is incomplete. Choose the target accreditation level, upload the required evidence (an identity document and either a CV or a professional experience document), and accept the current declaration.'],
      completeness: ['Current completion is 25.00% (1 of 4 requirements complete).'],
    }), undefined, 'ar')
    expect(ar).toContain('الطلب غير مكتمل')
    expect(ar).toContain('نسبة الاكتمال الآن 25.00٪ (اكتمل 1 من 4 متطلبات).')
    expect(ar).not.toMatch(/[A-Za-z]{4,}/)
  })
})

