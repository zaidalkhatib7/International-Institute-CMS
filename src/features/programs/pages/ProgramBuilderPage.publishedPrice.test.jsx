import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProgramBuilderPage from './ProgramBuilderPage'

/*
 * THE PRICE OF A PUBLISHED COURSE (platform walk, 17 Oct 2026, PB-06).
 *
 * A published gap course (CGP-COM-001, v1.0) had a price field that looked
 * editable and failed only on save, with the server's English "Published
 * package v1.0 is immutable…" inside the Arabic message. The owner sets one US
 * dollar price; a change is audited. So, for a published package, the builder
 * says its content is frozen, saves a price change through the price route
 * alone, and stops (in the screen's language) a save that changes anything else.
 */

const mocks = vi.hoisted(() => ({
  createAdminProgram: vi.fn(),
  fetchAdminCategories: vi.fn(),
  fetchAdminProgramById: vi.fn(),
  toggleAdminProgramActive: vi.fn(),
  updateAdminProgram: vi.fn(),
  updateAdminProgramPrice: vi.fn(),
  fetchCurrencies: vi.fn(),
}))

const language = vi.hoisted(() => ({ current: 'ar' }))

vi.mock('../services/programsService', () => ({
  createAdminProgram: mocks.createAdminProgram,
  fetchAdminCategories: mocks.fetchAdminCategories,
  fetchAdminProgramById: mocks.fetchAdminProgramById,
  toggleAdminProgramActive: mocks.toggleAdminProgramActive,
  updateAdminProgram: mocks.updateAdminProgram,
  updateAdminProgramPrice: mocks.updateAdminProgramPrice,
}))
vi.mock('../../finance/services/financeService', () => ({ fetchCurrencies: mocks.fetchCurrencies }))
vi.mock('../components/AiPackagePanel', () => ({ default: () => null }))
vi.mock('../components/SeedPackPanel', () => ({ default: () => null }))
vi.mock('../components/PublicationReadinessCard', () => ({ default: () => null }))
vi.mock('../../../services/languageStorage', async (importOriginal) => ({
  ...(await importOriginal()),
  getAdminLanguage: () => language.current,
}))

function published(overrides = {}) {
  return {
    id: 1,
    category_id: 2,
    competency_gap_group_id: 4,
    official_code: 'CGP-COM-001',
    content_status: 'published',
    package_version: '1.0',
    package_published_at: '2026-10-16T09:00:00Z',
    title: { ar: 'الاتصال المهني الفعال' },
    short_description: { ar: 'وصف' },
    is_active: true,
    is_featured: false,
    program_type: 'short_course',
    price_usd_minor: 2500,
    ...overrides,
  }
}

function renderBuilder(tab = 'pricing') {
  return render(
    <MemoryRouter initialEntries={[`/programs/edit?id=1&tab=${tab}`]}>
      <Routes>
        <Route path="/programs/edit" element={<ProgramBuilderPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  language.current = 'ar'
  mocks.fetchAdminCategories.mockResolvedValue({ data: [] })
  mocks.fetchAdminProgramById.mockResolvedValue({ data: published() })
  mocks.updateAdminProgramPrice.mockResolvedValue({ data: published({ price_usd_minor: 3000 }) })
  mocks.fetchCurrencies.mockResolvedValue({ currencies: [], exchange_rate: null })
})

const priceField = () => screen.findByLabelText(/السعر \(بالدولار الأمريكي\)/)
const saveButton = () => screen.getByRole('button', { name: 'حفظ التغييرات' })

describe('a published package', () => {
  it('says its content is frozen and its price can still change', async () => {
    renderBuilder()
    await priceField()

    expect(screen.getByRole('note')).toHaveTextContent(/منشور: محتواه ثابت/)
  })

  it('saves a new price through the price route alone, never the frozen content route', async () => {
    mocks.fetchAdminProgramById.mockResolvedValueOnce({ data: published() }).mockResolvedValue({ data: published({ price_usd_minor: 3000 }) })
    renderBuilder()

    fireEvent.change(await priceField(), { target: { value: '30.00' } })
    fireEvent.click(saveButton())

    await waitFor(() => expect(mocks.updateAdminProgramPrice).toHaveBeenCalledWith('1', { price_usd_minor: 3000 }))
    expect(mocks.updateAdminProgram).not.toHaveBeenCalled()
    expect(await screen.findByText('تم حفظ تغييرات البرنامج بنجاح.')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/immutable/)
  })

  it('stops, in Arabic, a save that changes its frozen content', async () => {
    renderBuilder('basic-info')
    const title = await screen.findByDisplayValue('الاتصال المهني الفعال')
    fireEvent.change(title, { target: { value: 'عنوان آخر' } })
    fireEvent.click(saveButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(/منشور: محتواه ثابت، ولم يُحفظ شيء/)
    expect(mocks.updateAdminProgram).not.toHaveBeenCalled()
    expect(mocks.updateAdminProgramPrice).not.toHaveBeenCalled()
  })
})
