import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import UserWorkspacePage, { copyByLanguage } from './UserWorkspacePage'
import { createAuthorization } from '../../auth/authorization'
import { roleUser } from '../../../test/roleFixtures'

/*
 * THE CLIENT PAGE LOADS PER PERMISSION (owner, 18 Oct 2026; PLATFORM-JOURNEY-SPEC
 * D-27, §9.1 item 13).
 *
 * The page used to read the RPL reference (rpl.applications.view) and the
 * programmes (programs.manage) with Promise.all, so a support agent could never
 * open a client, and a finance operator given users.view still could not top up
 * a wallet. Each read now goes only to a viewer who may make it; the sections that
 * need a read the viewer cannot make say so in one line, and no write control
 * shows without its permission.
 */

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }))
const auth = vi.hoisted(() => ({ user: null }))
const language = vi.hoisted(() => ({ current: 'en' }))

vi.mock('../../../services/http', () => ({ http }))
vi.mock('../../../services/languageStorage', async (importOriginal) => ({
  ...(await importOriginal()),
  getAdminLanguage: () => language.current,
}))
vi.mock('../../auth/context/useAuthorization', () => ({ useAuthorization: () => createAuthorization(auth.user) }))

const en = copyByLanguage.en

const CASE_ROW = { id: 31, public_id: 'case-31', case_reference: 'RPL-2026-CLIENT31', status: 'course_plan_active', pathway: { name: { en: 'Without secondary', ar: 'بدون الثانوية' } } }

const CLIENT = {
  id: 7,
  name: 'Client Example',
  role: 'user',
  roles: [],
  registration_channel: 'onsite',
  created_at: '2026-10-01T09:00:00+00:00',
  qualifications: [{ id: 1, title: 'Grade nine', qualification_type: 'below_secondary', institution: 'Local school', is_verified: true }],
  work_experiences: [],
  rpl_applications: [],
  wallet: { usd: { currency: 'USD', amount_minor: 0, amount: '0.00' }, syp: { currency: 'SYP', amount_minor: 0, amount: '0' } },
}

const FORBIDDEN = Object.assign(new Error('forbidden'), { response: { status: 403, data: { message: 'This action is unauthorized.' } } })

beforeEach(() => {
  vi.clearAllMocks()
  language.current = 'en'
  http.get.mockImplementation(async (url) => {
    switch (url) {
      case '/admin/users/7':
        return { data: { data: CLIENT } }
      case '/admin/users/7/professional-qualification-eligibility':
        return { data: { data: { rpl: { eligible: true, routing_status: 'rpl_without_secondary', recommended_pathway_code: 'rpl_without_secondary', intake: { can_open_case: true } }, academic_rpl: { eligible: false }, professional_qualifications: { eligible_program_types: [] } } } }
      case '/admin/rpl/reference-data':
      case '/admin/programs':
        throw FORBIDDEN
      case '/admin/users/7/wallet/transactions':
        return { data: { data: [], current_page: 1, last_page: 1, total: 0 } }
      case '/academic-rpl/reference-data':
        return { data: { data: { tracks: [] } } }
      default:
        throw new Error(`unexpected GET ${url}`)
    }
  })
})

function renderClient() {
  return render(
    <MemoryRouter initialEntries={['/users/7']}>
      <Routes><Route path="/users/:userId" element={<UserWorkspacePage />} /></Routes>
    </MemoryRouter>,
  )
}

const requested = (url) => http.get.mock.calls.some(([called]) => called === url)

