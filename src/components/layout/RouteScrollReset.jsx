import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function RouteScrollReset({ onRouteChange }) {
  const { pathname } = useLocation()

  useLayoutEffect(() => {
    onRouteChange?.()
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [onRouteChange, pathname])

  return null
}
