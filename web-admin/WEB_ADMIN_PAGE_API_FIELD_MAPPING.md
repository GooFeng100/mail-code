# Web Admin 页面 -> API -> 字段映射清单

## 1. 说明

- 范围：`web-admin/src/pages/*.vue`、`web-admin/src/components/*.vue`、`web-admin/src/api/*.js`
- 用途：给前端联调、后端回包对齐、测试造数用。
- 说明：下面的“响应字段”是根据前端模板和脚本**实际读取到的字段**整理的，不代表后端不能返回更多字段。

## 2. 全局入口

### 2.1 `App.vue`

| 页面/模块 | 触发时机 | API | 入参 | 前端依赖的返回字段 |
| --- | --- | --- | --- | --- |
| 会话恢复 | 应用启动时且本地有 token | `GET /api/me` | 无 | `user.role` / `user.type`、`user.username`、`user.accountEmail` |
| 登录后路由分流 | 登录成功后 | 无新增请求，使用登录接口返回 | 无 | `user.role` / `user.type` |

### 2.2 登录页 `LoginPage.vue`

| 页面/模块 | 触发时机 | API | 请求体 | 前端依赖的返回字段 |
| --- | --- | --- | --- | --- |
| 登录 | 点击登录按钮 | `POST /api/auth/login` | `{ username, password }` | `token`、`user.role` / `user.type`、`user.username`、`user.accountEmail` |

### 2.3 普通用户验证码页 `UserCodePage.vue`

| 页面/模块 | 触发时机 | API/事件 | 入参 | 前端依赖的返回字段 |
| --- | --- | --- | --- | --- |
| 初始验证码列表 | 页面挂载 | `GET /api/codes` | 无 | `codes[]`，其中每项使用 `id`、`code`、`from`、`emailAddress`、`receivedAt`、`expiresAt` |
| 实时验证码推送 | Socket 建连后 | `new_code` 事件 | `auth.token = getToken()` | 事件 payload 使用 `id`、`code`、`from`、`emailAddress`、`receivedAt`、`expiresAt` |

## 3. 管理端共享配置

### 3.1 `GET /api/admin/config`

使用页面：

- `AdobeAccountsPage.vue`
- `AdobeAccountDetailPage.vue`
- `CustomerManagementPage.vue`
- `CustomerDetailPage.vue`

前端依赖字段：

| 返回字段 | 使用位置 | 说明 |
| --- | --- | --- |
| `plans` | 账户/客户新增编辑、续费弹窗 | 下拉选项与天数计算来源 |
| `plans[].id` | 所有计划选择器 | 作为 `value` |
| `plans[].name` | 所有计划展示 | 作为 `label` 和详情显示 |
| `plans[].days` | 到期日、续费日推算 | 用于 `paidAt + days`、`renewal + days` |
| `mailDomainConfigs` | Adobe 新增编辑、Adobe 详情 | 验证码邮箱域名列表和域名到网址映射 |
| `mailDomainConfigs[].domain` | Adobe 表单 | 验证码邮箱域名下拉项 |
| `mailDomainConfigs[].verificationCodeUrl` | Adobe 详情复制文本 | 根据域名映射验证码网页地址 |
| `mailDomains` | Adobe 新增编辑兜底 | 当 `mailDomainConfigs` 为空时回退使用 |

## 4. Adobe 账户模块映射

### 4.1 Adobe 账户列表页 `AdobeAccountsPage.vue`

#### 4.1.1 列表请求

| 触发时机 | API | Query | 前端依赖的返回字段 |
| --- | --- | --- | --- |
| 页面首次加载 | `GET /api/admin/adobe-accounts` | `page`, `pageSize`, `keyword`, `planId`, `status`, `enabled` | `items[]`, `total`, `stats.total`, `stats.normal`, `stats.expiring`, `stats.expired`, `stats.disabled` |
| 搜索/筛选变化 | 同上 | 同上 | 同上 |
| 分页变化 | 同上 | 同上 | 同上 |

#### 4.1.2 列表行字段

每个 `items[]` 行对象实际被页面使用的字段：

