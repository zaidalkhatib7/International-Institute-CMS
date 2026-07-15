import { useContext } from 'react'
import { AuthorizationContext } from './authorizationContext'

export function useAuthorization() {
  const context = useContext(AuthorizationContext)
  if (!context) throw new Error('useAuthorization must be used inside AuthorizationProvider.')
  return context
}
