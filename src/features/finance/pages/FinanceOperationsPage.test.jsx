import { MemoryRouter } from 'react-router-dom'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import FinanceOperationsPage from './FinanceOperationsPage'
import {
  createFinancePrice,
  fetchExchangeRates,
  fetchFinanceCoupons,
  fetchFinanceDashboard,
  fetchFinanceProducts,
  fetchFinanceSubscriptions,
  updateFinanceProduct,
} from '../services/financeService'

vi.mock('../services/financeService', () => ({
  createFinanceCoupon: vi.fn(),
  createFinancePrice: vi.fn(),
  createFinanceProduct: vi.fn(),
  fetchCurrencies: vi.fn(),
  fetchExchangeRates: vi.fn(),
  fetchFinanceCoupons: vi.fn(),
  fetchFinanceDashboard: vi.fn(),
  fetchFinanceProducts: vi.fn(),
  fetchFinanceSubscriptions: vi.fn(),
  setExchangeRate: vi.fn(),
  updateFinanceCoupon: vi.fn(),
  updateFinancePrice: vi.fn(),
  updateFinanceProduct: vi.fn(),
  updateFinanceSubscription: vi.fn(),
}))

/*
 * FINANCE OPERATIONS (owner decisions of 17 Oct 2026). Pinned: one row per
 * currency, never summed, in the order US dollars, Syrian pounds, others, and
 * the earlier points last as history ("Points (earlier records)"); the new money
 * tiles (contract S11) and the rate in force; product prices in US dollars only,
 * saved as US cents; and the exchange-rate tab, which loads its own panel.
 */

const usd = (minor, amount) => ({ currency: 'USD', amount_minor: minor, amount })

const product = {
  id: 8,
  code: 'RPL-ASSESSMENT',
  type: 'rpl_fee',
  name: { en: 'RPL Assessment Fee' },
  is_active: true,
  prices: [
    { id: 17, currency: 'USD', amount: '120.00', money: usd(12000, '120.00'), billing_interval: 'one_time', is_active: true },
    { id: 18, currency: 'EUR', amount: '99.00', money: { currency: 'EUR', amount_minor: 9900, amount: '99.00', legacy: true }, billing_interval: 'one_time', is_active: false },
  ],
}

