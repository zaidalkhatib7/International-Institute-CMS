/*
 * MONEY ON THE PLATFORM (owner decisions of 17 Oct 2026).
 *
 * Every priced item has ONE price in US dollars. A client paying in Syrian
 * pounds pays the dollar price x the owner's exchange rate, rounded half up to
 * the whole pound, and that amount is frozen on his payment. Wallets hold two
 * balances, USD and SYP, never converted between them. Amounts that were II
 * Points became the same number of US dollars; records written before stay as
 * they were recorded and are shown as history ("points, earlier record").
 *
 * The wire format (contract 2.1):
 *   Money          {currency, amount_minor, amount, legacy?}
 *   ExchangeRate   {id, syp_per_usd, effective_from}
 *   Price          {usd: Money, syp: Money | null, exchange_rate: ExchangeRate | null}
 * amount_minor is an integer of minor units: US cents, whole Syrian pounds,
 * points. Every money input the platform sends is such an integer, built here
 * from the typed text with string arithmetic. Number(x) * 100 never touches a
 * money value, and the platform never computes an amount anybody pays: the
 * server sends it (Price.syp, a charge's amount). sypForUsd is for previews only
 * and is pinned to the server's results (the parity table in money.test.js).
 *
 * Money is written with Latin digits and comma grouping in both languages, as
 * in the owner's own "125,000 ل.س", so the digits staff type into a money field
 * and the digits they read back are the same.
 */

export const LEGACY_POINTS = 'POINTS'

/** The currencies money moves in. POINTS is history only: shown, never charged. */
export const CHARGEABLE_CURRENCIES = Object.freeze(['USD', 'SYP'])

const EXPONENTS = Object.freeze({ USD: 2, SYP: 0, [LEGACY_POINTS]: 0 })

/** Every price is 0 (free or unpriced) or $1.00 to $1,000,000.00 (contract 2.2, M6). */
export const MIN_PRICE_USD_MINOR = 100
export const MAX_PRICE_USD_MINOR = 100000000

const NAMES = Object.freeze({
  USD: { en: 'US dollar', ar: 'دولار أمريكي' },
  SYP: { en: 'Syrian pound', ar: 'ليرة سورية' },
  [LEGACY_POINTS]: { en: 'Points (former system)', ar: 'نقاط (النظام السابق)' },
})

const LRI = '\u2066'
const FSI = '\u2068'
const PDI = '\u2069'

function lang(language) {
  return language === 'ar' ? 'ar' : 'en'
}

function codeOf(currency) {
  return String(currency ?? '').trim().toUpperCase()
}

/** The number of decimals a currency is written with: USD 2, SYP 0, POINTS 0; any other history code 2. */
export function currencyExponent(currency) {
  const code = codeOf(currency)
  return Object.prototype.hasOwnProperty.call(EXPONENTS, code) ? EXPONENTS[code] : 2
}

export function isChargeableCurrency(currency) {
  return CHARGEABLE_CURRENCIES.includes(codeOf(currency))
}

/** "US dollar" / "دولار أمريكي"; "Syrian pound" / "ليرة سورية"; any other code as sent. */
export function currencyName(currency, language) {
  const code = codeOf(currency)
  return NAMES[code]?.[lang(language)] || code
}

/*
 * Arabic-Indic (٠-٩) and Persian (۰-۹) digits become Latin; the Arabic decimal
 * sign (٫) becomes '.', the Arabic thousands sign (٬) a comma; every space goes.
 */
export function normalizeDigits(text) {
  return String(text ?? '')
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, '.')
    .replace(/٬/g, ',')
    .replace(/[\s\u00a0\u202f]/g, '')
}

/*
 * A comma is accepted only where it groups thousands ("1,500.00"). Anywhere else
 * it refuses the text: "49,99" is a decimal comma in many places, and reading it
 * as 4999 would put a hundred times the money on a balance.
 */
function stripGrouping(text) {
  if (!text.includes(',')) return text
  return /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(text) ? text.replaceAll(',', '') : null
}

function stripLeadingZeros(digits) {
  const stripped = digits.replace(/^0+(?=\d)/, '')
  return stripped === '' ? '0' : stripped
}

/**
 * The typed text as a normalised decimal string, or null when it is not an
 * amount in that currency: USD at most 7 digits and 2 decimals ("49.9" gives
 * "49.90"), SYP a whole number of at most 12 digits ("125000"). Never a sign, an
 * exponent or a third decimal.
 */
