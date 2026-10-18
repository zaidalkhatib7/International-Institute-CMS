import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuthorization } from '../../auth/authorization'
import { roleUser } from '../../../test/roleFixtures'
import { resetWorkCounts } from '../../dashboard/hooks/useWorkCounts'
import RplApplicationsPage from './RplApplicationsPage'

/*
 * THE PROFESSIONAL CASES LIST (PLATFORM-JOURNEY-SPEC §4.2, §9.1 item 7).
 *
 * The stage and the queue live in the URL and become the request (statuses[],
 * queue, sort=waiting); a search never does. Stage counts only for unscoped
 * viewers; no stat tiles; the pre-flow statuses in their own group; the office
 * request button for whoever can open a case for an office client; and each row
 * carries where it was opened from, for the case's Back link. The reference in
 * the first column opens the case (UI-18).
 */

const mocks = vi.hoisted(() => ({
  fetchRplApplications: vi.fn(),
  fetchRplReferenceData: vi.fn(),
  fetchRplDashboard: vi.fn(),
  fetchRplChargeQueue: vi.fn(),
  fetchRplAfterQuizAttention: vi.fn(),
  user: { current: null },
  language: { current: 'en' },
}))

vi.mock('../services/rplService', () => ({
  fetchRplApplications: mocks.fetchRplApplications,
  fetchRplReferenceData: mocks.fetchRplReferenceData,
  fetchRplDashboard: mocks.fetchRplDashboard,
  fetchRplChargeQueue: mocks.fetchRplChargeQueue,
  fetchRplAfterQuizAttention: mocks.fetchRplAfterQuizAttention,
}))
vi.mock('../../academicRpl/services/academicRplService', () => ({ fetchAcademicApplications: vi.fn().mockResolvedValue({ data: [] }) }))
vi.mock('../../auth/context/useAuthorization', () => ({ useAuthorization: () => createAuthorization(mocks.user.current) }))
vi.mock('../../../services/languageStorage', async (importOriginal) => ({
  ...(await importOriginal()),
  getAdminLanguage: () => mocks.language.current,
}))

const ROW = { id: 41, public_id: 'e1e5793a-case', case_reference: 'RPL-2026-ZYQ8U1YT', status: 'assessment_in_progress', user: { name: 'Maya Client', email: 'client1@e2e.test' }, updated_at: '2026-10-17T10:00:00Z' }

function Probe() {
  const location = useLocation()
  return <p data-testid="probe">{location.pathname}{location.search}|{JSON.stringify(location.state)}</p>
}

function renderList(entry = '/rpl/applications', state) {
  return render(
    <MemoryRouter initialEntries={[state ? { pathname: entry.split('?')[0], search: entry.includes('?') ? `?${entry.split('?')[1]}` : '', state } : entry]}>
      <Routes>
        <Route path="/rpl/applications" element={<><RplApplicationsPage /><Probe /></>} />
        <Route path="*" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  resetWorkCounts()
  mocks.language.current = 'en'
  mocks.user.current = roleUser('admin')
  mocks.fetchRplApplications.mockResolvedValue({ data: { data: [ROW], current_page: 1, last_page: 1, total: 1 } })
  mocks.fetchRplReferenceData.mockResolvedValue({ data: { pathways: [{ id: 1, name: { en: 'With secondary', ar: 'مع الثانوية' }, levels: [{ id: 5, name: { en: 'Practitioner', ar: 'ممارس مهني' } }] }] } })
  mocks.fetchRplDashboard.mockResolvedValue({ data: { applications: { total: 41, by_status: { assessment_in_progress: 6, ready_for_assessment: 1, quality_review: 3 } }, queues: { quiz_start: 1, quiz_prepare: 2, quiz_client: 2, quiz_review: 0, plan_generate: 1 } } })
  mocks.fetchRplChargeQueue.mockResolvedValue({ data: [] })
})

