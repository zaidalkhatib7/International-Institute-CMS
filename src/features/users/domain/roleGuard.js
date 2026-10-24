import { readApiError } from '../../../services/apiResponse'

/*
 * THE ROLE GUARD, MIRRORED (owner report of 24 Oct 2026: an administrator could
 * make themselves super administrator, then approve the certificate wording and
 * the exchange rates that only the owner's role may approve).
 *
 * The server decides every role change (RoleAssignmentGuard): a role is granted
 * or removed only by someone who holds every permission it carries; the super
 * administrator role only by a super administrator; nobody changes their own
 * roles; nobody changes, edits or deletes an account that holds a permission
 * they lack; and the last super administrator keeps the role. The platform only
 * mirrors that answer, so it never offers a change the server will refuse:
 *
 *   GET /admin/roles?user_id=N   each role carries `grantable` and
 *                                `grant_refusal` {reason_code, message {ar, en},
 *                                missing_permissions}; `assignment` says whether
 *                                that account's roles may be changed at all
 *                                (target_editable, target_refusal).
 *
 *   A refused change (PUT /admin/users/{id}/roles, POST /admin/users,
 *   PUT and DELETE /admin/users/{id}, the erase) answers 403, or 422 for the last
 *   super administrator, with message_label {ar, en} and reason_code. The
 *   platform says the server's own sentence in the reader's language.
 *
 *   THE E-MAIL ADDRESS (Release I review). It is the key to an account's
 *   password, so on another account that holds any permission only a super
 *   administrator changes it (an administrator could otherwise take a peer's
 *   account). `assignment.target_email_editable` and `target_email_refusal` say
 *   so before the form offers the field.
 */

export const ROLE_GUARD_CODES = Object.freeze([
  'role_change_own_account',
  'role_grant_needs_management_through_a_role',
  'role_carries_permission_actor_lacks',
  'super_admin_role_needs_super_admin',
  'account_holds_permission_actor_lacks',
  'last_super_admin',
  'staff_email_change_needs_super_admin',
])

/** The server's sentences (RoleAssignmentGuard::MESSAGES), used when a response carries none. */
export const ROLE_GUARD_COPY = {
  ar: {
    role_change_own_account: 'لا يمكن لأحد تغيير أدواره بنفسه. يجب أن يجري هذا التغيير مسؤول آخر.',
    role_grant_needs_management_through_a_role: 'منح الأدوار يتطلب صلاحية الإدارة من خلال أحد أدوارك، ولا يمنحها وصول الطوارئ المؤقت.',
    role_carries_permission_actor_lacks: 'لا يمكنك منح دور أو سحبه إلا إذا كنت تملك كل الصلاحيات التي يتضمنها.',
    super_admin_role_needs_super_admin: 'لا يمنح دور المدير الأعلى أو يسحبه إلا مدير أعلى.',
    account_holds_permission_actor_lacks: 'يملك هذا الحساب صلاحيات لا تملكها، فلا يغيّره إلا من يملكها جميعًا.',
    last_super_admin: 'هذا آخر مدير أعلى في المنصة. امنح دور المدير الأعلى لحساب آخر أولًا.',
    staff_email_change_needs_super_admin: 'البريد الإلكتروني هو مفتاح كلمة مرور الحساب، فلا يغيّره في حساب يملك صلاحيات إلا مدير أعلى.',
  },
  en: {
    role_change_own_account: 'Nobody can change their own roles. Another administrator has to make this change.',
    role_grant_needs_management_through_a_role: 'Granting roles needs the management permission through one of your roles. Emergency (break-glass) access does not give it.',
    role_carries_permission_actor_lacks: 'You can grant or remove a role only when you hold every permission it carries.',
    super_admin_role_needs_super_admin: 'Only a super administrator can grant or remove the super administrator role.',
    account_holds_permission_actor_lacks: 'This account holds permissions you do not hold. Only someone who holds all of them can change it.',
    last_super_admin: 'This is the last super administrator. Make another account super administrator first.',
    staff_email_change_needs_super_admin: "The e-mail address is the key to the account's password. Only a super administrator can change it on an account that holds permissions.",
  },
}

