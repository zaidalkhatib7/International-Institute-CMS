import { http } from '../../../services/http'

export async function fetchFinanceDashboard(params = {}) { return (await http.get('/admin/finance/dashboard', { params })).data }
export async function fetchFinanceProducts(params = {}) { return (await http.get('/admin/finance/products', { params })).data }
export async function createFinanceProduct(payload) { return (await http.post('/admin/finance/products', payload)).data }
export async function updateFinanceProduct(id, payload) { return (await http.put(`/admin/finance/products/${id}`, payload)).data }
export async function createFinancePrice(productId, payload) { return (await http.post(`/admin/finance/products/${productId}/prices`, payload)).data }
export async function updateFinancePrice(productId, priceId, payload) { return (await http.put(`/admin/finance/products/${productId}/prices/${priceId}`, payload)).data }
export async function fetchFinanceCoupons(params = {}) { return (await http.get('/admin/finance/coupons', { params })).data }
export async function createFinanceCoupon(payload) { return (await http.post('/admin/finance/coupons', payload)).data }
export async function updateFinanceCoupon(id, payload) { return (await http.put(`/admin/finance/coupons/${id}`, payload)).data }
export async function fetchFinanceSubscriptions(params = {}) { return (await http.get('/admin/finance/subscriptions', { params })).data }
export async function updateFinanceSubscription(id, payload) { return (await http.put(`/admin/finance/subscriptions/${id}`, payload)).data }
