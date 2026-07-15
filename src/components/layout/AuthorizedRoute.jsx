import AccessDeniedPage from '../../features/shared/pages/AccessDeniedPage'
import { useAuthorization } from '../../features/auth/context/useAuthorization'

export default function AuthorizedRoute({ access, children }) {
  const { canAccess } = useAuthorization()
  return canAccess(access) ? children : <AccessDeniedPage />
}
