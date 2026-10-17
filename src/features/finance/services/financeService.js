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

/*
 * THE EXCHANGE RATE (owner decisions of 17 Oct 2026; contract S1, S2, W1).
 * The rate is Syrian pounds for 1 US dollar, append-only: setting one sends the
 * id of the rate the setter saw (409 exchange_rate_changed when it is no longer
 * the live one). The public W1 route carries the current rate for previews.
 */
export async function fetchExchangeRates(params = {}) { return (await http.get('/admin/finance/exchange-rates', { params })).data }
export async function setExchangeRate(payload) { return (await http.post('/admin/finance/exchange-rates', payload)).data }
export async function fetchCurrencies() { return (await http.get('/currencies')).data }
