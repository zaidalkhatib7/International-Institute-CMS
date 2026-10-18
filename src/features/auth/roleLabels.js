/*
 * THE STAFF ROLES BY NAME, IN ARABIC AND ENGLISH (walk of 18 Oct 2026).
 *
 * The API names a role from its slug in English only ("Finance Operator"), so the
 * Arabic platform showed English in its top bar. The platform names the roles it
 * knows by slug; a role it does not know keeps the API's own name (or its slug).
 */

const L = (ar, en) => Object.freeze({ ar, en })

export const ROLE_LABELS = Object.freeze({
  'super-admin': L('المدير الأعلى', 'Super administrator'),
  admin: L('مدير المنصة', 'Administrator'),
  'content-admin': L('مدير المحتوى', 'Content administrator'),
  trainer: L('مدرّب', 'Trainer'),
  assessor: L('مقيّم', 'Assessor'),
  'quality-reviewer': L('مراجع الجودة', 'Quality reviewer'),
  'finance-operator': L('موظف المالية', 'Finance operator'),
  'support-agent': L('موظف الدعم', 'Support agent'),
  'committee-member': L('عضو اللجنة', 'Committee member'),
  'appeal-reviewer': L('مراجع التظلمات', 'Appeal reviewer'),
  expert: L('خبير', 'Expert'),
})

function slugOf(role) {
  if (typeof role === 'string') return role.trim().toLowerCase()
  return String(role?.slug || '').trim().toLowerCase()
}

/** The role's name in the interface language; '' when there is no role at all. */
export function roleLabel(role, language) {
  if (!role) return ''
  const lang = language === 'ar' ? 'ar' : 'en'
  const known = ROLE_LABELS[slugOf(role)]
  if (known) return known[lang]
  if (typeof role === 'string') return role
  const name = role.name
  if (name && typeof name === 'object') return name[lang] || name.en || name.ar || role.slug || ''
  return name || role.slug || ''
}
