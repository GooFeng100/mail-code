export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
export const USE_MOCK = !API_BASE_URL

export const API_PATHS = {
  overview: '/api/mobile/overview',
  accounts: '/api/mobile/accounts',
  accountDetail: (id: string) => `/api/mobile/accounts/${id}`,
  users: '/api/mobile/users',
  userDetail: (id: string) => `/api/mobile/users/${id}`,
  relations: '/api/mobile/relations',
  login: '/api/auth/login'
}
