import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RplConfigurationPage, { COPY } from './RplConfigurationPage'

/*
 * THE FEES TAB AND THE LEVEL CERTIFICATE'S FEE (owner answer O2 of 15 Oct 2026).
 *
 * On the final-exam path a fee above 0 is charged only as a whole number of II
 * Points, and the API refuses to convert money. So the Fees tab saves II Points
 * (POINTS) by default and as a whole number, still saves a three-letter money code
 * for the committee path, and warns that a money fee above 0 strands the level
 * certificate. A three-letter-only currency field could never save POINTS.
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
  mocks.fetchRplCertificateWordings.mockResolvedValue({ data: [] })
})

async function openFeeForm(copy = C) {
  render(<RplConfigurationPage />)
  fireEvent.click(await screen.findByRole('button', { name: copy.fees }))
  fireEvent.click(await screen.findByRole('button', { name: copy.add }))
  fireEvent.change(await screen.findByLabelText(copy.pathway), { target: { value: '1' } })
}

const saveButton = () => screen.getByRole('button', { name: C.save })

describe('the Fees tab (O2)', () => {
  it('saves a fee in II Points as POINTS by default, as a whole number', async () => {
    await openFeeForm()

    expect(screen.getByLabelText(C.feeChargedIn)).toHaveValue('points')
    expect(screen.queryByLabelText(C.feeCurrencyCode)).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(C.amount), { target: { value: '40.5' } })
    expect(screen.getByText(C.feeWholePoints)).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()

    fireEvent.change(screen.getByLabelText(C.amount), { target: { value: '40' } })
    expect(screen.queryByText(C.feeWholePoints)).not.toBeInTheDocument()
    expect(saveButton()).toBeEnabled()
    fireEvent.click(saveButton())

    await waitFor(() => expect(mocks.createRplConfiguration).toHaveBeenCalledTimes(1))
    expect(mocks.createRplConfiguration).toHaveBeenCalledWith('fee-schedules', expect.objectContaining({ rpl_pathway_id: 1, amount: 40, currency: 'POINTS' }))
  })

  it('still saves a three-letter money code, and warns that a money fee above 0 strands the level certificate', async () => {
    await openFeeForm()

    fireEvent.change(screen.getByLabelText(C.feeChargedIn), { target: { value: 'money' } })
    fireEvent.change(screen.getByLabelText(C.amount), { target: { value: '49.50' } })
    expect(saveButton()).toBeDisabled()
    fireEvent.change(screen.getByLabelText(C.feeCurrencyCode), { target: { value: 'eu' } })
    expect(screen.getByText(C.feeCurrencyInvalid)).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()
    fireEvent.change(screen.getByLabelText(C.feeCurrencyCode), { target: { value: 'eur' } })
    expect(screen.getByText(C.feeMoneyWarning)).toBeInTheDocument()
    expect(saveButton()).toBeEnabled()

    // Back to II Points and to money again: POINTS, no warning; the money code is typed anew.
    fireEvent.change(screen.getByLabelText(C.feeChargedIn), { target: { value: 'points' } })
    expect(screen.queryByText(C.feeMoneyWarning)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(C.feeCurrencyCode)).not.toBeInTheDocument()
    expect(screen.getByText(C.feeWholePoints)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(C.feeChargedIn), { target: { value: 'money' } })
    expect(screen.getByLabelText(C.feeCurrencyCode)).toHaveValue('')
    fireEvent.change(screen.getByLabelText(C.feeCurrencyCode), { target: { value: 'eur' } })
    fireEvent.click(saveButton())

    await waitFor(() => expect(mocks.createRplConfiguration).toHaveBeenCalledTimes(1))
    expect(mocks.createRplConfiguration).toHaveBeenCalledWith('fee-schedules', expect.objectContaining({ amount: 49.5, currency: 'EUR' }))
  })

  it('tells staff on the tab that a fee above 0 on the final-exam path is in II Points, in Arabic too', async () => {
    render(<RplConfigurationPage />)
    fireEvent.click(await screen.findByRole('button', { name: C.fees }))
    expect(await screen.findByText(C.feesFinalExamHint)).toBeInTheDocument()
    expect(C.feesFinalExamHint).toContain('II Points (POINTS)')
    expect(COPY.ar.feesFinalExamHint).toContain('POINTS')
    for (const key of ['feeChargedIn', 'feePoints', 'feeMoney', 'feeCurrencyCode', 'feeWholePoints', 'feeCurrencyInvalid', 'feeMoneyWarning']) {
      expect(COPY.ar[key]).toBeTruthy()
      expect(COPY.en[key]).toBeTruthy()
    }
  })

  it('lists a fee in II Points by name', async () => {
    mocks.fetchRplConfiguration.mockResolvedValue({ data: [{ id: 7, rpl_pathway_id: 1, rpl_level_id: 1, amount: '100.00', currency: 'POINTS', is_active: true }] })
    render(<RplConfigurationPage />)
    fireEvent.click(await screen.findByRole('button', { name: C.fees }))

    expect(await screen.findByText('100 II Points')).toBeInTheDocument()
  })
})
