import { API_PATHS, USE_MOCK } from './config'
import { http, setToken } from './request'

export async function login(username: string, password: string) {
  if (USE_MOCK) {
    const token = `mock-token-${Date.now()}`
    setToken(token)
    return {
      token,
      user: {
        name: username || '管理员'
      }
    }
  }

  const result = await http<{ token: string; user?: { name: string } }>({
    url: API_PATHS.login,
    method: 'POST',
    data: {
      username,
      password
    }
  })

  setToken(result.token)
  return result
}
