import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PaymentReconciliationPanel from './PaymentReconciliationPanel'
import { businessTodayIso } from '../../../utils/businessDate'

/*
 * THE COMMITTEE-PATH CERTIFICATION FEE (contract S17; owner decisions of 17 Oct
 * 2026). Pinned: staff record the currency the client paid in and the amount,
 * which must be exactly what the server says is due (committee_fee_due): the
 * dollars, or the pounds at the rate in force, never offered while no rate is
 * set. A mismatch the server refuses (422 amount_mismatch) reads the case again.
 */

const mocks = vi.hoisted(() => ({ reconcileRplPayment: vi.fn() }))
vi.mock('../services/rplService', () => mocks)

const usd = { currency: 'USD', amount_minor: 15000, amount: '150.00' }
const syp = { currency: 'SYP', amount_minor: 1950000, amount: '1950000' }
const RATE = { id: 7, syp_per_usd: '13000.0000', effective_from: '2026-10-17T09:00:00Z' }

function application(overrides = {}) {
  return {
    public_id: 'case-41',
    payment_status: 'pending',
    fee_snapshot: { amount: 150, currency: 'USD' },
    committee_fee_due: { usd, syp, exchange_rate: RATE },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.reconcileRplPayment.mockResolvedValue({ data: {} })
})

describe('the committee-path fee', () => {
  it('records a payment in Syrian pounds for exactly the amount due, with the two mobile-money methods', async () => {
    const onReconciled = vi.fn()
    render(<PaymentReconciliationPanel application={application()} language="en" onReconciled={onReconciled} />)

    expect(screen.getAllByText('$ 150.00').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('radio', { name: /Syrian pounds/ }))
    expect(screen.getByText('Amount due: 1,950,000 SYP ($ 150.00 at 1 USD = 13,000 SYP, rounded to the whole pound)')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Syriatel Cash' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'MTN Cash' })).toBeInTheDocument()

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'mtn_cash' } })
    fireEvent.change(screen.getByPlaceholderText('Transfer or receipt number (at least 3 characters)'), { target: { value: 'MTN-77' } })
    const record = screen.getByRole('button', { name: 'Record the payment' })
    fireEvent.change(screen.getByLabelText('Amount paid'), { target: { value: '1900000' } })
    expect(screen.getByText('The amount paid must equal the amount due in this currency.')).toBeInTheDocument()
    expect(record).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Amount paid'), { target: { value: '1950000' } })
    fireEvent.click(record)

    await waitFor(() => expect(mocks.reconcileRplPayment).toHaveBeenCalledWith('case-41', { provider: 'mtn_cash', provider_reference: 'MTN-77', currency_paid: 'SYP', amount_paid_minor: 1950000 }))
    expect(onReconciled).toHaveBeenCalledTimes(1)
  })

  it('offers no Syrian-pound payment while no rate is set', () => {
    render(<PaymentReconciliationPanel application={application({ committee_fee_due: { usd, syp: null, exchange_rate: null } })} language="en" />)

    expect(screen.getByRole('radio', { name: /Syrian pounds/ })).toBeDisabled()
    expect(screen.getByRole('radio', { name: /US dollars/ })).toBeEnabled()
  })

  it('reads the case again when the server refuses the amount (422 amount_mismatch)', async () => {
    const onReconciled = vi.fn()
    mocks.reconcileRplPayment.mockRejectedValue({ response: { status: 422, data: { message: 'The amount does not match.', reason_code: 'amount_mismatch', errors: { amount_paid_minor: ['The amount does not match.'] } } } })
    render(<PaymentReconciliationPanel application={application()} language="en" onReconciled={onReconciled} />)

    fireEvent.click(screen.getByRole('radio', { name: /US dollars/ }))
    fireEvent.change(screen.getByPlaceholderText('Transfer or receipt number (at least 3 characters)'), { target: { value: 'TRX-1' } })
    fireEvent.change(screen.getByLabelText('Amount paid'), { target: { value: '150' } })
    fireEvent.click(screen.getByRole('button', { name: 'Record the payment' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('That is not the amount due now')
    expect(onReconciled).toHaveBeenCalledTimes(1)
    expect(mocks.reconcileRplPayment.mock.calls[0][1]).toMatchObject({ currency_paid: 'USD', amount_paid_minor: 15000 })
  })

  // D-28 (18 Oct 2026): with no fee due and nothing paid the card renders nothing; it stood as "no fee" on every case.
  it('shows an earlier fee in its own currency as history, and renders nothing when nothing is due', () => {
    const { container, unmount } = render(<PaymentReconciliationPanel application={application({ fee_snapshot: { amount: 0, currency: 'EUR' }, committee_fee_due: null })} language="en" />)
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText('This case has no payable fee.')).not.toBeInTheDocument()
    unmount()

    render(<PaymentReconciliationPanel application={application({ payment_status: 'paid', fee_snapshot: { amount: '150.00', currency: 'EUR' }, committee_fee_due: null })} language="ar" />)
    expect(screen.getByText('150.00 EUR')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('undefined')
  })

  // J07-G1 (17 Oct 2026): the date paid is a date on the institute's calendar, recorded as 00:00 UTC of it.
  it('shows the date paid as that calendar date, and limits the date field to the institute\'s today', () => {
    const { unmount } = render(<PaymentReconciliationPanel application={application({ payment_status: 'paid', order: { paid_at: '2026-10-18T00:00:00.000000Z' } })} language="en" />)
    expect(screen.getByText(/Paid · (Oct 18, 2026|18 Oct 2026)/)).toBeInTheDocument()
    unmount()

    const { container } = render(<PaymentReconciliationPanel application={application()} language="en" />)
    expect(container.querySelector('input[type="date"]')).toHaveAttribute('max', businessTodayIso())
  })
})
