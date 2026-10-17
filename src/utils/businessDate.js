import { formatLocalizedDate } from './localization'

/*
 * THE INSTITUTE'S BUSINESS DAY (E2E item J07-G1, 17 Oct 2026).
 *
 * A date of money received or paid outside (a wallet top-up, the confirmation of
 * an outside payment, the committee-fee reconciliation) is a date on the
 * institute's calendar: the server's config app.business_timezone, Asia/Damascus
 * by default. "No later than today" means today there, whatever the computer's
 * own zone, so the date fields' limit and their checks agree with the server's
 * between 00:00 and 03:00 in Damascus (when the UTC day is still yesterday).
 *
 * This is the platform's one copy of that zone: VITE_BUSINESS_TIME_ZONE when the
 * build sets it (to match the server's APP_BUSINESS_TIMEZONE), else Asia/Damascus.
 */
const DEFAULT_BUSINESS_TIME_ZONE = 'Asia/Damascus'

function knownTimeZone(zone) {
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone })
    return true
  } catch {
    return false
  }
}

const configuredZone = String(import.meta.env?.VITE_BUSINESS_TIME_ZONE ?? '').trim()

export const BUSINESS_TIME_ZONE = configuredZone && knownTimeZone(configuredZone) ? configuredZone : DEFAULT_BUSINESS_TIME_ZONE

/** Today on the institute's calendar, YYYY-MM-DD. */
export function businessTodayIso(now = new Date(), timeZone = BUSINESS_TIME_ZONE) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}

/*
 * A date of receipt as the server records it: YYYY-MM-DD, or 00:00 UTC of that
 * date on a date-time field (paid_at). Shown as that calendar date, never as a
 * local time that can fall on the day before.
 */
export function formatRecordedDate(value, language) {
  return formatLocalizedDate(value, language, { dateStyle: 'medium', timeZone: 'UTC' })
}
