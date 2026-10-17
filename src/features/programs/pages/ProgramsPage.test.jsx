import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProgramsPage from './ProgramsPage'

/*
 * THE PROGRAMMES LIST (owner decisions of 17 Oct 2026). Pinned: the price column
 * shows each programme's one price in US dollars, from price_usd_minor, and the
 * list sorts on that integer of cents; no points are shown.
 */

const mocks = vi.hoisted(() => ({
  fetchAdminCategories: vi.fn(),
  fetchAdminPrograms: vi.fn(),
  setAdminProgramFeatured: vi.fn(),
  toggleAdminProgramActive: vi.fn(),
}))

vi.mock('../services/programsService', () => mocks)

const programs = [
  { id: 1, slug: 'b-course', title: { en: 'B course' }, price_usd_minor: 4999, is_active: true, is_featured: false },
  { id: 2, slug: 'a-course', title: { en: 'A course' }, price_usd_minor: 150000, is_active: true, is_featured: false },
  { id: 3, slug: 'c-course', title: { en: 'C course' }, price_usd_minor: 0, is_free: true, is_active: true, is_featured: false },
]

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.setItem('icpc_admin_language', 'en')
  mocks.fetchAdminPrograms.mockResolvedValue({ data: programs })
  mocks.fetchAdminCategories.mockResolvedValue({ data: [] })
})

describe('the programmes list', () => {
  it('shows each price in US dollars and sorts on the integer of cents', async () => {
    render(<MemoryRouter><ProgramsPage /></MemoryRouter>)

    expect(await screen.findByText('$ 49.99')).toBeInTheDocument()
    expect(screen.getByText('$ 1,500.00')).toBeInTheDocument()
    expect(screen.getByText('$ 0.00')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/II Points/)

    fireEvent.change(screen.getByDisplayValue('Sort: Title'), { target: { value: 'price_usd_minor' } })
    const titles = screen.getAllByRole('heading', { level: 4 }).map((heading) => heading.textContent)
    expect(titles).toEqual(['C course', 'B course', 'A course'])
    expect(screen.getByRole('option', { name: 'Sort: Price' })).toBeInTheDocument()
  })
})
