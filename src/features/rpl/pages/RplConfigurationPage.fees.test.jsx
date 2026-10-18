import { MemoryRouter } from 'react-router-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RplConfigurationPage, { COPY } from './RplConfigurationPage'

/*
 * THE FEES TAB AND THE LEVEL CERTIFICATE'S FEE (owner answer O2 of 15 Oct 2026;
 * owner decisions of 17 Oct 2026: every fee in US dollars).
 *
 * One fee per pathway and level, in US dollars with cents, for the committee
 * path and the final-exam path alike: no "Charged in" choice and no currency
 * code. The body sends the amount as US cents (amount_minor) and the currency
 * USD (contract S14). A row still in another currency (POINTS before 17 Oct, or
 * EUR) is flagged "not in US dollars: re-enter it", and opens empty so nothing
 * is converted.
 */

const mocks = vi.hoisted(() => ({
  fetchRplSettings: vi.fn(),
  updateRplSettings: vi.fn(),
  fetchRplConfiguration: vi.fn(),
  fetchRplReferenceData: vi.fn(),
  createRplConfiguration: vi.fn(),
  updateRplConfiguration: vi.fn(),
  deleteRplConfiguration: vi.fn(),
  fetchRplCertificateWordings: vi.fn(),
  draftRplCertificateWording: vi.fn(),
  updateRplCertificateWording: vi.fn(),
  approveRplCertificateWording: vi.fn(),
}))

const language = vi.hoisted(() => ({ current: 'en' }))

vi.mock('../services/rplService', () => mocks)
vi.mock('../../users/services/usersService', () => ({ fetchUsers: vi.fn() }))
vi.mock('../../../services/languageStorage', async (importOriginal) => ({
  ...(await importOriginal()),
  getAdminLanguage: () => language.current,
}))

const C = COPY.en

const REFERENCE = {
  data: {
    pathways: [{ id: 1, code: 'rpl_without_secondary', name: { en: 'Professional RPL', ar: 'المسار المهني' }, levels: [
      { id: 1, rpl_pathway_id: 1, code: 'practitioner', rank: 1, name: { en: 'Professional Practitioner', ar: 'ممارس مهني' } },
    ] }],
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  language.current = 'en'
  mocks.fetchRplConfiguration.mockResolvedValue({ data: [] })
  mocks.fetchRplReferenceData.mockResolvedValue(REFERENCE)
  mocks.fetchRplSettings.mockResolvedValue({ data: {} })
  mocks.createRplConfiguration.mockResolvedValue({ data: {} })
  mocks.updateRplConfiguration.mockResolvedValue({ data: {} })
  mocks.fetchRplCertificateWordings.mockResolvedValue({ data: [] })
})

async function openFeeForm(copy = C) {
  render(<MemoryRouter><RplConfigurationPage /></MemoryRouter>)
  fireEvent.click(await screen.findByRole('button', { name: copy.fees }))
  fireEvent.click(await screen.findByRole('button', { name: copy.add }))
  fireEvent.change(await screen.findByLabelText(copy.pathway), { target: { value: '1' } })
}

const saveButton = () => screen.getByRole('button', { name: C.save })

