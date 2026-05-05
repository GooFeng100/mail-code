export type GlobalNavKey = 'overview' | 'account' | 'user' | 'relation'

export interface GlobalNavItem {
  key: GlobalNavKey
  label: string
  icon: string
  path: string
}

export const GLOBAL_NAV_ITEMS: GlobalNavItem[] = [
  { key: 'overview', label: '总览', icon: 'home', path: '/pages/overview/index' },
  { key: 'account', label: '账号', icon: 'books', path: '/pages/account/list/index' },
  { key: 'user', label: '用户', icon: 'user', path: '/pages/user/list/index' },
  { key: 'relation', label: '关系', icon: 'link', path: '/pages/relation/list/index' }
]

export const GLOBAL_NAV_HOME = GLOBAL_NAV_ITEMS[0].path

export function getGlobalNavPath(key: GlobalNavKey) {
  return GLOBAL_NAV_ITEMS.find((item) => item.key === key)?.path || GLOBAL_NAV_HOME
}
