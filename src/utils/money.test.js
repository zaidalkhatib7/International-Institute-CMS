import { describe, expect, it } from 'vitest'
import {
  CHARGEABLE_CURRENCIES,
  LEGACY_POINTS,
  currencyExponent,
  currencyName,
  exchangeRateText,
  formatMoney,
  formatMoneyInline,
  formatPrice,
  formatRate,
  fromMinor,
  money,
  moneyFromDecimal,
  normalizeDigits,
  parseMoneyInput,
  sypForUsd,
  sypPreview,
  toMinor,
} from './money'

/*
 * MONEY ON THE PLATFORM (owner decisions of 17 Oct 2026; contract 2.1, 2.2).
 *
 * Pinned: integer minor units built with string arithmetic only (never
 * Number(x) * 100); the owner's formatting ("$ 49.99", "125,000 ل.س") with Latin
 * digits in both languages; the earlier points shown as history; and the parity
 * table, row for row the API's MA-1 (ExchangeRateService::toSyp, half up to the
 * whole pound, BigInt here).
 */

const LRI = String.fromCharCode(0x2066)
const FSI = String.fromCharCode(0x2068)
const PDI = String.fromCharCode(0x2069)

describe('the currencies', () => {
  it('charges in US dollars and Syrian pounds only; points are history', () => {
    expect(CHARGEABLE_CURRENCIES).toEqual(['USD', 'SYP'])
    expect(currencyExponent('USD')).toBe(2)
    expect(currencyExponent('SYP')).toBe(0)
    expect(currencyExponent(LEGACY_POINTS)).toBe(0)
    expect(currencyExponent('EUR')).toBe(2)
    expect(currencyName('USD', 'en')).toBe('US dollar')
    expect(currencyName('SYP', 'ar')).toBe('ليرة سورية')
    expect(currencyName(LEGACY_POINTS, 'en')).toBe('Points (former system)')
    expect(currencyName(LEGACY_POINTS, 'ar')).toBe('نقاط (النظام السابق)')
  })
})

describe('reading what staff type', () => {
  it('reads Latin and Arabic-Indic digits and the Arabic decimal sign', () => {
    expect(normalizeDigits('٤٩٫٩٩')).toBe('49.99')
    expect(normalizeDigits('۱۲۵۰۰۰')).toBe('125000')
    expect(parseMoneyInput('٤٩٫٩٩', 'USD')).toBe('49.99')
    expect(parseMoneyInput(' 49.9 ', 'USD')).toBe('49.90')
    expect(parseMoneyInput('5', 'USD')).toBe('5.00')
    expect(parseMoneyInput('0007.5', 'USD')).toBe('7.50')
    expect(parseMoneyInput('1,500.00', 'USD')).toBe('1500.00')
    expect(parseMoneyInput('125000', 'SYP')).toBe('125000')
    expect(parseMoneyInput('١٢٥٬٠٠٠', 'SYP')).toBe('125000')
  })

  it.each([
    ['1e5', 'USD'],
    ['-1', 'USD'],
    ['49.999', 'USD'],
    ['49,99', 'USD'],
    ['49.', 'USD'],
    ['', 'USD'],
    ['   ', 'USD'],
    ['12345678', 'USD'],
    ['1.5', 'SYP'],
    ['-5', 'SYP'],
    ['1e5', 'SYP'],
    ['1234567890123', 'SYP'],
    ['', 'SYP'],
    ['10', 'POINTS'],
    ['10', 'EUR'],
  ])('refuses %j in %s', (text, currency) => {
    expect(parseMoneyInput(text, currency)).toBeNull()
    expect(toMinor(text, currency)).toBeNull()
  })

  it('turns the typed text into integer minor units with string arithmetic', () => {
    expect(toMinor('49.99', 'USD')).toBe(4999)
    expect(toMinor('0.07', 'USD')).toBe(7)
    expect(toMinor('5.5', 'USD')).toBe(550)
    expect(toMinor('1000000.00', 'USD')).toBe(100000000)
    expect(toMinor('125000', 'SYP')).toBe(125000)
    expect(toMinor('999999999999', 'SYP')).toBe(999999999999)
    // The float trap a Number() would fall into: 0.29 * 100 is 28.999999999999996.
    expect(toMinor('0.29', 'USD')).toBe(29)
    expect(toMinor('1.15', 'USD')).toBe(115)
  })

  it('writes minor units back at the currency\'s scale', () => {
    expect(fromMinor(0, 'USD')).toBe('0.00')
    expect(fromMinor(5, 'USD')).toBe('0.05')
    expect(fromMinor(4999, 'USD')).toBe('49.99')
    expect(fromMinor(100000000, 'USD')).toBe('1000000.00')
    expect(fromMinor(125000, 'SYP')).toBe('125000')
    expect(fromMinor('1500', LEGACY_POINTS)).toBe('1500')
    expect(fromMinor(null, 'USD')).toBeNull()
    expect(fromMinor('4.5', 'USD')).toBeNull()
    for (const minor of [0, 5, 4999, 100000000]) expect(toMinor(fromMinor(minor, 'USD'), 'USD')).toBe(minor)
  })

  it('builds Money objects, history flagged legacy', () => {
    expect(money(4999, 'USD')).toEqual({ currency: 'USD', amount_minor: 4999, amount: '49.99' })
    expect(money(649870, 'SYP')).toEqual({ currency: 'SYP', amount_minor: 649870, amount: '649870' })
    expect(money(1500, LEGACY_POINTS)).toEqual({ currency: LEGACY_POINTS, amount_minor: 1500, amount: '1500', legacy: true })
    expect(moneyFromDecimal('649870.00', 'SYP')).toEqual({ currency: 'SYP', amount_minor: 649870, amount: '649870' })
    expect(moneyFromDecimal('1250.5', 'EUR')).toEqual({ currency: 'EUR', amount_minor: 125050, amount: '1250.50', legacy: true })
    expect(moneyFromDecimal(120, 'USD')).toEqual({ currency: 'USD', amount_minor: 12000, amount: '120.00' })
    expect(moneyFromDecimal('1500.00', LEGACY_POINTS)).toEqual({ currency: LEGACY_POINTS, amount_minor: 1500, amount: '1500', legacy: true })
    expect(moneyFromDecimal('abc', 'USD')).toBeNull()
  })
})

