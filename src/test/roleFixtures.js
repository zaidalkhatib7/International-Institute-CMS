import { createAuthorization } from '../features/auth/authorization'

/*
 * THE SEEDED STAFF ROLES (copied from the API's AccessControlSeeder, 18 Oct 2026,
 * with A4 applied: finance-operator gains users.view). The navigation, Today and
 * guard tests run every role through the same permissions the server holds.
 */
export const SEEDED_ROLE_PERMISSIONS = Object.freeze({
  'content-admin': ['content.manage', 'programs.manage', 'media.manage', 'library.manage'],
  trainer: ['learning.manage', 'assignments.grade', 'discussions.moderate', 'library.restricted'],
  assessor: ['applications.review', 'assignments.grade', 'library.restricted', 'rpl.applications.view', 'rpl.evidence.view', 'rpl.assessments.perform', 'rpl.reports.submit'],
  'quality-reviewer': ['quality.review', 'audit.view', 'certificates.view', 'library.restricted', 'rpl.applications.view', 'rpl.evidence.view', 'rpl.quality.approve', 'rpl.audit.view'],
  'finance-operator': ['finance.manage', 'finance.catalog.manage', 'finance.reports.view', 'rpl.payments.reconcile', 'users.view'],
  'support-agent': ['users.view', 'support.manage', 'consultations.manage', 'certificates.view'],
  'committee-member': ['library.restricted', 'rpl.applications.view', 'rpl.evidence.view', 'rpl.committee.decide'],
  'appeal-reviewer': ['library.restricted', 'rpl.applications.view', 'rpl.evidence.view', 'rpl.appeals.review'],
})

/** The user payload of one seeded role (admin and super-admin hold every permission by role). */
export function roleUser(slug, extra = {}) {
  if (slug === 'admin' || slug === 'super-admin') return { id: 1, name: 'Staff Admin', role: slug, roles: [{ slug }], ...extra }
  const permissions = SEEDED_ROLE_PERMISSIONS[slug] || []
  return { id: 2, name: `Staff ${slug}`, roles: [{ slug, permissions: permissions.map((permission) => ({ slug: permission })) }], ...extra }
}

/** A user holding exactly these permissions under a custom operator role. */
export function permissionsUser(permissions, slug = 'support-agent') {
  return { id: 3, name: 'Custom', roles: [{ slug, permissions: permissions.map((permission) => ({ slug: permission })) }] }
}

export function roleAuthorization(slug) {
  return createAuthorization(roleUser(slug))
}
