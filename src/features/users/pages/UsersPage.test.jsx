import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import UsersPage from './UsersPage'
import { WALLET_COPY, buildUsersCsv, walletMatchesFilter } from '../domain/wallet'

/*
 * THE USERS LIST AND THE TWO BALANCES (owner decisions of 17 Oct 2026; contract
 * S6). Pinned: each client shows two balance lines, dollars and pounds; the
 * summary shows two cards from the API's wallet_totals, never one summed figure
 * and never by fetching every page of users; the CSV has one column per
 * balance; the list sorts by one balance at a time; and Top up / Deduct open the
 * client's wallet by id, with no name in the URL.
 */

const mocks = vi.hoisted(() => ({ fetchUsers: vi.fn(), createUser: vi.fn() }))

vi.mock('../services/usersService', () => mocks)
vi.mock('../../auth/context/useAuthorization', () => ({ useAuthorization: () => ({ hasPermission: () => true }) }))

const EN = WALLET_COPY.en
const money = (currency, minor, amount) => ({ currency, amount_minor: minor, amount })

const USERS = [
  { id: 7, name: 'Amina Saleh', email: 'amina@example.test', role: 'student', created_at: '2026-10-01T09:00:00Z', wallet_balances: { usd: money('USD', 4999, '49.99'), syp: money('SYP', 0, '0') } },
  { id: 8, name: 'Bassam Kurdi', email: 'bassam@example.test', role: 'student', created_at: '2026-10-02T09:00:00Z', wallet_balances: { usd: money('USD', 0, '0.00'), syp: money('SYP', 125000, '125000') } },
  { id: 9, name: 'Carla Haddad', email: 'carla@example.test', role: 'student', created_at: '2026-10-03T09:00:00Z', wallet_balances: { usd: money('USD', 100, '1.00'), syp: money('SYP', 900000, '900000') } },
]

function page(items, overrides = {}) {
  return {
    message: 'Users fetched.',
    data: { data: items, current_page: 1, last_page: 1, total: items.length, from: 1, to: items.length, per_page: 10 },
    wallet_totals: { usd: money('USD', 5099, '50.99'), syp: money('SYP', 1025000, '1025000') },
    ...overrides,
  }
}

function Where() {
  const location = useLocation()
  return <p data-testid="where">{`${location.pathname}${location.search}`}</p>
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/users/website']}>
      <Routes>
        <Route path="/users/website" element={<UsersPage />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.setItem('icpc_admin_language', 'en')
  mocks.fetchUsers.mockImplementation(async (params) => (params?.role === 'admin' ? page([], { data: { data: [], current_page: 1, last_page: 1, total: 2 } }) : page(USERS)))
})

function rowOf(name) {
  return screen.getByRole('button', { name }).closest('div.grid')
}

describe('the users list', () => {
  it('shows two balance lines per client, never one figure', async () => {
    renderPage()

    await screen.findByRole('button', { name: 'Amina Saleh' })
    const amina = within(rowOf('Amina Saleh'))
    expect(amina.getByText('$ 49.99')).toBeInTheDocument()
    expect(amina.getByText('0 SYP')).toBeInTheDocument()
    expect(within(rowOf('Bassam Kurdi')).getByText('125,000 SYP')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/II Points|Points/)
  })

  it('shows two summary cards from wallet_totals, without fetching every page of users', async () => {
    renderPage()

    expect(await screen.findByText(EN.usdTotals)).toBeInTheDocument()
    expect(screen.getByText(EN.sypTotals)).toBeInTheDocument()
    expect(await screen.findByText('$ 50.99')).toBeInTheDocument()
    expect(screen.getByText('1,025,000 SYP')).toBeInTheDocument()
    await waitFor(() => expect(mocks.fetchUsers).toHaveBeenCalledWith(expect.objectContaining({ per_page: 1, role: 'admin' })))
    expect(mocks.fetchUsers.mock.calls.every(([params]) => params?.per_page !== 100)).toBe(true)
  })

  it('sorts by one balance at a time, by its integer of minor units', async () => {
    renderPage()

    await screen.findByRole('button', { name: 'Amina Saleh' })
    const sort = screen.getByDisplayValue('Sort: Name')
    const order = () => screen.getAllByRole('button', { name: /Amina Saleh|Bassam Kurdi|Carla Haddad/ }).map((button) => button.textContent)

    fireEvent.change(sort, { target: { value: 'wallet_usd' } })
    expect(order()).toEqual(['Bassam Kurdi', 'Carla Haddad', 'Amina Saleh'])
    fireEvent.change(sort, { target: { value: 'wallet_syp' } })
    expect(order()).toEqual(['Amina Saleh', 'Bassam Kurdi', 'Carla Haddad'])
  })

  it('opens Top up and Deduct by the client\'s id, with no name in the URL', async () => {
    renderPage()

    await screen.findByRole('button', { name: 'Amina Saleh' })
    fireEvent.click(within(rowOf('Amina Saleh')).getByRole('button', { name: EN.topUp }))
    expect(screen.getByTestId('where')).toHaveTextContent('/users/7/wallet?action=top-up')
    expect(screen.getByTestId('where').textContent).not.toMatch(/Amina|name=/)
  })
})

describe('the wallet helpers', () => {
  it('writes one CSV column per balance, as decimal strings', () => {
    const lines = buildUsersCsv(USERS, 'en').split('\n')
    expect(lines[0]).toBe('"ID","Name","Email","Role","Registration Date","Wallet USD","Wallet SYP"')
    expect(lines[1]).toBe('"ICPC-7","Amina Saleh","amina@example.test","student","2026-10-01T09:00:00Z","49.99","0"')
    expect(lines[2]).toContain('"0.00","125000"')
  })

  it('counts a balance above 0 in either currency as positive', () => {
    expect(walletMatchesFilter(USERS[0], 'positive')).toBe(true)
    expect(walletMatchesFilter(USERS[1], 'positive')).toBe(true)
    expect(walletMatchesFilter({ wallet_balances: { usd: money('USD', 0, '0.00'), syp: money('SYP', 0, '0') } }, 'zero')).toBe(true)
    expect(walletMatchesFilter({}, 'zero')).toBe(true)
  })
})
