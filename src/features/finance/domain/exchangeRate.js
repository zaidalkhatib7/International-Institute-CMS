import { normalizeDigits } from '../../../utils/money'
import { getRouteAccess } from '../../../routes/routeAccess'

/*
 * THE USD -> SYP EXCHANGE RATE (owner decisions of 17 Oct 2026; contract S1, S2).
 *
 * Syrian pounds for 1 US dollar, a decimal with at most four places, from 1 to
 * 1,000,000. The owner sets it (finance.exchange_rates.manage, held by his role
 * only); every change is audited and the history is append-only: no rate is ever
 * edited or deleted. Setting one needs a note (the source of the rate) and the id
 * of the rate the setter saw, so two people never overwrite each other unseen.
 * The first rate, and any change of 20% or more, need a tick: a missing or extra
 * zero is a change of x10, a redenomination one of x100. Changing the rate never
 * changes a payment already made, a balance or a dollar price.
 */

export const EXCHANGE_RATE_MANAGE_PERMISSION = 'finance.exchange_rates.manage'
/** Who reads the rate and its history (contract M5); the route takes any of them. */
export const EXCHANGE_RATE_READ_PERMISSIONS = Object.freeze([
  EXCHANGE_RATE_MANAGE_PERMISSION,
  'finance.manage',
  'finance.reports.view',
  'finance.catalog.manage',
  'rpl.payments.reconcile',
])
export const RATE_NOTE_MIN = 10
export const RATE_NOTE_MAX = 2000
/** A change of this many percent or more needs the tick (the API's ExchangeRateService::CONFIRM_CHANGE_PERCENT). */
export const CONFIRM_CHANGE_PERCENT = 20
/** The price the preview converts: $ 49.99, in cents. */
export const PREVIEW_USD_MINOR = 4999

const MIN_RATE_E4 = 10000n
const MAX_RATE_E4 = 10000000000n

/*
 * Setting the rate is the owner's act: super-admin, or a role given the
 * permission by data. The platform's hasPermission() answers true for every
 * administrator, so it cannot tell an admin from a super-admin; this reads the
 * role or the permission itself (the canApproveWording pattern).
 */
/** The Finance tab that holds the rate, for a viewer who can open Finance. */
export const FINANCE_EXCHANGE_RATE_HREF = '/finance?tab=exchange_rate'
/** The page of its own, for a finance or payment role that cannot open Finance. */
export const STANDALONE_EXCHANGE_RATE_HREF = '/finance/exchange-rate'

/**
 * Where the rate is read (walk of 18 Oct 2026): one place per viewer. A viewer who
 * opens Finance reads it in Finance's tab; only a role without Finance gets the
 * page of its own. `canAccess` is the authorization's route check.
 */
export function exchangeRateHref(canAccess) {
  return typeof canAccess === 'function' && canAccess(getRouteAccess('/finance')) ? FINANCE_EXCHANGE_RATE_HREF : STANDALONE_EXCHANGE_RATE_HREF
}

export function canManageExchangeRate(authorization) {
  if (!authorization) return false
  const roles = Array.isArray(authorization.roles) ? authorization.roles : []
  const permissions = Array.isArray(authorization.permissions) ? authorization.permissions : []
  return roles.includes('super-admin') || permissions.includes(EXCHANGE_RATE_MANAGE_PERMISSION)
}

function rateText(rate) {
  return typeof rate === 'object' && rate ? String(rate.syp_per_usd ?? '') : String(rate ?? '')
}

/** A rate (a decimal string or an ExchangeRate) as an integer of ten-thousandths, or null. */
export function rateE4(rate) {
  const match = /^(\d+)(?:\.(\d{1,4}))?$/.exec(rateText(rate).trim())
  if (!match) return null
  return BigInt(`${match[1]}${(match[2] || '').padEnd(4, '0')}`)
}

/**
 * The typed rate as the API takes it ("13000.0000"), or null when it is not a
 * rate: at most seven whole digits and four decimals, from 1 to 1,000,000.
 * Arabic-Indic digits are read; a comma only where it groups thousands.
 */
