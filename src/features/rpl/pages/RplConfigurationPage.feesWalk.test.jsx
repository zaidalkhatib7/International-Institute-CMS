import { MemoryRouter } from 'react-router-dom'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RplConfigurationPage, { COPY } from './RplConfigurationPage'

/*
 * THE FEES TAB, AS THE OWNER READS IT (platform walk, 17 Oct 2026).
 *
 *   UI-04  each fee row names its pathway (with or without the secondary
 *          certificate) and its level, or "all levels"; before, every row read
 *          "USD | $ 0.00 | Active" and only the amount told them apart. The edit
 *          form keeps effective_from, which the API sends as an ISO datetime a
 *          date input cannot show, and the level list never offers the levels
 *          of both pathways under the same names.
 *   UI-19  a row with no level opens without a controlled <select> receiving
 *          null (React's console error).
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
    pathways: [
      { id: 1, code: 'rpl_without_secondary', name: { en: 'Professional RPL without secondary', ar: 'المسار المهني دون الثانوية' }, levels: [
        { id: 4, rpl_pathway_id: 1, code: 'practitioner', rank: 1, name: { en: 'Professional Practitioner', ar: 'ممارس مهني' } },
        { id: 5, rpl_pathway_id: 1, code: 'expert', rank: 3, name: { en: 'Professional Expert', ar: 'خبير مهني' } },
      ] },
      { id: 3, code: 'rpl_with_secondary', name: { en: 'Professional RPL with secondary', ar: 'المسار المهني مع الثانوية' }, levels: [
        { id: 7, rpl_pathway_id: 3, code: 'practitioner', rank: 1, name: { en: 'Professional Practitioner', ar: 'ممارس مهني' } },
        { id: 9, rpl_pathway_id: 3, code: 'expert', rank: 3, name: { en: 'Professional Expert', ar: 'خبير مهني' } },
      ] },
    ],
  },
}

const ROWS = [
  { id: 1, rpl_pathway_id: 1, rpl_level_id: null, amount: '0.00', currency: 'USD', money: { currency: 'USD', amount_minor: 0, amount: '0.00' }, usable: true, is_active: true, effective_from: '2026-10-17T00:00:00.000000Z', effective_until: null },
  { id: 4, rpl_pathway_id: 3, rpl_level_id: 9, amount: '40.00', currency: 'USD', money: { currency: 'USD', amount_minor: 4000, amount: '40.00' }, usable: true, is_active: true, effective_from: '2026-10-17T00:00:00.000000Z', effective_until: null },
]

let consoleError

beforeEach(() => {
  vi.clearAllMocks()
  language.current = 'en'
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  mocks.fetchRplConfiguration.mockResolvedValue({ data: ROWS })
  mocks.fetchRplReferenceData.mockResolvedValue(REFERENCE)
  mocks.fetchRplSettings.mockResolvedValue({ data: {} })
  mocks.updateRplConfiguration.mockResolvedValue({ data: {} })
  mocks.fetchRplCertificateWordings.mockResolvedValue({ data: [] })
})

afterEach(() => consoleError.mockRestore())

async function openFees() {
  render(<MemoryRouter><RplConfigurationPage /></MemoryRouter>)
  fireEvent.click(await screen.findByRole('button', { name: C.fees }))
  return screen.findByRole('table')
}

const rowOf = (table, text) => within(table).getByText(text).closest('tr')

describe('UI-04: the fee rows', () => {
  it('name the pathway and the level of every fee, "all levels" for a general one', async () => {
    const table = await openFees()
    const headers = within(table).getAllByRole('columnheader').map((cell) => cell.textContent)

    expect(headers).toEqual(expect.arrayContaining([C.pathway, C.level, C.amount]))
    const general = rowOf(table, '$ 0.00')
    expect(within(general).getByText('Professional RPL without secondary')).toBeInTheDocument()
    expect(within(general).getByText(C.feeAllLevels)).toBeInTheDocument()
    const expert = rowOf(table, '$ 40.00')
    expect(within(expert).getByText('Professional RPL with secondary')).toBeInTheDocument()
    expect(within(expert).getByText('Professional Expert')).toBeInTheDocument()
  })

  it('keeps effective_from in the edit form', async () => {
    const table = await openFees()
    fireEvent.click(within(rowOf(table, '$ 40.00')).getByRole('button', { name: C.edit }))

    expect(await screen.findByLabelText(C.effectiveFrom)).toHaveValue('2026-10-17')
  })

  it('lists only the chosen pathway\'s levels, and none before a pathway is chosen', async () => {
    await openFees()
    fireEvent.click(screen.getByRole('button', { name: C.add }))
    const level = await screen.findByLabelText(C.level)

    expect(within(level).getAllByRole('option').map((option) => option.value)).toEqual([''])
    fireEvent.change(screen.getByLabelText(C.pathway), { target: { value: '3' } })
    expect(within(screen.getByLabelText(C.level)).getAllByRole('option').map((option) => option.value)).toEqual(['', '7', '9'])
  })
})

describe('UI-19: a fee row with no level', () => {
  it('opens and saves without a select receiving null', async () => {
    const table = await openFees()
    fireEvent.click(within(rowOf(table, '$ 0.00')).getByRole('button', { name: C.edit }))
    expect(await screen.findByLabelText(C.level)).toHaveValue('')
    fireEvent.click(screen.getByRole('button', { name: C.save }))
    await waitFor(() => expect(mocks.updateRplConfiguration).toHaveBeenCalledTimes(1))

    expect(mocks.updateRplConfiguration.mock.calls[0][2]).toMatchObject({ rpl_pathway_id: 1, rpl_level_id: null, effective_from: '2026-10-17' })
    const nullSelect = consoleError.mock.calls.filter((call) => call.some((part) => String(part).includes('should not be null')))
    expect(nullSelect).toEqual([])
  })
})
