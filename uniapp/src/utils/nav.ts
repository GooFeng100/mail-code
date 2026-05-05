import { GLOBAL_NAV_HOME, getGlobalNavPath } from '@/constants/global-nav'
import type { GlobalNavKey } from '@/constants/global-nav'

export function go(path: string) {
  uni.navigateTo({ url: path })
}

export function replace(path: string) {
  uni.redirectTo({ url: path })
}

export function goTab(path: string) {
  uni.redirectTo({ url: path })
}

export function goGlobalNav(key: GlobalNavKey) {
  uni.redirectTo({ url: getGlobalNavPath(key) })
}

export function back() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
    return
  }
  uni.redirectTo({ url: GLOBAL_NAV_HOME })
}
