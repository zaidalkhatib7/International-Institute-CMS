import { beforeEach, describe, expect, it } from 'vitest'
import { createAuthorization } from '../features/auth/authorization'
import { SEEDED_ROLE_PERMISSIONS, permissionsUser, roleUser } from '../test/roleFixtures'
import {
  ROUTE_TITLE_PATTERNS,
  allNavigationLabels,
  allRouteTitleLabels,
  findActiveHref,
  getNavigationItems,
  getRouteTitle,
  getSidebarNavigation,
  navFromOf,
} from './navigation'
import { getRouteAccess, routeAccess } from './routeAccess'

/*
 * THE SIDEBAR PER ROLE (owner, 18 Oct 2026: "the side bar have too many
 * things"; PLATFORM-JOURNEY-SPEC §2.3 and §9.1).
 *
 * Every seeded role's rows, in order, are pinned exactly; a row never shows what
 * its route refuses; names are unique per language and Arabic names carry no
 * RPL, API or CMS; and exactly one row is active on each page.
 */

const hrefs = (user, ctx = {}) => getNavigationItems(createAuthorization(user).canAccess, { language: 'en', ...ctx }).map((item) => item.href)

const ADMIN_ROWS = [
  '/dashboard', '/users/website',
  '/rpl/applications', '/rpl/payments', '/rpl/experience-certificates', '/rpl/attention',
  '/academic-rpl/applications',
  '/programs', '/competency-gap-library', '/academic-rpl/library', '/content/course', '/quizzes', '/ai-settings',
  '/finance', '/certificates',
  '/support', '/library',
  '/rpl/configuration', '/academic-rpl/framework', '/users',
]
const PREFLOW_ROWS = ['/rpl/assessments', '/rpl/accreditation', '/quality', '/rpl/appeals']

const ROLE_ROWS = {
  'content-admin': ['/dashboard', '/programs', '/competency-gap-library', '/library'],
  trainer: ['/dashboard', '/ai-settings'],
  assessor: ['/dashboard', '/rpl/applications', '/academic-rpl/applications', '/academic-rpl/framework', '/rpl/assessments'],
  'quality-reviewer': ['/dashboard', '/rpl/applications', '/academic-rpl/applications', '/certificates', '/academic-rpl/framework', '/rpl/assessments', '/quality'],
  'finance-operator': ['/dashboard', '/users/website', '/rpl/payments', '/finance'],
  'support-agent': ['/dashboard', '/users/website', '/certificates', '/support'],
  'committee-member': ['/dashboard', '/rpl/applications', '/academic-rpl/applications', '/academic-rpl/framework', '/rpl/assessments', '/rpl/accreditation'],
  'appeal-reviewer': ['/dashboard', '/rpl/applications', '/academic-rpl/applications', '/academic-rpl/framework', '/rpl/assessments', '/rpl/appeals'],
}

beforeEach(() => localStorage.setItem('icpc_admin_language', 'en'))

describe('the rows of every seeded role (§2.3)', () => {
  it.each(['admin', 'super-admin'])('%s sees 20 rows without pre-flow work, Exchange rate inside Finance', (slug) => {
    expect(hrefs(roleUser(slug))).toEqual(ADMIN_ROWS)
    expect(hrefs(roleUser(slug), { preflowWork: 0 })).toHaveLength(20)
  })

  it('an administrator sees the pre-flow group last while pre-flow work exists (24 rows)', () => {
    expect(hrefs(roleUser('admin'), { preflowWork: 3 })).toEqual([...ADMIN_ROWS, ...PREFLOW_ROWS])
  })

  it.each(Object.entries(ROLE_ROWS))('%s sees exactly its rows, in order', (slug, rows) => {
    expect(hrefs(roleUser(slug))).toEqual(rows)
  })

  it('a role holding only rpl.payments.reconcile sees Today, Payments to confirm and Exchange rate', () => {
    expect(hrefs(permissionsUser(['rpl.payments.reconcile']))).toEqual(['/dashboard', '/rpl/payments', '/finance/exchange-rate'])
  })

  it('names the professional path group and the academic group, each with a case list of its own name', () => {
    const groups = getSidebarNavigation(createAuthorization(roleUser('admin')).canAccess, { language: 'ar' })
    expect(groups.find((group) => group.key === 'professional').label).toBe('مسار الاعتراف المهني بالتعلم السابق')
    const names = groups.flatMap((group) => group.items).map((item) => item.name)
    expect(names).toContain('طلبات المسار المهني')
    expect(names).toContain('طلبات المسار الأكاديمي')
  })
})

