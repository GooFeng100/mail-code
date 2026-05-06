import type { PageQuery, UserItem } from '@/types'
import { API_PATHS } from './config'
import { mapUserDetail, mapUserListItem, toIsoDate } from './mappers'
import { http } from './request'

type RawUserListResponse = {
  items?: Record<string, any>[]
  total?: number
  stats?: {
    total?: number
    normal?: number
    expiring?: number
    expired?: number
  }
}

type RawUserDetailResponse = {
  customer?: Record<string, any>
  adobeAccounts?: Record<string, any>[]
  renewalRecords?: Record<string, any>[]
}

export interface UserListResult {
  items: UserItem[]
  total: number
  stats: {
    total: number
    normal: number
    expiring: number
    expired: number
  }
}

export interface UserFormValue {
  code?: string
  name: string
  phone: string
  paidAt?: string
  purchasePlan?: string
  afterSalesExpireAt?: string
  remark?: string
}

function mapUserStatusToQuery(status?: string) {
  if (!status || status === 'all') return ''
  if (status === 'frozen') return 'expired'
  if (status === 'normal' || status === 'expiring') return status
  return ''
}

function serializeUserPayload(form: UserFormValue) {
  return {
    customerCode: String(form.code || '').trim(),
    customerNickname: String(form.name || '').trim(),
    customerContact: String(form.phone || '').trim(),
    customerContactEmail: '',
    purchasedPlan: String(form.purchasePlan || '').trim(),
    firstPaidAt: toIsoDate(form.paidAt),
    baseAfterSalesExpireAt: toIsoDate(form.afterSalesExpireAt),
    remark: String(form.remark || '')
  }
}

export async function fetchUsers(query: PageQuery = {}): Promise<UserItem[]> {
  const result = await http<RawUserListResponse>({
    url: API_PATHS.users,
    data: {
      page: query.page || 1,
      pageSize: query.pageSize || 50,
      keyword: query.keyword || '',
      status: mapUserStatusToQuery(query.status),
      planId: ''
    }
  })

  return Array.isArray(result.items) ? result.items.map(mapUserListItem) : []
}

export async function fetchUserListResult(query: PageQuery = {}): Promise<UserListResult> {
  const result = await http<RawUserListResponse>({
    url: API_PATHS.users,
    data: {
      page: query.page || 1,
      pageSize: query.pageSize || 50,
      keyword: query.keyword || '',
      status: mapUserStatusToQuery(query.status),
      planId: ''
    }
  })

  return {
    items: Array.isArray(result.items) ? result.items.map(mapUserListItem) : [],
    total: Number(result.total || 0),
    stats: {
      total: Number(result.stats?.total || 0),
      normal: Number(result.stats?.normal || 0),
      expiring: Number(result.stats?.expiring || 0),
      expired: Number(result.stats?.expired || 0)
    }
  }
}

export async function fetchUserDetail(id: string): Promise<UserItem> {
  const result = await http<RawUserDetailResponse>({ url: API_PATHS.userDetail(id) })
  return mapUserDetail(result)
}

export async function createUser(form: UserFormValue) {
  const payload = serializeUserPayload(form)
  return http<{ customer?: Record<string, any> }>({
    url: API_PATHS.users,
    method: 'POST',
    data: payload
  })
}

export async function updateUser(id: string, form: UserFormValue) {
  const payload = serializeUserPayload(form)
  return http<{ customer?: Record<string, any> }>({
    url: API_PATHS.userById(id),
    method: 'PUT',
    data: payload
  })
}

export async function deleteUser(id: string) {
  return http<{ ok?: boolean }>({
    url: API_PATHS.userById(id),
    method: 'DELETE'
  })
}

export async function deleteUserRenewal(userId: string, renewalId: string) {
  return http<{ renewalRecords?: Record<string, any>[] }>({
    url: API_PATHS.userRenewalDelete(userId, renewalId),
    method: 'DELETE'
  })
}

export async function createUserRenewal(
  userId: string,
  payload: { planId: string; renewalDate: string; remark?: string }
) {
  return http<{ renewalRecords?: Record<string, any>[] }>({
    url: API_PATHS.userRenewals(userId),
    method: 'POST',
    data: {
      planId: String(payload.planId || '').trim(),
      renewalDate: toIsoDate(payload.renewalDate),
      remark: String(payload.remark || '')
    }
  })
}
