import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import UserWalletActionPage from './UserWalletActionPage'
import { WALLET_COPY } from '../domain/wallet'
import { todayIso } from '../../rpl/domain/afterQuiz'

/*
 * TOP UP OR DEDUCT A CLIENT'S BALANCE (owner decisions of 17 Oct 2026; contract
 * S3, S4). Pinned: the balance has no default; cents for dollars only; a
 * reference unless cash; the date received no later than today; a confirm step
 * that names the balance in words, with a warning when the amount looks like
 * the other currency; ONE Idempotency-Key per opened form, sent again on a
 * retry of the same body; a deduction needs a reason; the refusals with their
 * Money; and the client is loaded by id, never by a name in the URL.
 */

const mocks = vi.hoisted(() => ({
  fetchUser: vi.fn(),
  topUpUserWallet: vi.fn(),
  deductUserWallet: vi.fn(),
  newIdempotencyKey: vi.fn(),
}))

const language = vi.hoisted(() => ({ current: 'en' }))

vi.mock('../services/usersService', () => ({ fetchUser: mocks.fetchUser, topUpUserWallet: mocks.topUpUserWallet, deductUserWallet: mocks.deductUserWallet }))
vi.mock('../../../utils/idempotency', () => ({ newIdempotencyKey: mocks.newIdempotencyKey }))
vi.mock('../../../services/languageStorage', async (importOriginal) => ({
  ...(await importOriginal()),
  getAdminLanguage: () => language.current,
}))

const EN = WALLET_COPY.en
const AR = WALLET_COPY.ar

const money = (currency, minor, amount) => ({ currency, amount_minor: minor, amount })

function client(overrides = {}) {
  return { id: 7, name: 'Client Example', wallet_balances: { usd: money('USD', 2500, '25.00'), syp: money('SYP', 50000, '50000') }, ...overrides }
}

