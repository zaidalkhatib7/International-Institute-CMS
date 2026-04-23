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
  try {
    const response = await http.post('/admin/users', payload)
    return response.data
  } catch (error) {
    const status = Number(error?.response?.status ?? 0)

    // Fallback for backends where admin user creation is not exposed
    // and registration endpoint is used instead.
    if (status === 404 || status === 405) {
      const registerPayload = {
        name: payload?.name,
        email: payload?.email,
        phone_number: payload?.phone_number,
        password: payload?.password,
        password_confirmation: payload?.password_confirmation,
      }
      const fallbackResponse = await http.post('/register', registerPayload)
      return fallbackResponse.data
    }

    throw error
  }
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
