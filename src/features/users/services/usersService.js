import { http } from '../../../services/http'

/**
 * جلب قائمة المستخدمين من لوحة تحكم الإدارة.
 * يدعم البارامترات مثل per_page, page, search, و role.
 */
export async function fetchUsers(params = {}) {
  // endpoint: /api/admin/users (يتم إضافة /api تلقائياً من baseURL)
  const response = await http.get('/admin/users', {
    params: {
      per_page: 10,
      ...params,
    },
  })

  // الاستجابة من Laravel Paginated ترجع البيانات داخل response.data
  return response.data
}