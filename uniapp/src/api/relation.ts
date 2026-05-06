import type { PageQuery, RelationItem } from '@/types'
import { API_PATHS } from './config'
import { mapRelationItem, toIsoDate } from './mappers'
import { http } from './request'

type RawRelationListResponse = {
  items?: Record<string, any>[]
  total?: number
}

export interface RelationBindValue {
  bindDate: string
  role: 'primary' | 'backup'
  accountId: string
  accountCode: string
  accountName: string
  userId: string
  userCode: string
  userName: string
}

function mapRelationStatusQuery(status?: string) {
  if (!status || status === 'all') return ''
  if (status === 'bound') return 'true'
  if (status === 'unbound') return 'false'
  return ''
}

export async function fetchRelations(query: PageQuery = {}): Promise<RelationItem[]> {
  const result = await http<RawRelationListResponse>({
    url: API_PATHS.relations,
    data: {
      page: query.page || 1,
      pageSize: query.pageSize || 50,
      keyword: query.keyword || '',
      role: '',
      active: mapRelationStatusQuery(query.status)
    }
  })

  return Array.isArray(result.items) ? result.items.map(mapRelationItem) : []
}

export async function createRelation(payload: RelationBindValue) {
  return http<{ assignment?: Record<string, any> }>({
    url: API_PATHS.relations,
    method: 'POST',
    data: {
      customerId: payload.userId,
      adobeAccountId: payload.accountId,
      assignmentRole: payload.role,
      assignedAt: toIsoDate(payload.bindDate)
    }
  })
}

export async function updateRelationRole(id: string, role: 'primary' | 'backup') {
  return http<{ assignment?: Record<string, any> }>({
    url: API_PATHS.relationById(id),
    method: 'PUT',
    data: {
      assignmentRole: role
    }
  })
}

export async function updateRelationActive(id: string, active: boolean) {
  return http<{ assignment?: Record<string, any> }>({
    url: API_PATHS.relationById(id),
    method: 'PUT',
    data: {
      active
    }
  })
}

export async function deleteRelation(id: string) {
  return http<{ assignment?: Record<string, any> }>({
    url: API_PATHS.relationById(id),
    method: 'DELETE'
  })
}
