import { beforeEach, describe, expect, it } from 'vitest'
import { createAuthorization } from '../features/auth/authorization'
import { getNavigationItems } from './navigation'
import { getRouteAccess } from './routeAccess'

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
    expect(paths).not.toContain('/finance/exchange-rate')
    expect(paths).not.toContain('/users')
  })

  it('keeps every navigation workspace available to an administrator', () => {
    const authorization = createAuthorization({ role: 'admin' })
    const paths = getNavigationItems(authorization.canAccess).map((item) => item.href)

    expect(paths).toEqual(expect.arrayContaining(['/users', '/finance', '/rpl/configuration', '/ai-settings', '/competency-gap-library', '/finance/exchange-rate']))
  })

  it('does not require unrelated finance and reporting permissions from specialized operators', () => {
    const authorization = createAuthorization({
      roles: [{ slug: 'finance-operator', permissions: [{ slug: 'finance.reports.view' }] }],
    })
    const paths = getNavigationItems(authorization.canAccess).map((item) => item.href)

    expect(paths).toContain('/finance')
    expect(paths).toContain('/finance/exchange-rate')
    expect(paths).not.toContain('/reports')
  })
})

describe('the exchange rate (owner decisions of 17 Oct 2026)', () => {
  beforeEach(() => localStorage.setItem('icpc_admin_language', 'en'))

  it('is read by every finance and payment role, the payments reconciler included, and by no one else', () => {
    const paths = (permissions) => getNavigationItems(createAuthorization({ roles: [{ slug: 'custom', permissions: permissions.map((slug) => ({ slug })) }] }).canAccess).map((item) => item.href)

    for (const permission of ['finance.exchange_rates.manage', 'finance.manage', 'finance.reports.view', 'finance.catalog.manage', 'rpl.payments.reconcile']) {
      expect(paths([permission])).toContain('/finance/exchange-rate')
    }
    expect(paths(['users.view'])).not.toContain('/finance/exchange-rate')
    expect(getRouteAccess('/finance/exchange-rate')).toEqual({ anyPermissions: ['finance.exchange_rates.manage', 'finance.manage', 'finance.reports.view', 'finance.catalog.manage', 'rpl.payments.reconcile'] })
  })

  it('keeps a client\'s balances to finance.manage, by id in the path', () => {
    expect(getRouteAccess('/users/12/wallet')).toEqual({ allPermissions: ['finance.manage'] })
    expect(getRouteAccess('/users/wallet')).toBeUndefined()
  })
})
