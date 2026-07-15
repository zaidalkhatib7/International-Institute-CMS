import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import FinanceOperationsPage from './FinanceOperationsPage'
import {
  fetchFinanceCoupons,
  fetchFinanceDashboard,
  fetchFinanceProducts,
  fetchFinanceSubscriptions,
} from '../services/financeService'

vi.mock('../services/financeService', () => ({
  createFinanceCoupon: vi.fn(),
  createFinancePrice: vi.fn(),
  createFinanceProduct: vi.fn(),
  fetchFinanceCoupons: vi.fn(),
  fetchFinanceDashboard: vi.fn(),
  fetchFinanceProducts: vi.fn(),
  fetchFinanceSubscriptions: vi.fn(),
  updateFinanceCoupon: vi.fn(),
  updateFinancePrice: vi.fn(),
  updateFinanceProduct: vi.fn(),
  updateFinanceSubscription: vi.fn(),
}))

const product = {
  id: 8,
  code: 'RPL-ASSESSMENT',
  type: 'rpl_fee',
  name: { en: 'RPL Assessment Fee' },
  is_active: true,
  prices: [
    { id: 17, currency: 'EUR', amount: 120, billing_interval: 'one_time', is_active: true },
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
        gross_by_currency: { EUR: 1250 },
        refunds_by_currency: { EUR: 50 },
        discounts_by_currency: { EUR: 25 },
      },
    })
    fetchFinanceProducts.mockResolvedValue({ data: [product] })
    fetchFinanceCoupons.mockResolvedValue({ data: [] })
    fetchFinanceSubscriptions.mockResolvedValue({ data: [] })
  })

  it('renders multi-currency reporting and opens product price management', async () => {
    render(<FinanceOperationsPage />)

    expect(await screen.findByRole('heading', { name: 'Finance operations' })).toBeInTheDocument()
    expect(await screen.findByText('Paid orders')).toBeInTheDocument()
    expect(screen.getByText('1,250')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: /Products & prices/ }))

    expect(await screen.findByText('RPL Assessment Fee')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Manage prices' }))

    expect(await screen.findByRole('dialog', { name: 'Manage prices: RPL Assessment Fee' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /EUR 120/ })).toBeInTheDocument()
  })
})
