import { useCallback, useEffect, useMemo, useState } from 'react'
import { unwrapApiData } from '../../../services/apiResponse'
import { getAdminToken } from '../../../services/tokenStorage'
import { createAuthorization } from '../authorization'
import { fetchCurrentUser } from '../services/authService'
import { AuthorizationContext } from './authorizationContext'

function extractUser(payload) {
  const data = unwrapApiData(payload)
  return data?.user || data || null
}
export default function AuthorizationProvider({ children }) {
  const [state, setState] = useState({ user: null, isLoading: Boolean(getAdminToken()), error: null })

  const refresh = useCallback(async () => {
    if (!getAdminToken()) {
      setState({ user: null, isLoading: false, error: null })
      return null
    }

    setState((current) => ({ ...current, isLoading: true, error: null }))

    try {
      const payload = await fetchCurrentUser()
      const user = extractUser(payload)
      setState({ user, isLoading: false, error: null })
      return user
    } catch (error) {
      setState({ user: null, isLoading: false, error })
      return null
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    if (getAdminToken()) {
      fetchCurrentUser()
        .then((payload) => {
          if (!cancelled) setState({ user: extractUser(payload), isLoading: false, error: null })
        })
        .catch((error) => {
          if (!cancelled) setState({ user: null, isLoading: false, error })
        })
    }

    const handleAuthChange = () => refresh()
    window.addEventListener('icpc-auth-changed', handleAuthChange)
    return () => {
      cancelled = true
      window.removeEventListener('icpc-auth-changed', handleAuthChange)
    }
  }, [refresh])

  const authorization = useMemo(() => createAuthorization(state.user), [state.user])
  const value = useMemo(
    () => ({ ...authorization, isLoading: state.isLoading, error: state.error, refresh }),
    [authorization, refresh, state.error, state.isLoading]
  )

  return <AuthorizationContext.Provider value={value}>{children}</AuthorizationContext.Provider>
}
