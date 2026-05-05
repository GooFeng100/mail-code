import { mockOverview } from '@/mock/data'
import type { OverviewData } from '@/types'
import { API_PATHS, USE_MOCK } from './config'
import { http } from './request'

export async function fetchOverview(): Promise<OverviewData> {
  if (USE_MOCK) return mockOverview
  return http<OverviewData>({ url: API_PATHS.overview })
}
