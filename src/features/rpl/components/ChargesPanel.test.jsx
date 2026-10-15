import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ChargesPanel from './ChargesPanel'
import { AFTER_QUIZ_COPY } from '../domain/afterQuiz'

/*
 * THE CASE'S PAYMENTS AFTER THE ENTRY QUIZ (owner model of 15 Oct 2026, P6).
 *
 * Pinned: Confirm sends exactly the S3 body with the charge's lock_version;
 * Cancel needs a category and a reason of 10 or more characters; Refund shows
 * only for finance.manage AND the server's can.refund; a stale write (409
 * rpl_charge_stale) says so, keeps what was typed and reloads; the level
 * certification fee (O2) is a charge like the others; Arabic never shows
 * "undefined"; and a 403 on the read hides the panel.
 */

const mocks = vi.hoisted(() => ({
  fetchRplCharges: vi.fn(),
  confirmRplChargePayment: vi.fn(),
  cancelRplCharge: vi.fn(),
  refundRplCharge: vi.fn(),
}))

vi.mock('../services/rplService', () => mocks)

const EN = AFTER_QUIZ_COPY.en
const AR = AFTER_QUIZ_COPY.ar
const REASON = 'No transfer reached the institute account.'

function charge(overrides = {}) {
  return {
    id: 1,
    public_id: 'charge-1',
    type: 'experience_certificate',
    cycle: 1,
    amount: 1500,
    currency: 'POINTS',
    route: 'offline',
    status: 'pending',
    invoice_number: 'INV-2026-0042',
    payer_reference: 'Transfer from Amina',
    requested_at: '2026-10-15T08:00:00Z',
    paid_at: null,
    cancelled_at: null,
    cancel_category: null,
    cancel_category_label: null,
    refunded_at: null,
    application: { public_id: 'case-41', case_reference: 'RPL-2026-AFTER' },
    client: { id: 9, name: 'Amina Saleh' },
    price_setting_key: 'rpl_experience_certificate_price_points',
    price_setting_snapshot: { key: 'rpl_experience_certificate_price_points', value: 1500 },
    order_id: 12,
    order_number: 'ORD-12',
    payment_id: null,
    wallet_transaction_id: null,
    refund_id: null,
    requested_by: { id: 9, name: 'Amina Saleh' },
    confirmed_by: null,
    confirmed_at: null,
    offline_method: null,
    offline_reference: null,
    offline_amount_received: null,
    offline_currency: null,
    staff_notes: null,
    consumed_at: null,
    consumed_by: null,
    cancelled_by: null,
    cancel_reason: null,
    refunded_by: null,
    refund_reason: null,
    lock_version: 2,
    can: { confirm: true, cancel: true, refund: false },
    ...overrides,
  }
}

function renderPanel(props = {}) {
  return render(<ChargesPanel applicationId="case-41" language="en" canReconcile canRefund {...props} />)
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.fetchRplCharges.mockResolvedValue({ data: [charge()] })
  mocks.confirmRplChargePayment.mockResolvedValue({ message: 'RPL payment confirmed.', data: charge({ status: 'paid' }) })
  mocks.cancelRplCharge.mockResolvedValue({ message: 'RPL payment request cancelled.', data: charge({ status: 'cancelled' }) })
  mocks.refundRplCharge.mockResolvedValue({ message: 'RPL payment refunded.', data: charge({ status: 'refunded' }) })
})

function fillConfirm(form) {
  fireEvent.change(form.getByLabelText(EN.charges.method), { target: { value: 'cash' } })
  fireEvent.change(form.getByLabelText(EN.charges.reference), { target: { value: '  RCPT-2026-117  ' } })
  fireEvent.change(form.getByLabelText(EN.charges.paidOn), { target: { value: '2026-01-05' } })
  fireEvent.change(form.getByLabelText(EN.charges.amountReceived), { target: { value: '150.50' } })
  fireEvent.change(form.getByLabelText(EN.charges.currencyReceived), { target: { value: 'jod' } })
  fireEvent.change(form.getByLabelText(EN.charges.notes), { target: { value: 'Paid at the Amman office.' } })
}

