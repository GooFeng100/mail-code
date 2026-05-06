import type { AccountItem, RelationItem, UserItem } from '@/types'

type RawRecord = Record<string, any>

function formatDateText(value?: string | Date | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function ensureStringId(value: unknown) {
  if (value === undefined || value === null) return ''
  return String(value)
}

function toAccountStatus(enabled: boolean, remainingDays: number): AccountItem['status'] {
  if (!enabled) return 'disabled'
  if (remainingDays <= 30) return 'expiring'
  return 'normal'
}

function toUserStatus(remainingDays: number): UserItem['status'] {
  if (remainingDays <= 0) return 'frozen'
  if (remainingDays <= 30) return 'expiring'
  return 'normal'
}

function renewalStatusText(remainingDays: number) {
  if (remainingDays <= 0) return '停用'
  if (remainingDays <= 30) return '即将到期'
  return '正常'
}

export function mapAccountListItem(raw: RawRecord): AccountItem {
  const remainingDays = Number(raw.remainingDays || 0)
  return {
    id: ensureStringId(raw.id || raw._id),
    name: String(raw.accountEmail || ''),
    code: String(raw.adobeCode || ''),
    businessName: String(raw.accountPlan || ''),
    status: toAccountStatus(Boolean(raw.enabled !== false), remainingDays),
    expireDate: formatDateText(raw.accountExpireAt || raw.baseExpireAt),
    createdAt: formatDateText(raw.createdAt || raw.paidAt),
    updatedAt: formatDateText(raw.updatedAt || raw.createdAt),
    boundUserId: '',
    boundUserName: '',
    remark: String(raw.remark || ''),
    accountEmail: String(raw.accountEmail || ''),
    adobePassword: String(raw.adobePassword || ''),
    accountEmailPassword: String(raw.accountEmailPassword || ''),
    verificationEmail: String(raw.verificationEmail || ''),
    paidAt: formatDateText(raw.paidAt),
    accountPlan: String(raw.accountPlan || ''),
    accountExpireAt: formatDateText(raw.accountExpireAt || raw.baseExpireAt),
    remainingDays,
    verificationEnabled: Boolean(raw.enabled !== false)
  }
}

export function mapAccountDetail(raw: RawRecord): AccountItem {
  const account = raw.adobeAccount || {}
  const base = mapAccountListItem(account)
  const bindings = Array.isArray(raw.customers)
    ? raw.customers.map((item: RawRecord) => {
      const remainingDays = Number(item.remainingDays || 0)
      return {
        userCode: String(item.customerCode || ''),
        userName: String(item.customerNickname || ''),
        plan: String(item.purchasedPlan || ''),
        afterSalesExpireAt: formatDateText(item.afterSalesExpireAt),
        remainingDays,
        renewalStatus: renewalStatusText(remainingDays),
        assignmentId: ensureStringId(item.assignmentId || ''),
        role: item.assignmentRole === 'primary' ? 'primary' : 'backup'
      }
    })
    : []
  const renewals = Array.isArray(raw.renewalRecords)
    ? raw.renewalRecords.map((item: RawRecord) => ({
      id: ensureStringId(item.id || item._id),
      initial: Boolean(item.initial),
      renewalDate: formatDateText(item.renewalDate),
      planName: String(item.planName || ''),
      increaseDays: Number(item.planDays || 0),
      beforeExpireAt: formatDateText(item.beforeExpireAt),
      afterExpireAt: formatDateText(item.afterExpireAt),
      remark: String(item.remark || ''),
      actionText: item.initial ? '基准记录' : '删除'
    }))
    : []

  return {
    ...base,
    bindings,
    renewals
  }
}

export function mapUserListItem(raw: RawRecord): UserItem {
  const remainingDays = Number(raw.remainingDays || 0)
  return {
    id: ensureStringId(raw.id || raw._id),
    code: String(raw.customerCode || ''),
    name: String(raw.customerNickname || ''),
    phone: String(raw.customerContact || ''),
    region: '',
    status: toUserStatus(remainingDays),
    expireDate: formatDateText(raw.afterSalesExpireAt || raw.baseAfterSalesExpireAt),
    createdAt: formatDateText(raw.createdAt || raw.firstPaidAt),
    availableAccounts: [],
    remark: String(raw.remark || ''),
    paidAt: formatDateText(raw.firstPaidAt),
    purchasePlan: String(raw.purchasedPlan || ''),
    afterSalesExpireAt: formatDateText(raw.afterSalesExpireAt || raw.baseAfterSalesExpireAt),
    remainingDays,
    renewalStatus: renewalStatusText(remainingDays)
  }
}

export function mapUserDetail(raw: RawRecord): UserItem {
  const customer = raw.customer || {}
  const base = mapUserListItem(customer)
  const bindings = Array.isArray(raw.adobeAccounts)
    ? raw.adobeAccounts.map((item: RawRecord) => {
      const remainingDays = Number(item.remainingDays || 0)
      return {
        accountId: ensureStringId(item.id || item._id),
        accountCode: String(item.adobeCode || ''),
        accountName: String(item.accountEmail || ''),
        purchasePlan: String(item.accountPlan || ''),
        afterSalesExpireAt: formatDateText(item.accountExpireAt),
        remainingDays,
        renewalStatus: renewalStatusText(remainingDays),
        status: renewalStatusText(remainingDays),
        assignmentId: ensureStringId(item.assignmentId),
        role: item.assignmentRole === 'primary' ? 'primary' : 'backup'
      }
    })
    : []
  const renewals = Array.isArray(raw.renewalRecords)
    ? raw.renewalRecords.map((item: RawRecord) => ({
      id: ensureStringId(item.id || item._id),
      initial: Boolean(item.initial),
      renewalDate: formatDateText(item.renewalDate),
      packageName: String(item.planName || ''),
      increaseDays: Number(item.planDays || 0),
      beforeExpireAt: formatDateText(item.beforeExpireAt),
      afterExpireAt: formatDateText(item.afterExpireAt),
      remark: String(item.remark || ''),
      actionText: item.initial ? '基准记录' : '删除'
    }))
    : []

  return {
    ...base,
    bindings,
    renewals
  }
}

export function mapRelationItem(raw: RawRecord): RelationItem {
  return {
    id: ensureStringId(raw.id || raw._id),
    accountId: ensureStringId(raw.adobeAccountId || raw.accountId),
    accountCode: String(raw.adobeCode || ''),
    accountName: String(raw.accountEmail || raw.accountName || ''),
    userId: ensureStringId(raw.customerId || raw.userId),
    userCode: String(raw.customerCode || ''),
    userName: String(raw.customerNickname || raw.userName || ''),
    assignmentRole: raw.assignmentRole === 'primary' ? 'primary' : 'backup',
    status: raw.active === false ? 'unbound' : 'bound',
    canRestore: Boolean(raw.canRestore),
    active: Boolean(raw.active !== false),
    assignedAt: formatDateText(raw.assignedAt),
    expireDate: formatDateText(raw.accountExpireAt),
    updatedAt: formatDateText(raw.updatedAt || raw.assignedAt || raw.createdAt)
  }
}

export function toIsoDate(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return formatDateText(date)
}

