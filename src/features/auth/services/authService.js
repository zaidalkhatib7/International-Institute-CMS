import { http } from '../../../services/http'

/**
 * تسجيل دخول المسؤول (Admin)
 * يرسل البريد الإلكتروني وكلمة المرور إلى الـ API الحقيقي.
 */
export async function loginAdmin({ email, password }) {
  const response = await http.post('/login', {
    email,
    password,
  })

  return response.data
}