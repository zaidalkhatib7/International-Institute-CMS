import { beforeEach, describe, expect, it } from 'vitest'
import { createAuthorization } from '../features/auth/authorization'
import { getNavigationItems } from './navigation'

describe('permission-aware navigation', () => {
  beforeEach(() => localStorage.setItem('icpc_admin_language', 'en'))

  it('shows an assessor only the workspaces backed by their permissions', () => {
    const authorization = createAuthorization({
      roles: [{
        slug: 'assessor',
        permissions: [
          { slug: 'rpl.applications.view' },
          { slug: 'rpl.evidence.view' },
          { slug: 'rpl.assessments.perform' },
          { slug: 'rpl.reports.submit' },
        ],
      }],
    })
    const paths = getNavigationItems(authorization.canAccess).map((item) => item.href)

    expect(paths).toEqual(expect.arrayContaining(['/dashboard', '/rpl/applications', '/rpl/evidence', '/rpl/assessments', '/settings']))
    expect(paths).not.toContain('/rpl/configuration')
    expect(paths).not.toContain('/finance')
    expect(paths).not.toContain('/users')
  })

  it('keeps every navigation workspace available to an administrator', () => {
    const authorization = createAuthorization({ role: 'admin' })
    const paths = getNavigationItems(authorization.canAccess).map((item) => item.href)

    expect(paths).toEqual(expect.arrayContaining(['/users', '/finance', '/rpl/configuration', '/ai-settings']))
  })

  it('does not require unrelated finance and reporting permissions from specialized operators', () => {
    const authorization = createAuthorization({
      roles: [{ slug: 'finance-operator', permissions: [{ slug: 'finance.reports.view' }] }],
    })
    const paths = getNavigationItems(authorization.canAccess).map((item) => item.href)

    expect(paths).toContain('/finance')
    expect(paths).not.toContain('/reports')
  })
})
