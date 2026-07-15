import { http } from '../../../services/http'

export async function fetchCertificates(params = {}) { return (await http.get('/admin/certificates', { params })).data }
export async function fetchCertificate(id) { return (await http.get(`/admin/certificates/${id}`)).data }
export async function issueCertificate(payload) { return (await http.post('/admin/certificates', payload)).data }
export async function revokeCertificate(id, reason) { return (await http.post(`/admin/certificates/${id}/revoke`, { reason })).data }
export async function reissueCertificate(id, reason) { return (await http.post(`/admin/certificates/${id}/reissue`, { reason })).data }
export async function fetchCertificateTemplates() { return (await http.get('/admin/certificate-templates')).data }
export async function createCertificateTemplate(payload) { return (await http.post('/admin/certificate-templates', payload)).data }
export async function updateCertificateTemplate(id, payload) { return (await http.put(`/admin/certificate-templates/${id}`, payload)).data }
export async function downloadCertificate(id) { return http.get(`/my/certificates/${id}/download`, { responseType: 'blob' }) }
