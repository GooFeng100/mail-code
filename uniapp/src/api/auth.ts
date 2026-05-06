import { API_PATHS } from './config'
import { clearToken, http, setToken } from './request'

interface LoginResult {
  token: string
  user?: {
    role?: string
    type?: string
    username?: string
    accountEmail?: string
    name?: string
  }
}

export async function login(username: string, password: string) {
  const result = await http<LoginResult>({
    url: API_PATHS.login,
    method: 'POST',
    data: {
      username,
      password
    }
  })

  const role = String(result.user?.role || result.user?.type || '').toLowerCase()
  if (role !== 'admin') {
    clearToken()
    throw new Error('仅管理员可登录移动后台')
  }

  setToken(result.token)
  return result
}

export function fetchMe() {
  return http<{ user: { role?: string; type?: string; username?: string; accountEmail?: string } }>({
    url: API_PATHS.me
  })
}