| 字段 | 用途 |
| --- | --- |
| `id` | 行唯一键、查看/编辑/删除/启用开关操作 |
| `adobeCode` | 账户编号展示、跳转详情、删除确认 |
| `accountEmail` | 账户邮箱展示 |
| `accountPlan` | 账户计划展示 |
| `accountPlanId` | 编辑回填计划值 |
| `accountExpireAt` | 到期日展示、删除确认 |
| `remainingDays` | 剩余天数和状态色 |
| `enabled` | 启用开关状态 |
| `assignmentCount` | 绑定用户数展示 |
| `verificationEmail` | 删除确认、编辑回填拆分域名 |
| `adobePassword` | 编辑回填 |
| `accountEmailPassword` | 编辑回填 |
| `paidAt` | 编辑回填 |
| `baseExpireAt` | 编辑回填 |
| `remark` | 编辑回填 |

#### 4.1.3 新增账户

| 触发时机 | API | 请求体 |
| --- | --- | --- |
| 新增弹窗点击保存 | `POST /api/admin/adobe-accounts` | `{ adobeCode, accountEmail, adobePassword, accountEmailPassword, verificationEmail, accountPlan, paidAt, baseExpireAt, enabled, remark }` |

表单字段来源：

| 前端表单字段 | 提交字段 |
| --- | --- |
| `code` | `adobeCode` |
| `email` | `accountEmail` |
| `password` | `adobePassword` |
| `emailPassword` | `accountEmailPassword` |
| `verifyEmailPrefix + verifyEmailDomain` | `verificationEmail` |
| `plan` | `accountPlan` |
| `paidAt` | `paidAt` |
| `baseExpireAt` | `baseExpireAt` |
| `enabled` | `enabled` |
| `remark` | `remark` |

#### 4.1.4 编辑账户/启用开关

| 触发时机 | API | 请求体 |
| --- | --- | --- |
| 编辑弹窗点击保存 | `PUT /api/admin/adobe-accounts/:id` | 与新增账户同结构 |
| 行内切换启用状态 | `PUT /api/admin/adobe-accounts/:id` | `{ enabled }` |

### 4.2 Adobe 账户详情页 `AdobeAccountDetailPage.vue`

#### 4.2.1 详情请求

| 触发时机 | API | 入参 | 前端依赖的返回字段 |
| --- | --- | --- | --- |
| 页面挂载/刷新详情 | `GET /api/admin/adobe-accounts/:id/detail` | 路径参数 `id` | `adobeAccount`, `customers[]`, `renewalRecords[]` |
| 页面挂载时加载客户选项 | `GET /api/admin/customers` | `page=1&pageSize=50` | `items[]` |

#### 4.2.2 `adobeAccount` 字段

| 字段 | 用途 |
| --- | --- |
| `id` | 编辑、续费、绑定操作 |
| `adobeCode` | 详情展示、编辑回填 |
| `accountEmail` | 详情展示、复制、编辑回填 |
| `adobePassword` | 详情展示、复制、编辑回填 |
| `accountEmailPassword` | 详情展示、编辑回填 |
| `accountPlan` | 详情展示、编辑回填、初始计划推断 |
| `accountPlanId` | 编辑回填 |
| `initialAccountPlan` | 首条基准续费记录计划推断 |
| `initialAccountPlanId` | 首条基准续费记录计划推断 |
| `verificationEmail` | 详情展示、编辑回填、域名映射 |
| `paidAt` | 详情展示、首条基准续费记录、编辑回填 |
| `baseExpireAt` | 编辑回填、续费基准记录 |
| `accountExpireAt` | 详情展示、续费弹窗 `previousExpireAt` |
| `remainingDays` | 顶部统计、状态展示 |
| `enabled` | 详情展示、编辑回填 |
| `remark` | 详情展示、编辑回填 |

#### 4.2.3 `customers[]` 字段

| 字段 | 用途 |
| --- | --- |
| `id` | 跳转客户详情 |
| `customerCode` | 当前客户表展示 |
| `customerNickname` | 当前客户表展示 |
| `customerContact` | 当前客户表展示 |
| `purchasedPlan` | 当前客户表展示 |
| `afterSalesExpireAt` | 当前客户表展示 |
| `remainingDays` | 当前客户表状态色和剩余天数 |

