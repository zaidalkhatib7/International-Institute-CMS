import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ExchangeRatePage from './ExchangeRatePage'
import { AuthorizationContext } from '../../auth/context/authorizationContext'
import { createAuthorization } from '../../auth/authorization'
import { permissionsUser, roleUser } from '../../../test/roleFixtures'
import { EXCHANGE_RATE_COPY } from '../domain/exchangeRate'

/*
 * THE EXCHANGE RATE'S PAGE OF ITS OWN (walk of 18 Oct 2026).
 *
 * Pinned: a viewer who can open Finance is sent to Finance's tab, so every link
 * and search result lands in one place; a role without Finance reads the page,
 * whose header names the rate once (the panel does not repeat the title or its
 * explanation).
 */

const mocks = vi.hoisted(() => ({ fetchExchangeRates: vi.fn(), setExchangeRate: vi.fn(), language: { current: 'en' } }))

vi.mock('../services/financeService', () => ({ fetchExchangeRates: mocks.fetchExchangeRates, setExchangeRate: mocks.setExchangeRate }))
vi.mock('../../../services/languageStorage', async (importOriginal) => ({
  ...(await importOriginal()),
  getAdminLanguage: () => mocks.language.current,
}))

function Probe() {
  const location = useLocation()
  return <p data-testid="probe">{location.pathname}{location.search}</p>
}

function renderPage(user) {
  return render(
    <AuthorizationContext.Provider value={createAuthorization(user)}>
      <MemoryRouter initialEntries={['/finance/exchange-rate']}>
        <Routes>
          <Route path="/finance/exchange-rate" element={<ExchangeRatePage />} />
          <Route path="*" element={<Probe />} />
        </Routes>
      </MemoryRouter>
    </AuthorizationContext.Provider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.language.current = 'en'
  mocks.fetchExchangeRates.mockResolvedValue({ data: { current: { id: 7, syp_per_usd: '13000.0000', effective_from: '2026-10-17T09:00:00Z', set_by: { name: 'Owner Example' } }, history: { data: [], current_page: 1, last_page: 1 } } })
})

describe('the exchange rate page', () => {
  it('sends a viewer who can open Finance to Finance\'s tab', () => {
    renderPage(roleUser('admin'))
    expect(screen.getByTestId('probe')).toHaveTextContent('/finance?tab=exchange_rate')
  })

  it.each(['en', 'ar'])('names the rate once for a role without Finance (%s)', async (language) => {
    mocks.language.current = language
    const copy = EXCHANGE_RATE_COPY[language]
    renderPage(permissionsUser(['rpl.payments.reconcile']))
    expect(await screen.findByText(copy.current)).toBeInTheDocument()
    expect(screen.getAllByText(copy.title)).toHaveLength(1)
    expect(screen.getAllByText(copy.hint)).toHaveLength(1)
    expect(screen.queryByTestId('probe')).not.toBeInTheDocument()
  })
})