function renderPage(action = 'top-up') {
  return render(
    <MemoryRouter initialEntries={[`/users/7/wallet?action=${action}`]}>
      <Routes>
        <Route path="/users/:id/wallet" element={<UserWalletActionPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

let keys = 0

beforeEach(() => {
  vi.clearAllMocks()
  language.current = 'en'
  keys = 0
  mocks.newIdempotencyKey.mockImplementation(() => `key-${++keys}`)
  mocks.fetchUser.mockResolvedValue({ data: client() })
  mocks.topUpUserWallet.mockResolvedValue({ message: 'Money added to the balance.', data: { transaction: { id: 1 }, balances: { usd: money('USD', 7499, '74.99'), syp: money('SYP', 50000, '50000') } } })
  mocks.deductUserWallet.mockResolvedValue({ message: 'Amount deducted from the balance.', data: { transaction: { id: 2 }, balances: { usd: money('USD', 1500, '15.00'), syp: money('SYP', 50000, '50000') } } })
})

const radio = (label) => screen.getByRole('radio', { name: label })

async function fillTopUp({ currency = EN.currencyUsd, amount = '49.99', method = 'bank_transfer', reference = 'TRX-77', receivedOn = '2026-10-16' } = {}) {
  fireEvent.click(await screen.findByRole('radio', { name: currency }))
  fireEvent.change(screen.getByLabelText(EN.amount), { target: { value: amount } })
  fireEvent.change(screen.getByLabelText(EN.method), { target: { value: method } })
  if (reference != null) fireEvent.change(screen.getByLabelText(EN.reference), { target: { value: reference } })
  fireEvent.change(screen.getByLabelText(EN.receivedOn), { target: { value: receivedOn } })
}

describe('topping up a balance (S3)', () => {
  it('loads the client by id and asks for the balance, with no default', async () => {
    renderPage()

    expect(await screen.findByText('Client: Client Example')).toBeInTheDocument()
    expect(mocks.fetchUser).toHaveBeenCalledWith('7')
    expect(screen.getAllByText('$ 25.00').length).toBeGreaterThan(0)
    expect(screen.getAllByText('50,000 SYP').length).toBeGreaterThan(0)
    expect(radio(EN.currencyUsd)).not.toBeChecked()
    expect(radio(EN.currencySyp)).not.toBeChecked()
    expect(screen.getByText(EN.currencyRequired)).toBeInTheDocument()
    expect(screen.getByLabelText(EN.amount)).toBeDisabled()
    expect(screen.getByRole('button', { name: EN.continue })).toBeDisabled()
  })

  it('takes cents for US dollars only', async () => {
    renderPage()

    fireEvent.click(await screen.findByRole('radio', { name: EN.currencySyp }))
    fireEvent.change(screen.getByLabelText(EN.amount), { target: { value: '1.5' } })
    expect(screen.getByText(EN.sypInvalid)).toBeInTheDocument()
    fireEvent.click(radio(EN.currencyUsd))
    expect(screen.getByLabelText(EN.amount)).toHaveValue('')
    fireEvent.change(screen.getByLabelText(EN.amount), { target: { value: '1.5' } })
    expect(screen.queryByText(EN.usdInvalid)).not.toBeInTheDocument()
  })

  it('needs a reference unless the money came in cash, and a date no later than today', async () => {
    renderPage()

    await fillTopUp({ reference: null })
    const next = screen.getByRole('button', { name: EN.continue })
    expect(next).toBeDisabled()
    fireEvent.change(screen.getByLabelText(EN.method), { target: { value: 'cash' } })
    expect(next).toBeEnabled()
    fireEvent.change(screen.getByLabelText(EN.receivedOn), { target: { value: '2999-01-01' } })
    expect(screen.getByText(EN.receivedOnInvalid)).toBeInTheDocument()
    expect(next).toBeDisabled()
    fireEvent.change(screen.getByLabelText(EN.receivedOn), { target: { value: todayIso() } })
    // Other: a reference (any method but cash) and notes on how the money came.
    fireEvent.change(screen.getByLabelText(EN.reference), { target: { value: 'HAND-2026-9' } })
    fireEvent.change(screen.getByLabelText(EN.method), { target: { value: 'other' } })
    expect(screen.getByText(EN.notesInvalid)).toBeInTheDocument()
    expect(next).toBeDisabled()
    fireEvent.change(screen.getByLabelText(EN.notes), { target: { value: 'Handed over at the Aleppo office.' } })
    expect(next).toBeEnabled()
  })

  it('confirms with the balance in words, then sends exactly the S3 body with an Idempotency-Key', async () => {
    renderPage()

    await fillTopUp()
    fireEvent.click(screen.getByRole('button', { name: EN.continue }))
    expect(screen.getByText('Add $ 49.99 to the US-dollar balance of Client Example?')).toBeInTheDocument()
    expect(screen.queryByText(/Check the currency/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: EN.confirm }))

    await waitFor(() => expect(mocks.topUpUserWallet).toHaveBeenCalledWith('7', { currency: 'USD', amount_minor: 4999, method: 'bank_transfer', reference: 'TRX-77', received_on: '2026-10-16' }, 'key-1'))
    expect(await screen.findByText('$ 49.99 added. US-dollar balance now: $ 74.99')).toBeInTheDocument()
    expect(screen.getAllByText('$ 74.99').length).toBeGreaterThan(0)
  })

  it.each([
    ['dollars above $10,000.00', EN.currencyUsd, '125000', 'Check the currency: $ 125,000.00.'],
    ['pounds below 1,000', EN.currencySyp, '500', 'Check the currency: 500 SYP.'],
  ])('warns before confirming %s', async (_, currency, amount, warning) => {
    renderPage()

    await fillTopUp({ currency, amount })
    fireEvent.click(screen.getByRole('button', { name: EN.continue }))
    expect(screen.getByText(warning)).toBeInTheDocument()
  })

  it('sends the same Idempotency-Key on a retry of the same body, and a new one for another body', async () => {
    mocks.topUpUserWallet.mockRejectedValueOnce(new Error('Network Error'))
    renderPage()

    await fillTopUp()
    fireEvent.click(screen.getByRole('button', { name: EN.continue }))
    fireEvent.click(screen.getByRole('button', { name: EN.confirm }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: EN.confirm }))

    await waitFor(() => expect(mocks.topUpUserWallet).toHaveBeenCalledTimes(2))
    expect(mocks.topUpUserWallet.mock.calls[0][2]).toBe('key-1')
    expect(mocks.topUpUserWallet.mock.calls[1][2]).toBe('key-1')

    // After the success the form is fresh: the next act has its own key.
    await fillTopUp({ amount: '10' })
    fireEvent.click(screen.getByRole('button', { name: EN.continue }))
    fireEvent.click(screen.getByRole('button', { name: EN.confirm }))
    await waitFor(() => expect(mocks.topUpUserWallet).toHaveBeenCalledTimes(3))
    expect(mocks.topUpUserWallet.mock.calls[2][2]).not.toBe('key-1')
  })

  it('says a reference is already used (409 payment_reference_used)', async () => {
    mocks.topUpUserWallet.mockRejectedValue({ response: { status: 409, data: { message: 'This payment reference is already recorded.', code: 'payment_reference_used' } } })
    renderPage()

    await fillTopUp()
    fireEvent.click(screen.getByRole('button', { name: EN.continue }))
    fireEvent.click(screen.getByRole('button', { name: EN.confirm }))

    expect(await screen.findByRole('alert')).toHaveTextContent(EN.referenceUsed)
  })
})

describe('deducting from a balance (S4)', () => {
  it('needs a reason of 10 or more characters, and sends exactly the S4 body', async () => {
    renderPage('deduct')

    fireEvent.click(await screen.findByRole('radio', { name: EN.currencyUsd }))
    fireEvent.change(screen.getByLabelText(EN.amount), { target: { value: '10' } })
    expect(screen.queryByLabelText(EN.method)).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(EN.reason), { target: { value: 'too short' } })
    expect(screen.getByText(EN.reasonInvalid)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: EN.continue })).toBeDisabled()
    fireEvent.change(screen.getByLabelText(EN.reason), { target: { value: 'Top-up of 16 Oct was entered in dollars by mistake.' } })
    fireEvent.click(screen.getByRole('button', { name: EN.continue }))
    expect(screen.getByText('Deduct $ 10.00 from the US-dollar balance of Client Example?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: EN.confirm }))

    await waitFor(() => expect(mocks.deductUserWallet).toHaveBeenCalledWith('7', { currency: 'USD', amount_minor: 1000, reason: 'Top-up of 16 Oct was entered in dollars by mistake.' }, 'key-1'))
  })

  it('shows an insufficient balance with its Money (422 insufficient_balance)', async () => {
    mocks.deductUserWallet.mockRejectedValue({ response: { status: 422, data: { message: 'Your Syrian pound balance is too low for this payment. Nothing was charged.', reason_code: 'insufficient_balance', balance: money('SYP', 50000, '50000'), required: money('SYP', 125000, '125000') } } })
    renderPage('deduct')

    fireEvent.click(await screen.findByRole('radio', { name: EN.currencySyp }))
    fireEvent.change(screen.getByLabelText(EN.amount), { target: { value: '125000' } })
    fireEvent.change(screen.getByLabelText(EN.reason), { target: { value: 'Correcting a duplicated cash entry.' } })
    fireEvent.click(screen.getByRole('button', { name: EN.continue }))
    fireEvent.click(screen.getByRole('button', { name: EN.confirm }))

    expect(await screen.findByRole('alert')).toHaveTextContent('The balance is too low: 50,000 SYP available, 125,000 SYP needed. Nothing was deducted.')
  })
})

describe('in Arabic', () => {
  it('renders without a literal "undefined" and names the pound balance in words', async () => {
    language.current = 'ar'
    renderPage()

    fireEvent.click(await screen.findByRole('radio', { name: AR.currencySyp }))
    expect(within(screen.getByLabelText(AR.amount).parentElement).getByText('ل.س')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('undefined')
  })
})
