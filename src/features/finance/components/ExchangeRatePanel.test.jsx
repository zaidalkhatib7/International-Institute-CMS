import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ExchangeRatePanel from './ExchangeRatePanel'
import { AuthorizationContext } from '../../auth/context/authorizationContext'
import { createAuthorization } from '../../auth/authorization'
import { EXCHANGE_RATE_COPY, canManageExchangeRate, needsLargeChangeConfirmation, parseRateInput, rateChangePercent } from '../domain/exchangeRate'

/*
 * THE EXCHANGE RATE (owner decisions of 17 Oct 2026; contract S1, S2).
 *
 * Pinned: the rate in force and the append-only history in both languages, with
 * no control to edit or delete a rate; the red "no rate" line while none is set;
 * the form only for the owner's role (super-admin or finance.exchange_rates.manage),
 * never for a plain administrator; a note of 10 or more characters; the tick for
 * the first rate and for a change of 20% or more; the body with the id of the
 * rate the form was opened on; and a 409 that reloads and keeps what was typed.
 */

const mocks = vi.hoisted(() => ({
  fetchExchangeRates: vi.fn(),
  setExchangeRate: vi.fn(),
}))

vi.mock('../services/financeService', () => mocks)

const EN = EXCHANGE_RATE_COPY.en
const AR = EXCHANGE_RATE_COPY.ar
const NOTE = 'Central bank bulletin of 17 Oct 2026.'

function rate(overrides = {}) {
  return {
    id: 7,
    syp_per_usd: '13000.0000',
    effective_from: '2026-10-17T09:00:00.000000Z',
    superseded_at: null,
    is_current: true,
    set_by: { id: 1, name: 'Owner Example' },
    note: 'Market rate in Damascus.',
    previous_rate_id: 6,
    previous_syp_per_usd: '12500.0000',
    change_percent: '4.00',
    ...overrides,
  }
}

function payload(current, history = current ? [current] : []) {
  return { data: { current, history: { data: history, current_page: 1, last_page: 1 } } }
}

const OWNER = createAuthorization({ roles: [{ slug: 'super-admin' }] })
const ADMIN = createAuthorization({ roles: [{ slug: 'admin' }] })

function renderPanel({ authorization = OWNER, language = 'en' } = {}) {
  return render(
    <AuthorizationContext.Provider value={authorization}>
      <ExchangeRatePanel language={language} />
    </AuthorizationContext.Provider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.fetchExchangeRates.mockResolvedValue(payload(rate(), [rate(), rate({ id: 6, syp_per_usd: '12500.0000', is_current: false, superseded_at: '2026-10-17T09:00:00.000000Z', change_percent: null, note: 'First rate.' })]))
  mocks.setExchangeRate.mockResolvedValue({ message: 'Exchange rate set.', data: rate({ id: 8 }) })
})

describe('the domain', () => {
  it('reads a rate exactly, 1 to 1,000,000 with at most four decimals', () => {
    expect(parseRateInput('13000')).toBe('13000.0000')
    expect(parseRateInput('١٣٠٠٠')).toBe('13000.0000')
    expect(parseRateInput('118.75')).toBe('118.7500')
    expect(parseRateInput('13,000')).toBe('13000.0000')
    expect(parseRateInput('0.5')).toBeNull()
    expect(parseRateInput('1000000.0001')).toBeNull()
    expect(parseRateInput('1.23456')).toBeNull()
    expect(parseRateInput('1e4')).toBeNull()
  })

  it('needs the tick for the first rate and for 20% or more, exactly', () => {
    expect(needsLargeChangeConfirmation(null, '13000')).toBe(true)
    expect(needsLargeChangeConfirmation(rate(), '15599.9999')).toBe(false)
    expect(needsLargeChangeConfirmation(rate(), '15600')).toBe(true)
    expect(needsLargeChangeConfirmation(rate(), '10400')).toBe(true)
    expect(needsLargeChangeConfirmation(rate(), '130000')).toBe(true)
    expect(rateChangePercent(rate(), '12700')).toBe('-2.31')
    expect(rateChangePercent(rate(), '15600')).toBe('20.00')
    expect(rateChangePercent(null, '13000')).toBeNull()
  })

  it('lets only the owner\'s role set the rate, never a plain administrator', () => {
    expect(canManageExchangeRate(OWNER)).toBe(true)
    expect(canManageExchangeRate(ADMIN)).toBe(false)
    expect(canManageExchangeRate(createAuthorization({ roles: [{ slug: 'finance-operator', permissions: [{ slug: 'finance.exchange_rates.manage' }] }] }))).toBe(true)
    expect(canManageExchangeRate(null)).toBe(false)
  })
})