export function parseMoneyInput(text, currency) {
  const code = codeOf(currency)
  const normalized = stripGrouping(normalizeDigits(text))
  if (normalized == null || normalized === '') return null
  if (code === 'USD') {
    const match = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(normalized)
    if (!match) return null
    return `${stripLeadingZeros(match[1])}.${(match[2] || '').padEnd(2, '0')}`
  }
  if (code === 'SYP') {
    return /^\d{1,12}$/.test(normalized) ? stripLeadingZeros(normalized) : null
  }
  return null
}

/** The typed text as an integer of minor units (US cents, whole pounds), or null. String arithmetic only. */
export function toMinor(text, currency) {
  const decimal = parseMoneyInput(text, currency)
  if (decimal == null) return null
  return Number.parseInt(decimal.replace('.', ''), 10)
}

/** An integer of minor units as a decimal string at the currency's scale: 4999 USD gives "49.99", 5 gives "0.05". */
export function fromMinor(minor, currency) {
  if (minor == null || minor === '') return null
  const text = typeof minor === 'bigint' ? minor.toString() : String(minor)
  if (!/^-?\d+$/.test(text)) return null
  const negative = text.startsWith('-')
  const digits = stripLeadingZeros(negative ? text.slice(1) : text)
  const exponent = currencyExponent(currency)
  let result = digits
  if (exponent > 0) {
    const padded = digits.padStart(exponent + 1, '0')
    result = `${padded.slice(0, -exponent)}.${padded.slice(-exponent)}`
  }
  return negative && /[1-9]/.test(result) ? `-${result}` : result
}

/** A Money object (contract 2.1) from an integer of minor units. */
export function money(minor, currency) {
  const code = codeOf(currency)
  const amount = fromMinor(minor, code)
  if (amount == null) return null
  return { currency: code, amount_minor: Number(minor), amount, ...(isChargeableCurrency(code) ? {} : { legacy: true }) }
}

/**
 * A Money object from a ledger decimal ("649870.00" SYP, "1250.5" EUR, 120), as
 * the history tables and the finance maps carry them. Zeros past the currency's
 * scale are dropped; a value that does not fit it is kept as sent, for display.
 */
export function moneyFromDecimal(amount, currency) {
  if (amount == null || amount === '') return null
  const text = String(amount).trim()
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(text)
  if (!match) return null
  const code = codeOf(currency)
  const exponent = currencyExponent(code)
  const fraction = match[3] || ''
  const legacy = isChargeableCurrency(code) ? {} : { legacy: true }
  if (fraction.length > exponent && /[1-9]/.test(fraction.slice(exponent))) {
    return { currency: code, amount_minor: null, amount: text, ...legacy }
  }
  const minorDigits = `${match[2]}${fraction.slice(0, exponent).padEnd(exponent, '0')}`
  const unsigned = Number.parseInt(minorDigits, 10)
  const negative = Boolean(match[1]) && unsigned !== 0
  return { currency: code, amount_minor: negative ? -unsigned : unsigned, amount: fromMinor(negative ? `-${minorDigits}` : minorDigits, code), ...legacy }
}

export function isMoney(value) {
  return Boolean(value) && typeof value === 'object' && typeof value.currency === 'string' && (Number.isSafeInteger(value.amount_minor) || typeof value.amount === 'string')
}

/** The integer of minor units a Money carries, or null. */
export function amountMinorOf(value) {
  return isMoney(value) && Number.isSafeInteger(value.amount_minor) ? value.amount_minor : null
}

