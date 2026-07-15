const ADMINISTRATOR_ROLES = new Set(['admin', 'super-admin'])
const CMS_OPERATOR_ROLES = new Set([
  'admin',
  'super-admin',
  'content-admin',
  'trainer',
  'assessor',
  'quality-reviewer',
  'finance-operator',
  'support-agent',
  'committee-member',
  'appeal-reviewer',
])

function normalizeSlug(value) {
  if (typeof value === 'string') return value.trim().toLowerCase()
  if (!value || typeof value !== 'object') return ''
  return String(value.slug || value.name || '').trim().toLowerCase()
}

function uniqueSlugs(values = []) {
  return [...new Set(values.map(normalizeSlug).filter(Boolean))]
}

export function getUserRoles(user) {
  return uniqueSlugs([
    user?.role,
    ...(Array.isArray(user?.roles) ? user.roles : []),
  ])
}

export function getUserPermissions(user) {
  const directPermissions = Array.isArray(user?.permissions) ? user.permissions : []
  const rolePermissions = (Array.isArray(user?.roles) ? user.roles : [])
    .flatMap((role) => (Array.isArray(role?.permissions) ? role.permissions : []))

  return uniqueSlugs([...directPermissions, ...rolePermissions])
}

export function createAuthorization(user) {
  const roles = getUserRoles(user)
  const permissions = getUserPermissions(user)
  const roleSet = new Set(roles)
  const permissionSet = new Set(permissions)
  const isAdministrator = roles.some((role) => ADMINISTRATOR_ROLES.has(role))
  const isCmsOperator = roles.some((role) => CMS_OPERATOR_ROLES.has(role))

  const hasRole = (role) => isAdministrator || roleSet.has(normalizeSlug(role))
  const hasPermission = (permission) =>
    isAdministrator || permissionSet.has(normalizeSlug(permission))

  const canAccess = (rule) => {
    if (!rule) return true
    if (!user) return false
    if (isAdministrator) return true

    const allPermissions = uniqueSlugs(rule.allPermissions || [])
    const anyPermissions = uniqueSlugs(rule.anyPermissions || [])
    const anyRoles = uniqueSlugs(rule.anyRoles || [])

    if (allPermissions.length && !allPermissions.every((permission) => permissionSet.has(permission))) {
      return false
    }

    if (anyPermissions.length && !anyPermissions.some((permission) => permissionSet.has(permission))) {
      return false
    }

    if (anyRoles.length && !anyRoles.some((role) => roleSet.has(role))) {
      return false
    }

    return true
  }

  return {
    user,
    roles,
    permissions,
    isAdministrator,
    isCmsOperator,
    hasRole,
    hasPermission,
    canAccess,
  }
}
