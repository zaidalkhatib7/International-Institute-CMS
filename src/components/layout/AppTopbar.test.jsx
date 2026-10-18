import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuthorization } from '../../features/auth/authorization'
import { roleUser } from '../../test/roleFixtures'
import { resetWorkCounts } from '../../features/dashboard/hooks/useWorkCounts'
import AppTopbar from './AppTopbar'

/*
 * THE TOP BAR (PLATFORM-JOURNEY-SPEC §4.7, D-17): the title names the page (a
 * row's own name, or the page under it), the bell counts the work waiting and
 * opens Today (it opened an always-empty notifications page), and the profile
 * menu says "My settings".
 */

const mocks = vi.hoisted(() => ({
  fetchRplDashboard: vi.fn(),
  user: { current: null },
  language: { current: 'en' },
}))

vi.mock('../../features/rpl/services/rplService', () => ({
  fetchRplDashboard: mocks.fetchRplDashboard,
  fetchRplChargeQueue: vi.fn().mockResolvedValue({ data: [] }),
  fetchRplAfterQuizAttention: vi.fn().mockResolvedValue({ data: {} }),
  fetchRplApplications: vi.fn().mockResolvedValue({ data: [] }),
}))
vi.mock('../../features/academicRpl/services/academicRplService', () => ({ fetchAcademicApplications: vi.fn().mockResolvedValue({ data: [] }) }))
vi.mock('../../features/users/services/usersService', () => ({ fetchUsers: vi.fn().mockResolvedValue({ data: [] }) }))
vi.mock('../../features/auth/services/authService', () => ({ logoutAdmin: vi.fn().mockResolvedValue({}) }))
vi.mock('../../features/auth/context/useAuthorization', () => ({ useAuthorization: () => createAuthorization(mocks.user.current) }))
vi.mock('../../services/languageStorage', async (importOriginal) => ({
  ...(await importOriginal()),
  getAdminLanguage: () => mocks.language.current,
}))

function Probe() {
  const location = useLocation()
  return <p data-testid="probe">{location.pathname}</p>
}

function renderBar(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppTopbar onMenuToggle={() => {}} />
      <Routes><Route path="*" element={<Probe />} /></Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  resetWorkCounts()
  mocks.language.current = 'en'
  mocks.user.current = roleUser('admin')
  mocks.fetchRplDashboard.mockResolvedValue({ data: { charges_awaiting_confirmation: 2, experience_certificates_awaiting_approval: 1, queues: { screening_decision: 3 } } })
})

describe('the title', () => {
  it.each([
    ['/rpl/applications', 'Professional cases'],
    ['/rpl/applications/abc', 'Case'],
    ['/users/12', 'Client'],
    ['/users/onsite', 'Clients'],
    ['/finance/exchange-rate', 'Exchange rate'],
    ['/settings', 'My settings'],
    ['/dashboard', 'Today'],
  ])('on %s reads %s', (path, title) => {
    renderBar(path)
    expect(screen.getAllByText(title).length).toBeGreaterThan(0)
  })
})

describe('the bell', () => {
  it('counts the work waiting for the viewer and opens Today', async () => {
    renderBar('/rpl/applications')
    const bell = await screen.findByRole('button', { name: 'Work waiting for you: 6' })
    expect(screen.getByTestId('work-badge')).toHaveTextContent('6')
    fireEvent.click(bell)
    expect(screen.getByTestId('probe')).toHaveTextContent('/dashboard')
  })

  it('shows no badge when nothing waits or the count is unknown', async () => {
    mocks.user.current = roleUser('content-admin')
    renderBar('/programs')
    expect(screen.getByRole('button', { name: 'Work waiting for you' })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByTestId('work-badge')).not.toBeInTheDocument())
  })

  it('reads in Arabic', async () => {
    mocks.language.current = 'ar'
    renderBar('/rpl/applications')
    expect(await screen.findByRole('button', { name: /^أعمال بانتظارك/ })).toBeInTheDocument()
  })
})

describe('the profile menu', () => {
  // Walk of 18 Oct 2026: the role read "Finance Operator" in the Arabic top bar.
  it.each([
    ['ar', 'finance-operator', { slug: 'finance-operator', name: 'Finance Operator' }, 'موظف المالية'],
    ['ar', 'admin', { slug: 'admin', name: 'Admin' }, 'مدير المنصة'],
    ['en', 'finance-operator', { slug: 'finance-operator', name: 'Finance Operator' }, 'Finance operator'],
    ['ar', 'unknown', { slug: 'night-desk', name: 'Night Desk' }, 'Night Desk'],
  ])('names the role in the interface language (%s, %s)', (language, _slug, role, label) => {
    mocks.language.current = language
    mocks.user.current = { id: 5, name: 'Staff Person', roles: [{ ...role, permissions: [] }] }
    renderBar('/dashboard')
    expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    if (label !== role.name) expect(screen.queryByText(role.name)).not.toBeInTheDocument()
  })

  it('offers My settings and Sign out', () => {
    renderBar('/dashboard')
    fireEvent.click(screen.getByRole('button', { name: 'Staff Admin' }))
    fireEvent.click(screen.getByRole('button', { name: 'My settings' }))
    expect(screen.getByTestId('probe')).toHaveTextContent('/settings')
  })
})