describe('confirming an outside payment (S3)', () => {
  it('sends exactly the S3 body with the charge lock_version, then reloads', async () => {
    renderPanel()

    const card = within(await screen.findByRole('article', { name: EN.chargeTypes.experience_certificate }))
    expect(card.getByText('1500 II Points')).toBeInTheDocument()
    expect(card.getByText('1500 II Points').closest('p')).toHaveTextContent('1500 II Points · Paid outside the platform')
    expect(card.getByText(EN.chargeStatuses.pending)).toBeInTheDocument()
    fireEvent.click(card.getByRole('button', { name: EN.charges.confirm }))

    const form = within(screen.getByRole('region', { name: EN.charges.confirmTitle }))
    expect(form.getByText(EN.charges.confirmHint)).toBeInTheDocument()
    const submit = form.getByRole('button', { name: EN.charges.confirmSubmit })
    expect(submit).toBeDisabled()
    fillConfirm(form)
    expect(submit).toBeEnabled()
    fireEvent.click(submit)

    await waitFor(() => expect(mocks.confirmRplChargePayment).toHaveBeenCalledWith('charge-1', {
      lock_version: 2,
      method: 'cash',
      reference: 'RCPT-2026-117',
      paid_at: '2026-01-05',
      amount_received: '150.50',
      currency_received: 'JOD',
      notes: 'Paid at the Amman office.',
    }))
    expect(await screen.findByText(EN.charges.confirmed)).toBeInTheDocument()
    await waitFor(() => expect(mocks.fetchRplCharges).toHaveBeenCalledTimes(2))
  })

  it('refuses a future date, a short reference and an amount with three decimals', async () => {
    renderPanel()

    fireEvent.click(await screen.findByRole('button', { name: EN.charges.confirm }))
    const form = within(screen.getByRole('region', { name: EN.charges.confirmTitle }))
    fillConfirm(form)
    fireEvent.change(form.getByLabelText(EN.charges.reference), { target: { value: 'ab' } })
    fireEvent.change(form.getByLabelText(EN.charges.paidOn), { target: { value: '2999-01-01' } })
    fireEvent.change(form.getByLabelText(EN.charges.amountReceived), { target: { value: '1.234' } })

    expect(form.getByText(EN.charges.referenceInvalid)).toBeInTheDocument()
    expect(form.getByText(EN.charges.paidOnInvalid)).toBeInTheDocument()
    expect(form.getByText(EN.charges.amountInvalid)).toBeInTheDocument()
    expect(form.getByRole('button', { name: EN.charges.confirmSubmit })).toBeDisabled()
  })

  it('warns before a second confirmation when a paid charge already holds the slot', async () => {
    mocks.fetchRplCharges.mockResolvedValue({ data: [charge({ public_id: 'charge-2', id: 2, type: 'final_exam_retake', cycle: 2 }), charge({ public_id: 'charge-3', id: 3, type: 'final_exam_retake', cycle: 2, status: 'paid', route: 'wallet', can: { confirm: false, cancel: false, refund: true } })] })
    renderPanel()

    const cards = await screen.findAllByRole('article', { name: 'Final-exam retake · round 2' })
    fireEvent.click(within(cards[0]).getByRole('button', { name: EN.charges.confirm }))
    expect(within(screen.getByRole('region', { name: EN.charges.confirmTitle })).getByText(EN.charges.slotTaken)).toBeInTheDocument()
  })

  it('on a stale charge says so, keeps what was typed and reloads (409 rpl_charge_stale)', async () => {
    mocks.confirmRplChargePayment.mockRejectedValue({ response: { status: 409, data: { message: 'The payment changed.', code: 'rpl_charge_stale', current_lock_version: 3 } } })
    renderPanel()

    fireEvent.click(await screen.findByRole('button', { name: EN.charges.confirm }))
    const form = within(screen.getByRole('region', { name: EN.charges.confirmTitle }))
    fillConfirm(form)
    fireEvent.click(form.getByRole('button', { name: EN.charges.confirmSubmit }))

    expect(await screen.findByRole('alert')).toHaveTextContent(EN.charges.stale)
    await waitFor(() => expect(mocks.fetchRplCharges).toHaveBeenCalledTimes(2))
    expect(within(screen.getByRole('region', { name: EN.charges.confirmTitle })).getByLabelText(EN.charges.reference)).toHaveValue('  RCPT-2026-117  ')
  })

  it('shows a reference already used elsewhere as the server wrote it (409 payment_reference_used)', async () => {
    mocks.confirmRplChargePayment.mockRejectedValue({ response: { status: 409, data: { message: 'This payment reference is already recorded on another payment.', code: 'payment_reference_used' } } })
    renderPanel()

    fireEvent.click(await screen.findByRole('button', { name: EN.charges.confirm }))
    const form = within(screen.getByRole('region', { name: EN.charges.confirmTitle }))
    fillConfirm(form)
    fireEvent.click(form.getByRole('button', { name: EN.charges.confirmSubmit }))

    expect(await screen.findByRole('alert')).toHaveTextContent('This payment reference is already recorded on another payment.')
  })
})