describe('formatting (the owner\'s examples)', () => {
  it.each([
    [money(4999, 'USD'), '$ 49.99', '$ 49.99'],
    [money(150000, 'USD'), '$ 1,500.00', '$ 1,500.00'],
    [money(125000, 'SYP'), '125,000 SYP', '125,000 ل.س'],
    [money(1500, LEGACY_POINTS), '1,500 points (earlier record)', '1,500 نقطة (سجل سابق)'],
    [{ currency: 'EUR', amount_minor: 15000, amount: '150.00', legacy: true }, '150.00 EUR', '150.00 EUR'],
    [null, '—', '—'],
    [{}, '—', '—'],
  ])('formats %j as %j (en) and %j (ar)', (value, en, ar) => {
    expect(formatMoney(value, 'en')).toBe(en)
    expect(formatMoney(value, 'ar')).toBe(ar)
  })

  it('groups a 13-digit pound amount from its digits, never through a float', () => {
    expect(formatMoney({ currency: 'SYP', amount_minor: 1000000000000, amount: '1000000000000' }, 'en')).toBe('1,000,000,000,000 SYP')
    expect(formatMoney({ currency: 'SYP', amount: '9999999999999' }, 'ar')).toBe('9,999,999,999,999 ل.س')
  })

  it('isolates an amount inside an Arabic sentence, and only there', () => {
    expect(formatMoneyInline(money(4999, 'USD'), 'en')).toBe('$ 49.99')
    expect(formatMoneyInline(money(4999, 'USD'), 'ar')).toBe(`${LRI}$ 49.99${PDI}`)
    expect(formatMoneyInline(money(125000, 'SYP'), 'ar')).toBe(`${FSI}125,000 ل.س${PDI}`)
    expect(formatMoneyInline(null, 'ar')).toBe('—')
  })

  it('shows a Price with the pounds at today\'s rate, or the dollars alone while no rate is set', () => {
    const rate = { id: 7, syp_per_usd: '13000.0000', effective_from: '2026-10-17T09:00:00.000000Z' }
    expect(formatPrice({ usd: money(4999, 'USD'), syp: money(649870, 'SYP'), exchange_rate: rate }, 'en')).toBe('$ 49.99 (649,870 SYP at today\'s rate)')
    expect(formatPrice({ usd: money(4999, 'USD'), syp: null, exchange_rate: null }, 'en')).toBe('$ 49.99')
    expect(formatPrice({ usd: money(4999, 'USD'), syp: money(649870, 'SYP'), exchange_rate: rate }, 'ar')).toContain('بسعر اليوم')
    expect(formatPrice(null, 'en')).toBe('—')
  })

  it('writes the rate without its trailing zeros', () => {
    expect(formatRate('13000.0000')).toBe('13,000')
    expect(formatRate('118.7500')).toBe('118.75')
    expect(exchangeRateText({ syp_per_usd: '13000.0000' }, 'en')).toBe('1 USD = 13,000 SYP')
    expect(exchangeRateText('13000', 'ar')).toBe('1 دولار = 13,000 ل.س')
    expect(exchangeRateText(null, 'en')).toBe('—')
  })
})

describe('the parity table (previews only; the API MA-1 rows)', () => {
  it.each([
    ['49.99', '13000', '649870'],
    ['0.01', '50', '1'],
    ['1.15', '10', '12'],
    ['0.99', '118.75', '118'],
    ['25.50', '13000', '331500'],
    ['1000000.00', '1000000', '1000000000000'],
  ])('$%s x %s = %s pounds, half up', (usd, rate, syp) => {
    expect(sypForUsd(usd, rate)).toBe(syp)
  })

  it('takes an ExchangeRate as well as a string, and refuses what is not a price or a rate', () => {
    expect(sypForUsd('49.99', { syp_per_usd: '13000.0000' })).toBe('649870')
    expect(sypPreview(4999, { syp_per_usd: '13000.0000' })).toEqual(money(649870, 'SYP'))
    expect(sypForUsd('49.999', '13000')).toBeNull()
    expect(sypForUsd('49.99', '13000.00001')).toBeNull()
    expect(sypForUsd('49.99', '0')).toBeNull()
    expect(sypPreview(4999, null)).toBeNull()
  })
})
