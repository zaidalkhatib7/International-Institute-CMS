const permission = (slug) => ({ allPermissions: [slug] })
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
  '/sections': permission('learning.manage'),
  '/sections/edit': permission('learning.manage'),
  '/quizzes': permission('learning.manage'),
  '/quizzes/bank': permission('learning.manage'),
  '/quizzes/units': permission('learning.manage'),
  '/content/course': permission('learning.manage'),
  '/quizzes/edit': permission('learning.manage'),
  '/ai-settings': permission('learning.manage'),
  '/settings': null,
  '/content/architecture': permission('content.manage'),
  '/content/pages': permission('content.manage'),
  '/content/news': permission('content.manage'),
  '/content/experts': anyPermission('experts.view', 'experts.manage', 'consultations.manage'),
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
  '/reports': anyPermission('applications.review', 'experts.view', 'cpd.review', 'audit.view'),
  '/notifications': null,
})

export function getRouteAccess(pathname) {
  if (!pathname) return undefined
  if (/^\/rpl\/applications\/[^/]+$/.test(pathname)) return routeAccess['/rpl/applications']
  if (/^\/rpl\/assessments\/[^/]+$/.test(pathname)) return routeAccess['/rpl/assessments']
  if (/^\/users\/[^/]+\/wallet$/.test(pathname)) return routeAccess['/users/:id/wallet']
  return routeAccess[pathname]
}
