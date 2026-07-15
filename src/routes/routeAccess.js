const permission = (slug) => ({ allPermissions: [slug] })
const anyPermission = (...slugs) => ({ anyPermissions: slugs })

export const routeAccess = Object.freeze({
  '/dashboard': null,
  '/users': permission('users.view'),
  '/users/wallet': permission('finance.manage'),
  '/programs': permission('programs.manage'),
  '/programs/edit': permission('programs.manage'),
  '/categories': permission('programs.manage'),
  '/lessons': permission('learning.manage'),
  '/lessons/edit': permission('learning.manage'),
  '/sections': permission('learning.manage'),
  '/sections/edit': permission('learning.manage'),
  '/quizzes': permission('learning.manage'),
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
  '/rpl/configuration': permission('rpl.settings.manage'),
  '/standards': permission('rpl.settings.manage'),
  '/assessors': permission('rpl.assignments.manage'),
  '/committees': permission('rpl.committee.decide'),
  '/quality': permission('rpl.quality.approve'),
  '/certificates': permission('certificates.view'),
  '/library': permission('library.manage'),
  '/support': permission('support.manage'),
  '/finance': anyPermission('finance.reports.view', 'finance.catalog.manage'),
  '/reports': anyPermission('applications.review', 'experts.view', 'cpd.review', 'audit.view'),
  '/notifications': null,
})

export function getRouteAccess(pathname) {
  if (!pathname) return undefined
  if (/^\/rpl\/applications\/[^/]+$/.test(pathname)) return routeAccess['/rpl/applications']
  if (/^\/rpl\/assessments\/[^/]+$/.test(pathname)) return routeAccess['/rpl/assessments']
  return routeAccess[pathname]
}