describe('a nav rule can only hide (§2.2)', () => {
  const viewers = [roleUser('admin'), ...Object.keys(SEEDED_ROLE_PERMISSIONS).map((slug) => roleUser(slug)), permissionsUser(['rpl.payments.reconcile']), permissionsUser(['learning.manage'])]

  it.each(viewers.map((user) => [user.roles[0].slug, user]))('every row %s sees passes its route rule', (_, user) => {
    const authorization = createAuthorization(user)
    for (const item of getNavigationItems(authorization.canAccess, { preflowWork: 5, filtering: true })) {
      expect(authorization.canAccess(getRouteAccess(item.href))).toBe(true)
    }
  })

  it.each(['finance.exchange_rates.manage', 'finance.manage', 'finance.reports.view', 'finance.catalog.manage', 'rpl.payments.reconcile'])('a holder of %s reaches the exchange rate by a row or the Finance tab', (permission) => {
    const rows = hrefs(permissionsUser([permission]))
    expect(rows.includes('/finance') || rows.includes('/finance/exchange-rate')).toBe(true)
  })

  it('never shows the exchange rate to a role without a finance or payment permission', () => {
    expect(hrefs(permissionsUser(['users.view']))).not.toContain('/finance/exchange-rate')
    expect(getRouteAccess('/finance/exchange-rate')).toEqual({ anyPermissions: ['finance.exchange_rates.manage', 'finance.manage', 'finance.reports.view', 'finance.catalog.manage', 'rpl.payments.reconcile'] })
  })
})

describe('the pre-flow group (§2.2 rule 6)', () => {
  const admin = createAuthorization(roleUser('admin')).canAccess
  const keys = (ctx) => getSidebarNavigation(admin, { language: 'en', ...ctx }).map((group) => group.key)

  it('hides for an administrator with no pre-flow work, and shows with some', () => {
    expect(keys({ preflowWork: 0 })).not.toContain('preflow')
    expect(keys({ preflowWork: 1 })).toContain('preflow')
  })

  it('stays while the administrator is on one of its pages, and while filtering', () => {
    expect(keys({ pathname: '/quality' })).toContain('preflow')
    expect(keys({ pathname: '/rpl/assessments/9' })).toContain('preflow')
    expect(keys({ filtering: true })).toContain('preflow')
    expect(keys({ pathname: '/rpl/applications' })).not.toContain('preflow')
  })

  it('always shows for a role without the screening decision', () => {
    expect(getSidebarNavigation(createAuthorization(roleUser('committee-member')).canAccess, { preflowWork: 0 }).map((group) => group.key)).toContain('preflow')
  })
})

describe('labels (§6.7)', () => {
  it('names every row once per language', () => {
    for (const language of ['ar', 'en']) {
      const names = getNavigationItems(createAuthorization(roleUser('admin')).canAccess, { language, preflowWork: 1 }).map((item) => item.name)
      names.push(...getNavigationItems(createAuthorization(permissionsUser(['rpl.payments.reconcile'])).canAccess, { language }).map((item) => item.name).filter((name) => !names.includes(name)))
      expect(new Set(names).size).toBe(names.length)
    }
  })

  it('gives every label Arabic and English, no Latin RPL, API or CMS in Arabic, and no Dutch', () => {
    for (const label of [...allNavigationLabels(), ...allRouteTitleLabels()]) {
      expect(label.ar?.trim()).toBeTruthy()
      expect(label.en?.trim()).toBeTruthy()
      expect(label.ar).not.toMatch(/RPL|API|CMS/)
      expect(label).not.toHaveProperty('nl')
    }
  })
})