describe('stage and queue', () => {
  it('sends the stage\'s statuses, the queue and the waiting order, and shows the stage\'s queues with their counts', async () => {
    renderList('/rpl/applications?stage=entry_quiz&queue=quiz_prepare')
    await waitFor(() => expect(mocks.fetchRplApplications).toHaveBeenCalledWith(expect.objectContaining({ statuses: ['ready_for_assessment', 'assessment_in_progress'], queue: 'quiz_prepare', sort: 'waiting' })))
    const queues = screen.getByRole('navigation', { name: 'Work queues in this stage' })
    await waitFor(() => expect(within(queues).getByRole('button', { name: /To prepare and send/ })).toHaveTextContent('2'))
    expect(within(queues).getByRole('button', { name: /To prepare and send/ })).toHaveAttribute('aria-pressed', 'true')
    expect(within(queues).getAllByRole('button').map((button) => button.textContent.replace(/\d+$/, ''))).toEqual(['To start', 'To prepare and send', 'Waiting for the client', 'Plans to generate', 'Answers to review'])
  })

  it('sends no statuses, queue or order for All', async () => {
    renderList()
    await waitFor(() => expect(mocks.fetchRplApplications).toHaveBeenCalled())
    const params = mocks.fetchRplApplications.mock.calls.at(-1)[0]
    expect(params).not.toHaveProperty('statuses')
    expect(params).not.toHaveProperty('queue')
    expect(params).not.toHaveProperty('sort')
  })

  it('writes the chosen stage into the URL, and nothing else', async () => {
    renderList()
    fireEvent.click(await screen.findByRole('button', { name: /^Entry quiz/ }))
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('/rpl/applications?stage=entry_quiz|'))
  })

  it('shows the stage counts to an unscoped viewer and hides them from an assessor', async () => {
    const { unmount } = renderList()
    const stages = screen.getByRole('navigation', { name: 'Stages' })
    await waitFor(() => expect(within(stages).getByRole('button', { name: /^Entry quiz/ })).toHaveTextContent('7'))
    expect(within(stages).getByRole('button', { name: /^All/ })).toHaveTextContent('41')
    unmount()
    resetWorkCounts()
    mocks.user.current = roleUser('assessor')
    renderList()
    await waitFor(() => expect(mocks.fetchRplDashboard).toHaveBeenCalled())
    expect(within(screen.getByRole('navigation', { name: 'Stages' })).getByRole('button', { name: /^Entry quiz/ }).textContent).toBe('Entry quiz')
  })
})

describe('the search stays out of the URL', () => {
  it('never changes location.search while typing', async () => {
    renderList('/rpl/applications?stage=decision')
    fireEvent.change(screen.getByRole('textbox', { name: /Search/ }), { target: { value: 'maya@example.com' } })
    await waitFor(() => expect(mocks.fetchRplApplications).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'maya@example.com' })))
    expect(screen.getByTestId('probe').textContent.split('|')[0]).toBe('/rpl/applications?stage=decision')
  })

  it('takes a search handed over by global search in the route state', async () => {
    renderList('/rpl/applications', { q: 'RPL-2026' })
    expect(screen.getByRole('textbox', { name: /Search/ })).toHaveValue('RPL-2026')
    await waitFor(() => expect(mocks.fetchRplApplications).toHaveBeenCalledWith(expect.objectContaining({ q: 'RPL-2026' })))
  })
})

