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
  const normalizedPayload = {
    ...payload,
    amount: safeAmount,
  }

  const attempts = [
    { url: `/admin/wallets/${userId}/debit`, body: normalizedPayload },
    { url: `/admin/wallets/${userId}/deduct`, body: normalizedPayload },
    { url: `/admin/wallets/${userId}/decrease`, body: normalizedPayload },
    {
      url: `/admin/wallets/${userId}/adjust`,
      body: {
        ...normalizedPayload,
        type: 'debit',
      },
    },
    {
      url: `/admin/wallets/${userId}/credit`,
      body: {
        ...normalizedPayload,
        operation: 'debit',
      },
    },
    {
      url: `/admin/wallets/${userId}/credit`,
      body: {
        ...normalizedPayload,
        amount: -safeAmount,
      },
    },
  ]

  let lastError

  for (const attempt of attempts) {
    try {
      const response = await http.post(attempt.url, attempt.body)
      return response.data
    } catch (error) {
      const status = Number(error?.response?.status ?? 0)
      const message = String(error?.response?.data?.message ?? '').toLowerCase()
      const hasBalanceError =
        message.includes('insufficient') || message.includes('balance')

      if (status === 422 && hasBalanceError) {
        throw error
      }

      if (status === 404 || status === 405 || status === 422 || status === 400) {
        lastError = error
        continue
      }

      throw error
    }
  }

  throw lastError ?? new Error('Unable to process wallet debit with available endpoints.')
}
