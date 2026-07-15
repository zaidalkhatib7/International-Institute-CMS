import { useAuthorization } from '../context/useAuthorization'

export default function Can({ access, permission, anyPermissions, allPermissions, roles, fallback = null, children }) {
  const { canAccess } = useAuthorization()
  const rule = access || {
    ...(permission ? { allPermissions: [permission] } : {}),
    ...(anyPermissions ? { anyPermissions } : {}),
    ...(allPermissions ? { allPermissions } : {}),
    ...(roles ? { anyRoles: roles } : {}),
  }

  return canAccess(rule) ? children : fallback
}
