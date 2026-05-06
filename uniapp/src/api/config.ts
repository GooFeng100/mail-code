export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export const API_PATHS = {
  login: '/api/auth/login',
  me: '/api/me',
  adminConfig: '/api/admin/config',
  accounts: '/api/admin/adobe-accounts',
  accountDetail: (id: string) => `/api/admin/adobe-accounts/${id}/detail`,
  accountRenewals: (id: string) => `/api/admin/adobe-accounts/${id}/renewals`,
  accountRenewalDelete: (id: string, renewalId: string) => `/api/admin/adobe-accounts/${id}/renewals/${renewalId}`,
  accountById: (id: string) => `/api/admin/adobe-accounts/${id}`,
  users: '/api/admin/customers',
  userDetail: (id: string) => `/api/admin/customers/${id}/detail`,
  userRenewals: (id: string) => `/api/admin/customers/${id}/renewals`,
  userRenewalDelete: (id: string, renewalId: string) => `/api/admin/customers/${id}/renewals/${renewalId}`,
  userById: (id: string) => `/api/admin/customers/${id}`,
  relations: '/api/admin/assignments',
  relationById: (id: string) => `/api/admin/assignments/${id}`
}
