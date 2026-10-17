import { describe, expect, it } from 'vitest'
import { BUSINESS_TIME_ZONE, businessTodayIso, formatRecordedDate } from './businessDate'
import { todayIso } from '../features/rpl/domain/afterQuiz'

// E2E item J07-G1 (17 Oct 2026): "today" for money received or paid outside is the
// institute's day (Asia/Damascus, UTC+3), as the server judges it.
describe('the institute business day', () => {
  it('is Asia/Damascus by default', () => {
    expect(BUSINESS_TIME_ZONE).toBe('Asia/Damascus')
  })

  it('at 22:30 UTC is already the next day in Damascus, and the date fields use it', () => {
    const lateEvening = new Date('2026-10-17T22:30:00Z')
    expect(businessTodayIso(lateEvening)).toBe('2026-10-18')
    expect(todayIso(lateEvening)).toBe('2026-10-18')
    expect(businessTodayIso(lateEvening, 'UTC')).toBe('2026-10-17')
  })

  it('is the same day as UTC in the Damascus daytime', () => {
    expect(businessTodayIso(new Date('2026-10-17T09:00:00Z'))).toBe('2026-10-17')
    expect(businessTodayIso(new Date('2026-10-17T20:59:59Z'))).toBe('2026-10-17')
    expect(businessTodayIso(new Date('2026-10-17T21:00:00Z'))).toBe('2026-10-18')
  })

  it('shows a recorded date as that calendar date, never the day before', () => {
    expect(formatRecordedDate('2026-10-18', 'en')).toBe(formatRecordedDate('2026-10-18T00:00:00.000000Z', 'en'))
    expect(formatRecordedDate('2026-10-18T00:00:00.000000Z', 'en')).toContain('18')
    expect(formatRecordedDate('2026-10-18', 'en')).toContain('2026')
  })
})
