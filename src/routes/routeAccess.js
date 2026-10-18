const permission = (slug) => ({ allPermissions: [slug] })
const allPermissions = (...slugs) => ({ allPermissions: slugs })
const anyPermission = (...slugs) => ({ anyPermissions: slugs })

export const routeAccess = Object.freeze({
  '/dashboard': null,
  '/users': permission('users.view'),
  // A client's balances: top up or deduct (owner, 17 Oct 2026). The path carries the id only, never a name.
  '/users/:id/wallet': permission('finance.manage'),
  '/programs': permission('programs.manage'),
  '/competency-gap-library': permission('programs.manage'),
  // A missing key means canAccess() returns true, so an operator without the
  // permission reaches the page and meets a raw 403 panel from the API rather
  // than the Access-denied screen. These five had no rule at all.
  '/academic-rpl/applications': permission('rpl.applications.view'),
  '/academic-rpl/framework': permission('rpl.applications.view'),
  '/academic-rpl/library': permission('rpl.settings.manage'),
  '/users/website': permission('users.view'),
  '/users/onsite': permission('users.view'),
  '/programs/edit': permission('programs.manage'),
  '/categories': permission('programs.manage'),
  '/lessons': permission('learning.manage'),
  '/lessons/edit': permission('learning.manage'),
  // These read the programmes (GET /admin/programs is programs.manage), so they need both (§3.3).
  '/sections': allPermissions('learning.manage', 'programs.manage'),
  '/sections/edit': allPermissions('learning.manage', 'programs.manage'),
  '/quizzes': allPermissions('learning.manage', 'programs.manage'),
  '/quizzes/bank': allPermissions('learning.manage', 'programs.manage'),
  '/quizzes/units': permission('learning.manage'),
  '/content/course': allPermissions('learning.manage', 'programs.manage'),
  '/quizzes/edit': permission('learning.manage'),
  '/ai-settings': permission('learning.manage'),
  '/settings': null,
  '/rpl/applications': permission('rpl.applications.view'),
  '/rpl/evidence': permission('rpl.evidence.view'),
  '/rpl/assessments': permission('rpl.applications.view'),
  '/rpl/accreditation': permission('rpl.committee.decide'),
  '/rpl/appeals': permission('rpl.appeals.review'),
  // After the entry quiz (owner model of 15 Oct 2026, P6): each queue is its permission's (S1, S7, S17).
  '/rpl/payments': permission('rpl.payments.reconcile'),
  '/rpl/experience-certificates': permission('rpl.experience_certificates.approve'),
  '/rpl/attention': permission('rpl.applications.view'),
  '/rpl/configuration': permission('rpl.settings.manage'),
  '/rpl/source-of-truth': permission('rpl.settings.manage'),
  '/assessors': permission('rpl.assignments.manage'),
  '/quality': permission('rpl.quality.approve'),
  '/certificates': permission('certificates.view'),
  '/library': permission('library.manage'),
  '/support': permission('support.manage'),
  '/finance': anyPermission('finance.reports.view', 'finance.catalog.manage'),
  // The USD -> SYP rate (owner, 17 Oct 2026): read by every finance and payment role; only the owner's role sets it (the panel decides).
  '/finance/exchange-rate': anyPermission('finance.exchange_rates.manage', 'finance.manage', 'finance.reports.view', 'finance.catalog.manage', 'rpl.payments.reconcile'),
  // The pages under a list, by id (§3.3): each follows the API read it makes.
  '/users/:id': permission('users.view'),
  '/academic-rpl/applications/:id': permission('rpl.applications.view'),
  '/academic-rpl/diagnostics/:id': permission('rpl.applications.manage'),
})

export function getRouteAccess(pathname) {
  if (!pathname) return undefined
  if (Object.prototype.hasOwnProperty.call(routeAccess, pathname)) return routeAccess[pathname]
  if (/^\/rpl\/applications\/[^/]+$/.test(pathname)) return routeAccess['/rpl/applications']
  if (/^\/rpl\/assessments\/[^/]+$/.test(pathname)) return routeAccess['/rpl/assessments']
  if (/^\/users\/[^/]+\/wallet$/.test(pathname)) return routeAccess['/users/:id/wallet']
  if (/^\/users\/[^/]+$/.test(pathname)) return routeAccess['/users/:id']
  if (/^\/academic-rpl\/applications\/[^/]+$/.test(pathname)) return routeAccess['/academic-rpl/applications/:id']
  if (/^\/academic-rpl\/diagnostics\/[^/]+$/.test(pathname)) return routeAccess['/academic-rpl/diagnostics/:id']
  return undefined
}
