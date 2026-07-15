import { describe, expect, it } from 'vitest'
import { createAuthorization, getUserPermissions, getUserRoles } from './authorization'

describe('CMS authorization', () => {
  it('normalizes Laravel role and nested permission payloads', () => {
    const user = {
      role: 'user',
      roles: [
        {
          slug: 'quality-reviewer',
          permissions: [{ slug: 'rpl.quality.approve' }, { name: 'AUDIT.VIEW' }],
        },
      ],
    }

    expect(getUserRoles(user)).toEqual(['user', 'quality-reviewer'])
    expect(getUserPermissions(user)).toEqual(['rpl.quality.approve', 'audit.view'])

    const authorization = createAuthorization(user)
    expect(authorization.isCmsOperator).toBe(true)
    expect(authorization.hasPermission('rpl.quality.approve')).toBe(true)
    expect(authorization.canAccess({ allPermissions: ['rpl.quality.approve', 'audit.view'] })).toBe(true)
    expect(authorization.canAccess({ allPermissions: ['rpl.committee.decide'] })).toBe(false)
  })

  it('preserves Laravel administrator permission bypass behavior', () => {
    const authorization = createAuthorization({ roles: [{ slug: 'super-admin', permissions: [] }] })

    expect(authorization.isAdministrator).toBe(true)
    expect(authorization.hasPermission('any.future.permission')).toBe(true)
    expect(authorization.canAccess({ allPermissions: ['rpl.settings.manage'] })).toBe(true)
  })

  it('requires every all-permission rule and at least one any-permission rule', () => {
    const authorization = createAuthorization({
      roles: [{ slug: 'assessor', permissions: [{ slug: 'rpl.applications.view' }] }],
    })

    expect(authorization.canAccess({ anyPermissions: ['rpl.applications.view', 'rpl.settings.manage'] })).toBe(true)
    expect(authorization.canAccess({ allPermissions: ['rpl.applications.view', 'rpl.evidence.view'] })).toBe(false)
  })

  it('does not treat a learner token as a CMS administrative session', () => {
    const authorization = createAuthorization({ roles: [{ slug: 'learner', permissions: [] }] })

    expect(authorization.isCmsOperator).toBe(false)
    expect(authorization.isAdministrator).toBe(false)
  })
})
