import { describe, expect, it } from 'vitest'
import {
  ROLE_GUARD_CODES,
  ROLE_GUARD_COPY,
  accountLock,
  assignmentLock,
  emailLock,
  isGrantable,
  offeredAccountRoles,
  readUserActionError,
  refusalText,
  roleGuardRefusal,
} from './roleGuard'

/*
 * THE ROLE GUARD, MIRRORED (owner report of 24 Oct 2026: an administrator could
 * make themselves super administrator). Pinned: the server's sentence is said in
 * the reader's language, the platform's copy covers a response without one, an
 * error that is not the guard's keeps the usual reading, and a new account is
 * offered only the roles the server says the caller may grant.
 */

function refused(status, data) {
  return Object.assign(new Error('refused'), { response: { status, data } })
}

const SUPER_ADMIN_REFUSAL = {
  message: 'Only a super administrator can grant or remove the super administrator role.',
  message_label: { ar: 'نص الخادم بالعربية', en: 'The server sentence in English.' },
  reason_code: 'super_admin_role_needs_super_admin',
  refused_roles: ['super-admin'],
  missing_permissions: [],
  errors: { roles: ['Only a super administrator can grant or remove the super administrator role.'] },
}

describe('the copy', () => {
  it('says every refusal code in both platform languages, and only those', () => {
    expect(Object.keys(ROLE_GUARD_COPY).sort()).toEqual(['ar', 'en'])
    for (const language of ['ar', 'en']) {
      expect(Object.keys(ROLE_GUARD_COPY[language]).sort()).toEqual([...ROLE_GUARD_CODES].sort())
      for (const code of ROLE_GUARD_CODES) expect(ROLE_GUARD_COPY[language][code].trim()).not.toBe('')
    }
    for (const code of ROLE_GUARD_CODES) expect(ROLE_GUARD_COPY.ar[code]).toMatch(/[؀-ۿ]/)
  })

  it('never calls the platform a CMS', () => {
    for (const language of ['ar', 'en']) {
      for (const line of Object.values(ROLE_GUARD_COPY[language])) expect(line).not.toMatch(/CMS|\bAPI\b/)
    }
  })
})

describe('a refused request', () => {
  it('is the server\'s sentence in the reader\'s language', () => {
    expect(roleGuardRefusal(refused(403, SUPER_ADMIN_REFUSAL), 'ar')).toBe('نص الخادم بالعربية')
    expect(roleGuardRefusal(refused(403, SUPER_ADMIN_REFUSAL), 'en')).toBe('The server sentence in English.')
  })

  it('falls back to the platform\'s copy when the server sends no label', () => {
    const bare = { ...SUPER_ADMIN_REFUSAL, message_label: undefined }
    expect(roleGuardRefusal(refused(403, bare), 'ar')).toBe(ROLE_GUARD_COPY.ar.super_admin_role_needs_super_admin)
  })

  it('reads the last super administrator\'s 422 as the sentence, not the generic invalid line', () => {
    const last = { ...SUPER_ADMIN_REFUSAL, reason_code: 'last_super_admin', message_label: { ar: 'آخر مدير أعلى', en: 'Last super administrator.' } }
    expect(readUserActionError(refused(422, last), undefined, 'en')).toBe('Last super administrator.')
    expect(readUserActionError(refused(422, last), undefined, 'ar')).toBe('آخر مدير أعلى')
  })

  it('is not the guard\'s when the code is not one of its own, and keeps the usual reading', () => {
    const other = refused(403, { message: 'This action is unauthorized.', reason_code: 'something_else' })
    expect(roleGuardRefusal(other, 'en')).toBeNull()
    expect(readUserActionError(other, 'Fallback.', 'ar')).toBe('ليست لديك صلاحية تنفيذ هذا الإجراء.')
    expect(roleGuardRefusal(refused(500, SUPER_ADMIN_REFUSAL), 'en')).toBeNull()
    expect(roleGuardRefusal(new Error('Network Error'), 'en')).toBeNull()
  })
})

