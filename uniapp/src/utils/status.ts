import type { AccountStatus, RelationStatus, UserStatus } from '@/types'

export function accountStatusText(status: AccountStatus) {
  return (
    {
      normal: '正常',
      expiring: '即将到期',
      disabled: '停用'
    } as const
  )[status]
}

export function userStatusText(status: UserStatus) {
  return (
    {
      normal: '正常',
      expiring: '即将到期',
      frozen: '冻结'
    } as const
  )[status]
}

export function relationStatusText(status: RelationStatus) {
  return (
    {
      bound: '已绑定',
      unbound: '未绑定'
    } as const
  )[status]
}

export function statusType(status: string): 'primary' | 'success' | 'warning' | 'danger' | 'default' {
  if (['normal', 'bound'].includes(status)) return 'success'
  if (['expiring'].includes(status)) return 'warning'
  if (['disabled', 'frozen', 'unbound'].includes(status)) return 'danger'
  return 'default'
}