function groupThousands(decimal) {
  const negative = decimal.startsWith('-')
  const [integer, fraction] = (negative ? decimal.slice(1) : decimal).split('.')
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${negative ? '-' : ''}${grouped}${fraction != null ? `.${fraction}` : ''}`
}

function decimalOf(value) {
  if (Number.isSafeInteger(value?.amount_minor)) return fromMinor(value.amount_minor, value.currency)
  if (typeof value?.amount === 'string' && /^-?\d+(\.\d+)?$/.test(value.amount.trim())) return value.amount.trim()
  return null
}

/**
 * A Money object as text: "$ 49.99" in both languages; "125,000 ل.س" (ar) or
 * "125,000 SYP" (en); "1,500 points (earlier record)" / "1,500 نقطة (سجل سابق)"
 * for the former system; any other history code as sent ("150.00 EUR"); "—"
 * for nothing.
 */
export function formatMoney(value, language) {
  if (!isMoney(value)) return '—'
  const decimal = decimalOf(value)
  if (decimal == null) return '—'
  const code = codeOf(value.currency)
  const grouped = groupThousands(decimal)
  const ar = lang(language) === 'ar'
  if (code === 'USD') return `$ ${grouped}`
  if (code === 'SYP') return ar ? `${grouped} ل.س` : `${grouped} SYP`
  if (code === LEGACY_POINTS) return ar ? `${grouped} نقطة (سجل سابق)` : `${grouped} points (earlier record)`
  return `${grouped} ${code}`
}

/** True when the text of this money reads left to right in Arabic too (dollars, any Latin code). */
export function readsLeftToRight(value, language) {
  const code = codeOf(value?.currency)
  return lang(language) !== 'ar' || !(code === 'SYP' || code === LEGACY_POINTS)
}

/**
 * formatMoney for a place that holds text only (an <option>, a sentence): in
 * Arabic the amount is isolated, so "$ 49.99" inside an Arabic sentence never
 * reads "49.99 $".
 */
export function formatMoneyInline(value, language) {
  const text = formatMoney(value, language)
  if (lang(language) !== 'ar' || text === '—') return text
  return readsLeftToRight(value, language) ? `${LRI}${text}${PDI}` : `${FSI}${text}${PDI}`
}

/** A Price (contract 2.1): "$ 49.99 (649,870 SYP at today's rate)", or the dollars alone while no rate is set. */
export function formatPrice(price, language) {
  if (!price || !isMoney(price.usd)) return '—'
  const usd = formatMoneyInline(price.usd, language)
  if (!isMoney(price.syp)) return usd
  const syp = formatMoneyInline(price.syp, language)
  return lang(language) === 'ar' ? `${usd} (${syp} بسعر اليوم)` : `${usd} (${syp} at today's rate)`
}

function scaled(decimal, places) {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(normalizeDigits(decimal))
  if (!match) return null
  const fraction = match[2] || ''
  if (fraction.length > places) return null
  return BigInt(`${match[1]}${fraction.padEnd(places, '0')}`)
}

function sypMinorFromCents(cents, sypPerUsd) {
  const rateE4 = typeof sypPerUsd === 'object' && sypPerUsd ? scaled(String(sypPerUsd.syp_per_usd ?? ''), 4) : scaled(String(sypPerUsd ?? ''), 4)
  if (cents == null || rateE4 == null || rateE4 <= 0n) return null
  // syp = round half up(cents x rateE4 / 10^6): units of 10^-6 pound, plus half a pound, then floor (contract M3).
  return (cents * rateE4 + 500000n) / 1000000n
}

/**
 * PREVIEWS ONLY. The whole pounds a dollar price comes to at a rate, rounded half
 * up, with BigInt and never a float; the same rule and the same results as the
 * API's ExchangeRateService::toSyp. usd is a decimal string (at most two places),
 * the rate a decimal string (at most four) or an ExchangeRate. Null when either
 * is not one.
 */
export function sypForUsd(usd, sypPerUsd) {
  const result = sypMinorFromCents(scaled(String(usd ?? ''), 2), sypPerUsd)
  return result == null ? null : result.toString()
}

/** PREVIEWS ONLY: a Money in pounds for a price in US cents at a rate, or null. */
export function sypPreview(usdMinor, sypPerUsd) {
  if (!Number.isSafeInteger(usdMinor) || usdMinor < 0) return null
  const result = sypMinorFromCents(BigInt(usdMinor), sypPerUsd)
  if (result == null || result > BigInt(Number.MAX_SAFE_INTEGER)) return null
  return money(Number(result), 'SYP')
}

/** A rate's decimal string with the trailing zeros of its fraction dropped and the thousands grouped: "13000.0000" gives "13,000". */
export function formatRate(sypPerUsd) {
  const text = typeof sypPerUsd === 'object' && sypPerUsd ? sypPerUsd.syp_per_usd : sypPerUsd
  const match = /^(\d+)(?:\.(\d+))?$/.exec(String(text ?? '').trim())
  if (!match) return '—'
  const fraction = (match[2] || '').replace(/0+$/, '')
  return groupThousands(fraction ? `${stripLeadingZeros(match[1])}.${fraction}` : stripLeadingZeros(match[1]))
}

/** "1 USD = 13,000 SYP" / "1 دولار = 13,000 ل.س", or "—" while no rate is set. */
export function exchangeRateText(rate, language) {
  const value = formatRate(rate)
  if (value === '—') return '—'
  return lang(language) === 'ar' ? `1 دولار = ${value} ل.س` : `1 USD = ${value} SYP`
}
