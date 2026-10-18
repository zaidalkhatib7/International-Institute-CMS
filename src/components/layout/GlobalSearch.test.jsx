import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuthorization } from '../../features/auth/authorization'
import { permissionsUser, roleUser } from '../../test/roleFixtures'
import GlobalSearch from './GlobalSearch'

/*
 * ONE SEARCH FOR THE PLATFORM (PLATFORM-JOURNEY-SPEC §4.7, §9.1 item 11).
 *
 * It finds cases, clients and screens, each section only for a viewer who may
 * open it; it waits for two characters and a 300 ms pause; arrow keys, Enter and
 * Escape work; Enter opens the highlighted result; the query never enters a URL;
 * and a source that fails hides only its own section.
 */

const mocks = vi.hoisted(() => ({ fetchRplApplications: vi.fn(), fetchUsers: vi.fn(), user: { current: null }, language: { current: 'en' } }))

vi.mock('../../features/rpl/services/rplService', () => ({ fetchRplApplications: mocks.fetchRplApplications }))
vi.mock('../../features/users/services/usersService', () => ({ fetchUsers: mocks.fetchUsers }))
vi.mock('../../features/auth/context/useAuthorization', () => ({ useAuthorization: () => createAuthorization(mocks.user.current) }))
vi.mock('../../services/languageStorage', async (importOriginal) => ({
  ...(await importOriginal()),
  getAdminLanguage: () => mocks.language.current,
}))

function Probe() {
  const location = useLocation()
  return <p data-testid="probe">{location.pathname}{location.search}|{JSON.stringify(location.state)}</p>
}

function renderSearch() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <GlobalSearch />
      <Routes><Route path="*" element={<Probe />} /></Routes>
    </MemoryRouter>,
  )
}

async function type(value) {
  fireEvent.change(screen.getByRole('combobox'), { target: { value } })
  await act(async () => { vi.advanceTimersByTime(320) })
  await act(async () => {})
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false })
  vi.clearAllMocks()
  mocks.language.current = 'en'
  mocks.user.current = roleUser('admin')
  mocks.fetchRplApplications.mockResolvedValue({ data: { data: [{ id: 41, public_id: '588ce7d3-case', case_reference: 'RPL-2026-AB12CD34', user: { name: 'Maya Client' } }] } })
  mocks.fetchUsers.mockImplementation(async ({ audience }) => ({ data: { data: audience === 'website' ? [{ id: 9, name: 'Maya Client', email: 'maya@e2e.test' }] : [] } }))
})

afterEach(() => vi.useRealTimers())

describe('the global search', () => {
  it('waits for two characters and a pause, and asks only the sources the viewer may open', async () => {
    renderSearch()
    await type('m')
    expect(mocks.fetchRplApplications).not.toHaveBeenCalled()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ma' } })
    await act(async () => { vi.advanceTimersByTime(200) })
    expect(mocks.fetchRplApplications).not.toHaveBeenCalled()
    await act(async () => { vi.advanceTimersByTime(150) })
    await act(async () => {})
    expect(mocks.fetchRplApplications).toHaveBeenCalledWith({ q: 'ma', per_page: 5 })
    expect(mocks.fetchUsers).toHaveBeenCalledWith({ search: 'ma', per_page: 5, audience: 'website' })
    expect(mocks.fetchUsers).toHaveBeenCalledWith({ search: 'ma', per_page: 5, audience: 'onsite' })
    expect(screen.getByRole('group', { name: 'Cases' })).toHaveTextContent('RPL-2026-AB12CD34')
    expect(screen.getByRole('group', { name: 'Clients' })).toHaveTextContent('Maya Client')
  })

  it('asks no source a viewer cannot open, and still finds its screens', async () => {
    mocks.user.current = roleUser('content-admin')
    renderSearch()
    await type('prog')
    expect(mocks.fetchRplApplications).not.toHaveBeenCalled()
    expect(mocks.fetchUsers).not.toHaveBeenCalled()
    expect(screen.getByRole('group', { name: 'Screens' })).toHaveTextContent('Programmes & courses')
  })

  it('opens the highlighted case with Enter, the case by its id and the query nowhere in the URL', async () => {
    renderSearch()
    await type('AB12')
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' })
    const probe = screen.getByTestId('probe').textContent
    expect(probe.split('|')[0]).toBe('/rpl/applications/588ce7d3-case')
    expect(probe).not.toMatch(/AB12/)
  })

  it('moves with the arrow keys and closes with Escape', async () => {
    renderSearch()
    await type('maya')
    const box = screen.getByRole('combobox')
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(box, { key: 'ArrowDown' })
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(box, { key: 'ArrowUp' })
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(box, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.getByTestId('probe').textContent.split('|')[0]).toBe('/dashboard')
  })

  it('hands the query to the cases list in the route state, never the URL', async () => {
    renderSearch()
    await type('maya')
    fireEvent.mouseDown(screen.getByRole('option', { name: /All matching cases/ }))
    const [path, state] = screen.getByTestId('probe').textContent.split('|')
    expect(path).toBe('/rpl/applications')
    expect(JSON.parse(state)).toEqual({ q: 'maya' })
  })

  it('hides only the section whose source failed', async () => {
    mocks.fetchRplApplications.mockRejectedValue(new Error('down'))
    renderSearch()
    await type('maya')
    expect(screen.queryByRole('group', { name: 'Cases' })).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Clients' })).toHaveTextContent('Maya Client')
  })

  it('finds a screen by its name, and says when nothing matches', async () => {
    mocks.user.current = permissionsUser(['rpl.payments.reconcile'])
    renderSearch()
    await type('exchange')
    expect(screen.getByRole('group', { name: 'Screens' })).toHaveTextContent('Exchange rate')
    await type('zzzz')
    expect(screen.getByText('No results.')).toBeInTheDocument()
  })

  it('reads in Arabic', async () => {
    mocks.language.current = 'ar'
    renderSearch()
    expect(screen.getByRole('combobox', { name: 'البحث في المنصة' })).toHaveAttribute('placeholder', 'ابحث عن طلب أو عميل أو شاشة…')
    await type('سعر')
    expect(screen.getByRole('group', { name: 'الشاشات' })).toHaveTextContent('سعر الصرف')
  })

  // Walk of 18 Oct 2026: an administrator was sent to the rate's page of its own instead of Finance's tab.
  it.each([
    ['admin', roleUser('admin'), '/finance?tab=exchange_rate'],
    ['a reconciler without Finance', permissionsUser(['rpl.payments.reconcile']), '/finance/exchange-rate'],
  ])('opens the exchange rate where %s reads it', async (_who, user, href) => {
    mocks.user.current = user
    mocks.fetchRplApplications.mockResolvedValue({ data: { data: [] } })
    mocks.fetchUsers.mockResolvedValue({ data: { data: [] } })
    renderSearch()
    await type('exchange')
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' })
    expect(screen.getByTestId('probe').textContent.split('|')[0]).toBe(href)
  })
})
