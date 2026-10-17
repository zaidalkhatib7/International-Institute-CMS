import { describe, expect, it } from 'vitest'
import { AFTER_QUIZ_COPY } from '../features/rpl/domain/afterQuiz'
import { COPY as RPL_CONFIGURATION_COPY } from '../features/rpl/pages/RplConfigurationPage'
import { EXCHANGE_RATE_COPY } from '../features/finance/domain/exchangeRate'
import { WALLET_COPY } from '../features/users/domain/wallet'
import { copyByLanguage as USER_WORKSPACE_COPY } from '../features/users/pages/UserWorkspacePage'

/*
 * NO II POINTS ANYWHERE (owner decision 1 of 17 Oct 2026: only money).
 *
 * A guard over the platform's source and its copy objects. "II Points" and
 * "نقاط II" are gone from every screen, comment and string; and the code of the
 * former points currency is written in one place only, utils/money.js
 * (LEGACY_POINTS), which shows the earlier records as history. Every other file
 * reads that constant, so a new literal "POINTS" anywhere fails here.
 */

const SOURCES = import.meta.glob(['../**/*.js', '../**/*.jsx', '!../**/*.test.js', '!../**/*.test.jsx', '!../test/**'], { query: '?raw', import: 'default', eager: true })

describe('no II Points', () => {
  it('reads the whole platform source', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(100)
    expect(Object.keys(SOURCES)).toContain('../utils/money.js')
  })

  it('names II Points nowhere, in either language', () => {
    const offenders = Object.entries(SOURCES).filter(([, source]) => /II Points|نقاط II/.test(source)).map(([path]) => path)
    expect(offenders).toEqual([])
  })

  it('writes the former points code only in utils/money.js', () => {
    const offenders = Object.entries(SOURCES)
      .filter(([path]) => path !== '../utils/money.js')
      .filter(([, source]) => /(['"`])POINTS\1/.test(source))
      .map(([path]) => path)
    expect(offenders).toEqual([])
  })

  it.each(Object.entries({ AFTER_QUIZ_COPY, RPL_CONFIGURATION_COPY, EXCHANGE_RATE_COPY, WALLET_COPY, USER_WORKSPACE_COPY }))('keeps %s free of points', (_, copy) => {
    expect(JSON.stringify(copy)).not.toMatch(/II Points|نقاط II|POINTS/)
  })
})