describe('a finance operator (users.view and finance.manage)', () => {
  beforeEach(() => { auth.user = roleUser('finance-operator') })

  it('opens the client with the wallet card, and never asks for the case reference or the programmes', async () => {
    renderClient()
    expect(await screen.findByText(en.casesManagedNote)).toBeInTheDocument()
    expect(screen.queryByText(en.loadFailed)).not.toBeInTheDocument()
    expect(requested('/admin/rpl/reference-data')).toBe(false)
    expect(requested('/admin/programs')).toBe(false)
    expect(requested('/academic-rpl/reference-data')).toBe(false)
    await waitFor(() => expect(requested('/admin/users/7/wallet/transactions')).toBe(true))
  })

  it('shows no edit, enrolment or start-case control without users.manage and rpl.applications.manage', async () => {
    renderClient()
    await screen.findByText(en.casesManagedNote)
    expect(screen.queryByRole('button', { name: en.startRpl })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: en.edit })).not.toBeInTheDocument()
  })

  it('offers neither Delete nor Erase: both need users.manage', async () => {
    renderClient()
    await screen.findByText(en.casesManagedNote)
    expect(screen.queryByText(en.dangerZone)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: en.deleteAccount })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: en.purge })).not.toBeInTheDocument()
  })

  it('lists the client\'s cases as text, never as a button to a page it would be refused', async () => {
    CLIENT.rpl_applications = [CASE_ROW]
    try {
      renderClient()
      const reference = await screen.findByText('RPL-2026-CLIENT31')
      expect(reference.closest('button')).toBeNull()
      expect(reference.closest('[data-case-reference]')).not.toBeNull()
    } finally {
      CLIENT.rpl_applications = []
    }
  })
})

describe('a support agent (users.view, no finance or case permission)', () => {
  beforeEach(() => { auth.user = roleUser('support-agent') })

  it('opens the client (it could not before), with the note in place of the start-case area', async () => {
    renderClient()
    expect(await screen.findByText(en.casesManagedNote)).toBeInTheDocument()
    expect(screen.getAllByText('Client Example').length).toBeGreaterThan(0)
    expect(requested('/admin/rpl/reference-data')).toBe(false)
  })

  it('says it in Arabic', async () => {
    language.current = 'ar'
    renderClient()
    expect(await screen.findByText(copyByLanguage.ar.casesManagedNote)).toBeInTheDocument()
  })
})

describe('an administrator', () => {
  it('still loads the reference, and a failed read says so with a retry, never that the admin lacks the permission', async () => {
    auth.user = roleUser('admin')
    renderClient()
    // The reference read fails here: the page stands, and says the data could not be loaded.
    expect(await screen.findByText(en.pathDataFailed)).toBeInTheDocument()
    expect(screen.queryByText(en.casesManagedNote)).not.toBeInTheDocument()
    expect(requested('/admin/rpl/reference-data')).toBe(true)
    expect(requested('/admin/programs')).toBe(true)
    expect(screen.queryByText(en.loadFailed)).not.toBeInTheDocument()
    const reads = http.get.mock.calls.filter(([url]) => url === '/admin/rpl/reference-data').length
    fireEvent.click(screen.getByRole('button', { name: en.retry }))
    await waitFor(() => expect(http.get.mock.calls.filter(([url]) => url === '/admin/rpl/reference-data').length).toBe(reads + 1))
  })

  it('keeps the case rows as buttons and the removal card', async () => {
    auth.user = roleUser('admin')
    CLIENT.rpl_applications = [CASE_ROW]
    try {
      renderClient()
      const reference = await screen.findByText('RPL-2026-CLIENT31')
      expect(reference.closest('button')).not.toBeNull()
      expect(screen.getByRole('button', { name: en.deleteAccount })).toBeInTheDocument()
    } finally {
      CLIENT.rpl_applications = []
    }
  })
})

describe('a staff member\'s page (review of 18 Oct 2026)', () => {
  it('belongs to Staff & roles however it was opened: the page marks itself as opened from that row', async () => {
    auth.user = roleUser('admin')
    const staffMember = { ...CLIENT, name: 'Assessor Example', role: 'user', roles: [{ slug: 'assessor' }] }
    const base = http.get.getMockImplementation()
    http.get.mockImplementation(async (url) => (url === '/admin/users/7' ? { data: { data: staffMember } } : base(url)))
    function Where() {
      const location = useLocation()
      return <p data-testid="nav-from">{location.state?.navFrom || 'none'}</p>
    }
    render(
      <MemoryRouter initialEntries={['/users/7']}>
        <Routes><Route path="/users/:userId" element={<><UserWorkspacePage /><Where /></>} /></Routes>
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByTestId('nav-from')).toHaveTextContent('/users'))
  })
})
