import type { AccountItem, OverviewData, RelationItem, UserItem } from '@/types'

export const mockAccounts: AccountItem[] = [
  {
    id: 'a001',
    name: '账号 A001',
    code: 'ACC20260503001',
    businessName: '华东门店一部',
    status: 'normal',
    expireDate: '2026-07-31',
    createdAt: '2026-05-03 12:30',
    updatedAt: '今天 12:30',
    boundUserId: 'u089',
    boundUserName: '用户 U089',
    remark: '用于华东门店的日常运营与数据巡检。'
  },
  {
    id: 'a002',
    name: '账号 A002',
    code: 'ACC20260503002',
    businessName: '华南门店二部',
    status: 'expiring',
    expireDate: '2026-06-10',
    createdAt: '2026-04-12 09:12',
    updatedAt: '今天 09:15',
    boundUserId: 'u128',
    boundUserName: '用户 U128',
    remark: '适用于华南区域促销活动与盘点权限。'
  },
  {
    id: 'a003',
    name: '账号 A003',
    code: 'ACC20260503003',
    businessName: '华北直营网点',
    status: 'normal',
    expireDate: '2026-08-15',
    createdAt: '2026-03-18 10:00',
    updatedAt: '昨天 17:45',
    remark: '当前未绑定用户，预留给新店开业使用。'
  },
  {
    id: 'a004',
    name: '账号 A004',
    code: 'ACC20260503004',
    businessName: '西南加盟中心',
    status: 'disabled',
    expireDate: '2026-05-20',
    createdAt: '2026-03-01 10:00',
    updatedAt: '昨天 16:20',
    boundUserId: 'u202',
    boundUserName: '用户 U202',
    remark: '因权限审计暂时停用，等待复核。'
  },
  {
    id: 'a005',
    name: '账号 A005',
    code: 'ACC20260503005',
    businessName: '华中运营中心',
    status: 'expiring',
    expireDate: '2026-06-25',
    createdAt: '2026-02-11 14:10',
    updatedAt: '前天 11:05',
    remark: '用于活动中台报表查看与审批操作。'
  }
]

export const mockUsers: UserItem[] = [
  {
    id: 'u089',
    code: 'U089',
    name: '张明',
    phone: '138****8899',
    region: '无锡',
    status: 'normal',
    expireDate: '2026-08-12',
    createdAt: '2026-04-21 09:20',
    availableAccounts: ['账号 A001', '账号 A015'],
    remark: '负责华东片区的数据核对与权限审核。'
  },
  {
    id: 'u128',
    code: 'U128',
    name: '王倩',
    phone: '139****2288',
    region: '无锡',
    status: 'expiring',
    expireDate: '2026-07-05',
    createdAt: '2026-04-20 09:20',
    availableAccounts: ['账号 A002'],
    remark: '即将到期，需在下个周期前完成续期。'
  },
  {
    id: 'u156',
    code: 'U156',
    name: '李华',
    phone: '139****1133',
    region: '苏州',
    status: 'normal',
    expireDate: '2026-09-18',
    createdAt: '2026-04-19 09:20',
    availableAccounts: ['账号 A003'],
    remark: '负责苏州片区门店日常数据维护。'
  },
  {
    id: 'u202',
    code: 'U202',
    name: '赵敏',
    phone: '150****2266',
    region: '上海',
    status: 'frozen',
    expireDate: '2026-06-01',
    createdAt: '2026-04-18 09:20',
    availableAccounts: ['账号 A004'],
    remark: '因异常登录触发冻结，等待管理员处理。'
  },
  {
    id: 'u260',
    code: 'U260',
    name: '陈杰',
    phone: '151****2600',
    region: '南京',
    status: 'expiring',
    expireDate: '2026-07-28',
    createdAt: '2026-04-17 09:20',
    availableAccounts: ['账号 A005'],
    remark: '负责南京区域活动与库存运营。'
  }
]

export const mockRelations: RelationItem[] = [
  {
    id: 'r001',
    accountId: 'A001',
    accountName: '账号 A001',
    userId: 'U089',
    userName: '用户 U089',
    status: 'bound',
    expireDate: '2026-07-31',
    updatedAt: '今天 12:30'
  },
  {
    id: 'r002',
    accountId: 'A002',
    accountName: '账号 A002',
    userId: 'U128',
    userName: '用户 U128',
    status: 'bound',
    expireDate: '2026-06-10',
    updatedAt: '今天 09:15'
  },
  {
    id: 'r003',
    accountId: 'A003',
    accountName: '账号 A003',
    status: 'unbound',
    updatedAt: '昨天 17:45'
  },
  {
    id: 'r004',
    accountId: 'A004',
    accountName: '账号 A004',
    userId: 'U202',
    userName: '用户 U202',
    status: 'bound',
    expireDate: '2026-05-20',
    updatedAt: '昨天 16:20'
  },
  {
    id: 'r005',
    accountId: 'A005',
    accountName: '账号 A005',
    status: 'unbound',
    updatedAt: '前天 11:05'
  }
]

export const mockOverview: OverviewData = {
  accountTotal: mockAccounts.length,
  accountExpiring: mockAccounts.filter((item) => item.status === 'expiring').length,
  userTotal: mockUsers.length,
  userExpiring: mockUsers.filter((item) => item.status === 'expiring').length,
  recentActivities: [
    {
      id: '1',
      type: 'account',
      text: '账号 A002 即将在 7 天后到期',
      tag: '待续期',
      tagType: 'warning'
    },
    {
      id: '2',
      type: 'user',
      text: '用户 U128 已完成续期审批',
      tag: '已处理',
      tagType: 'success'
    },
    {
      id: '3',
      type: 'relation',
      text: '账号 A001 与用户 U089 绑定成功',
      tag: '已绑定',
      tagType: 'primary'
    }
  ]
}
