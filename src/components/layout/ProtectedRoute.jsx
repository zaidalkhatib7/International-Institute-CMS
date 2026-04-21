import { Navigate } from 'react-router-dom'
import { hasAdminToken } from '../../services/tokenStorage'

/**
 * A wrapper component that checks for an admin token.
 * If no token is found, it redirects to the login page.
 */
export default function ProtectedRoute({ children }) {
  if (!hasAdminToken()) {
    // Redirect them to /login if they are not logged in
    return <Navigate to="/login" replace />
  }

  return children
}