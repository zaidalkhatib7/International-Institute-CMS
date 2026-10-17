import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RplApplicationsPage from './RplApplicationsPage'

/*
 * THE CASE LIST AT A LAPTOP WIDTH (platform walk, 17 Oct 2026, UI-18).
 *
 * At 1280px, beside the sidebar, the seven-column table was 1099px wide in an
 * 846px card: "Last update" and the "Open case" button sat beyond the card's
 * edge, so the list's one action needed sideways scrolling. The case reference,
 * in the first column, now opens the case; the last update sits under the
 * status (one column fewer), and the table uses the compact cell padding.
 */

const mocks = vi.hoisted(() => ({ fetchRplApplications: vi.fn(), fetchRplDashboard: vi.fn() }))

vi.mock('../services/rplService', () => mocks)
vi.mock('../../../services/languageStorage', async (importOriginal) => ({
  ...(await importOriginal()),
  getAdminLanguage: () => 'en',
}))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.fetchRplApplications.mockResolvedValue({ data: { data: [
    { id: 41, public_id: 'e1e5793a-case', case_reference: 'RPL-2026-ZYQ8U1YT', status: 'evidence_verification', user: { name: 'Maya Client', email: 'client1@e2e.test' }, updated_at: '2026-10-17T10:00:00Z', completeness_percentage: 100 },
  ], current_page: 1, last_page: 1, total: 1 } })
  mocks.fetchRplDashboard.mockResolvedValue({ data: {} })
})

describe('the case list', () => {
  it('opens a case from its reference, in the first column', async () => {
    render(<MemoryRouter><RplApplicationsPage /></MemoryRouter>)
    const table = await screen.findByRole('table')
    const link = await within(table).findByRole('link', { name: /RPL-2026-ZYQ8U1YT/ })

    expect(link).toHaveAttribute('href', '/rpl/applications/e1e5793a-case')
    expect(link.closest('td')).toBe(link.closest('tr').querySelector('td'))
  })

  it('carries the last update under the status, in a compact table of six columns', async () => {
    render(<MemoryRouter><RplApplicationsPage /></MemoryRouter>)
    const table = await screen.findByRole('table')
    await within(table).findByText('Maya Client')

    expect(within(table).getAllByRole('columnheader')).toHaveLength(6)
    expect(within(table).queryByRole('columnheader', { name: 'Last update' })).not.toBeInTheDocument()
    expect(within(table).getByText(/Last update:/)).toBeInTheDocument()
    expect(table.className).not.toMatch(/min-w-\[780px\]/)
  })
})