#### 4.2.4 `renewalRecords[]` 字段

| 字段 | 用途 |
| --- | --- |
| `id` | 删除续费记录 |
| `initial` | 过滤是否是后端标记的基准记录 |
| `renewalDate` | 续费排序与展示 |
| `planId` | 续费套餐与天数计算 |
| `remark` | 续费备注 |
| `createdAt` | 同日续费记录排序 |

#### 4.2.5 详情页动作

| 触发时机 | API | 请求体 |
| --- | --- | --- |
| 编辑账户保存 | `PUT /api/admin/adobe-accounts/:id` | 同 Adobe 列表编辑结构 |
| 新增续费 | `POST /api/admin/adobe-accounts/:id/renewals` | `{ planId, renewalDate, remark }` |
| 删除续费 | `DELETE /api/admin/adobe-accounts/:id/renewals/:renewalId` | 无 |
| 从详情页新增绑定 | `POST /api/admin/assignments` | `{ customerId, adobeAccountId, assignmentRole, assignedAt }` |

## 5. 客户模块映射

### 5.1 客户列表页 `CustomerManagementPage.vue`

#### 5.1.1 列表请求

| 触发时机 | API | Query | 前端依赖的返回字段 |
| --- | --- | --- | --- |
| 页面首次加载 | `GET /api/admin/customers` | `page`, `pageSize`, `keyword`, `planId`, `status` | `items[]`, `total`, `stats.total`, `stats.normal`, `stats.expiring` |
| 搜索/筛选变化 | 同上 | 同上 | 同上 |
| 分页变化 | 同上 | 同上 | 同上 |

#### 5.1.2 列表行字段

| 字段 | 用途 |
| --- | --- |
| `id` | 行唯一键、查看/编辑/删除 |
| `customerCode` | 客户编号展示、跳转详情、删除确认 |
| `customerNickname` | 列表展示、编辑回填、删除确认 |
| `customerContact` | 列表展示、编辑回填、删除确认 |
| `customerContactEmail` | 编辑回填 |
| `purchasedPlan` | 列表展示、编辑回填 |
| `purchasedPlanId` | 编辑回填计划值 |
| `firstPaidAt` | 编辑回填 |
| `baseAfterSalesExpireAt` | 编辑回填 |
| `afterSalesExpireAt` | 列表展示、删除确认 |
| `remainingDays` | 剩余天数和状态色 |
| `assignmentCount` | 绑定账户数展示 |
| `remark` | 列表展示、编辑回填 |

#### 5.1.3 新增/编辑客户

| 触发时机 | API | 请求体 |
| --- | --- | --- |
| 新增保存 | `POST /api/admin/customers` | `{ customerCode, customerNickname, customerContact, customerContactEmail, purchasedPlan, firstPaidAt, baseAfterSalesExpireAt, remark }` |
| 编辑保存 | `PUT /api/admin/customers/:id` | 同新增结构 |
| 删除客户 | `DELETE /api/admin/customers/:id` | 无 |

### 5.2 客户详情页 `CustomerDetailPage.vue`

#### 5.2.1 详情请求

| 触发时机 | API | 入参 | 前端依赖的返回字段 |
| --- | --- | --- | --- |
| 页面挂载/刷新详情 | `GET /api/admin/customers/:id/detail` | 路径参数 `id` | `customer`, `adobeAccounts[]`, `renewalRecords[]` |
| 页面挂载时加载账户选项 | `GET /api/admin/adobe-accounts` | `page=1&pageSize=50` | `items[]` |

#### 5.2.2 `customer` 字段

| 字段 | 用途 |
| --- | --- |
| `id` | 编辑、续费、绑定操作 |
| `customerCode` | 详情展示、编辑回填 |
| `customerNickname` | 详情展示、编辑回填 |
| `customerContact` | 详情展示、编辑回填 |
| `customerContactEmail` | 详情展示、编辑回填 |
| `purchasedPlan` | 详情展示、编辑回填、首条基准续费记录计划推断 |
| `purchasedPlanId` | 编辑回填 |
| `initialPurchasedPlan` | 首条基准续费记录计划推断 |
| `initialPurchasedPlanId` | 首条基准续费记录计划推断 |
| `firstPaidAt` | 详情展示、基准续费记录、编辑回填 |
| `baseAfterSalesExpireAt` | 编辑回填、续费基准记录 |
| `afterSalesExpireAt` | 详情展示、续费弹窗 `previousExpireAt` |
| `remainingDays` | 顶部统计、状态展示 |
| `remark` | 详情展示、编辑回填 |

