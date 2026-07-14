import { http } from '../../../services/http'

/**
 * تسجيل دخول المسؤول (Admin)
 * يرسل البريد الإلكتروني وكلمة المرور إلى الـ API الحقيقي.
 */
export async function loginAdmin({ email, password }) {
  const response = await http.post('/login', {
    email,
    password,
    device_name: 'ICPC CMS',
  })

  return response.data
}

export async function completeAdminMfa({ email, code, challengeToken }) {
  const response = await http.post('/login/mfa', {
    email,
    code,
    challenge_token: challengeToken,
    device_name: 'ICPC CMS',
  })

  return response.data
}

export async function fetchCurrentUser() {
  const response = await http.get('/user')
  return response.data
}

export async function logoutAdmin() {
  const response = await http.post('/logout')
  return response.data
}