describe('cancelling and refunding', () => {
  it('cancels only with a category and a reason of 10 or more characters (S4)', async () => {
    renderPanel()

    fireEvent.click(await screen.findByRole('button', { name: EN.charges.cancel }))
    const form = within(screen.getByRole('region', { name: EN.charges.cancelTitle }))
    expect(form.getByText(EN.charges.cancelHint)).toBeInTheDocument()
    const submit = form.getByRole('button', { name: EN.charges.cancelSubmit })
    expect(submit).toBeDisabled()
    fireEvent.change(form.getByLabelText(EN.common.reason), { target: { value: 'too short' } })
    expect(form.getByText(EN.common.reasonInvalid)).toBeInTheDocument()
    fireEvent.change(form.getByLabelText(EN.common.reason), { target: { value: REASON } })
    expect(submit).toBeDisabled()
    fireEvent.change(form.getByLabelText(EN.charges.category), { target: { value: 'payment_not_found' } })
    expect(submit).toBeEnabled()
    fireEvent.click(submit)

    await waitFor(() => expect(mocks.cancelRplCharge).toHaveBeenCalledWith('charge-1', { lock_version: 2, reason: REASON, category: 'payment_not_found' }))
    expect(await screen.findByText(EN.charges.cancelled)).toBeInTheDocument()
  })

  it.each([
    ['finance.manage without can.refund', true, false],
    ['can.refund without finance.manage', false, true],
  ])('offers no refund with %s', async (_, canRefund, serverRefund) => {
    mocks.fetchRplCharges.mockResolvedValue({ data: [charge({ type: 'final_exam_retake', cycle: 2, status: 'paid', route: 'wallet', paid_at: '2026-10-15T09:00:00Z', can: { confirm: false, cancel: false, refund: serverRefund } })] })
    renderPanel({ canRefund })

    await screen.findByRole('article', { name: 'Final-exam retake · round 2' })
    expect(screen.queryByRole('button', { name: EN.charges.refund })).not.toBeInTheDocument()
  })

  it('refunds with finance.manage and can.refund, with a reason (S5)', async () => {
    mocks.fetchRplCharges.mockResolvedValue({ data: [charge({ type: 'final_exam_retake', cycle: 2, status: 'paid', route: 'wallet', lock_version: 4, can: { confirm: false, cancel: false, refund: true } })] })
    renderPanel()

    fireEvent.click(await screen.findByRole('button', { name: EN.charges.refund }))
    const form = within(screen.getByRole('region', { name: EN.charges.refundTitle }))
    fireEvent.change(form.getByLabelText(EN.common.reason), { target: { value: 'The client paid the retake twice.' } })
    fireEvent.click(form.getByRole('button', { name: EN.charges.refundSubmit }))

    await waitFor(() => expect(mocks.refundRplCharge).toHaveBeenCalledWith('charge-1', { lock_version: 4, reason: 'The client paid the retake twice.' }))
  })

  it('offers neither confirm nor cancel without rpl.payments.reconcile', async () => {
    renderPanel({ canReconcile: false })

    await screen.findByRole('article', { name: EN.chargeTypes.experience_certificate })
    expect(screen.queryByRole('button', { name: EN.charges.confirm })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: EN.charges.cancel })).not.toBeInTheDocument()
  })
})

