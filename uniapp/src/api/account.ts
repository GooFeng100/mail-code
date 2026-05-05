import { mockAccounts } from '@/mock/data'
import type { AccountItem, PageQuery } from '@/types'
import { API_PATHS, USE_MOCK } from './config'
import { http } from './request'

export async function fetchAccounts(query: PageQuery = {}): Promise<AccountItem[]> {
  if (USE_MOCK) {
    const keyword = query.keyword?.trim()
    const status = query.status
    return mockAccounts.filter((item) => {
      const matchKeyword = !keyword || item.name.includes(keyword) || item.code.includes(keyword)
      const matchStatus = !status || status === 'all' || item.status === status
      return matchKeyword && matchStatus
    })
  }

  return http<AccountItem[]>({
    url: API_PATHS.accounts,
    data: query
  })
}

export async function fetchAccountDetail(id: string): Promise<AccountItem> {
  if (USE_MOCK) {
    const base = mockAccounts.find((item) => item.id === id) || mockAccounts[0]
    const today = new Date()
    const expire = new Date(`${base.expireDate}T00:00:00`)
    const current = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const remain = Math.max(0, Math.ceil((expire.getTime() - current.getTime()) / (1000 * 60 * 60 * 24)))

    return {
      ...base,
      accountEmail: base.name,
      adobePassword: '000000',
      accountEmailPassword: '-',
      verificationEmail: 'shanshanz1878313@889100.xyz',
      paidAt: '2025/11/8',
      accountPlan: '全家桶半年付（180天）',
      accountExpireAt: '2026/5/7',
      remainingDays: remain,
      verificationEnabled: true,
      remark: base.remark || '-',
      bindings: [
        {
          userCode: base.boundUserId || 'U089',
          userName: base.boundUserName || '用户 U089',
          plan: '全家桶半年付（180天）',
          afterSalesExpireAt: base.expireDate,
          remainingDays: remain,
          renewalStatus: base.status === 'disabled' ? '停用' : remain <= 30 ? '即将到期' : '正常'
        },
        {
          userCode: 'U128',
          userName: '用户 U128',
          plan: '标准版季度付（90天）',
          afterSalesExpireAt: '2026-06-30',
          remainingDays: 56,
          renewalStatus: '正常'
        }
      ],
      renewals: [
        {
          renewalDate: '2026-04-01',
          planName: '全家桶半年付（180天）',
          increaseDays: 180,
          beforeExpireAt: '2026-01-15',
          afterExpireAt: '2026-07-13',
          remark: '首条续费记录',
          actionText: '删除'
        },
        {
          renewalDate: '2026-01-10',
          planName: '标准版季度付（90天）',
          increaseDays: 90,
          beforeExpireAt: '2025-10-17',
          afterExpireAt: '2026-01-15',
          remark: '补充续费',
          actionText: '删除'
        }
      ]
    }
  }
  return http<AccountItem>({ url: API_PATHS.accountDetail(id) })
}