function lang(language) {
  return language === 'ar' ? 'ar' : 'en'
}

function labelIn(label, language) {
  if (!label || typeof label !== 'object') return ''
  const text = label[language] || label.en || label.ar
  return typeof text === 'string' ? text.trim() : ''
}

/**
 * A refusal object of GET /admin/roles (grant_refusal or target_refusal) in
 * words: the server's message in the reader's language, else the platform's copy
 * of it, else '' (nothing to say).
 */
export function refusalText(refusal, language) {
  if (!refusal || typeof refusal !== 'object') return ''
  const lng = lang(language)
  return labelIn(refusal.message, lng) || ROLE_GUARD_COPY[lng][refusal.reason_code] || ''
}

/** The role guard's refusal of a request in words, or null when the error is not one. */
export function roleGuardRefusal(error, language) {
  const status = Number(error?.response?.status)
  if (status !== 403 && status !== 422) return null
  const data = error?.response?.data || {}
  if (!ROLE_GUARD_CODES.includes(data.reason_code)) return null
  const lng = lang(language)
  return labelIn(data.message_label, lng) || ROLE_GUARD_COPY[lng][data.reason_code] || null
}

/** The error of a request that may meet the role guard: its refusal when it is one, else the usual reading. */
export function readUserActionError(error, fallback, language) {
  return roleGuardRefusal(error, language) || readApiError(error, fallback, language)
}

/** A role the server lets this actor tick or untick. An answer without the field (an older server) does not lock it. */
export function isGrantable(role) {
  return role?.grantable !== false
}

/** Whether the account's roles are closed to this actor, and the sentence that says why ('' when they are open). */
export function assignmentLock({ assignment, ownAccount = false, language }) {
  const lng = lang(language)
  if (assignment?.target_editable === false) {
    return refusalText(assignment.target_refusal, lng) || ROLE_GUARD_COPY[lng].account_holds_permission_actor_lacks
  }
  // One's own account is closed whatever an older server says: rule 2 is the server's, and this only mirrors it.
  if (ownAccount) return ROLE_GUARD_COPY[lng].role_change_own_account
  return ''
}

/** The account itself (edit, delete, erase) is closed to this actor when it holds a permission the actor lacks. */
export function accountLock(assignment, language) {
  const refusal = assignment?.target_refusal
  if (refusal?.reason_code !== 'account_holds_permission_actor_lacks') return ''
  return refusalText(refusal, language)
}

/**
 * The account's e-mail address is closed to this actor (it holds permissions and
 * the actor is not a super administrator): the sentence that says why, or ''.
 * An answer without the field (an older server) does not lock it.
 */
export function emailLock(assignment, language) {
  if (assignment?.target_email_editable !== false) return ''
  const lng = lang(language)
  return refusalText(assignment.target_email_refusal, lng) || ROLE_GUARD_COPY[lng].staff_email_change_needs_super_admin
}

/*
 * A NEW ACCOUNT'S ROLE (POST /admin/users accepts student, trainer or admin and
 * gives the learner, trainer or admin role). The new account's role is a grant
 * like any other, so the form offers a choice only when GET /admin/roles says
 * the caller may grant its role. An applicant's role carries no permission and
 * is always offered. While the roles are unknown (still loading, or the caller
 * may not read them) the administrator is not offered: its role carries the
 * roles permission that the caller evidently lacks, and the server decides the
 * trainer anyway.
 */
export const ACCOUNT_ROLE_SLUGS = Object.freeze({ student: 'learner', trainer: 'trainer', admin: 'admin' })

/** @param {Array|null} roles the roles of GET /admin/roles, or null while they are unknown */
export function offeredAccountRoles(roles) {
  return Object.keys(ACCOUNT_ROLE_SLUGS).filter((choice) => {
    if (choice === 'student') return true
    if (!Array.isArray(roles)) return choice !== 'admin'
    const role = roles.find((candidate) => candidate?.slug === ACCOUNT_ROLE_SLUGS[choice])
    if (!role) return choice !== 'admin'
    return isGrantable(role)
  })
}