describe('the panel', () => {
  it('shows the rate in force and the history, with no edit or delete control on a rate', async () => {
    renderPanel()

    const current = within(await screen.findByRole('region', { name: EN.current }))
    expect(current.getByText('1 USD = 13,000 SYP')).toBeInTheDocument()
    expect(current.getByText(/^Set by Owner Example on /)).toBeInTheDocument()
    const history = within(screen.getByRole('table', { name: EN.history }))
    expect(history.getByText('1 USD = 12,500 SYP')).toBeInTheDocument()
    expect(history.getByText('4.00%')).toBeInTheDocument()
    expect(history.getByText('First rate.')).toBeInTheDocument()
    expect(history.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /edit|delete|حذف|تعديل/i })).not.toBeInTheDocument()
  })

  it('says in red that no rate is set, and asks the tick for the first one', async () => {
    mocks.fetchExchangeRates.mockResolvedValue(payload(null, []))
    renderPanel()

    expect(await screen.findByText(EN.noRate)).toBeInTheDocument()
    expect(screen.getByText(EN.historyEmpty)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(EN.newRate), { target: { value: '13000' } })
    fireEvent.change(screen.getByLabelText(EN.note), { target: { value: NOTE } })
    expect(screen.getByText(EN.firstRate)).toBeInTheDocument()
    const submit = screen.getByRole('button', { name: EN.submit })
    expect(submit).toBeDisabled()
    fireEvent.click(screen.getByLabelText(EN.confirmTick))
    expect(submit).toBeEnabled()
    fireEvent.click(submit)

    await waitFor(() => expect(mocks.setExchangeRate).toHaveBeenCalledWith({ syp_per_usd: '13000.0000', note: NOTE, expected_current_rate_id: null, confirm_large_change: true }))
    expect(await screen.findByText(EN.saved)).toBeInTheDocument()
  })

  it('sends a small change without the tick, with the id of the rate it was opened on', async () => {
    renderPanel()

    fireEvent.change(await screen.findByLabelText(EN.newRate), { target: { value: '12700' } })
    expect(screen.getByText('A $ 49.99 price would be 634,873 SYP (now 649,870 SYP).')).toBeInTheDocument()
    expect(screen.getByText('Change: -2.31%')).toBeInTheDocument()
    expect(screen.queryByLabelText(EN.confirmTick)).not.toBeInTheDocument()
    const submit = screen.getByRole('button', { name: EN.submit })
    fireEvent.change(screen.getByLabelText(EN.note), { target: { value: 'short' } })
    expect(screen.getByText(EN.noteInvalid)).toBeInTheDocument()
    expect(submit).toBeDisabled()
    fireEvent.change(screen.getByLabelText(EN.note), { target: { value: NOTE } })
    fireEvent.click(submit)

    await waitFor(() => expect(mocks.setExchangeRate).toHaveBeenCalledWith({ syp_per_usd: '12700.0000', note: NOTE, expected_current_rate_id: 7, confirm_large_change: false }))
  })

  it('asks the tick for a change of 20% or more (a missing or extra zero)', async () => {
    renderPanel()

    fireEvent.change(await screen.findByLabelText(EN.newRate), { target: { value: '130000' } })
    fireEvent.change(screen.getByLabelText(EN.note), { target: { value: NOTE } })
    expect(screen.getByText('This changes the rate by 900.00% (from 1 USD = 13,000 SYP to 1 USD = 130,000 SYP). Tick to confirm it is not a typing mistake.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: EN.submit })).toBeDisabled()
    fireEvent.click(screen.getByLabelText(EN.confirmTick))
    fireEvent.click(screen.getByRole('button', { name: EN.submit }))

    await waitFor(() => expect(mocks.setExchangeRate).toHaveBeenCalledWith(expect.objectContaining({ syp_per_usd: '130000.0000', confirm_large_change: true })))
  })

  it('on 409 exchange_rate_changed reloads and keeps what was typed', async () => {
    mocks.setExchangeRate.mockRejectedValue({ response: { status: 409, data: { message: 'The rate changed.', code: 'exchange_rate_changed', current: rate({ id: 9 }) } } })
    renderPanel()

    fireEvent.change(await screen.findByLabelText(EN.newRate), { target: { value: '12700' } })
    fireEvent.change(screen.getByLabelText(EN.note), { target: { value: NOTE } })
    fireEvent.click(screen.getByRole('button', { name: EN.submit }))

    expect(await screen.findByRole('alert')).toHaveTextContent(EN.stale)
    await waitFor(() => expect(mocks.fetchExchangeRates).toHaveBeenCalledTimes(2))
    expect(screen.getByLabelText(EN.newRate)).toHaveValue('12700')
    expect(screen.getByLabelText(EN.note)).toHaveValue(NOTE)
  })

  it('shows the tick when the server asks for it (422 rate_change_needs_confirmation)', async () => {
    mocks.setExchangeRate.mockRejectedValueOnce({ response: { status: 422, data: { message: 'Confirm.', reason_code: 'rate_change_needs_confirmation', change_percent: '-2.31' } } })
    renderPanel()

    fireEvent.change(await screen.findByLabelText(EN.newRate), { target: { value: '12700' } })
    fireEvent.change(screen.getByLabelText(EN.note), { target: { value: NOTE } })
    fireEvent.click(screen.getByRole('button', { name: EN.submit }))

    expect(await screen.findByLabelText(EN.confirmTick)).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(EN.needsConfirmation)
  })

  it('offers no form to a plain administrator, only the history', async () => {
    renderPanel({ authorization: ADMIN })

    expect(await screen.findByText(EN.ownerOnly)).toBeInTheDocument()
    expect(screen.queryByLabelText(EN.newRate)).not.toBeInTheDocument()
    expect(screen.getByRole('table', { name: EN.history })).toBeInTheDocument()
  })

  it('renders in Arabic without a literal "undefined"', async () => {
    renderPanel({ language: 'ar' })

    expect(within(await screen.findByRole('region', { name: AR.current })).getByText('1 دولار = 13,000 ل.س')).toBeInTheDocument()
    expect(screen.getByRole('table', { name: AR.history })).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('undefined')
  })
})
