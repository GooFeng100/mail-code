import { mockRelations } from '@/mock/data'
import type { PageQuery, RelationItem } from '@/types'
import { API_PATHS, USE_MOCK } from './config'
import { http } from './request'

export async function fetchRelations(query: PageQuery = {}): Promise<RelationItem[]> {
  if (USE_MOCK) {
    const keyword = query.keyword?.trim()
    const status = query.status
    return mockRelations.filter((item) => {
      const haystack = `${item.accountName}${item.userName || ''}${item.accountId}${item.userId || ''}`
      const matchKeyword = !keyword || haystack.includes(keyword)
      const matchStatus = !status || status === 'all' || item.status === status
      return matchKeyword && matchStatus
    })
  }

  return http<RelationItem[]>({
    url: API_PATHS.relations,
    data: query
  })
}
