let BASE_URL = '/api'

function normalizeBaseUrl(value: string) {
  return String(value || '').trim().replace(/\/+$/, '')
}

function ensureApiPath(value: string) {
  const normalized = normalizeBaseUrl(value)
  if (!normalized) return ''
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

// #ifdef H5
BASE_URL = '/api'
// #endif

// #ifdef APP-PLUS
BASE_URL = 'https://m.889100.xyz/api'
// #endif

// #ifdef MP-WEIXIN
BASE_URL = 'https://m.889100.xyz/api'
// #endif

const envBaseUrl = normalizeBaseUrl(String(import.meta.env.VITE_API_BASE_URL || ''))

// Keep H5 on reverse-proxy route (/api), avoid overriding H5 to absolute URL.
// #ifdef APP-PLUS
if (envBaseUrl) BASE_URL = ensureApiPath(envBaseUrl)
// #endif

// #ifdef MP-WEIXIN
if (envBaseUrl) BASE_URL = ensureApiPath(envBaseUrl)
// #endif

export default BASE_URL

