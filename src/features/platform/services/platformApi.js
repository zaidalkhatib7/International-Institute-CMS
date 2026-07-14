import { http } from '../../../services/http'

export async function fetchLearnerDashboard() {
  const response = await http.get('/dashboard')
  return response.data
}

export async function fetchNotifications(params = {}) {
  const response = await http.get('/notifications', {
    params: { per_page: 10, ...params },
  })
  return response.data
}

export async function markNotificationRead(notificationId) {
  const response = await http.post(`/notifications/${notificationId}/read`)
  return response.data
}

export async function markAllNotificationsRead() {
  const response = await http.post('/notifications/read-all')
  return response.data
}

export async function fetchAdminPages(params = {}) {
  const response = await http.get('/admin/pages', { params })
  return response.data
}

export async function fetchAdminMenus(params = {}) {
  const response = await http.get('/admin/menus', { params })
  return response.data
}

export async function fetchAdminApplications(params = {}) {
  const response = await http.get('/admin/applications', {
    params: { per_page: 10, ...params },
  })
  return response.data
}

export async function reviewAdminApplication(applicationId, payload) {
  const response = await http.put(`/admin/applications/${applicationId}`, payload)
  return response.data
}

export async function fetchAdminCpd(params = {}) {
  const response = await http.get('/admin/cpd', {
    params: { per_page: 10, ...params },
  })
  return response.data
}

export async function reviewAdminCpd(cpdEntryId, payload) {
  const response = await http.put(`/admin/cpd/${cpdEntryId}/review`, payload)
  return response.data
}

export async function fetchAdminExperts(params = {}) {
  const response = await http.get('/admin/experts', {
    params: { per_page: 10, ...params },
  })
  return response.data
}

export async function fetchAdminExpertiseCategories(params = {}) {
  const response = await http.get('/admin/expertise-categories', { params })
  return response.data
}

export async function fetchAdminConsultations(params = {}) {
  const response = await http.get('/admin/consultations', {
    params: { per_page: 10, ...params },
  })
  return response.data
}

export async function fetchAdminEnrollments(params = {}) {
  const response = await http.get('/admin/enrollments', {
    params: { per_page: 10, ...params },
  })
  return response.data
}

export async function refundAdminEnrollment(enrollmentId, payload) {
  const response = await http.post(`/admin/enrollments/${enrollmentId}/refund`, payload)
  return response.data
}

export async function fetchAuditLogs(params = {}) {
  const response = await http.get('/admin/audit-logs', {
    params: { per_page: 10, ...params },
  })
  return response.data
}
