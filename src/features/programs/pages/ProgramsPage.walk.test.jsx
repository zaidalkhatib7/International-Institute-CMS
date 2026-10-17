import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProgramsPage from './ProgramsPage'

/*
 * THE PROGRAMMES LIST AT A LAPTOP WIDTH (platform walk, 17 Oct 2026, UI-05).
 *
 * At 1280x800 the list card is about 900px wide. Its grid's fixed minimum column
 * widths added up to more than that inside an overflow-hidden card, so the
 * Status and Actions columns sat outside the card, the edit and activate
 * controls could not be reached, and a 28px title ran over the Category column.
 * jsdom does no layout, so the grid's own arithmetic is checked: its minimum
 * width fits the card, the table can scroll sideways when it must, and a cell
 * may shrink (min-w-0) instead of overflowing into its neighbour.
 */

const mocks = vi.hoisted(() => ({
  fetchAdminCategories: vi.fn(),
  fetchAdminPrograms: vi.fn(),
  setAdminProgramFeatured: vi.fn(),
  toggleAdminProgramActive: vi.fn(),
}))

vi.mock('../services/programsService', () => mocks)

const CARD_WIDTH_AT_1280 = 900

/** The smallest width a Tailwind grid row can take: its column minimums, its gaps and its side padding. */
function minimumRowWidth(className) {
  const template = /grid-cols-\[([^\]]+)\]/.exec(className)?.[1]
  if (!template) return Infinity
  const columns = template.split('_')
  const minimums = columns.map((column) => Number((/^minmax\((\d+)px/.exec(column) || /^(\d+)px$/.exec(column) || [0, 0])[1]))
  const gap = Number(/\bgap-(\d+)\b/.exec(className)?.[1] ?? 0) * 4
  const padding = Number(/\bpx-(\d+)\b/.exec(className)?.[1] ?? 0) * 4 * 2
  return minimums.reduce((sum, value) => sum + value, 0) + gap * (columns.length - 1) + padding
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.setItem('icpc_admin_language', 'ar')
  mocks.fetchAdminPrograms.mockResolvedValue({ data: [
    { id: 1, slug: 'ethics', title: { ar: 'أخلاقيات العمل المهني' }, category: { name: { ar: 'مكتبة برامج سد فجوات الكفاءة' } }, price_usd_minor: 2500, is_active: true, is_featured: false },
  ] })
  mocks.fetchAdminCategories.mockResolvedValue({ data: [] })
})

describe('the programmes list at 1280px', () => {
  it('fits its columns in the card, scrolls sideways when it must, and lets cells shrink', async () => {
    render(<MemoryRouter><ProgramsPage /></MemoryRouter>)
    const title = await screen.findByRole('heading', { level: 4, name: 'أخلاقيات العمل المهني' })
    const row = title.closest('[class*="grid-cols-"]')

    expect(minimumRowWidth(row.className)).toBeLessThanOrEqual(CARD_WIDTH_AT_1280)
    expect(row.closest('.overflow-x-auto')).not.toBeNull()
    expect(title.className).not.toMatch(/text-\[1\.75rem\]/)
    for (const cell of row.children) expect(cell.className).toMatch(/\bmin-w-0\b/)
  })
})