describe('the Fees tab (US dollars only)', () => {
  it('saves a fee in US dollars with cents, as US cents, with no currency to choose', async () => {
    await openFeeForm()

    expect(screen.queryByLabelText(/Charged in/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Currency code/i)).not.toBeInTheDocument()
    expect(screen.getByText(C.feeCurrencyUsd)).toBeInTheDocument()
    const amount = screen.getByLabelText(C.feeAmountUsd)
    expect(amount).toHaveAttribute('type', 'text')

    fireEvent.change(amount, { target: { value: '49.555' } })
    expect(screen.getByText(C.feeAmountInvalid)).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()
    fireEvent.change(amount, { target: { value: '0.50' } })
    expect(saveButton()).toBeDisabled()

    fireEvent.change(amount, { target: { value: '49.5' } })
    expect(screen.queryByText(C.feeAmountInvalid)).not.toBeInTheDocument()
    expect(saveButton()).toBeEnabled()
    fireEvent.click(saveButton())

    await waitFor(() => expect(mocks.createRplConfiguration).toHaveBeenCalledTimes(1))
    const body = mocks.createRplConfiguration.mock.calls[0][1]
    expect(mocks.createRplConfiguration.mock.calls[0][0]).toBe('fee-schedules')
    expect(body).toMatchObject({ rpl_pathway_id: 1, amount_minor: 4950, currency: 'USD' })
    expect(body).not.toHaveProperty('amount')
  })

  it('saves a fee of 0 (the level certificate is then issued at once)', async () => {
    await openFeeForm()

    fireEvent.change(screen.getByLabelText(C.feeAmountUsd), { target: { value: '0' } })
    fireEvent.click(saveButton())

    await waitFor(() => expect(mocks.createRplConfiguration).toHaveBeenCalledWith('fee-schedules', expect.objectContaining({ amount_minor: 0, currency: 'USD' })))
  })

  it('lists a fee in dollars, and flags a row in another currency to be re-entered in dollars', async () => {
    mocks.fetchRplConfiguration.mockResolvedValue({
      data: [
        { id: 7, rpl_pathway_id: 1, rpl_level_id: 1, amount: '100.00', currency: 'USD', money: { currency: 'USD', amount_minor: 10000, amount: '100.00' }, is_active: true },
        { id: 8, rpl_pathway_id: 1, rpl_level_id: 1, amount: '25.00', currency: 'EUR', money: { currency: 'EUR', amount_minor: 2500, amount: '25.00', legacy: true }, usable: false, is_active: true },
      ],
    })
    render(<MemoryRouter><RplConfigurationPage /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: C.fees }))

    expect(await screen.findByText('$ 100.00')).toBeInTheDocument()
    expect(screen.getByText('25.00 EUR')).toBeInTheDocument()
    expect(screen.getByText(C.feeLegacyCurrency.replace('{currency}', 'EUR'))).toBeInTheDocument()
    expect(screen.getAllByText(/Not in US dollars/)).toHaveLength(1)
  })

  it('opens a row in another currency empty, so nothing is converted, and saves it in dollars', async () => {
    mocks.fetchRplConfiguration.mockResolvedValue({ data: [{ id: 8, rpl_pathway_id: 1, rpl_level_id: 1, amount: '25.00', currency: 'EUR', money: { currency: 'EUR', amount_minor: 2500, amount: '25.00', legacy: true }, usable: false, is_active: true }] })
    render(<MemoryRouter><RplConfigurationPage /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: C.fees }))
    fireEvent.click(await screen.findByRole('button', { name: C.edit }))

    expect(screen.getByLabelText(C.feeAmountUsd)).toHaveValue('')
    expect(screen.getByRole('note')).toHaveTextContent(C.feeLegacyCurrency.replace('{currency}', 'EUR'))
    fireEvent.change(screen.getByLabelText(C.feeAmountUsd), { target: { value: '30' } })
    fireEvent.click(saveButton())

    await waitFor(() => expect(mocks.updateRplConfiguration).toHaveBeenCalledWith('fee-schedules', 8, expect.objectContaining({ amount_minor: 3000, currency: 'USD' })))
  })

  it('tells staff the fee is in US dollars on both paths, in Arabic too, with no points left', async () => {
    render(<MemoryRouter><RplConfigurationPage /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: C.fees }))
    expect(await screen.findByText(C.feesFinalExamHint)).toBeInTheDocument()
    expect(C.feesFinalExamHint).toContain('US dollars')
    expect(COPY.ar.feesFinalExamHint).toContain('بالدولار الأمريكي')
    for (const language of ['ar', 'en']) {
      expect(COPY[language].feesFinalExamHint).not.toMatch(/POINTS|II Points|نقاط/)
      for (const key of ['feeCurrencyUsd', 'feeAmountUsd', 'feeAmountInvalid', 'feeLegacyCurrency']) expect(COPY[language][key]).toBeTruthy()
    }
  })
})
