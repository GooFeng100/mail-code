const TOKEN_KEY = "mailCodeToken"
export const SESSION_EXPIRED_EVENT = "mail-code-session-expired"

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  }
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function getTokenPayload() {
  const token = getToken()
  if (!token) {
    return null
  }

  try {
    const payload = token.split(".")[1]
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/")
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    )
    return JSON.parse(window.atob(padded))
  } catch {
    return null
  }
}

export function getTokenExpiresAt() {
  const payload = getTokenPayload()
  return payload && payload.exp ? payload.exp * 1000 : 0
}

function notifySessionExpired() {
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
}

function buildUrl(path, query) {
  if (!query || !Object.keys(query).length) {
    return path
  }

  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value)
    }
  })

  const text = params.toString()
  return text ? `${path}?${text}` : path
}

export async function apiRequest(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  }

  const token = getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(buildUrl(path, options.query), {
    ...options,
    body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body,
    headers,
  })

  const data = await response.json().catch(() => ({}))
  if (response.status === 401 && token) {
    clearToken()
    notifySessionExpired()
  }

  if (!response.ok || data.ok === false) {
    const error = new Error(data.error || `HTTP ${response.status}`)
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}
