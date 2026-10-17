import { describe, expect, it } from 'vitest'
import {
  CLOSED_CASE_STATUSES,
  ENTRY_QUIZ_COPY,
  ENTRY_QUIZ_REFERRAL_REASONS,
  QUIZ_PASS_MARK_COPY,
  QUIZ_PASS_MARK_KEY,
  canRescoreEntryQuiz,
  entryAttemptOpened,
  entryQuizCopy,
  entryQuizItemMark,
  entryQuizItemMarks,
  formatQuizPercent,
  hasQuizResult,
  isCaseClosed,
  isHeardAtExpiry,
  isQuizPassMarkReady,
  isQuizPassMarkValid,
  isRescoreReasonValid,
  isTechnicalFailureReasonValid,
  quizPassMarkCopy,
  quizPassMarkExample,
  quizPassMarkFieldError,
  quizPassMarkPayload,
  readEntryQuiz,
  readQuizPassMarkSetting,
  referralReasonText,
  reopenNeedsTechnicalFailure,
  withdrawBlockedByAttempt,
} from './entryQuiz'

const POLICY = 'rpl_entry_quiz_pass_mark_v1'

/*
 * THE ENTRY QUIZ PASS MARK (owner flow of 12 Oct 2026, P4).
 *
 * The platform marks the quiz; the CMS only shows the frozen result and edits
 * the setting. What is pinned here: the strict "more than" rule in numbers, the
 * governed setting with no default, one attempt only, and failed wording that
 * never calls the outcome a decline (the client goes to a course plan, D11).
 */

const TABLES = { ENTRY_QUIZ_COPY, QUIZ_PASS_MARK_COPY }