#### 5.2.3 `adobeAccounts[]` 字段

| 字段 | 用途 |
| --- | --- |
| `id` | 跳转账户详情 |
| `adobeCode` | 绑定账户表展示 |
| `accountEmail` | 绑定账户表展示 |
| `accountPlan` | 绑定账户表展示 |
| `accountExpireAt` | 绑定账户表展示 |
| `remainingDays` | 绑定账户表状态色和剩余天数 |
| `assignmentRole` | 主备开关展示与修改 |
| `assignmentId` | 修改主备关系时提交 |

#### 5.2.4 `renewalRecords[]` 字段

| 字段 | 用途 |
| --- | --- |
| `id` | 删除续费记录 |
| `initial` | 过滤是否是后端标记的基准记录 |
| `renewalDate` | 续费排序与展示 |
| `planId` | 续费套餐与天数计算 |
| `remark` | 续费备注 |
| `createdAt` | 同日续费记录排序 |

#### 5.2.5 详情页动作

| 触发时机 | API | 请求体 |
| --- | --- | --- |
| 编辑客户保存 | `PUT /api/admin/customers/:id` | 同客户列表编辑结构 |
| 新增续费 | `POST /api/admin/customers/:id/renewals` | `{ planId, renewalDate, remark }` |
| 删除续费 | `DELETE /api/admin/customers/:id/renewals/:renewalId` | 无 |
| 从详情页新增绑定 | `POST /api/admin/assignments` | `{ customerId, adobeAccountId, assignmentRole, assignedAt }` |
| 修改主备关系 | `PUT /api/admin/assignments/:assignmentId` | `{ assignmentRole }` |

## 6. 绑定关系模块映射

### 6.1 绑定管理页 `AssignmentManagementPage.vue`

#### 6.1.1 列表与选项请求

| 触发时机 | API | Query | 前端依赖的返回字段 |
| --- | --- | --- | --- |
| 页面首次加载 | `GET /api/admin/assignments` | `page`, `pageSize`, `keyword`, `role`, `active` | `items[]`, `total` |
| 页面首次加载 | `GET /api/admin/customers` | `page=1&pageSize=50` | `items[]`，其中使用 `id`, `customerCode`, `customerNickname` |
| 页面首次加载 | `GET /api/admin/adobe-accounts` | `page=1&pageSize=50` | `items[]`，其中使用 `id`, `adobeCode`, `accountEmail` |
| 搜索/筛选变化 | `GET /api/admin/assignments` | 同列表 Query | `items[]`, `total` |

#### 6.1.2 列表行字段

| 字段 | 用途 |
| --- | --- |
| `id` | 行唯一键、解绑/恢复/删除/修改主备 |
| `customerId` | 跳转客户详情 |
| `customerCode` | 客户编号展示、删除确认 |
| `customerNickname` | 客户昵称展示、删除确认 |
| `adobeAccountId` | 跳转账户详情 |
| `adobeCode` | Adobe 账户编号展示、删除确认 |
| `accountEmail` | Adobe 账户邮箱展示、删除确认 |
| `assignmentRole` | 主备开关展示与修改 |
| `assignedAt` | 绑定日期展示、删除确认 |
| `active` | 有效/无效状态、操作按钮分支 |
| `canRestore` | 无效绑定是否允许恢复 |

#### 6.1.3 动作请求

| 触发时机 | API | 请求体 |
| --- | --- | --- |
| 新增绑定 | `POST /api/admin/assignments` | `{ customerId, adobeAccountId, assignmentRole, assignedAt }` |
| 修改主备 | `PUT /api/admin/assignments/:id` | `{ assignmentRole }` |
| 解绑 | `PUT /api/admin/assignments/:id` | `{ active: false }` |
| 恢复 | `PUT /api/admin/assignments/:id` | `{ active: true }` |
| 删除无效绑定 | `DELETE /api/admin/assignments/:id` | 无 |

