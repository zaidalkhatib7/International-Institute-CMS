import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuthorization } from '../../features/auth/authorization'
import { AuthorizationContext } from '../../features/auth/context/authorizationContext'
import Can from '../../features/auth/components/Can'
import AuthorizedRoute from './AuthorizedRoute'

function renderWithAuthorization(user, content) {
  const authorization = createAuthorization(user)
  return render(
    <MemoryRouter>
      <AuthorizationContext.Provider value={{ ...authorization, isLoading: false, error: null, refresh: vi.fn() }}>
        {content}
      </AuthorizationContext.Provider>
    </MemoryRouter>
  )
}

describe('permission-aware CMS presentation', () => {
  beforeEach(() => localStorage.setItem('icpc_admin_language', 'en'))

  it('renders a localized 403 experience for a direct unauthorized route', () => {
    renderWithAuthorization(
      { roles: [{ slug: 'assessor', permissions: [{ slug: 'rpl.applications.view' }] }] },
      <AuthorizedRoute access={{ allPermissions: ['rpl.settings.manage'] }}>
        <p>Restricted configuration</p>
      </AuthorizedRoute>
    )

    expect(screen.getByRole('heading', { name: 'You do not have access' })).toBeInTheDocument()
    expect(screen.getByText('Status code 403')).toBeInTheDocument()
    expect(screen.queryByText('Restricted configuration')).not.toBeInTheDocument()
  })

  it('shows protected actions only when their permission is present', () => {
    renderWithAuthorization(
      { roles: [{ slug: 'support-agent', permissions: [{ slug: 'certificates.view' }] }] },
      <>
        <Can permission="certificates.view"><button type="button">View certificate</button></Can>
        <Can permission="certificates.manage"><button type="button">Revoke certificate</button></Can>
      </>
    )

    expect(screen.getByRole('button', { name: 'View certificate' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Revoke certificate' })).not.toBeInTheDocument()
  })
})
