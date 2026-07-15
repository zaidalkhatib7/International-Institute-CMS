import { apiConfig } from '../config/api'

export function getAdminToken() {
  return localStorage.getItem(apiConfig.tokenStorageKey)
}

export function setAdminToken(token) {
  localStorage.setItem(apiConfig.tokenStorageKey, token)
  window.dispatchEvent(new Event('icpc-auth-changed'))
}

export function clearAdminToken() {
  localStorage.removeItem(apiConfig.tokenStorageKey)
  window.dispatchEvent(new Event('icpc-auth-changed'))
}

export function hasAdminToken() {
  return Boolean(getAdminToken())
}