## 7. 参数设置模块映射

### 7.1 参数设置页 `ParameterSettingsPage.vue`

#### 7.1.1 列表请求

| 触发时机 | API | Query | 前端依赖的返回字段 |
| --- | --- | --- | --- |
| 页面首次加载 | `GET /api/admin/parameters` | `page`, `pageSize`, `keyword` | `items[]`, `total` |
| 搜索变化 | 同上 | 同上 | 同上 |
| 分页变化 | 同上 | 同上 | 同上 |

#### 7.1.2 列表行字段

| 字段 | 用途 |
| --- | --- |
| `id` | 编辑/删除/启用开关 |
| `category` | 参数分类展示 |
| `name` | 参数名称展示、编辑回填 |
| `days` | 有效期天数展示、编辑回填 |
| `enabled` | 启用开关 |
| `sortOrder` | 排序展示、编辑回填 |
| `remark` | 备注展示、编辑回填 |
| `createdAt` | 创建时间展示 |

#### 7.1.3 动作请求

| 触发时机 | API | 请求体 |
| --- | --- | --- |
| 新增参数 | `POST /api/admin/parameters` | `{ category, name, days, enabled, sortOrder, remark }` |
| 编辑参数 | `PUT /api/admin/parameters/:id` | 同新增结构 |
| 切换启用状态 | `PUT /api/admin/parameters/:id` | `{ enabled }` |
| 删除参数 | `DELETE /api/admin/parameters/:id` | 无 |

## 8. 共用弹窗映射

### 8.1 `RenewalDialog.vue`

| 来源页面 | 打开时传入 | 用户提交时输出 |
| --- | --- | --- |
| Adobe 账户详情页 | `plans`, `previousExpireAt=account.accountExpireAt`, `subjectLabel="Adobe账户"` | `{ planId, renewalDate, remark }` |
| 客户详情页 | `plans`, `previousExpireAt=customer.afterSalesExpireAt`, `subjectLabel="客户"` | `{ planId, renewalDate, remark }` |

### 8.2 `BindingDialog.vue`

| 来源页面 | 打开模式 | 输入选项/锁定项 | 用户提交时输出 |
| --- | --- | --- | --- |
| 绑定管理页 | `bind` / `unbind` / `restore` | `customerOptions`, `accountOptions`, `binding` | `{ mode, id, customerId, adobeAccountId, assignmentRole, assignedAt }` |
| Adobe 账户详情页 | `bind` | `lockedAccount=account`, `customerOptions`, `accountOptions=[account]` | 同上 |
| 客户详情页 | `bind` | `lockedCustomer=customer`, `customerOptions=[customer]`, `accountOptions` | 同上 |

### 8.3 `DeleteConfirmDialog.vue`

| 来源页面 | 删除对象 | 字段数组内容 |
| --- | --- | --- |
| Adobe 列表页 | Adobe 账户 | `adobeCode`, `accountEmail`, `verificationEmail`, `accountExpireAt` |
| 客户列表页 | 客户 | `customerCode`, `customerNickname`, `customerContact`, `afterSalesExpireAt` |
| 绑定管理页 | 绑定关系 | `customerCode/customerNickname`, `adobeCode/accountEmail`, `assignmentRole`, `assignedAt`, `active` |
| 参数设置页 | 参数 | `category`, `name`, `days`, `enabled` |
| Adobe 详情页 | 续费记录 | `renewalDate`, `planName`, `planDays`, `afterExpireAt` |
| 客户详情页 | 续费记录 | `renewalDate`, `planName`, `planDays`, `afterExpireAt` |

## 9. 建议如何使用这份清单

- 联调前：先根据“请求体”把后端 DTO 对齐。
- 列表接口联调时：优先保证 `items[]`、`total`、状态字段、主键字段齐全。
- 详情接口联调时：优先保证详情对象、子表数组、续费记录字段齐全。
- 如果后端字段名与这里不一致，前端需要同步修改：
  - 列表列 `prop`
  - 编辑回填 `Object.assign(...)`
  - 提交 `payload` 构造函数