export function parseRateInput(text) {
  let normalized = normalizeDigits(text)
  if (normalized.includes(',')) {
    if (!/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(normalized)) return null
    normalized = normalized.replaceAll(',', '')
  }
  const match = /^(\d{1,7})(?:\.(\d{1,4}))?$/.exec(normalized)
  if (!match) return null
  const whole = match[1].replace(/^0+(?=\d)/, '')
  const value = `${whole}.${(match[2] || '').padEnd(4, '0')}`
  const scaled = rateE4(value)
  if (scaled == null || scaled < MIN_RATE_E4 || scaled > MAX_RATE_E4) return null
  return value
}

/**
 * The change from the old rate to the new one in percent, two decimals ("-2.31"),
 * in integer arithmetic, rounded half away from zero; null with no old rate.
 */
export function rateChangePercent(oldRate, newRate) {
  const before = rateE4(oldRate)
  const after = rateE4(newRate)
  if (before == null || after == null || before === 0n) return null
  const difference = after - before
  const negative = difference < 0n
  const magnitude = negative ? -difference : difference
  // percent x 100, rounded half up on the magnitude: (|diff| x 10000 + before / 2) / before
  const hundredths = (magnitude * 10000n + before / 2n) / before
  const whole = hundredths / 100n
  const fraction = String(hundredths % 100n).padStart(2, '0')
  return `${negative && hundredths !== 0n ? '-' : ''}${whole}.${fraction}`
}

/** The tick is needed for the first rate and for a change of 20% or more, exactly (|new - old| x 100 >= old x 20). */
export function needsLargeChangeConfirmation(oldRate, newRate) {
  const before = rateE4(oldRate)
  const after = rateE4(newRate)
  if (before == null) return true
  if (after == null) return false
  const difference = after > before ? after - before : before - after
  return difference * 100n >= before * BigInt(CONFIRM_CHANGE_PERCENT)
}

export function isRateNoteValid(text) {
  const length = String(text ?? '').trim().length
  return length >= RATE_NOTE_MIN && length <= RATE_NOTE_MAX
}