describe('one active row (§2.2 rule 2)', () => {
  const items = getNavigationItems(createAuthorization(roleUser('admin')).canAccess, { language: 'en', preflowWork: 1 })

  it.each([
    ['/users/onsite', '/users/website'],
    ['/users/12', '/users/website'],
    ['/users/7/wallet', '/users/website'],
    ['/users', '/users'],
    ['/finance/exchange-rate', '/finance'],
    ['/rpl/applications/abc', '/rpl/applications'],
    ['/rpl/evidence', '/rpl/applications'],
    ['/rpl/source-of-truth', '/rpl/configuration'],
    ['/quizzes/edit', '/quizzes'],
    ['/assessors', '/rpl/assessments'],
    ['/academic-rpl/diagnostics/4', '/academic-rpl/applications'],
    ['/dashboard', '/dashboard'],
  ])('%s makes %s the active row', (pathname, active) => {
    expect(findActiveHref(pathname, items)).toBe(active)
  })

  it('makes the exchange rate its own row for a viewer who has the row', () => {
    const own = getNavigationItems(createAuthorization(permissionsUser(['rpl.payments.reconcile'])).canAccess, {})
    expect(findActiveHref('/finance/exchange-rate', own)).toBe('/finance/exchange-rate')
  })

  it('leaves a page under no row with no active row', () => {
    expect(findActiveHref('/nowhere', items)).toBeNull()
  })

  it('keeps the row a page was opened from active (navFrom), only among the rows the viewer sees', () => {
    // A case's full assessment page stays under Professional cases; a staff member's page under Staff & roles.
    expect(findActiveHref('/rpl/assessments/77', items, '/rpl/applications')).toBe('/rpl/applications')
    expect(findActiveHref('/users/12', items, '/users')).toBe('/users')
    // An exact row still wins, and a row the viewer lacks is never picked.
    expect(findActiveHref('/finance', items, '/users')).toBe('/finance')
    const support = getNavigationItems(createAuthorization(roleUser('support-agent')).canAccess, { language: 'en' })
    expect(findActiveHref('/users/12', support, '/users')).toBe('/users/website')
    expect(navFromOf({ state: { navFrom: '/users' } })).toBe('/users')
    expect(navFromOf({ state: { navFrom: 'https://elsewhere' } })).toBeNull()
    expect(navFromOf({ state: null })).toBeNull()
  })

  it('does not open the pre-flow group for an assessment opened from a case', () => {
    const groups = getSidebarNavigation(createAuthorization(roleUser('admin')).canAccess, { language: 'en', preflowWork: 0, pathname: '/rpl/assessments/77', navFrom: '/rpl/applications' })
    expect(groups.map((group) => group.key)).not.toContain('preflow')
    const direct = getSidebarNavigation(createAuthorization(roleUser('admin')).canAccess, { language: 'en', preflowWork: 0, pathname: '/rpl/assessments/77' })
    expect(direct.map((group) => group.key)).toContain('preflow')
  })
})

describe('route titles (§4.7)', () => {
  it.each(ROUTE_TITLE_PATTERNS.map((pattern) => [pattern]))('%s has a title in Arabic and English', (pattern) => {
    const path = pattern.replace(':id', '42')
    expect(getRouteTitle(path, 'ar')).toBeTruthy()
    expect(getRouteTitle(path, 'en')).toBeTruthy()
    expect(getRouteTitle(path, 'en')).not.toBe('Today')
  })

  it('names a case, a client and the fallback', () => {
    expect(getRouteTitle('/rpl/applications/abc', 'ar')).toBe('ملف طلب')
    expect(getRouteTitle('/users/12', 'en')).toBe('Client')
    expect(getRouteTitle('/users/12', 'en', '/users')).toBe('Staff member')
    expect(getRouteTitle('/users/12', 'ar', '/users')).toBe('ملف الموظف')
    expect(getRouteTitle('/users/website', 'en')).toBe('Today')
    expect(getRouteTitle('/settings', 'ar')).toBe('إعداداتي')
    expect(getRouteTitle('/anything', 'ar')).toBe('اليوم')
  })
})

describe('route rules (§3.3)', () => {
  it('asks both learning.manage and programs.manage of the pages that read the programmes', () => {
    for (const path of ['/content/course', '/quizzes', '/quizzes/bank', '/sections', '/sections/edit']) {
      expect(getRouteAccess(path)).toEqual({ allPermissions: ['learning.manage', 'programs.manage'] })
    }
    for (const path of ['/lessons', '/lessons/edit', '/quizzes/units', '/quizzes/edit']) {
      expect(getRouteAccess(path)).toEqual({ allPermissions: ['learning.manage'] })
    }
  })

  it('guards the pages under a list by the read each makes', () => {
    expect(getRouteAccess('/users/12')).toEqual({ allPermissions: ['users.view'] })
    expect(getRouteAccess('/users/website')).toEqual({ allPermissions: ['users.view'] })
    expect(getRouteAccess('/academic-rpl/applications/abc')).toEqual({ allPermissions: ['rpl.applications.view'] })
    expect(getRouteAccess('/academic-rpl/diagnostics/7')).toEqual({ allPermissions: ['rpl.applications.manage'] })
    expect(getRouteAccess('/users/12/wallet')).toEqual({ allPermissions: ['finance.manage'] })
  })

  it('has no rule for the six deleted screens', () => {
    for (const path of ['/content/architecture', '/content/pages', '/content/news', '/content/experts', '/reports', '/notifications']) {
      expect(routeAccess).not.toHaveProperty(path)
    }
  })
})
