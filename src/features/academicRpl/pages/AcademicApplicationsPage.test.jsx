import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AcademicApplicationsPage from './AcademicApplicationsPage'

/*
 * THE ACADEMIC CASES LIST (PLATFORM-JOURNEY-SPEC §4.8 items 5 and 6).
 *
 * The rows were handed to the table as children it never drew, so the list read
 * empty whatever the server sent. They are now its rows; the two columns once both
 * headed "Status" are "Case" and "Status"; statuses read as words; and an empty
 * list says where an academic case is opened.
 */

const mocks = vi.hoisted(() => ({ fetchAcademicApplications: vi.fn(), fetchAcademicReferenceData: vi.fn() }))
const language = vi.hoisted(() => ({ current: 'en' }))

vi.mock('../services/academicRplService', () => mocks)
vi.mock('../../../services/languageStorage', async (importOriginal) => ({
  ...(await importOriginal()),
  getAdminLanguage: () => language.current,
}))

beforeEach(() => {
  vi.clearAllMocks()
  language.current = 'en'
  mocks.fetchAcademicReferenceData.mockResolvedValue({ data: { tracks: [], framework: { ready: true } } })
  mocks.fetchAcademicApplications.mockResolvedValue({ data: { data: [{ public_id: 'aca-1', case_reference: 'ARPL-2026-0001', status: 'submitted', user: { name: 'Lina Client', email: 'lina@e2e.test' }, submitted_at: '2026-10-10T09:00:00Z' }], total: 1 } })
})

function renderList() {
  return render(<MemoryRouter><AcademicApplicationsPage /></MemoryRouter>)
}

describe('the academic cases list', () => {
  it('draws the rows the server sends, with the case and status columns named apart and the status as a word', async () => {
    renderList()
    const table = await screen.findByRole('table')
    expect(await within(table).findByText('ARPL-2026-0001')).toBeInTheDocument()
    expect(within(table).getAllByRole('columnheader').map((header) => header.textContent).slice(0, 4)).toEqual(['Case', 'Client', 'Requested track', 'Status'])
    // The status word, beside the column of the date submitted.
    expect(within(table).getAllByText('Submitted')).toHaveLength(2)
    expect(within(table).queryByText('submitted')).not.toBeInTheDocument()
  })

  it('says where an academic case is opened when there are none', async () => {
    mocks.fetchAcademicApplications.mockResolvedValue({ data: { data: [], total: 0 } })
    renderList()
    expect(await screen.findByText(/An academic case is opened from the client's page in Clients/)).toBeInTheDocument()
  })

  it('reads in Arabic, the filter options as words, without RPL', async () => {
    language.current = 'ar'
    renderList()
    const table = await screen.findByRole('table')
    expect(await within(table).findByText('مُرسل')).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: 'الطلب' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'مسحوب' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'طلبات المسار الأكاديمي' })).toBeInTheDocument()
    expect(document.body.textContent.replace(/ARPL-2026-0001/g, '')).not.toMatch(/RPL|undefined/)
  })
})
