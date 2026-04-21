import axios from 'axios'
import { apiConfig } from '../config/api'
import { getAdminToken } from './tokenStorage'
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
