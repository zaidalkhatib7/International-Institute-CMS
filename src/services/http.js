import axios from 'axios'
import { apiConfig } from '../config/api'
import { clearAdminToken, getAdminToken } from './tokenStorage'
import { getAdminLanguage } from './languageStorage'
import { appPath, isOnAppPath } from './appPath'

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

      // Through appPath, never a literal '/login'. This is a raw browser
      // navigation, so the router's /cms/ basename does not apply to it: the
      // literal sent every expired session to the API host's 404 page, and the
      // old guard compared against '/login' — a path the login screen never has
      // under /cms/ — so it could not recognise the page it was protecting.
      if (! isOnAppPath('login')) {
        window.location.assign(appPath('login'))
      }
    }

    return Promise.reject(error)
  }
)