describe('the list itself', () => {
  it('has no stat tiles, an Arabic-free English header, and the pre-flow statuses in their own group', async () => {
    renderList()
    await screen.findByRole('table')
    expect(screen.queryByText('Total applications')).not.toBeInTheDocument()
    expect(screen.queryByText('RPL')).not.toBeInTheDocument()
    const optgroup = document.querySelector('optgroup')
    expect(optgroup).toHaveAttribute('label', 'Pre-flow')
    expect([...optgroup.querySelectorAll('option')].map((option) => option.value)).toEqual(['quality_review', 'committee_review', 'remediation_required', 'decision_issued', 'appeal_open', 'under_appeal', 'returned_for_rework'])
  })

  it('opens a case from its reference, in the first column, carrying where it came from', async () => {
    renderList('/rpl/applications?stage=entry_quiz&queue=quiz_prepare')
    const table = await screen.findByRole('table')
    const link = await within(table).findByRole('link', { name: /RPL-2026-ZYQ8U1YT/ })
    expect(link).toHaveAttribute('href', '/rpl/applications/e1e5793a-case')
    expect(link.closest('td')).toBe(link.closest('tr').querySelector('td'))
    fireEvent.click(link)
    const probe = screen.getByTestId('probe').textContent
    expect(probe).toContain('/rpl/applications/e1e5793a-case|')
    expect(JSON.parse(probe.split('|')[1])).toEqual({ from: { pathname: '/rpl/applications', search: '?stage=entry_quiz&queue=quiz_prepare', label: 'To prepare and send' } })
  })

  it('names the client, the stage and the last change in six columns', async () => {
    renderList()
    const table = await screen.findByRole('table')
    await within(table).findByText('Maya Client')
    expect(within(table).getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Reference', 'Client', 'Pathway and level', 'Stage', 'Status', 'Last change'])
    expect(within(table).getByText('Entry quiz')).toBeInTheDocument()
    expect(table.className).not.toMatch(/min-w-\[780px\]/)
  })

  it('offers the office request only to a viewer with users.view and rpl.applications.manage, and opens the office clients', async () => {
    renderList()
    fireEvent.click(await screen.findByRole('button', { name: /New office request/ }))
    expect(screen.getByTestId('probe')).toHaveTextContent('/users/onsite')
  })

  it('hides the office request from a role that cannot open a case', async () => {
    mocks.user.current = roleUser('committee-member')
    renderList()
    await screen.findByRole('table')
    expect(screen.queryByRole('button', { name: /New office request/ })).not.toBeInTheDocument()
  })

  it('explains where cases come from when there are none', async () => {
    mocks.fetchRplApplications.mockResolvedValue({ data: { data: [], current_page: 1, last_page: 1, total: 0 } })
    renderList()
    expect(await screen.findByText(/Cases arrive from the website/)).toBeInTheDocument()
  })

  it('renders in Arabic without RPL', async () => {
    mocks.language.current = 'ar'
    renderList()
    await screen.findByRole('table')
    expect(screen.getByRole('heading', { name: 'طلبات المسار المهني' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'العميل' })).toBeInTheDocument()
    expect(document.body.textContent.replace(/RPL-2026-ZYQ8U1YT/g, '')).not.toMatch(/RPL|undefined/)
  })
})

describe('review of 18 Oct 2026', () => {
  function SearchHandOver() {
    const navigate = useNavigate()
    return <button type="button" onClick={() => navigate('/rpl/applications', { state: { q: 'Maya' } })}>All matching cases</button>
  }

  it('takes the global search\'s query even while the list is already open', async () => {
    render(
      <MemoryRouter initialEntries={['/rpl/applications?stage=entry_quiz']}>
        <SearchHandOver />
        <Routes>
          <Route path="/rpl/applications" element={<><RplApplicationsPage /><Probe /></>} />
        </Routes>
      </MemoryRouter>,
    )
    await waitFor(() => expect(mocks.fetchRplApplications).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: 'All matching cases' }))
    await waitFor(() => expect(screen.getByRole('textbox', { name: /Search: case reference/ })).toHaveValue('Maya'))
    await waitFor(() => expect(mocks.fetchRplApplications).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'Maya', page: 1 })))
    const params = mocks.fetchRplApplications.mock.calls.at(-1)[0]
    expect(params).not.toHaveProperty('statuses')
    expect(screen.getByTestId('probe').textContent).not.toMatch(/Maya.*\?|q=/)
  })

  it('never lets a slower answer to an earlier filter replace the latest one', async () => {
    let answerOld
    const OLD_ROW = { ...ROW, id: 42, public_id: 'old-case', case_reference: 'RPL-2026-OLDQUEUE' }
    mocks.fetchRplApplications
      .mockImplementationOnce(() => new Promise((resolve) => { answerOld = resolve }))
      .mockResolvedValue({ data: { data: [ROW], current_page: 1, last_page: 1, total: 1 } })
    renderList('/rpl/applications?stage=entry_quiz&queue=quiz_prepare')
    await waitFor(() => expect(mocks.fetchRplApplications).toHaveBeenCalledTimes(1))
    const queues = screen.getByRole('navigation', { name: 'Work queues in this stage' })
    // Clear the queue chip: a second, faster request answers first.
    fireEvent.click(within(queues).getByRole('button', { name: /To prepare and send/ }))
    await waitFor(() => expect(screen.getByText('RPL-2026-ZYQ8U1YT')).toBeInTheDocument())
    answerOld({ data: { data: [OLD_ROW], current_page: 1, last_page: 1, total: 1 } })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(screen.queryByText('RPL-2026-OLDQUEUE')).not.toBeInTheDocument()
    expect(screen.getByText('RPL-2026-ZYQ8U1YT')).toBeInTheDocument()
  })

  // Walk of 18 Oct 2026: the count badge read "1 cases".
  it.each([
    ['en', 1, '1 case'],
    ['en', 3, '3 cases'],
    ['ar', 1, 'طلب واحد'],
    ['ar', 2, 'طلبان'],
    ['ar', 3, '٣ طلبات'],
    ['ar', 11, '١١ طلبًا'],
  ])('names the count in its plural form (%s, %i)', async (language, total, label) => {
    mocks.language.current = language
    mocks.fetchRplApplications.mockResolvedValue({ data: { data: [ROW], current_page: 1, last_page: 1, total } })
    renderList()
    expect(await screen.findByText(label)).toBeInTheDocument()
  })
})
