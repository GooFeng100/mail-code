import type { AccountItem, PageQuery } from '@/types'
import { API_PATHS } from './config'
import { mapAccountDetail, mapAccountListItem, toIsoDate } from './mappers'
import { http } from './request'

type RawAccountListResponse = {
  items?: Record<string, any>[]
  total?: number
  stats?: {
    total?: number
    normal?: number
    expiring?: number
    expired?: number
    disabled?: number
  }
}

type RawAccountDetailResponse = {
  adobeAccount?: Record<string, any>
  customers?: Record<string, any>[]
  renewalRecords?: Record<string, any>[]
}

export interface AccountListResult {
  items: AccountItem[]
  total: number
  stats: {
    total: number
    normal: number
    expiring: number
    expired: number
    disabled: number
  }
}

export interface AccountFormValue {
  code?: string
  accountEmail: string
  adobePassword?: string
  accountEmailPassword?: string
  verifyPrefix?: string
  verifyDomain?: string
  accountPlan?: string
  paidAt?: string
  baseExpireAt?: string
  enabled?: boolean
  remark?: string
}

function mapAccountStatusToQuery(status?: string) {
  if (!status || status === 'all') {
    return { status: '', enabled: '' }
  }
  if (status === 'disabled') {
    return { status: '', enabled: 'false' }
  }
  if (status === 'normal' || status === 'expiring') {
    return { status, enabled: 'true' }
  }
  return { status: '', enabled: '' }
}

function serializeAccountPayload(form: AccountFormValue) {
  const verifyPrefix = String(form.verifyPrefix || '').trim()
  const verifyDomain = String(form.verifyDomain || '').trim()
  const verificationEmail = verifyPrefix && verifyDomain ? `${verifyPrefix}@${verifyDomain}` : ''

  return {
    adobeCode: String(form.code || '').trim(),
    accountEmail: String(form.accountEmail || '').trim(),
    adobePassword: String(form.adobePassword || ''),
    accountEmailPassword: String(form.accountEmailPassword || ''),
    verificationEmail,
    accountPlan: String(form.accountPlan || '').trim(),
    paidAt: toIsoDate(form.paidAt),
    baseExpireAt: toIsoDate(form.baseExpireAt),
    enabled: form.enabled !== false,
    remark: String(form.remark || '')
  }
}

export async function fetchAccounts(query: PageQuery = {}): Promise<AccountItem[]> {
  const mapped = mapAccountStatusToQuery(query.status)
  const result = await http<RawAccountListResponse>({
    url: API_PATHS.accounts,
    data: {
      page: query.page || 1,
      pageSize: query.pageSize || 50,
      keyword: query.keyword || '',
      planId: '',
      status: mapped.status,
      enabled: mapped.enabled
    }
  })

  return Array.isArray(result.items) ? result.items.map(mapAccountListItem) : []
}

export async function fetchAccountListResult(query: PageQuery = {}): Promise<AccountListResult> {
  const mapped = mapAccountStatusToQuery(query.status)
  const result = await http<RawAccountListResponse>({
    url: API_PATHS.accounts,
    data: {
      page: query.page || 1,
      pageSize: query.pageSize || 50,
      keyword: query.keyword || '',
      planId: '',
      status: mapped.status,
      enabled: mapped.enabled
    }
  })

  return {
    items: Array.isArray(result.items) ? result.items.map(mapAccountListItem) : [],
    total: Number(result.total || 0),
    stats: {
      total: Number(result.stats?.total || 0),
      normal: Number(result.stats?.normal || 0),
      expiring: Number(result.stats?.expiring || 0),
      expired: Number(result.stats?.expired || 0),
      disabled: Number(result.stats?.disabled || 0)
    }
  }
}

export async function fetchAccountDetail(id: string): Promise<AccountItem> {
  const result = await http<RawAccountDetailResponse>({ url: API_PATHS.accountDetail(id) })
  return mapAccountDetail(result)
}

export async function createAccount(form: AccountFormValue) {
  const payload = serializeAccountPayload(form)
  return http<{ adobeAccount?: Record<string, any> }>({
    url: API_PATHS.accounts,
    method: 'POST',
    data: payload
  })
}

export async function updateAccount(id: string, form: AccountFormValue) {
  const payload = serializeAccountPayload(form)
  return http<{ adobeAccount?: Record<string, any> }>({
    url: API_PATHS.accountById(id),
    method: 'PUT',
    data: payload
  })
}

export async function deleteAccount(id: string) {
  return http<{ ok?: boolean }>({
    url: API_PATHS.accountById(id),
    method: 'DELETE'
  })
}

export async function deleteAccountRenewal(accountId: string, renewalId: string) {
  return http<{ renewalRecords?: Record<string, any>[] }>({
    url: API_PATHS.accountRenewalDelete(accountId, renewalId),
    method: 'DELETE'
  })
}

export async function createAccountRenewal(
  accountId: string,
  payload: { planId: string; renewalDate: string; remark?: string }
) {
  return http<{ renewalRecords?: Record<string, any>[] }>({
    url: API_PATHS.accountRenewals(accountId),
    method: 'POST',
    data: {
      planId: String(payload.planId || '').trim(),
      renewalDate: toIsoDate(payload.renewalDate),
      remark: String(payload.remark || '')
    }
  })
}
