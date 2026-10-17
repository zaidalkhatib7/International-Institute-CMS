import { http } from '../../../services/http'

export async function fetchUsers(params = {}) {
  const response = await http.get('/admin/users', {
    params: {
      per_page: 10,
      ...params,
    },
  })

  return response.data
}

export async function createUser(payload) {
  const response = await http.post('/admin/users', payload)
  return response.data
}

export async function fetchUser(id) {
  const response = await http.get(`/admin/users/${id}`)
  return response.data
}

export async function fetchUserProfessionalEligibility(id) {
  const response = await http.get(`/admin/users/${id}/professional-qualification-eligibility`)
  return response.data
}

export async function updateUser(id, payload) {
  const response = await http.put(`/admin/users/${id}`, payload)
  return response.data
}

export async function createUserQualification(userId, payload) {
  const response = await http.post(`/admin/users/${userId}/qualifications`, payload)
  return response.data
}

export async function updateUserQualification(userId, qualificationId, payload) {
  const response = await http.put(`/admin/users/${userId}/qualifications/${qualificationId}`, payload)
  return response.data
}

export async function deleteUserQualification(userId, qualificationId) {
  const response = await http.delete(`/admin/users/${userId}/qualifications/${qualificationId}`)
  return response.data
}

/*
 * WORK EXPERIENCE, ON THE CLIENT'S BEHALF.
 *
 * At least one work experience on the client's profile is a submit requirement
 * for an RPL request, and an on-site client may have no way to add it
 * themselves. These mirror the client's own /profile/experiences routes and take
 * exactly the same body fields; an experience that is not this user's is a 404.
 */
export async function createUserExperience(userId, payload) {
  const response = await http.post(`/admin/users/${userId}/experiences`, payload)
  return response.data
}

export async function updateUserExperience(userId, experienceId, payload) {
  const response = await http.put(`/admin/users/${userId}/experiences/${experienceId}`, payload)
  return response.data
}

export async function deleteUserExperience(userId, experienceId) {
  const response = await http.delete(`/admin/users/${userId}/experiences/${experienceId}`)
  return response.data
}

/*
 * STAFF-ASSISTED ENROLMENT (contract S7). A priced programme is paid from the
 * client's balance in the currency staff chose, and the body echoes the amount
 * the screen showed (`expected_amount_minor`, an integer of minor units): a price
 * or rate change between view and click answers 409 price_changed and charges
 * nothing. A free programme sends the programme alone.
 */
export async function enrollUserByStaff(id, body) {
  const response = await http.post(`/admin/users/${id}/enrollments`, body)
  return response.data
}

/*
 * THE CLIENT'S TWO BALANCES (owner, 17 Oct 2026; contract S3, S4, S5). Money the
 * institute received is topped up in the currency it was received in, and a
 * deduction corrects a balance; both are audited and both REQUIRE an
 * Idempotency-Key, so a double click or a retry after a lost answer never moves
 * money twice. The amount is an integer of minor units (US cents, whole pounds).
 */
export async function topUpUserWallet(userId, body, idempotencyKey) {
  const response = await http.post(`/admin/wallets/${userId}/top-ups`, body, { headers: { 'Idempotency-Key': idempotencyKey } })
  return response.data
}

export async function deductUserWallet(userId, body, idempotencyKey) {
  const response = await http.post(`/admin/wallets/${userId}/deductions`, body, { headers: { 'Idempotency-Key': idempotencyKey } })
  return response.data
}

/** The client's wallet ledger, staff shape (S5): currency USD, SYP or POINTS (the earlier records), paginated. */
export async function fetchUserWalletTransactions(userId, params = {}) {
  const response = await http.get(`/admin/users/${userId}/wallet/transactions`, { params })
  return response.data
}

/**
 * Delete an account: revoke access, keep the record of what it did.
 *
 * A soft delete server-side. Seventy-odd foreign keys point at users and the
 * audit trail is append-only, so erasing the row would turn "approved by #10"
 * into a dangling reference. Access ends immediately and every token is
 * destroyed; the history stays readable.
 */
export async function deleteUser(id) {
  const response = await http.delete(`/admin/users/${id}`)
  return response.data
}

/**
 * Erase an account permanently. The server refuses unless the account has no
 * governed footprint at all, and the refusal names what blocks it.
 */
export async function purgeUser(id) {
  const response = await http.delete(`/admin/users/${id}/purge`)
  return response.data
}

/*
 * ROLE ASSIGNMENT.
 *
 * GET /admin/roles and PUT /admin/users/{id}/roles are implemented and audited
 * as `roles.assigned`, and no CMS file referenced either. Meanwhile
 * UserController::store accepts only student/trainer/admin, so eight of the
 * eleven seeded roles — assessor, quality-reviewer, committee-member,
 * appeal-reviewer, finance-operator, support-agent, content-admin, expert —
 * could not be granted through any screen. Those are exactly the roles the RPL
 * governance chain runs on, and the workspace copy told staff to "manage
 * permissions from Administration and roles", a page that could not do it.
 */

export async function fetchRoles() {
  const response = await http.get('/admin/roles')
  return response.data
}

/** Replaces the user's roles wholesale — send the complete set of slugs. */
export async function assignUserRoles(userId, roles) {
  const response = await http.put(`/admin/users/${userId}/roles`, { roles })
  return response.data
}
