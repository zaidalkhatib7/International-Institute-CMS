import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuthorization } from '../../auth/authorization'
import { roleUser } from '../../../test/roleFixtures'
import ProtectedRoute from '../../../components/layout/ProtectedRoute'
import AccessDeniedPage from './AccessDeniedPage'
import NotFoundPage from './NotFoundPage'

/*
 * THE GUARDS (PLATFORM-JOURNEY-SPEC §4.7, §9.1 item 12): a signed-in account
 * that is not staff meets Sign out, never a link to a page that refuses again;
 * a deleted path reaches Not found, which leads back to Today.
 */

const mocks = vi.hoisted(() => ({ user: { current: null }, language: { current: 'en' }, logoutAdmin: vi.fn() }))

vi.mock('../../auth/context/useAuthorization', () => ({ useAuthorization: () => ({ ...createAuthorization(mocks.user.current), isLoading: false, error: null, refresh: vi.fn() }) }))
vi.mock('../../auth/services/authService', () => ({ logoutAdmin: mocks.logoutAdmin }))
vi.mock('../../../services/languageStorage', async (importOriginal) => ({
  ...(await importOriginal()),
  getAdminLanguage: () => mocks.language.current,
}))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.language.current = 'en'
  mocks.logoutAdmin.mockResolvedValue({})
  localStorage.setItem('icpc_admin_token', 'local-test-token')
})

function renderProtected() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/dashboard" element={<ProtectedRoute><p>Today page</p></ProtectedRoute>} />
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('a signed-in account that is not staff', () => {
  it.each(['learner', 'expert'])('a %s sees Sign out, which clears the token and goes to the login', async (slug) => {
    mocks.user.current = { id: 9, name: 'Client', roles: [{ slug, permissions: [] }] }
    renderProtected()
    expect(screen.queryByRole('button', { name: /Go to Today/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    await waitFor(() => expect(screen.getByText('Login page')).toBeInTheDocument())
    expect(localStorage.getItem('icpc_admin_token')).toBeNull()
    expect(mocks.logoutAdmin).toHaveBeenCalled()
  })

  it('says it in Arabic', () => {
    mocks.language.current = 'ar'
    mocks.user.current = { id: 9, name: 'Client', roles: [{ slug: 'learner', permissions: [] }] }
    renderProtected()
    expect(screen.getByRole('button', { name: 'تسجيل الخروج' })).toBeInTheDocument()
  })

  it('lets staff through', () => {
    mocks.user.current = roleUser('trainer')
    renderProtected()
    expect(screen.getByText('Today page')).toBeInTheDocument()
  })
})

describe('staff without a screen\'s permission', () => {
  it('go back or to Today, with no Sign out', () => {
    render(<MemoryRouter><AccessDeniedPage /></MemoryRouter>)
    expect(screen.getByRole('button', { name: 'Go to Today' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go back' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument()
  })
})

describe('a deleted path', () => {
  it.each(['ar', 'en'])('leads back to Today in %s', (language) => {
    mocks.language.current = language
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>)
    expect(screen.getByRole('link', { name: language === 'ar' ? /العودة إلى اليوم/ : /Back to Today/ })).toHaveAttribute('href', '/dashboard')
    expect(document.body.textContent).not.toMatch(/ICPC system|نظام ICPC/)
  })
})
