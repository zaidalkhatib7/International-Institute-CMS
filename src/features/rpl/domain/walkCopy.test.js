import { describe, expect, it } from 'vitest'
import { countPhrase, fill } from './documentScreening'
import { COURSE_PLAN_COPY } from './coursePlan'
import { AFTER_QUIZ_COPY } from './afterQuiz'
import { CASE_DECISION_COPY } from './caseDecision'

/*
 * A COUNT AND ITS NOUN AGREE (platform walk, 17 Oct 2026, UI-16).
 *
 * The Arabic templates used one noun form for every count: "قُرئت 3 من 3 وثيقة",
 * "5 دورة، منها 5 متاحة للشراء", "6 سؤالًا معتمدًا مؤهلًا للسحب", "1 محاولات".
 * Arabic takes one phrase for 1 and for 2, the plural from 3 to 10, and the
 * singular from 11 to 99; English says "1 try" and "3 tries".
 */

describe('countPhrase', () => {
  const forms = ['محاولة واحدة', 'محاولتان', 'محاولات', 'محاولة']

  it.each([
    [1, 'محاولة واحدة'], [2, 'محاولتان'], [3, '3 محاولات'], [10, '10 محاولات'],
    [11, '11 محاولة'], [99, '99 محاولة'], [100, '100 محاولة'], [103, '103 محاولات'], [0, '0 محاولة'],
  ])('Arabic %i → %s', (count, phrase) => {
    expect(countPhrase(count, forms)).toBe(phrase)
  })

  it('English: one form for 1, the plural otherwise', () => {
    expect(countPhrase(1, ['try', 'tries'])).toBe('1 try')
    expect(countPhrase(3, ['try', 'tries'])).toBe('3 tries')
    expect(countPhrase(0, ['try', 'tries'])).toBe('0 tries')
  })

  it('leaves a plain placeholder and a missing value as before', () => {
    expect(fill('{name} — {count|try|tries}', { name: 'x' })).toBe('x — ')
    expect(fill('{a}/{b}', { a: 1, b: 2 })).toBe('1/2')
  })
})

describe('the Arabic counts the walk found', () => {
  const AR = { plan: COURSE_PLAN_COPY.ar, exam: AFTER_QUIZ_COPY.ar.finalExam, decision: CASE_DECISION_COPY.ar }

  it('documents read', () => {
    expect(fill(AR.decision.coverage, { read: 3, total: 3 })).toBe('قُرئت 3 من 3 وثائق.')
    expect(fill(AR.decision.coverage, { read: 1, total: 1 })).toBe('قُرئت 1 من وثيقة واحدة.')
  })

  it('courses on a plan', () => {
    expect(fill(AR.plan.approveSummary, { count: 5, buyable: 5 })).toMatch(/^5 دورات، منها 5 متاحة للشراء/)
    expect(fill(AR.plan.versionCourses, { count: 12 })).toBe('12 دورة')
    expect(fill(AR.plan.approveBelow, { count: 2, level: 'خبير مهني', minimum: 10 })).toMatch(/^تضم هذه الخطة دورتين،/)
  })

  it('approved questions for the final-exam draw', () => {
    expect(fill(AR.exam.eligible, { count: 6 })).toBe('6 أسئلة معتمدة مؤهلة للسحب')
    expect(fill(AR.exam.eligible, { count: 25 })).toBe('25 سؤالًا معتمدًا مؤهلًا للسحب')
  })

  it('tries and attempts', () => {
    expect(fill(AR.exam.triesAllowed, { count: 3 })).toBe('3 محاولات')
    expect(fill(AR.exam.level.outbox, { status: 'نُفِّذت', attempts: 1 })).toBe('مهمة الإصدار: نُفِّذت، محاولة واحدة')
    expect(fill(AR.exam.waitApplied, { days: 7 })).toBe('الانتظار المطبَّق: 7 أيام')
  })

  it('and English says "1 attempt", "1 course"', () => {
    expect(fill(AFTER_QUIZ_COPY.en.finalExam.level.outbox, { status: 'done', attempts: 1 })).toBe('Issuance job: done, 1 attempt')
    expect(fill(COURSE_PLAN_COPY.en.versionCourses, { count: 1 })).toBe('1 course')
  })
})