export const EXCHANGE_RATE_COPY = {
  ar: {
    title: 'سعر الصرف',
    hint: 'لكل ما يُباع سعر واحد بالدولار الأمريكي. يدفع العميل بالليرة السورية السعرَ بالدولار × هذا السعر، مقرّبًا إلى أقرب ليرة صحيحة (يُقرَّب النصف إلى الأعلى)، ويُثبَّت هذا المبلغ على دفعته: لا يغيّر تغييرُ السعر أي دفعة تمت ولا أي رصيد في المحفظة ولا أي سعر بالدولار.',
    current: 'السعر الساري',
    setBy: 'ضبطه {name} في {at}',
    source: 'المصدر: {note}',
    noRate: 'لم يُضبط سعر صرف: لا يمكن لأحد الدفع بالليرة السورية حتى يُضبط. ولا يتأثر الدفع بالدولار.',
    changeTitle: 'ضبط سعر جديد',
    newRate: 'عدد الليرات السورية مقابل دولار أمريكي واحد',
    newRateInvalid: 'أدخل سعرًا من 1 إلى 1,000,000 بأربع خانات عشرية على الأكثر، مثل 13000.',
    note: 'مصدر السعر (من 10 إلى 2000 حرف، يُحفظ في سجل التدقيق)',
    noteInvalid: 'اكتب ما بين 10 و2000 حرف.',
    preview: 'سيصبح سعر {price} مساويًا {new} (حاليًا {old}).',
    previewFirst: 'سيصبح سعر {price} مساويًا {new}.',
    change: 'التغيير: {percent}٪',
    bigChange: 'يغيّر هذا السعر بنسبة {percent}٪ (من {old} إلى {new}). ضع علامة لتأكيد أنه ليس خطأ في الكتابة.',
    firstRate: 'هذا أول سعر صرف. ضع علامة لتأكيد أنه السعر الذي يدفع به العملاء فعلًا (ليرات سورية مقابل دولار واحد).',
    confirmTick: 'أؤكد هذا السعر.',
    submit: 'اضبط السعر',
    saving: 'جارٍ الحفظ…',
    saved: 'السعر الجديد ساري المفعول من الآن.',
    stale: 'ضبط موظف آخر سعرًا جديدًا أثناء عملك. أُعيد التحميل: راجعه ثم أعد المحاولة. وبقي ما كتبته.',
    needsConfirmation: 'يحتاج هذا السعر إلى تأكيد: ضع العلامة ثم أعد المحاولة.',
    ownerOnly: 'يضبط دور المالك وحده سعر الصرف.',
    history: 'سجل الأسعار',
    historyHint: 'سجل لا يُعدَّل ولا يُحذف منه شيء: كل سعر جديد يُضاف، ويبقى ما قبله كما سُجّل.',
    historyEmpty: 'لم يُضبط أي سعر بعد.',
    from: 'ساري من',
    rate: 'السعر',
    changeColumn: 'التغيير',
    setByColumn: 'ضبطه',
    sourceColumn: 'المصدر',
    inForce: 'ساري',
    previous: 'السابق',
    next: 'التالي',
    page: 'الصفحة {page} من {last}',
    loadError: 'تعذر تحميل سعر الصرف.',
    retry: 'إعادة المحاولة',
    settingsCard: 'سعر الصرف',
    settingsCardHint: 'يُضبط في النظام المالي، ويضبطه دور المالك وحده، ويُسجَّل كل تغيير في سجل التدقيق.',
    open: 'فتح سعر الصرف',
  },
  en: {
    title: 'Exchange rate',
    hint: 'Everything is priced once, in US dollars. A client paying in Syrian pounds pays the dollar price × this rate, rounded half up to the whole pound, and that amount is frozen on his payment: changing the rate never changes a payment already made, a wallet balance or a dollar price.',
    current: 'Rate in force',
    setBy: 'Set by {name} on {at}',
    source: 'Source: {note}',
    noRate: 'No exchange rate is set: nobody can pay in Syrian pounds until one is set. Dollar payments are not affected.',
    changeTitle: 'Set a new rate',
    newRate: 'Syrian pounds for 1 US dollar',
    newRateInvalid: 'Enter a rate from 1 to 1,000,000 with at most four decimals, such as 13000.',
    note: 'Source of the rate (10 to 2,000 characters, kept in the audit trail)',
    noteInvalid: 'Write between 10 and 2,000 characters.',
    preview: 'A {price} price would be {new} (now {old}).',
    previewFirst: 'A {price} price would be {new}.',
    change: 'Change: {percent}%',
    bigChange: 'This changes the rate by {percent}% (from {old} to {new}). Tick to confirm it is not a typing mistake.',
    firstRate: 'This is the first exchange rate. Tick to confirm it is the rate clients actually pay with (Syrian pounds for 1 US dollar).',
    confirmTick: 'I confirm this rate.',
    submit: 'Set the rate',
    saving: 'Saving…',
    saved: 'The new rate is in force from now.',
    stale: 'Someone else set a new rate while you were working. It has been reloaded: check it, then try again. What you typed is kept.',
    needsConfirmation: 'This rate needs a confirmation: tick the box, then try again.',
    ownerOnly: 'Only the owner\'s role sets the exchange rate.',
    history: 'Rate history',
    historyHint: 'Nothing here is ever edited or deleted: each new rate is added, and the earlier ones stay as they were recorded.',
    historyEmpty: 'No rate has been set yet.',
    from: 'In force from',
    rate: 'Rate',
    changeColumn: 'Change',
    setByColumn: 'Set by',
    sourceColumn: 'Source',
    inForce: 'In force',
    previous: 'Previous',
    next: 'Next',
    page: 'Page {page} of {last}',
    loadError: 'Unable to load the exchange rate.',
    retry: 'Try again',
    settingsCard: 'Exchange rate',
    settingsCardHint: 'Set in Finance, by the owner\'s role only; every change is kept in the audit trail.',
    open: 'Open the exchange rate',
  },
}

export function exchangeRateCopy(language) {
  return EXCHANGE_RATE_COPY[language === 'ar' ? 'ar' : 'en']
}
