import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ChargesPanel from './ChargesPanel'
import { AFTER_QUIZ_COPY, chargeTitle } from '../domain/afterQuiz'
import { LEGACY_POINTS } from '../../../utils/money'

/*
 * THE CASE'S PAYMENTS AFTER THE ENTRY QUIZ (owner model of 15 Oct 2026, P6).
 *
 * Pinned: Confirm sends exactly the S15 body with the charge's lock_version, the
 * charge's own currency and the amount received in minor units, which must equal
 * the amount due (owner, 17 Oct 2026);
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
const RATE = { id: 7, syp_per_usd: '13000.0000', effective_from: '2026-10-15T08:00:00Z' }
// $ 49.99 at 13,000 pounds to the dollar, frozen when the client asked to pay outside.
const SYP_AMOUNT = { currency: 'SYP', amount_minor: 649870, amount: '649870' }

function charge(overrides = {}) {
  return {
    id: 1,
    public_id: 'charge-1',
    type: 'experience_certificate',
    cycle: 1,
    amount: { currency: 'USD', amount_minor: 1500, amount: '15.00' },
    price_usd: { currency: 'USD', amount_minor: 1500, amount: '15.00' },
    exchange_rate: null,
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
    price_setting_key: 'rpl_experience_certificate_price_usd_minor',
    price_setting_snapshot: { key: 'rpl_experience_certificate_price_usd_minor', value_minor: 1500, currency: 'USD' },
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
    offline_received: null,
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
  fireEvent.change(form.getByLabelText(EN.charges.amountReceived), { target: { value: '15.00' } })
  fireEvent.change(form.getByLabelText(EN.charges.notes), { target: { value: 'Paid at the Amman office.' } })
}

describe('confirming an outside payment (S15)', () => {
  it('sends exactly the S15 body with the charge lock_version, then reloads', async () => {
    renderPanel()

    const card = within(await screen.findByRole('article', { name: EN.chargeTypes.experience_certificate }))
    expect(card.getByText('$ 15.00')).toBeInTheDocument()
    expect(card.getByText('$ 15.00').closest('p')).toHaveTextContent('$ 15.00 · Paid outside the platform')
    expect(card.getByText(EN.chargeStatuses.pending)).toBeInTheDocument()
    fireEvent.click(card.getByRole('button', { name: EN.charges.confirm }))

    const form = within(screen.getByRole('region', { name: EN.charges.confirmTitle }))
    expect(form.getByText(EN.charges.confirmHint)).toBeInTheDocument()
    // The currency is the charge's own, shown and never chosen.
    expect(form.getByText('Amount due: $ 15.00')).toBeInTheDocument()
    expect(form.queryByLabelText(/currency/i)).not.toBeInTheDocument()
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
      amount_received_minor: 1500,
      currency_received: 'USD',
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
    expect(form.getByText(EN.charges.amountInvalidUsd)).toBeInTheDocument()
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

  it('confirms a request in Syrian pounds only for its exact frozen amount (M12)', async () => {
    mocks.fetchRplCharges.mockResolvedValue({ data: [charge({ amount: SYP_AMOUNT, price_usd: { currency: 'USD', amount_minor: 4999, amount: '49.99' }, exchange_rate: RATE })] })
    renderPanel()

    fireEvent.click(await screen.findByRole('button', { name: EN.charges.confirm }))
    const form = within(screen.getByRole('region', { name: EN.charges.confirmTitle }))
    expect(form.getByText('Amount due: 649,870 SYP ($ 49.99 at 1 USD = 13,000 SYP)')).toBeInTheDocument()
    fillConfirm(form)
    fireEvent.change(form.getByLabelText(EN.charges.method), { target: { value: 'syriatel_cash' } })
    const submit = form.getByRole('button', { name: EN.charges.confirmSubmit })

    fireEvent.change(form.getByLabelText(EN.charges.amountReceived), { target: { value: '649870.5' } })
    expect(form.getByText(EN.charges.amountInvalidSyp)).toBeInTheDocument()
    fireEvent.change(form.getByLabelText(EN.charges.amountReceived), { target: { value: '699860' } })
    expect(form.getByText(EN.charges.amountMustMatch)).toBeInTheDocument()
    expect(submit).toBeDisabled()
    fireEvent.change(form.getByLabelText(EN.charges.amountReceived), { target: { value: '649870' } })
    expect(submit).toBeEnabled()
    fireEvent.click(submit)

    await waitFor(() => expect(mocks.confirmRplChargePayment).toHaveBeenCalledWith('charge-1', {
      lock_version: 2,
      method: 'syriatel_cash',
      reference: 'RCPT-2026-117',
      paid_at: '2026-01-05',
      amount_received_minor: 649870,
      currency_received: 'SYP',
      notes: 'Paid at the Amman office.',
    }))
  })

  it('says no rate is set when the server answers 503 exchange_rate_missing', async () => {
    mocks.confirmRplChargePayment.mockRejectedValue({ response: { status: 503, data: { message: 'Payment in Syrian pounds is not available: no exchange rate is set.', code: 'exchange_rate_missing' } } })
    renderPanel()

    fireEvent.click(await screen.findByRole('button', { name: EN.charges.confirm }))
    const form = within(screen.getByRole('region', { name: EN.charges.confirmTitle }))
    fillConfirm(form)
    fireEvent.click(form.getByRole('button', { name: EN.charges.confirmSubmit }))

    expect(await screen.findByRole('alert')).toHaveTextContent(EN.common.noRate)
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

  it('offers the out-of-date-rate category on a request in Syrian pounds only', async () => {
    mocks.fetchRplCharges.mockResolvedValue({ data: [charge(), charge({ public_id: 'charge-2', id: 2, type: 'final_exam_retake', cycle: 2, amount: SYP_AMOUNT, exchange_rate: RATE })] })
    renderPanel()

    const usdCard = within(await screen.findByRole('article', { name: EN.chargeTypes.experience_certificate }))
    fireEvent.click(usdCard.getByRole('button', { name: EN.charges.cancel }))
    expect(within(screen.getByLabelText(EN.charges.category)).queryByText(EN.cancelCategories.exchange_rate_outdated)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: EN.common.cancel }))

    const sypCard = within(screen.getByRole('article', { name: 'Final-exam retake · round 2' }))
    fireEvent.click(sypCard.getByRole('button', { name: EN.charges.cancel }))
    const category = screen.getByLabelText(EN.charges.category)
    expect(within(category).getByText(EN.cancelCategories.exchange_rate_outdated)).toBeInTheDocument()
    fireEvent.change(category, { target: { value: 'exchange_rate_outdated' } })
    fireEvent.change(screen.getByLabelText(EN.common.reason), { target: { value: 'The rate moved since the request.' } })
    fireEvent.click(screen.getByRole('button', { name: EN.charges.cancelSubmit }))

    await waitFor(() => expect(mocks.cancelRplCharge).toHaveBeenCalledWith('charge-2', { lock_version: 2, reason: 'The rate moved since the request.', category: 'exchange_rate_outdated' }))
  })

  // J07-G2 (17 Oct 2026): the client is told the rate changed, so the category is offered only when it did.
  it('does not offer the out-of-date-rate category on a pound request still at the rate in force', async () => {
    mocks.fetchRplCharges.mockResolvedValue({ data: [charge({ public_id: 'charge-2', id: 2, type: 'final_exam_retake', cycle: 2, amount: SYP_AMOUNT, exchange_rate: RATE, exchange_rate_outdated: false })] })
    renderPanel()

    const card = within(await screen.findByRole('article', { name: 'Final-exam retake · round 2' }))
    fireEvent.click(card.getByRole('button', { name: EN.charges.cancel }))
    const category = screen.getByLabelText(EN.charges.category)
    expect(within(category).queryByText(EN.cancelCategories.exchange_rate_outdated)).not.toBeInTheDocument()
    expect(within(category).getByText(EN.cancelCategories.payment_not_found)).toBeInTheDocument()
  })

  it('says in the reader\'s language that the rate did not change when the server refuses the category, and reloads', async () => {
    mocks.fetchRplCharges.mockResolvedValue({ data: [charge({ public_id: 'charge-2', id: 2, type: 'final_exam_retake', cycle: 2, amount: SYP_AMOUNT, exchange_rate: RATE, exchange_rate_outdated: true })] })
    mocks.cancelRplCharge.mockRejectedValue({ response: { status: 422, data: {
      message: 'The exchange rate in force is the rate this request was frozen at, so its amount in Syrian pounds is not out of date. Choose another category.',
      reason_code: 'exchange_rate_unchanged',
      errors: { category: ['The exchange rate in force is the rate this request was frozen at, so its amount in Syrian pounds is not out of date. Choose another category.'] },
    } } })
    renderPanel({ language: 'ar' })

    const card = within(await screen.findByRole('article', { name: chargeTitle({ type: 'final_exam_retake', cycle: 2 }, 'ar') }))
    fireEvent.click(card.getByRole('button', { name: AR.charges.cancel }))
    fireEvent.change(screen.getByLabelText(AR.charges.category), { target: { value: 'exchange_rate_outdated' } })
    fireEvent.change(screen.getByLabelText(AR.common.reason), { target: { value: 'The rate moved since the request.' } })
    fireEvent.click(screen.getByRole('button', { name: AR.charges.cancelSubmit }))

    expect(await screen.findByText(AR.charges.rateUnchanged)).toBeInTheDocument()
    await waitFor(() => expect(mocks.fetchRplCharges).toHaveBeenCalledTimes(2))
    // The refused category is cleared, so the button waits for another one; the reason typed is kept.
    expect(screen.getByLabelText(AR.charges.category)).toHaveValue('')
    expect(screen.getByLabelText(AR.common.reason)).toHaveValue('The rate moved since the request.')
    expect(screen.getByRole('button', { name: AR.charges.cancelSubmit })).toBeDisabled()
    expect(mocks.cancelRplCharge).toHaveBeenCalledTimes(1)
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
      data: [charge({ status: 'paid', paid_at: '2026-10-15T09:00:00Z', amount: SYP_AMOUNT, price_usd: { currency: 'USD', amount_minor: 4999, amount: '49.99' }, exchange_rate: RATE, confirmed_by: { id: 3, name: 'Finance Officer' }, confirmed_at: '2026-10-15T10:00:00Z', offline_method: 'syriatel_cash', offline_reference: 'TRX-9', offline_received: SYP_AMOUNT, staff_notes: 'Matched on the statement.', can: { confirm: false, cancel: false, refund: false } })],
    })
    renderPanel()

    const card = within(await screen.findByRole('article', { name: EN.chargeTypes.experience_certificate }))
    expect(card.getByText(/^Confirmed by Finance Officer on /)).toBeInTheDocument()
    expect(card.getByText('Received outside: 649,870 SYP · Syriatel Cash · reference TRX-9')).toBeInTheDocument()
    expect(card.getByText('649,870 SYP ($ 49.99 at 1 USD = 13,000 SYP)').closest('p')).toHaveTextContent('Paid outside the platform')
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

  it('shows a charge from before 17 Oct 2026 in points as an earlier record, and never confirms it', async () => {
    mocks.fetchRplCharges.mockResolvedValue({ data: [charge({ amount: { currency: LEGACY_POINTS, amount_minor: 1500, amount: '1500', legacy: true }, price_usd: null })] })
    renderPanel()

    const card = within(await screen.findByRole('article', { name: EN.chargeTypes.experience_certificate }))
    expect(card.getByText('1,500 points (earlier record)').closest('p')).toHaveTextContent('1,500 points (earlier record) · Paid outside the platform')
    expect(card.queryByRole('button', { name: EN.charges.confirm })).not.toBeInTheDocument()
    expect(card.getByText(EN.charges.notConfirmable)).toBeInTheDocument()
    expect(card.getByRole('button', { name: EN.charges.cancel })).toBeInTheDocument()
  })

  it('names the balance a wallet payment came from', async () => {
    mocks.fetchRplCharges.mockResolvedValue({ data: [charge({ route: 'wallet', status: 'paid', amount: SYP_AMOUNT, exchange_rate: RATE, price_usd: { currency: 'USD', amount_minor: 4999, amount: '49.99' }, can: { confirm: false, cancel: false, refund: false } })] })
    renderPanel()

    const card = within(await screen.findByRole('article', { name: EN.chargeTypes.experience_certificate }))
    expect(card.getByText('649,870 SYP ($ 49.99 at 1 USD = 13,000 SYP)').closest('p')).toHaveTextContent(EN.routes.walletSyp)
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
    // The amount reads left to right inside the Arabic line (an isolated "$ 15.00", never "15.00 $").
    const line = card.getAllByText(/دفع خارج المنصة/)[0]
    expect(line).toHaveTextContent('$ 15.00')
    expect(document.body.textContent).not.toContain('undefined')
  })
})