describe('FinanceOperationsPage', () => {
  beforeEach(() => {
    localStorage.setItem('icpc_admin_language', 'en')
    vi.clearAllMocks()
    fetchFinanceDashboard.mockResolvedValue({
      data: {
        orders_by_status: { paid: 3 },
        payments_by_status: { paid: 3, failed: 1 },
        active_subscriptions: 2,
        renewals_due_30_days: 1,
        // The ledger maps stay decimals by currency; a POINTS key is history from before 17 Oct 2026.
        gross_by_currency: { POINTS: '1500.00', SYP: '649870.00', USD: '1250.00' },
        refunds_by_currency: { USD: '50.00' },
        discounts_by_currency: { USD: '25.00' },
        wallet_top_ups_by_currency: { USD: usd(10000, '100.00'), SYP: { currency: 'SYP', amount_minor: 125000, amount: '125000' } },
        wallet_deductions_by_currency: {},
        outside_payments_by_currency: { SYP: { currency: 'SYP', amount_minor: 649870, amount: '649870' } },
        wallet_balances_by_currency: { USD: usd(25000, '250.00') },
        gross_usd_list_price: usd(129999, '1299.99'),
        current_exchange_rate: { id: 7, syp_per_usd: '13000.0000', effective_from: '2026-10-17T09:00:00.000000Z' },
      },
    })
    fetchFinanceProducts.mockResolvedValue({ data: [product] })
    fetchFinanceCoupons.mockResolvedValue({ data: [] })
    fetchFinanceSubscriptions.mockResolvedValue({ data: [] })
    createFinancePrice.mockResolvedValue({ data: {} })
    fetchExchangeRates.mockResolvedValue({ data: { current: null, history: { data: [], current_page: 1, last_page: 1 } } })
  })

  it('reports each currency on its own row, the points last as earlier records, and the new money tiles', async () => {
    render(<MemoryRouter><FinanceOperationsPage /></MemoryRouter>)

    expect(await screen.findByRole('heading', { name: 'Finance operations' })).toBeInTheDocument()
    expect(await screen.findByText('Paid orders')).toBeInTheDocument()
    expect(screen.getByText('Rate in force: 1 USD = 13,000 SYP')).toBeInTheDocument()
    expect(screen.getByText('$ 1,299.99')).toBeInTheDocument()

    const gross = screen.getByRole('region', { name: 'Gross by currency' })
    const rows = within(gross).getAllByText(/US dollars|Syrian pounds|Points \(earlier records\)/).map((node) => node.textContent)
    expect(rows).toEqual(['US dollars', 'Syrian pounds', 'Points (earlier records)'])
    expect(within(gross).getByText('$ 1,250.00')).toBeInTheDocument()
    expect(within(gross).getByText('649,870 SYP')).toBeInTheDocument()
    expect(within(gross).getByText('1,500 points (earlier record)')).toBeInTheDocument()

    const topUps = within(screen.getByRole('region', { name: 'Money received into balances' }))
    expect(topUps.getByText('$ 100.00')).toBeInTheDocument()
    expect(topUps.getByText('125,000 SYP')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Outside payments confirmed' })).getByText('649,870 SYP')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Balances held for clients' })).getByText('$ 250.00')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Corrections deducted from balances' })).getByText('No financial data exists for the selected period.')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/II Points/)
  })

  it('shows product prices in US dollars, flags a price in another currency, and saves a new one as US cents', async () => {
    render(<MemoryRouter><FinanceOperationsPage /></MemoryRouter>)

    fireEvent.click(await screen.findByRole('tab', { name: /Products & prices/ }))
    expect(await screen.findByText('RPL Assessment Fee')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Manage prices' }))

    const dialog = within(await screen.findByRole('dialog', { name: 'Manage prices: RPL Assessment Fee' }))
    expect(dialog.getByRole('button', { name: /\$ 120\.00/ })).toBeInTheDocument()
    expect(dialog.getByRole('button', { name: /99\.00 EUR/ })).toHaveTextContent('Not in US dollars: archive it and add a dollar price')
    expect(dialog.queryByLabelText('Currency')).not.toBeInTheDocument()

    fireEvent.change(dialog.getByLabelText('Amount (US dollars)'), { target: { value: '49.99' } })
    fireEvent.click(dialog.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(createFinancePrice).toHaveBeenCalledTimes(1))
    const [productId, payload] = createFinancePrice.mock.calls[0]
    expect(productId).toBe(8)
    expect(payload).toMatchObject({ amount_minor: 4999, billing_interval: 'one_time' })
    expect(payload).not.toHaveProperty('amount')
    expect(payload).not.toHaveProperty('currency')
  })

  it('opens the exchange-rate tab, which loads its own panel', async () => {
    render(<MemoryRouter><FinanceOperationsPage /></MemoryRouter>)

    fireEvent.click(await screen.findByRole('tab', { name: /Exchange rate/ }))
    await waitFor(() => expect(fetchExchangeRates).toHaveBeenCalledWith({ page: 1 }))
    expect(await screen.findByText('No exchange rate is set: nobody can pay in Syrian pounds until one is set. Dollar payments are not affected.')).toBeInTheDocument()
  })

  it('edits a product in Arabic and English only, and never sends a stored nl back', async () => {
    fetchFinanceProducts.mockResolvedValue({
      data: [{
        ...product,
        name: { en: 'RPL Assessment Fee', ar: 'رسوم تقييم RPL', nl: 'RPL-beoordelingskosten' },
        description: { en: 'One assessment', ar: 'تقييم واحد', nl: 'Eén beoordeling' },
      }],
    })
    render(<MemoryRouter><FinanceOperationsPage /></MemoryRouter>)

    fireEvent.click(await screen.findByRole('tab', { name: /Products & prices/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))

    expect(await screen.findByLabelText('Name in Arabic')).toHaveValue('رسوم تقييم RPL')
    expect(document.body.textContent).not.toMatch(/Dutch/)
    fireEvent.submit(document.getElementById('finance-product-form'))

    await waitFor(() => expect(updateFinanceProduct).toHaveBeenCalledTimes(1))
    const [id, payload] = updateFinanceProduct.mock.calls[0]
    expect(id).toBe(8)
    expect(payload.name).toEqual({ en: 'RPL Assessment Fee', ar: 'رسوم تقييم RPL' })
    expect(payload.description).toEqual({ en: 'One assessment', ar: 'تقييم واحد' })
    expect(JSON.stringify(payload)).not.toContain('"nl"')
  })

  // D-20 (18 Oct 2026): the tab is in the URL, so the payments queue and the settings open the rate inside Finance.
  it('opens the tab named in ?tab=, and writes the chosen tab back', async () => {
    fetchExchangeRates.mockResolvedValue({ data: [] })
    render(<MemoryRouter initialEntries={['/finance?tab=exchange_rate']}><FinanceOperationsPage /></MemoryRouter>)

    expect(await screen.findByRole('tab', { name: /Exchange rate/ })).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(screen.getByRole('tab', { name: /Products & prices/ }))
    expect(screen.getByRole('tab', { name: /Products & prices/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('falls back to the overview for an unknown tab', async () => {
    render(<MemoryRouter initialEntries={['/finance?tab=nonsense']}><FinanceOperationsPage /></MemoryRouter>)
    expect(await screen.findByRole('tab', { name: /Finance overview/ })).toHaveAttribute('aria-selected', 'true')
  })
})
