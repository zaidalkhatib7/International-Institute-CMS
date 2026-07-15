import { http } from '../../../services/http'

export async function fetchLibraryResources(params = {}) { return (await http.get('/admin/library/resources', { params })).data }
export async function fetchLibraryResource(id) { return (await http.get(`/admin/library/resources/${id}`)).data }
export async function createLibraryResource(payload) { return (await http.post('/admin/library/resources', payload)).data }
export async function updateLibraryResource(id, payload) { return (await http.put(`/admin/library/resources/${id}`, payload)).data }
export async function archiveLibraryResource(id) { return (await http.post(`/admin/library/resources/${id}/archive`)).data }
export async function addLibraryVersion(id, payload) { return (await http.post(`/admin/library/resources/${id}/versions`, payload)).data }
export async function publishLibraryVersion(resourceId, versionId) { return (await http.post(`/admin/library/resources/${resourceId}/versions/${versionId}/publish`)).data }
export async function fetchLibraryCategories() { return (await http.get('/admin/library/categories')).data }
export async function createLibraryCategory(payload) { return (await http.post('/admin/library/categories', payload)).data }
export async function updateLibraryCategory(id, payload) { return (await http.put(`/admin/library/categories/${id}`, payload)).data }
export async function deleteLibraryCategory(id) { return (await http.delete(`/admin/library/categories/${id}`)).data }
