import { mockUsers } from '@/mock/data'
import type { PageQuery, UserItem } from '@/types'
import { API_PATHS, USE_MOCK } from './config'
import { http } from './request'

export async function fetchUsers(query: PageQuery = {}): Promise<UserItem[]> {
  if (USE_MOCK) {
    const keyword = query.keyword?.trim()
    const status = query.status
    return mockUsers.filter((item) => {
      const matchKeyword =
        !keyword || item.code.includes(keyword) || item.name.includes(keyword) || item.phone.includes(keyword)
      const matchStatus = !status || status === 'all' || item.status === status
      return matchKeyword && matchStatus
    })
  }

  return http<UserItem[]>({
    url: API_PATHS.users,
    data: query
  })
}

export async function fetchUserDetail(id: string): Promise<UserItem> {
  if (USE_MOCK) return mockUsers.find((item) => item.id === id) || mockUsers[0]
  return http<UserItem>({ url: API_PATHS.userDetail(id) })
}