function paths(block, prefix = '') {
  return Object.entries(block).flatMap(([key, value]) =>
    value && typeof value === 'object' && !Array.isArray(value) ? paths(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  )
}

describe('the copy', () => {
  it.each(Object.entries(TABLES))('%s has Arabic and English only, with the same keys', (_, table) => {
    // Dutch was removed from the platform (owner, 13 Oct 2026).
    expect(Object.keys(table).sort()).toEqual(['ar', 'en'])
    expect(paths(table.ar).sort()).toEqual(paths(table.en).sort())
  })

  it('falls back to English for any other language', () => {
    expect(entryQuizCopy('fr')).toBe(ENTRY_QUIZ_COPY.en)
    expect(entryQuizCopy(undefined)).toBe(ENTRY_QUIZ_COPY.en)
    expect(quizPassMarkCopy('fr')).toBe(QUIZ_PASS_MARK_COPY.en)
    expect(entryQuizCopy('ar')).toBe(ENTRY_QUIZ_COPY.ar)
  })

  // Owner model of 15 Oct 2026 (P6): a failed client never gets the Experience Confirmation Certificate, and the course plan then one final exam lead to the level certificate.
  it('never calls a failed quiz a decline: no Experience Confirmation Certificate, the course plan and the final exam instead (owner D11, 15 Oct 2026)', () => {
    expect(ENTRY_QUIZ_COPY.en.resultExplanation.failed).not.toMatch(/declin|reject/i)
    expect(ENTRY_QUIZ_COPY.en.resultLabels.failed).not.toMatch(/declin|reject/i)
    expect(ENTRY_QUIZ_COPY.en.resultExplanation.failed).toMatch(/no Experience Confirmation Certificate/)
    expect(ENTRY_QUIZ_COPY.en.resultExplanation.failed).toMatch(/level certificate/)
    expect(ENTRY_QUIZ_COPY.en.resultExplanation.failed).toMatch(/course plan/)
    expect(ENTRY_QUIZ_COPY.ar.resultExplanation.failed).not.toMatch(/رفض/)
    expect(ENTRY_QUIZ_COPY.ar.resultLabels.failed).not.toMatch(/رفض/)
    expect(ENTRY_QUIZ_COPY.ar.resultExplanation.failed).toMatch(/لا شهادة تثبيت خبرة/)
  })

  it('tells staff a passed client may buy the Experience Confirmation Certificate and goes on to the final exam (owner, 15 Oct 2026)', () => {
    expect(ENTRY_QUIZ_COPY.en.resultExplanation.passed).toMatch(/may buy the Experience Confirmation Certificate/)
    expect(ENTRY_QUIZ_COPY.en.resultExplanation.passed).toMatch(/one final exam and the level certificate/)
    expect(ENTRY_QUIZ_COPY.ar.resultExplanation.passed).toMatch(/شهادة تثبيت الخبرة/)
  })

  it('frames the mark as an entry gate, never a competency finding (R24)', () => {
    expect(ENTRY_QUIZ_COPY.en.gateNote).toMatch(/entry gate to the learning plan, never a competency finding/)
    expect(QUIZ_PASS_MARK_COPY.en.hint).toMatch(/entry gate to the learning plan, never a competency finding/)
    expect(QUIZ_PASS_MARK_COPY.en.rule).toMatch(/MORE than this percentage/)
  })
})

describe('where an entry quiz stands', () => {
  const result = { result: 'passed', items: [] }

  it.each([
    ['not an entry quiz', { status: 'answered', is_entry_quiz: false, quiz_result: null }, 'none'],
    ['a payload from before P4', { status: 'answered' }, 'none'],
    ['a draft', { status: 'draft', is_entry_quiz: true, scoring_policy: null, quiz_result: null }, 'not_sent'],
    ['sent before the pass mark (D21)', { status: 'answered', is_entry_quiz: true, scoring_policy: null, quiz_result: null }, 'not_scored'],
    ['sent under a policy, unmarked', { status: 'issued', is_entry_quiz: true, scoring_policy: POLICY, quiz_result: null }, 'awaiting'],
    ['marked', { status: 'answered', is_entry_quiz: true, scoring_policy: POLICY, quiz_result: result }, 'scored'],
  ])('%s', (_, set, state) => {
    expect(readEntryQuiz(set).state).toBe(state)
  })

  it('treats any marked set as never reopenable', () => {
    expect(hasQuizResult({ quiz_result: result })).toBe(true)
    expect(hasQuizResult({ quiz_result: null })).toBe(false)
    expect(hasQuizResult(null)).toBe(false)
  })

  it.each([
    ['opened, under the pass mark', { scoring_policy: POLICY, opened_at: '2026-10-14T10:00:00Z', first_opened_at: '2026-10-14T10:00:00Z' }, true],
    // A technical reopen clears opened_at and keeps first_opened_at: still the attempt (the server's rule).
    ['reopened after a technical failure, not opened since', { scoring_policy: POLICY, opened_at: null, first_opened_at: '2026-10-14T10:00:00Z' }, true],
    ['never opened', { scoring_policy: POLICY, opened_at: null, first_opened_at: null }, false],
    // Sent before the pass mark: today's rules (D21(a)).
    ['opened, sent before the pass mark', { scoring_policy: null, opened_at: '2026-10-14T10:00:00Z', first_opened_at: null }, false],
    ['no set', null, false],
  ])('treats a set %s as an opened attempt: %s', (_, set, opened) => {
    expect(entryAttemptOpened(set)).toBe(opened)
    // Reopen needs a technical failure, and withdrawal is refused, exactly then (D11, owner).
    expect(reopenNeedsTechnicalFailure(set)).toBe(opened)
    expect(withdrawBlockedByAttempt(set)).toBe(opened)
  })

  it('offers to mark a quiz again only when the platform referred it', () => {
    expect(canRescoreEntryQuiz({ quiz_result: { result: 'referred' } })).toBe(true)
    expect(canRescoreEntryQuiz({ quiz_result: { result: 'failed' } })).toBe(false)
    expect(canRescoreEntryQuiz({ quiz_result: { result: 'passed' } })).toBe(false)
    expect(canRescoreEntryQuiz({ quiz_result: null })).toBe(false)
    expect(canRescoreEntryQuiz(null)).toBe(false)
  })

  it('counts a set closed by the timer as heard (R8 exception), and nothing else', () => {
    expect(isHeardAtExpiry({ quiz_result: { closed_by: 'timer_expired' } })).toBe(true)
    expect(isHeardAtExpiry({ quiz_result: { closed_by: 'all_answered' } })).toBe(false)
    expect(isHeardAtExpiry({ quiz_result: null })).toBe(false)
  })
})

describe('the marks', () => {
  it('reads each question as correct, incorrect, unanswered or without a key', () => {
    expect(entryQuizItemMark({ answered: true, correct: true })).toBe('correct')
    expect(entryQuizItemMark({ answered: true, correct: false })).toBe('incorrect')
    expect(entryQuizItemMark({ answered: false, correct: false })).toBe('unanswered')
    expect(entryQuizItemMark({ answered: false, correct: null })).toBe('unanswered')
    expect(entryQuizItemMark({ answered: true, correct: null })).toBe('unmarkable')
  })

  it('keys the marks by item_ref, as strings', () => {
    const marks = entryQuizItemMarks({
      quiz_result: { items: [{ item_ref: 3, answered: true, correct: true }, { item_ref: '4', answered: false, correct: null }, { answered: true }] },
    })
    expect([...marks.entries()]).toEqual([['3', 'correct'], ['4', 'unanswered']])
    expect(entryQuizItemMarks({ quiz_result: null }).size).toBe(0)
  })

  it('shows the percentage with two decimals, and nothing when there is none', () => {
    expect(formatQuizPercent(52)).toBe('52.00')
    expect(formatQuizPercent('66.666')).toBe('66.67')
    expect(formatQuizPercent(null)).toBeNull()
    expect(formatQuizPercent('')).toBeNull()
  })

  it('words exactly the referral codes the server sends, in both languages', () => {
    // RplQuizScoringService REFERRAL_*, pinned on the API side too ("the referral
    // reasons are a fixed contract with the CMS result card").
    expect(ENTRY_QUIZ_REFERRAL_REASONS).toEqual(['issued_item_without_answer_key', 'no_scored_items', 'pass_mark_setting_missing'])
    for (const copy of [ENTRY_QUIZ_COPY.en, ENTRY_QUIZ_COPY.ar]) {
      expect(Object.keys(copy.referralReasons).sort()).toEqual([...ENTRY_QUIZ_REFERRAL_REASONS].sort())
      for (const code of ENTRY_QUIZ_REFERRAL_REASONS) {
        expect(referralReasonText(code, copy)).toBe(copy.referralReasons[code])
      }
    }
    // An Arabic screen never falls back to English words for a known code.
    expect(referralReasonText('pass_mark_setting_missing', ENTRY_QUIZ_COPY.ar)).not.toMatch(/[a-z]/i)
  })

  it('words a referral reason: a known code, an unknown code humanised, free text as given', () => {
    const copy = ENTRY_QUIZ_COPY.en
    expect(referralReasonText('issued_item_without_answer_key', copy)).toBe(copy.referralReasons.issued_item_without_answer_key)
    expect(referralReasonText('some_new_code', copy)).toBe('some new code')
    expect(referralReasonText('Item 12 has no key.', copy)).toBe('Item 12 has no key.')
    expect(referralReasonText(null, copy)).toBe('')
  })
})

describe('the reason a referred quiz is marked again on', () => {
  it('needs 10 to 2000 characters, trimmed, as the server does', () => {
    expect(isRescoreReasonValid('123456789')).toBe(false)
    expect(isRescoreReasonValid('  123456789  ')).toBe(false)
    expect(isRescoreReasonValid('1234567890')).toBe(true)
    expect(isRescoreReasonValid('x'.repeat(2000))).toBe(true)
    expect(isRescoreReasonValid('x'.repeat(2001))).toBe(false)
    expect(isRescoreReasonValid(null)).toBe(false)
  })
})

describe('the technical failure reason', () => {
  it('needs 10 to 2000 characters, trimmed', () => {
    expect(isTechnicalFailureReasonValid('123456789')).toBe(false)
    expect(isTechnicalFailureReasonValid('  123456789  ')).toBe(false)
    expect(isTechnicalFailureReasonValid('1234567890')).toBe(true)
    expect(isTechnicalFailureReasonValid('x'.repeat(2000))).toBe(true)
    expect(isTechnicalFailureReasonValid('x'.repeat(2001))).toBe(false)
    expect(isTechnicalFailureReasonValid(undefined)).toBe(false)
  })
})

describe('the pass mark setting', () => {
  it.each([
    ['1', true], ['50', true], ['99', true], [50, true], [' 50 ', true],
    ['0', false], ['100', false], ['50.5', false], ['-1', false], ['', false], [null, false], ['abc', false],
  ])('%j is %s', (value, valid) => {
    expect(isQuizPassMarkValid(value)).toBe(valid)
  })

  it('reads a stored mark as held, and an absent one as not written', () => {
    expect(readQuizPassMarkSetting({ [QUIZ_PASS_MARK_KEY]: 50 })).toEqual({ value: '50', include: true, error: '' })
    expect(readQuizPassMarkSetting({})).toEqual({ value: '', include: false, error: '' })
    expect(readQuizPassMarkSetting({ [QUIZ_PASS_MARK_KEY]: null })).toEqual({ value: '', include: false, error: '' })
  })

  it('writes the key as a number only when it is held or edited, with no default (R15)', () => {
    expect(quizPassMarkPayload({ value: '60', include: true })).toEqual({ rpl_quiz_pass_mark_percent: 60 })
    expect(quizPassMarkPayload({ value: '', include: false })).toEqual({})
    expect(isQuizPassMarkReady({ value: '', include: false })).toBe(true)
    expect(isQuizPassMarkReady({ value: '', include: true })).toBe(false)
    expect(isQuizPassMarkReady({ value: '100', include: true })).toBe(false)
  })

  it('shows the strict rule in numbers: exactly the mark does not pass', () => {
    // correct * 100 > mark * questions, on the exact fraction.
    expect(quizPassMarkExample(50)).toEqual({ questions: 50, pass: 26, fail: 25 })
    expect(quizPassMarkExample('33')).toEqual({ questions: 50, pass: 17, fail: 16 })
    expect(quizPassMarkExample(99)).toEqual({ questions: 50, pass: 50, fail: 49 })
    expect(quizPassMarkExample(60, 25)).toEqual({ questions: 25, pass: 16, fail: 15 })
    expect(quizPassMarkExample(0)).toBeNull()
  })

  it('collects the server lines for the key only', () => {
    const error = {
      response: {
        status: 422,
        data: { errors: { rpl_quiz_pass_mark_percent: ['The pass mark must be between 1 and 99.'], appeal_window_days: ['Other.'] } },
      },
    }
    expect(quizPassMarkFieldError(error)).toBe('The pass mark must be between 1 and 99.')
    expect(quizPassMarkFieldError({})).toBe('')
  })
})

/*
 * F4: ON A CLOSED CASE NOTHING REOPENS. The platform mirrors the API's
 * RplApplicationStatus::isClosed() from the set payload's application.status.
 */
describe('a closed case', () => {
  it('is completed, withdrawn or rejected, as the API says', () => {
    expect(CLOSED_CASE_STATUSES).toEqual(['completed', 'withdrawn', 'rejected'])
  })

  it.each([
    ['completed', true],
    ['withdrawn', true],
    ['rejected', true],
    ['assessment_in_progress', false],
    ['evidence_verification', false],
    [undefined, false],
    [null, false],
  ])('reads application.status %j as closed: %s', (status, closed) => {
    expect(isCaseClosed({ application: { status } })).toBe(closed)
  })

  it('takes a set with no application as open (the server stays the authority)', () => {
    expect(isCaseClosed({})).toBe(false)
    expect(isCaseClosed(null)).toBe(false)
  })
})
