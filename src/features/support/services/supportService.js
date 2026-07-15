import { http } from '../../../services/http'

export async function fetchSupportDashboard() { return (await http.get('/admin/support/dashboard')).data }
export async function fetchSupportTickets(params = {}) { return (await http.get('/admin/support/tickets', { params })).data }
export async function fetchSupportTicket(id) { return (await http.get(`/admin/support/tickets/${id}`)).data }
export async function updateSupportTicket(id, payload) { return (await http.put(`/admin/support/tickets/${id}`, payload)).data }
export async function replyToSupportTicket(id, payload) { return (await http.post(`/admin/support/tickets/${id}/messages`, payload)).data }
export async function fetchFaqCategories() { return (await http.get('/admin/support/faq-categories')).data }
export async function createFaqCategory(payload) { return (await http.post('/admin/support/faq-categories', payload)).data }
export async function updateFaqCategory(id, payload) { return (await http.put(`/admin/support/faq-categories/${id}`, payload)).data }
export async function deleteFaqCategory(id) { return (await http.delete(`/admin/support/faq-categories/${id}`)).data }
export async function fetchFaqs(params = {}) { return (await http.get('/admin/support/faqs', { params })).data }
export async function createFaq(payload) { return (await http.post('/admin/support/faqs', payload)).data }
export async function updateFaq(id, payload) { return (await http.put(`/admin/support/faqs/${id}`, payload)).data }
export async function deleteFaq(id) { return (await http.delete(`/admin/support/faqs/${id}`)).data }
export async function fetchAnnouncements(params = {}) { return (await http.get('/admin/support/announcements', { params })).data }
export async function createAnnouncement(payload) { return (await http.post('/admin/support/announcements', payload)).data }
export async function updateAnnouncement(id, payload) { return (await http.put(`/admin/support/announcements/${id}`, payload)).data }
export async function deleteAnnouncement(id) { return (await http.delete(`/admin/support/announcements/${id}`)).data }
