import axios from 'axios'
import { apiConfig } from '../config/api'
import { clearAdminToken, getAdminToken } from './tokenStorage'
import { getAdminLanguage } from './languageStorage'

export const http = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.requestTimeout,
  headers: {
    Accept: 'application/json',
  },
})

http.interceptors.request.use((config) => {
  const token = getAdminToken()
  const language = getAdminLanguage()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  config.headers['Accept-Language'] = language || 'en'

  return config
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (Number(error?.response?.status) === 401) {
      clearAdminToken()

      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }

    return Promise.reject(error)
  }
)