describe('what the panel shows', () => {
  it('shows a paid outside payment\'s evidence and who confirmed it, staff-only', async () => {
    mocks.fetchRplCharges.mockResolvedValue({
      data: [charge({ status: 'paid', paid_at: '2026-10-15T09:00:00Z', confirmed_by: { id: 3, name: 'Finance Officer' }, confirmed_at: '2026-10-15T10:00:00Z', offline_method: 'bank_transfer', offline_reference: 'TRX-9', offline_amount_received: '150.00', offline_currency: 'EUR', staff_notes: 'Matched on the statement.', can: { confirm: false, cancel: false, refund: false } })],
    })
    renderPanel()

    const card = within(await screen.findByRole('article', { name: EN.chargeTypes.experience_certificate }))
    expect(card.getByText(/^Confirmed by Finance Officer on /)).toBeInTheDocument()
    expect(card.getByText('Received outside: 150.00 EUR · Bank transfer · reference TRX-9')).toBeInTheDocument()
    expect(card.getByText('Staff notes: Matched on the statement.')).toBeInTheDocument()
    expect(card.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows the level certification fee (O2) as a charge, with its note', async () => {
    mocks.fetchRplCharges.mockResolvedValue({ data: [charge({ type: 'certification_fee', price_setting_key: null })] })
    renderPanel()

    const card = within(await screen.findByRole('article', { name: EN.chargeTypes.certification_fee }))
    expect(card.getByText(EN.charges.certificationFeeNote)).toBeInTheDocument()
    expect(card.getByRole('button', { name: EN.charges.confirm })).toBeInTheDocument()
  })

  it('says so when the case has no payment', async () => {
    mocks.fetchRplCharges.mockResolvedValue({ data: [] })
    renderPanel()

    expect(await screen.findByText(EN.charges.empty)).toBeInTheDocument()
  })

  it('hides itself on a 403', async () => {
    mocks.fetchRplCharges.mockRejectedValue({ response: { status: 403, data: { message: 'This action is unauthorized.' } } })
    const { container } = renderPanel()

    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })

  it('renders in Arabic without a literal "undefined"', async () => {
    mocks.fetchRplCharges.mockResolvedValue({ data: [charge(), charge({ public_id: 'charge-2', id: 2, type: 'certification_fee', status: 'cancelled', cancelled_at: '2026-10-15T11:00:00Z', cancel_category: 'case_closed', cancelled_by: null, can: { confirm: false, cancel: false, refund: false } })] })
    renderPanel({ language: 'ar' })

    const card = within(await screen.findByRole('article', { name: AR.chargeTypes.experience_certificate }))
    fireEvent.click(card.getByRole('button', { name: AR.charges.confirm }))
    expect(screen.getByRole('region', { name: AR.charges.confirmTitle })).toBeInTheDocument()
    expect(card.getByText('1500 نقاط II').closest('p')).toHaveTextContent('1500 نقاط II · دفع خارج المنصة')
    expect(document.body.textContent).not.toContain('undefined')
  })
})
