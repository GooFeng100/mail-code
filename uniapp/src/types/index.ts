export type AccountStatus = 'normal' | 'expiring' | 'disabled'
export type UserStatus = 'normal' | 'expiring' | 'frozen'
export type RelationStatus = 'bound' | 'unbound'

export interface AccountItem {
  id: string
  name: string
  code: string
  businessName: string
  status: AccountStatus
  expireDate: string
  createdAt: string
  updatedAt: string
  boundUserId?: string
  boundUserName?: string
  remark?: string
  accountEmail?: string
  adobePassword?: string
  accountEmailPassword?: string
  verificationEmail?: string
  paidAt?: string
  accountPlan?: string
  accountExpireAt?: string
  remainingDays?: number
  verificationEnabled?: boolean
  bindings?: Array<{
    userCode: string
    userName: string
    plan: string
    afterSalesExpireAt: string
    remainingDays: number
    renewalStatus: string
  }>
  renewals?: Array<{
    renewalDate: string
    planName: string
    increaseDays: number
    beforeExpireAt: string
    afterExpireAt: string
    remark: string
    actionText: string
  }>
}

export interface UserItem {
  id: string
  code: string
  name: string
  phone: string
  region: string
  status: UserStatus
  expireDate: string
  createdAt: string
  availableAccounts: string[]
  remark?: string
  paidAt?: string
  purchasePlan?: string
  afterSalesExpireAt?: string
  remainingDays?: number
  renewalStatus?: string
  bindings?: Array<{
    accountCode: string
    accountName: string
    purchasePlan: string
    afterSalesExpireAt: string
    remainingDays: number
    renewalStatus: string
  }>
  renewals?: Array<{
    renewalDate: string
    packageName: string
    increaseDays: number
    beforeExpireAt: string
    afterExpireAt: string
    remark: string
    actionText: string
  }>
}

export interface RelationItem {
  id: string
  accountId: string
  accountName: string
  userId?: string
  userName?: string
  status: RelationStatus
  expireDate?: string
  updatedAt: string
}

export interface OverviewActivity {
  id: string
  type: 'account' | 'user' | 'relation'
  text: string
  tag: string
  tagType: 'primary' | 'success' | 'warning' | 'danger'
}

export interface OverviewData {
  accountTotal: number
  accountExpiring: number
  userTotal: number
  userExpiring: number
  recentActivities: OverviewActivity[]
}

export interface PageQuery {
  keyword?: string
  status?: string
  expireRange?: string
  page?: number
  pageSize?: number
}
