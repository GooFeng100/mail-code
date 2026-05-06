import { API_PATHS } from './config'
import { http } from './request'

type RawAdminConfigResponse = {
  plans?: Array<{ id?: string; name?: string; days?: number }>
  mailDomainConfigs?: Array<{ domain?: string }>
  mailDomains?: string[]
}

const FALLBACK_MAIL_DOMAINS = ['889100.xyz', 'outlook.com', 'proton.me']
const FALLBACK_RENEWAL_PLANS = [
  { id: '全家桶月付（30天）', name: '全家桶月付（30天）', days: 30 },
  { id: '标准版季度付（90天）', name: '标准版季度付（90天）', days: 90 },
  { id: '全家桶半年付（180天）', name: '全家桶半年付（180天）', days: 180 },
  { id: '全家桶年付（365天）', name: '全家桶年付（365天）', days: 365 }
]

export interface RenewalPlanOption {
  id: string
  name: string
  days: number
}

async function fetchAdminConfig() {
  return http<RawAdminConfigResponse>({ url: API_PATHS.adminConfig })
}

export async function fetchMailDomains(): Promise<string[]> {
  try {
    const data = await fetchAdminConfig()
    const domains = (Array.isArray(data.mailDomainConfigs) && data.mailDomainConfigs.length
      ? data.mailDomainConfigs.map((item) => String(item?.domain || '').trim())
      : Array.isArray(data.mailDomains)
        ? data.mailDomains.map((item) => String(item || '').trim())
        : []
    ).filter(Boolean)

    return domains.length ? domains : FALLBACK_MAIL_DOMAINS
  } catch {
    return FALLBACK_MAIL_DOMAINS
  }
}

export async function fetchRenewalPlans(): Promise<RenewalPlanOption[]> {
  try {
    const data = await fetchAdminConfig()
    const plans = Array.isArray(data.plans)
      ? data.plans
        .map((item) => ({
          id: String(item?.id || '').trim(),
          name: String(item?.name || '').trim(),
          days: Number(item?.days || 0)
        }))
        .filter((item) => item.id && item.name && item.days > 0)
      : []

    return plans.length ? plans : FALLBACK_RENEWAL_PLANS
  } catch {
    return FALLBACK_RENEWAL_PLANS
  }
}
