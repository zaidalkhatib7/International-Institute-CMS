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
