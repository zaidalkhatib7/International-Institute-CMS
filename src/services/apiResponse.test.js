import { describe, expect, it } from 'vitest'
import { readApiError, translateServerLine } from './apiResponse'

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

/*
 * THE SOURCE VERDICTS' FIXED REFUSALS (review of the one verdict for all, 31 Oct
 * 2026). Each line is built exactly as ProgramAiAuthoringController writes it
 * (resolve-source and resolve-sources-bulk; the two newest as the review fixed
 * them verbatim), so a change on either side shows here. The citation and the
 * recorded status survive into the Arabic; the English platform keeps the line.
 */
describe('the source verdicts’ fixed refusals in Arabic', () => {
  const NOTHING = 'لم يُسجَّل شيء.'
  const NOT_FOUND = 'لم يُعثر على المرجع في مسودة هذه الحقيبة (ربما استُبدل بإعادة التوليد)؛ أعد تحميل القائمة. لم يُسجَّل شيء.'

  const server = {
    staleView: (shown, latest) => 'SOURCE_BULK_STALE_VIEW: the review screen was built from authoring run #' + shown + ', but '
      + (latest === null ? 'this programme has no authoring run' : 'the latest run of this programme is #' + latest)
      + '. Reload the review screen; nothing was recorded.',
    runNotReviewable: (id, status) => 'SOURCE_BULK_RUN_NOT_REVIEWABLE: authoring run #' + id + ' is ' + status
      + '; one verdict for many references is recorded only on a finished draft awaiting review (ai_draft). Nothing was recorded.',
    alreadyReviewed: (citation, artifactId, state) => 'SOURCE_BULK_ALREADY_REVIEWED: the reference "' + citation
      + '" on artifact #' + artifactId + ' already carries a recorded verdict (' + state
      + '). A bulk verdict never overrides a recorded verdict — re-review it on its own. Nothing was recorded.',
    supersededContent: (citation, artifactId) => 'SOURCE_BULK_SUPERSEDED_CONTENT: the reference "' + citation
      + '" on artifact #' + artifactId + ' belongs to content a regeneration replaced; record its verdict on its own. Nothing was recorded.',
    // resolve-source
    flagNotFound: (artifactId) => 'SOURCE_FLAG_NOT_FOUND: no source flag on artifact #' + artifactId
      + ' matches this reference. Reload the review screen — the artifact may have been superseded by a regeneration.',
    // resolve-sources-bulk
    artifactNotInRun: (artifactId, runId) => 'SOURCE_FLAG_NOT_FOUND: artifact #' + artifactId + ' is not part of authoring run #'
      + runId + ' of this programme. Reload the review screen; nothing was recorded.',
    referenceNotFound: (artifactId, citation) => 'SOURCE_FLAG_NOT_FOUND: no source flag on artifact #' + artifactId + ' matches the reference "'
      + citation + '". Reload the review screen — the artifact may have been '
      + 'superseded by a regeneration; nothing was recorded.',
    more: (count) => 'And ' + count + ' more refused reference(s). Nothing was recorded.',
  }

  function bulkRefusal(errors) {
    return { message: 'Request failed', response: { status: 422, data: { message: 'Invalid.', errors } } }
  }

  it('reads a stale review screen, with or without a run on the server', () => {
    const reading = 'تغيّرت مسودة الحقيبة منذ فُتحت هذه الصفحة؛ أُعيد تحميل القائمة، فراجعها ثم أعد المحاولة. لم يُسجَّل شيء.'
    expect(translateServerLine(server.staleView(31, 32), 'ar')).toBe(reading)
    expect(translateServerLine(server.staleView(31, null), 'ar')).toBe(reading)
    expect(translateServerLine(server.staleView(31, 32), 'en')).toBe(server.staleView(31, 32))
  })

  it.each(['queued', 'generating', 'failed', 'archived'])('reads a run that is not a finished draft (%s)', (status) => {
    const line = server.runNotReviewable(41, status)
    expect(translateServerLine(line, 'ar')).toBe('لا يُسجَّل حكم واحد على مراجع كثيرة إلا على مسودة مكتملة تنتظر المراجعة. لم يُسجَّل شيء.')
    expect(translateServerLine(line, 'en')).toBe(line)
  })

  it('reads a reference already reviewed, keeping its citation and its recorded verdict', () => {
    const line = server.alreadyReviewed('Regional leadership survey (2019)', 501, 'REJECTED')
    expect(translateServerLine(line, 'ar')).toBe(
      'المرجع «Regional leadership survey (2019)» عليه حكم مسجَّل (REJECTED)، والحكم الواحد على مراجع كثيرة لا يلغي حكمًا مسجَّلًا؛ راجعه وحده. لم يُسجَّل شيء.',
    )
    expect(translateServerLine(line, 'en')).toBe(line)
  })

  it('reads the recorded states that are not a verdict code, and keeps a citation with quotes and brackets whole', () => {
    expect(translateServerLine(server.alreadyReviewed('Drucker, The Effective Executive (1967)', 502, 'marked resolved with no recorded verdict'), 'ar')).toBe(
      'المرجع «Drucker, The Effective Executive (1967)» عليه حكم مسجَّل (مُعلَّم كمحسوم دون حكم مسجَّل)، والحكم الواحد على مراجع كثيرة لا يلغي حكمًا مسجَّلًا؛ راجعه وحده. لم يُسجَّل شيء.',
    )
    expect(translateServerLine(server.alreadyReviewed('Survey (2019)', 502, 'an unrecognised verification status'), 'ar')).toContain(
      '(حالة تحقق غير معروفة)',
    )
    // Str::limit(120) ends a long citation with three dots; quotes and brackets are part of it.
    const awkward = 'Liker, "The Toyota Way" (2004) (rev. "2nd") — a citation long enough to be cut by the server at one hundred and t...'
    expect(translateServerLine(server.alreadyReviewed(awkward, 503, 'SUPERSEDED'), 'ar')).toBe(
      `المرجع «${awkward}» عليه حكم مسجَّل (SUPERSEDED)، والحكم الواحد على مراجع كثيرة لا يلغي حكمًا مسجَّلًا؛ راجعه وحده. لم يُسجَّل شيء.`,
    )
    // A citation that holds a line break is still one reference.
    expect(translateServerLine(server.alreadyReviewed('Line one\nline two', 503, 'REJECTED'), 'ar')).toContain('«Line one\nline two»')
  })

  it('reads a reference on content a regeneration replaced, keeping its citation', () => {
    const line = server.supersededContent('ISO 9001:2015 Quality management systems', 501)
    expect(translateServerLine(line, 'ar')).toBe(
      'المرجع «ISO 9001:2015 Quality management systems» من محتوى استُبدل بإعادة التوليد، فيُسجَّل حكمه وحده. لم يُسجَّل شيء.',
    )
    expect(translateServerLine(line, 'en')).toBe(line)
  })

  it('reads every SOURCE_FLAG_NOT_FOUND: the one-by-one verdict’s and both of the bulk call’s', () => {
    expect(translateServerLine(server.flagNotFound(501), 'ar')).toBe(NOT_FOUND)
    expect(translateServerLine(server.artifactNotInRun(777, 31), 'ar')).toBe(NOT_FOUND)
    expect(translateServerLine(server.referenceNotFound(501, 'Kotter, Leading Change (1996)'), 'ar')).toBe(
      'لم يُعثر على المرجع «Kotter, Leading Change (1996)» في مسودة هذه الحقيبة (ربما استُبدل بإعادة التوليد)؛ أعد تحميل القائمة. لم يُسجَّل شيء.',
    )
    for (const line of [server.flagNotFound(501), server.artifactNotInRun(777, 31), server.referenceNotFound(501, 'Kotter, Leading Change (1996)')]) {
      expect(translateServerLine(line, 'en')).toBe(line)
    }
  })

  it('reads the count of the refusals the bulk call did not list', () => {
    expect(translateServerLine(server.more(14), 'ar')).toBe('ورُفضت مراجع أخرى (14). لم يُسجَّل شيء.')
    expect(translateServerLine(server.more(14), 'en')).toBe(server.more(14))
  })

  it('leaves a line that only resembles one of them as the server wrote it', () => {
    const lookalike = 'SOURCE_BULK_STALE_VIEW: the review screen shows an earlier authoring run. Reload the review screen; nothing was recorded.'
    expect(translateServerLine(lookalike, 'ar')).toBe(lookalike)
    expect(translateServerLine(server.more(14) + ' Extra.', 'ar')).toBe(server.more(14) + ' Extra.')
  })

  it('reads a whole bulk refusal in Arabic, one line per refusal, with no English sentence left', () => {
    const lines = [
      server.alreadyReviewed('Regional leadership survey (2019)', 501, 'REJECTED'),
      server.supersededContent('ISO 9001:2015 Quality management systems', 501),
      server.referenceNotFound(502, 'Kotter, Leading Change (1996)'),
      server.artifactNotInRun(777, 31),
      server.more(3),
    ]
    const ar = readApiError(bulkRefusal({ flags: lines }), undefined, 'ar')

    expect(ar.startsWith('تعذر إكمال الإجراء')).toBe(true)
    expect(ar.split('\n').filter((line) => line.endsWith(NOTHING))).toHaveLength(5)
    expect(ar).toContain('«Regional leadership survey (2019)»')
    expect(ar).toContain('«ISO 9001:2015 Quality management systems»')
    expect(ar).toContain('«Kotter, Leading Change (1996)»')
    expect(ar).not.toMatch(/SOURCE_|[Nn]othing was recorded|Reload the review screen/)

    const en = readApiError(bulkRefusal({ flags: lines }), undefined, 'en')
    for (const line of lines) expect(en).toContain(line)
  })
})

