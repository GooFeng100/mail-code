import BASE_URL from '@/common/baseUrl'

export const API_BASE_URL = BASE_URL

export const API_PATHS = {
  login: '/auth/login',
  me: '/me',
  adminConfig: '/admin/config',
  accounts: '/admin/adobe-accounts',
  accountDetail: (id: string) => `/admin/adobe-accounts/${id}/detail`,
  accountRenewals: (id: string) => `/admin/adobe-accounts/${id}/renewals`,
  accountRenewalDelete: (id: string, renewalId: string) => `/admin/adobe-accounts/${id}/renewals/${renewalId}`,
  accountById: (id: string) => `/admin/adobe-accounts/${id}`,
  users: '/admin/customers',
  userDetail: (id: string) => `/admin/customers/${id}/detail`,
  userRenewals: (id: string) => `/admin/customers/${id}/renewals`,
  userRenewalDelete: (id: string, renewalId: string) => `/admin/customers/${id}/renewals/${renewalId}`,
  userById: (id: string) => `/admin/customers/${id}`,
  relations: '/admin/assignments',
  relationById: (id: string) => `/admin/assignments/${id}`
}
