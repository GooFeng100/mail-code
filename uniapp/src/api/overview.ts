import type { OverviewActivity, OverviewData } from '@/types'
import { fetchAccountListResult } from './account'
import { fetchUserListResult } from './user'

function toDateValue(dateText?: string) {
  if (!dateText) return Number.POSITIVE_INFINITY
  const value = new Date(`${dateText}T00:00:00`).getTime()
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY
}

function remainingDaysByDate(dateText?: string) {
  if (!dateText) return Number.POSITIVE_INFINITY
  const end = new Date(`${dateText}T00:00:00`)
  if (Number.isNaN(end.getTime())) return Number.POSITIVE_INFINITY
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.ceil((end.getTime() - start.getTime()) / 86400000)
}

function mergeById<T extends { id: string }>(...groups: T[][]) {
  const map = new Map<string, T>()
  groups.forEach((group) => {
    group.forEach((item) => {
      if (item.id) {
        map.set(item.id, item)
      }
    })
  })
  return Array.from(map.values())
}

function buildRecentActivities(
  accounts: Awaited<ReturnType<typeof fetchAccountListResult>>['items'],
  users: Awaited<ReturnType<typeof fetchUserListResult>>['items']
) {
  const accountActivities: Array<OverviewActivity & { sortAt: number }> = accounts
    .map((item) => {
      const expireAt = item.accountExpireAt || item.expireDate
      const daysFromDate = remainingDaysByDate(expireAt)
      const daysFromApi = Number(item.remainingDays ?? Number.POSITIVE_INFINITY)
      const days = Number.isFinite(daysFromDate) ? daysFromDate : daysFromApi
      return { item, days, expireAt }
    })
    .filter(({ days }) => days >= 0 && days <= 7)
    .map(({ item, days, expireAt }) => {
      const accountName = String(item.name || item.accountEmail || item.code || '--')
      return {
        id: `account-${item.id}`,
        type: 'account' as const,
        text: accountName,
        expireDate: expireAt || '',
        tag: `剩余${Math.max(0, Number(days || 0))}天`,
        tagType: 'warning' as const,
        sortAt: toDateValue(expireAt)
      }
    })

  const userActivities: Array<OverviewActivity & { sortAt: number }> = users
    .map((item) => {
      const expireAt = item.afterSalesExpireAt || item.expireDate
      const daysFromDate = remainingDaysByDate(expireAt)
      const daysFromApi = Number(item.remainingDays ?? Number.POSITIVE_INFINITY)
      const days = Number.isFinite(daysFromDate) ? daysFromDate : daysFromApi
      return { item, days, expireAt }
    })
    .filter(({ days }) => days >= 0 && days <= 7)
    .map(({ item, days, expireAt }) => {
      const userName = String(item.name || item.code || '--')
      return {
        id: `user-${item.id}`,
        type: 'user' as const,
        text: userName,
        expireDate: expireAt || '',
        tag: `剩余${Math.max(0, Number(days || 0))}天`,
        tagType: 'warning' as const,
        sortAt: toDateValue(expireAt)
      }
    })

  return [...accountActivities, ...userActivities]
    .sort((a, b) => a.sortAt - b.sortAt)
    .map(({ sortAt, ...rest }) => rest)
}

export async function fetchOverview(): Promise<OverviewData> {
  const [
    accountStatsResult,
    userStatsResult,
    expiringAccountResult,
    expiredAccountResult,
    expiringUserResult,
    expiredUserResult
  ] = await Promise.all([
    fetchAccountListResult({ page: 1, pageSize: 1 }),
    fetchUserListResult({ page: 1, pageSize: 1 }),
    fetchAccountListResult({ page: 1, pageSize: 500, status: 'expiring' }),
    fetchAccountListResult({ page: 1, pageSize: 500, status: 'expired' }),
    fetchUserListResult({ page: 1, pageSize: 500, status: 'expiring' }),
    fetchUserListResult({ page: 1, pageSize: 500, status: 'frozen' })
  ])

  const candidateAccounts = mergeById(expiringAccountResult.items, expiredAccountResult.items)
  const candidateUsers = mergeById(expiringUserResult.items, expiredUserResult.items)

  return {
    accountTotal: accountStatsResult.stats.total,
    accountExpiring: accountStatsResult.stats.expiring,
    userTotal: userStatsResult.stats.total,
    userExpiring: userStatsResult.stats.expiring,
    recentActivities: buildRecentActivities(candidateAccounts, candidateUsers)
  }
}

export function hasExpiringInWeek(dateText?: string) {
  const days = remainingDaysByDate(dateText)
  return days >= 0 && days <= 7
}
