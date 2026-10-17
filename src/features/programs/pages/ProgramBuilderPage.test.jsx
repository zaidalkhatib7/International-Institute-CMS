import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProgramBuilderPage from './ProgramBuilderPage'

/*
 * ONE PRICE, IN US DOLLARS (owner decisions of 17 Oct 2026; contract S9).
 *
 * Pinned: the editor shows one price field in US dollars with cents, read from
 * price_usd_minor and never from the retired points; the save sends
 * price_usd_minor as an integer of cents and never fees, currency or
 * price_points; a pound preview at today's rate, or "no rate" while none is set;
 * a price the API would refuse (1 to 99 cents) is stopped here; and no "II
 * Points" or "نقاط" is rendered in either language.
 */

const mocks = vi.hoisted(() => ({
  createAdminProgram: vi.fn(),
  fetchAdminCategories: vi.fn(),
  fetchAdminProgramById: vi.fn(),
  toggleAdminProgramActive: vi.fn(),
  updateAdminProgram: vi.fn(),
  fetchCurrencies: vi.fn(),
}))

const language = vi.hoisted(() => ({ current: 'en' }))

vi.mock('../services/programsService', () => ({
  createAdminProgram: mocks.createAdminProgram,
  fetchAdminCategories: mocks.fetchAdminCategories,
  fetchAdminProgramById: mocks.fetchAdminProgramById,
  toggleAdminProgramActive: mocks.toggleAdminProgramActive,
  updateAdminProgram: mocks.updateAdminProgram,
}))
vi.mock('../../finance/services/financeService', () => ({ fetchCurrencies: mocks.fetchCurrencies }))
vi.mock('../components/AiPackagePanel', () => ({ default: () => null }))
vi.mock('../components/SeedPackPanel', () => ({ default: () => null }))
vi.mock('../components/PublicationReadinessCard', () => ({ default: () => null }))
vi.mock('../../../services/languageStorage', async (importOriginal) => ({
  ...(await importOriginal()),
  getAdminLanguage: () => language.current,
}))

const RATE = { id: 7, syp_per_usd: '13000.0000', effective_from: '2026-10-17T09:00:00Z' }

function program(overrides = {}) {
  return {
    id: 31,
    category_id: 2,
    title: { en: 'Site Safety', ar: 'سلامة المواقع' },
    is_active: false,
    is_featured: false,
    program_type: 'short_course',
    price_usd_minor: 4999,
    price: { usd: { currency: 'USD', amount_minor: 4999, amount: '49.99' }, syp: null, exchange_rate: null },
    // Retired columns the API no longer serves; even if one arrived, it is never read or sent.
    price_points: 500,
    ...overrides,
  }
}

function renderBuilder(tab = 'pricing') {
  return render(
    <MemoryRouter initialEntries={[`/programs/edit?id=31&tab=${tab}`]}>
      <Routes>
        <Route path="/programs/edit" element={<ProgramBuilderPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  language.current = 'en'
  mocks.fetchAdminCategories.mockResolvedValue({ data: [] })
  mocks.fetchAdminProgramById.mockResolvedValue({ data: program() })
  mocks.updateAdminProgram.mockResolvedValue({ data: program() })
  mocks.fetchCurrencies.mockResolvedValue({ currencies: [], exchange_rate: RATE, rounding: 'half_up_whole_pound' })
})

describe('the programme price', () => {
  it('shows one price in US dollars, from price_usd_minor, with the pounds at today\'s rate', async () => {
    renderBuilder()

    const price = await screen.findByLabelText('Price (US dollars) *')
    expect(price).toHaveValue('49.99')
    expect(price).toHaveAttribute('type', 'text')
    expect(await screen.findByText('At today\'s rate: 649,870 SYP')).toBeInTheDocument()
    expect(screen.queryByLabelText(/Currency/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Fees/)).not.toBeInTheDocument()
    expect(screen.getAllByText('$ 49.99').length).toBeGreaterThan(0)
  })

  it('saves price_usd_minor as an integer of cents, never fees, currency or price_points', async () => {
    renderBuilder()

    fireEvent.change(await screen.findByLabelText('Price (US dollars) *'), { target: { value: '120.5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(mocks.updateAdminProgram).toHaveBeenCalledTimes(1))
    const [id, payload] = mocks.updateAdminProgram.mock.calls[0]
    expect(id).toBe('31')
    expect(payload.price_usd_minor).toBe(12050)
    for (const key of ['price_points', 'fees', 'currency']) expect(payload).not.toHaveProperty(key)
  })

  it('stops a price the API would refuse (1 to 99 cents), and says why', async () => {
    renderBuilder()

    fireEvent.change(await screen.findByLabelText('Price (US dollars) *'), { target: { value: '0.50' } })
    expect(screen.getAllByText(/Enter 0, or a price from 1.00 to 1,000,000.00 US dollars/).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(mocks.updateAdminProgram).not.toHaveBeenCalled()
  })

  it('says no rate is set, rather than a pound figure, while none is set', async () => {
    mocks.fetchCurrencies.mockResolvedValue({ currencies: [], exchange_rate: null })
    renderBuilder()

    expect(await screen.findByText('No exchange rate is set: nobody can pay in Syrian pounds until one is set. Dollar payments are not affected.')).toBeInTheDocument()
  })

  it.each(['en', 'ar'])('renders no II Points and no points in %s', async (current) => {
    language.current = current
    renderBuilder()

    await screen.findByDisplayValue('49.99')
    expect(document.body.textContent).not.toMatch(/II Points|نقاط/)
    expect(document.body.textContent).not.toContain('undefined')
  })
})
