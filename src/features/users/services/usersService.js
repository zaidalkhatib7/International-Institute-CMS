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

export async function enrollUserByStaff(id, programId) {
  const response = await http.post(`/admin/users/${id}/enrollments`, { program_id: Number(programId) })
  return response.data
}

export async function creditUserWallet(userId, payload) {
  const response = await http.post(`/admin/wallets/${userId}/credit`, payload)
  return response.data
}

export async function debitUserWallet(userId, payload) {
  const safeAmount = Math.abs(Number(payload?.amount ?? 0))
  const description = payload?.description

  if (!safeAmount || safeAmount < 1) {
    throw new Error('The amount field must be at least 1.')
  }

  const normalizedPayload = {
    amount: safeAmount,
    description,
  }

  const response = await http.post(`/admin/wallets/${userId}/debit`, normalizedPayload)
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
