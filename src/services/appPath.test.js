import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { appPath, isOnAppPath } from './appPath'

/*
 * WHY THIS EXISTS: production serves the CMS from /cms/, and a raw
 * window.location call ignores the router's basename. An expired session sent
 * the browser to https://icpc.glanzly-service.de/login — the API host's 404
 * page — because the 401 handler hard-coded '/login'. The page the owner landed
 * on said "404 Not Found" and offered no way back.
 *
 * The same source tree is also built with base '/' (Netlify, local dev), so
 * every assertion is made under BOTH bases: a fix that only works for one of
 * them is how this broke in the first place.
 */

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('appPath', () => {
  test('prefixes the /cms/ base, which is what production is built with', () => {
    vi.stubEnv('BASE_URL', '/cms/')

    expect(appPath('login')).toBe('/cms/login')
    expect(appPath('/dashboard')).toBe('/cms/dashboard')
  })

  test('stays at the root when the build has no base', () => {
    vi.stubEnv('BASE_URL', '/')

    expect(appPath('login')).toBe('/login')
    expect(appPath('/dashboard')).toBe('/dashboard')
  })

  test('never doubles a slash, whichever side carries it', () => {
    vi.stubEnv('BASE_URL', '/cms/')

    expect(appPath('//login')).toBe('/cms/login')
    expect(appPath('login')).not.toContain('//')
  })
})

describe('isOnAppPath', () => {
  test('recognises the login screen under /cms/, with or without a trailing slash', () => {
    vi.stubEnv('BASE_URL', '/cms/')

    expect(isOnAppPath('login', '/cms/login')).toBe(true)
    expect(isOnAppPath('login', '/cms/login/')).toBe(true)

    // The old guard compared against the bare '/login' — a path the login
    // screen never has under /cms/ — so it could not recognise this page.
    expect(isOnAppPath('login', '/login')).toBe(false)
    expect(isOnAppPath('login', '/cms/dashboard')).toBe(false)
  })
})

describe('the 401 handler', () => {
  const realLocation = window.location
  let assign

  beforeEach(() => {
    assign = vi.fn()
    delete window.location
    window.location = { ...realLocation, assign, pathname: '/cms/rpl/assessments/3' }
  })

  afterEach(() => {
    window.location = realLocation
  })

  async function rejectWith(status) {
    const { http } = await import('./http')
    const rejected = http.interceptors.response.handlers.at(-1).rejected

    await expect(rejected({ response: { status } })).rejects.toBeTruthy()
  }

  test('an expired session under /cms/ goes to /cms/login, not to the API 404', async () => {
    vi.stubEnv('BASE_URL', '/cms/')

    await rejectWith(401)

    expect(assign).toHaveBeenCalledTimes(1)
    expect(assign).toHaveBeenCalledWith('/cms/login')
    expect(assign).not.toHaveBeenCalledWith('/login')
  })

  test('an expired session on a root build goes to /login', async () => {
    vi.stubEnv('BASE_URL', '/')
    window.location.pathname = '/dashboard'

    await rejectWith(401)

    expect(assign).toHaveBeenCalledWith('/login')
  })

  test('a 401 while already on the login screen does not redirect it to itself', async () => {
    vi.stubEnv('BASE_URL', '/cms/')
    window.location.pathname = '/cms/login'

    await rejectWith(401)

    expect(assign).not.toHaveBeenCalled()
  })

  test('any other failure leaves the page where it is', async () => {
    vi.stubEnv('BASE_URL', '/cms/')

    await rejectWith(422)
    await rejectWith(500)

    expect(assign).not.toHaveBeenCalled()
  })
})
