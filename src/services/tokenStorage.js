import { apiConfig } from '../config/api'

export function getAdminToken() {
  return localStorage.getItem(apiConfig.tokenStorageKey)
}

export function setAdminToken(token) {
  localStorage.setItem(apiConfig.tokenStorageKey, token)
}

export function clearAdminToken() {
  localStorage.removeItem(apiConfig.tokenStorageKey)
}

export function hasAdminToken() {
  return Boolean(getAdminToken())
}