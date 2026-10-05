/**
 * The browser path for an in-app route, honouring the build's base path.
 *
 * React Router applies its `basename` to everything it navigates, so
 * `navigate('/login')` correctly becomes `/cms/login` in production. A raw
 * `window.location` call bypasses the router entirely. Under the production
 * build (VITE_BASE=/cms/) a hard-coded `'/login'` therefore leaves the CMS and
 * lands on the API host's own 404 page — which is exactly what an expired
 * session did, because the 401 handler is one of those raw calls.
 *
 * Use this for every navigation that cannot go through the router.
 *
 * BASE_URL is read at call time rather than captured at import, so tests can
 * stub it and the result always matches the build that is actually running.
 */
export function appPath(route = '') {
  const base = String(import.meta.env.BASE_URL || '/').replace(/\/+$/, '')
  const path = String(route).replace(/^\/+/, '')

  return `${base}/${path}`
}

/**
 * Whether the browser is currently on an in-app route.
 *
 * Compared without a trailing slash, because `/cms/login` and `/cms/login/`
 * are the same screen and a guard that misses one of them redirects forever.
 */
export function isOnAppPath(route, pathname = window.location.pathname) {
  const strip = (value) => String(value).replace(/\/+$/, '') || '/'

  return strip(pathname) === strip(appPath(route))
}