describe('the roles answer', () => {
  it('locks only a role the server marks not grantable (an older answer without the field locks nothing)', () => {
    expect(isGrantable({ slug: 'assessor', grantable: true })).toBe(true)
    expect(isGrantable({ slug: 'assessor' })).toBe(true)
    expect(isGrantable({ slug: 'super-admin', grantable: false })).toBe(false)
  })

  it('says a grant refusal in the reader\'s language', () => {
    const refusal = { reason_code: 'role_carries_permission_actor_lacks', message: { ar: 'عربي', en: 'English.' }, missing_permissions: ['finance.exchange_rates.manage'] }
    expect(refusalText(refusal, 'ar')).toBe('عربي')
    expect(refusalText({ reason_code: 'last_super_admin' }, 'en')).toBe(ROLE_GUARD_COPY.en.last_super_admin)
    expect(refusalText(null, 'en')).toBe('')
  })

  it('closes one\'s own roles, whatever an older server says', () => {
    expect(assignmentLock({ assignment: null, ownAccount: true, language: 'ar' })).toBe(ROLE_GUARD_COPY.ar.role_change_own_account)
    expect(assignmentLock({ assignment: { target_editable: true }, ownAccount: false, language: 'en' })).toBe('')
    const own = { target_editable: false, target_refusal: { reason_code: 'role_change_own_account', message: { ar: 'أدوارك', en: 'Your roles.' } } }
    expect(assignmentLock({ assignment: own, language: 'en' })).toBe('Your roles.')
  })

  it('closes the account itself only when it holds a permission the caller lacks', () => {
    const outranks = { target_editable: false, target_refusal: { reason_code: 'account_holds_permission_actor_lacks', message: { ar: 'حساب أعلى', en: 'Outranks you.' } } }
    expect(accountLock(outranks, 'ar')).toBe('حساب أعلى')
    const own = { target_editable: false, target_refusal: { reason_code: 'role_change_own_account', message: { ar: 'أدوارك', en: 'Your roles.' } } }
    expect(accountLock(own, 'en')).toBe('')
    expect(accountLock(null, 'en')).toBe('')
  })
})

describe('the e-mail address (the key to the password)', () => {
  it('is closed only when the server says so, in the server\'s words, and an older answer closes nothing', () => {
    const closed = { target_editable: true, target_email_editable: false, target_email_refusal: { reason_code: 'staff_email_change_needs_super_admin', message: { ar: 'مفتاح الحساب', en: 'The key to the account.' }, missing_permissions: [] } }
    expect(emailLock(closed, 'ar')).toBe('مفتاح الحساب')
    expect(emailLock(closed, 'en')).toBe('The key to the account.')
    expect(emailLock({ target_email_editable: false }, 'ar')).toBe(ROLE_GUARD_COPY.ar.staff_email_change_needs_super_admin)
    expect(emailLock({ target_email_editable: true, target_email_refusal: null }, 'en')).toBe('')
    expect(emailLock({ target_editable: true }, 'en')).toBe('')
    expect(emailLock(null, 'en')).toBe('')
  })

  it('reads the server\'s refusal of a new address as its sentence', () => {
    const data = { message: 'English.', message_label: { ar: 'عربي', en: 'English.' }, reason_code: 'staff_email_change_needs_super_admin', refused_roles: [], missing_permissions: [], errors: { email: ['English.'] } }
    expect(readUserActionError(refused(403, data), 'Fallback.', 'ar')).toBe('عربي')
    expect(roleGuardRefusal(refused(403, { ...data, message_label: undefined }), 'en')).toBe(ROLE_GUARD_COPY.en.staff_email_change_needs_super_admin)
  })
})

describe('a new account\'s role', () => {
  const role = (slug, grantable) => ({ slug, grantable, grant_refusal: grantable ? null : { reason_code: 'role_carries_permission_actor_lacks' } })

  it('offers the administrator only when the server says the caller may grant it', () => {
    expect(offeredAccountRoles([role('learner', true), role('trainer', true), role('admin', true)])).toEqual(['student', 'trainer', 'admin'])
    expect(offeredAccountRoles([role('learner', true), role('trainer', true), role('admin', false)])).toEqual(['student', 'trainer'])
    expect(offeredAccountRoles([role('learner', false), role('trainer', false), role('admin', false)])).toEqual(['student'])
  })

  it('never offers the administrator while the roles are unknown, and always offers an applicant', () => {
    expect(offeredAccountRoles(null)).toEqual(['student', 'trainer'])
    expect(offeredAccountRoles([])).toEqual(['student', 'trainer'])
  })
})
