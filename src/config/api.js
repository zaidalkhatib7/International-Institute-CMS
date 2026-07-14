const defaultApiBaseURL = import.meta.env.DEV
  ? 'http://127.0.0.1:8000/api/v1'
  : 'https://icpc.glanzly-service.de/api/v1'

export const apiConfig = {
  baseURL: import.meta.env.VITE_API_BASE_URL || defaultApiBaseURL,
  tokenStorageKey: 'icpc_admin_token',
  languageStorageKey: 'icpc_admin_language',
  requestTimeout: 15000,
}
