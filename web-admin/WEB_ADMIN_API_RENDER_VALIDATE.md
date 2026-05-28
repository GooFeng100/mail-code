# Web Admin 分支接口、渲染规则与校验规则整理

## 1. 说明

- 代码范围：`web-admin/` 目录。
- 当前整理依据：当前工作树所在的 `codex/web-admin` 分支代码，以及 `web-admin/src/api/*.js`、`web-admin/src/pages/*.vue`、`web-admin/src/components/*.vue`、`web-admin/src/utils/*.js`。
- 前端技术栈：Vue 3 + Element Plus + Vite。
- 接口访问方式：统一通过 `src/api/client.js` 中的 `apiRequest` 发起，默认走同源相对路径；开发环境通过 `vite.config.js` 将 `/api` 和 `/socket.io` 代理到 `VITE_API_PROXY_TARGET`。

## 2. 全局调用规则

### 2.1 HTTP 请求规则

来源：`src/api/client.js`

- 默认请求头包含 `Content-Type: application/json`。
- 如果 `localStorage.mailCodeToken` 存在，则自动附带 `Authorization: Bearer <token>`。
- 查询参数会过滤掉 `undefined`、`null`、空字符串 `""`，只保留有效值。
- 如果 `response.status === 401` 且当前存在 token：
  - 清理本地 token。
  - 派发 `mail-code-session-expired` 事件。
  - `App.vue` 监听该事件后会强制退回登录页。
- 如果 `response.ok === false` 或后端返回 `data.ok === false`，统一抛出错误，由页面层用通知提示展示。

### 2.2 登录态与页面路由规则

来源：`src/App.vue`

- 应用启动时执行 `restoreSession()`：
  - 无 token：直接进入登录页。
  - 有 token：调用 `GET /api/me` 恢复用户信息。
- 登录成功后，根据 `user.role` 或 `user.type` 决定渲染视图：
  - `admin`：进入后台管理壳。
  - 其他：进入普通用户验证码页。
- 后台管理壳左侧菜单包含 4 个模块：
  - Adobe 账户管理
  - 客户管理
  - 绑定关系管理
  - 参数设置
- Adobe 账户详情页、客户详情页不是独立路由，而是由 `activeAdminModule` 在列表页与详情页之间切换。

### 2.3 开发代理规则

来源：`vite.config.js`

- `/api` 代理到 `VITE_API_PROXY_TARGET`。
- `/socket.io` 代理到 `VITE_API_PROXY_TARGET`，并开启 WebSocket 转发。
- 默认兜底代理地址：`http://127.0.0.1:3002`。
- 示例环境变量：
  - `.env.example`：`http://127.0.0.1:3001`
  - `.env.local`：`http://192.168.10.3:3001`

## 3. API 清单

### 3.1 认证与会话

| 方法 | 路径 | 调用位置 | 作用 | 请求参数/体 |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/login` | `src/pages/LoginPage.vue` | 登录并写入 token | `{ username, password }` |
| GET | `/api/me` | `src/App.vue` | 恢复当前登录用户信息 | 无 |

### 3.2 管理端通用配置

| 方法 | 路径 | 调用位置 | 作用 | 说明 |
| --- | --- | --- | --- | --- |
| GET | `/api/admin/config` | Adobe 列表页、Adobe 详情页、客户列表页、客户详情页 | 获取账户计划、邮箱域名配置等 | 返回值被用于下拉选项、续费天数计算、验证码地址映射 |

### 3.3 Adobe 账户相关

| 方法 | 路径 | 调用位置 | 作用 | 请求参数/体 |
| --- | --- | --- | --- | --- |
| GET | `/api/admin/adobe-accounts` | Adobe 列表页、客户详情页、绑定页、客户详情页绑定弹窗 | 获取 Adobe 账户列表 | Query: `page`, `pageSize`, `keyword`, `planId`, `status`, `enabled` |
| POST | `/api/admin/adobe-accounts` | Adobe 列表页 | 新增 Adobe 账户 | Body: `adobeCode`, `accountEmail`, `adobePassword`, `accountEmailPassword`, `verificationEmail`, `accountPlan`, `paidAt`, `baseExpireAt`, `enabled`, `remark` |
| GET | `/api/admin/adobe-accounts/:id` | `src/api/admin.js` 已封装，当前页面未直接使用 | 获取单个 Adobe 账户 | 无 |
| GET | `/api/admin/adobe-accounts/:id/detail` | Adobe 账户详情页 | 获取账户详情、当前客户、续费记录 | 无 |
| PUT | `/api/admin/adobe-accounts/:id` | Adobe 列表页、Adobe 详情页 | 编辑账户，或单独切换启用状态 | Body 支持完整更新，也支持局部更新如 `{ enabled }` |
| DELETE | `/api/admin/adobe-accounts/:id` | Adobe 列表页 | 删除 Adobe 账户 | 无 |
| POST | `/api/admin/adobe-accounts/:id/renewals` | Adobe 详情页 | 新增账户续费记录 | Body: `{ planId, renewalDate, remark }` |
| DELETE | `/api/admin/adobe-accounts/:id/renewals/:renewalId` | Adobe 详情页 | 删除续费记录 | 无 |

### 3.4 客户相关

| 方法 | 路径 | 调用位置 | 作用 | 请求参数/体 |
| --- | --- | --- | --- | --- |
| GET | `/api/admin/customers` | 客户列表页、Adobe 详情页、绑定页、Adobe 详情页绑定弹窗 | 获取客户列表 | Query: `page`, `pageSize`, `keyword`, `planId`, `status` |
| POST | `/api/admin/customers` | 客户列表页 | 新增客户 | Body: `customerCode`, `customerNickname`, `customerContact`, `customerContactEmail`, `purchasedPlan`, `firstPaidAt`, `baseAfterSalesExpireAt`, `remark` |
| GET | `/api/admin/customers/:id` | `src/api/admin.js` 已封装，当前页面未直接使用 | 获取单个客户 | 无 |
| GET | `/api/admin/customers/:id/detail` | 客户详情页 | 获取客户详情、绑定账户、续费记录 | 无 |
| PUT | `/api/admin/customers/:id` | 客户列表页、客户详情页 | 编辑客户 | Body 支持完整更新 |
| DELETE | `/api/admin/customers/:id` | 客户列表页 | 删除客户 | 无 |
| POST | `/api/admin/customers/:id/renewals` | 客户详情页 | 新增客户续费记录 | Body: `{ planId, renewalDate, remark }` |
| DELETE | `/api/admin/customers/:id/renewals/:renewalId` | 客户详情页 | 删除客户续费记录 | 无 |

### 3.5 绑定关系相关

| 方法 | 路径 | 调用位置 | 作用 | 请求参数/体 |
| --- | --- | --- | --- | --- |
| GET | `/api/admin/assignments` | 绑定管理页 | 获取绑定关系列表 | Query: `page`, `pageSize`, `keyword`, `role`, `active` |
| POST | `/api/admin/assignments` | 绑定管理页、Adobe 详情页、客户详情页 | 创建绑定关系 | Body: `customerId`, `adobeAccountId`, `assignmentRole`, `assignedAt` |
| PUT | `/api/admin/assignments/:id` | 绑定管理页、客户详情页 | 修改绑定关系 | Body 常见为 `{ assignmentRole }`、`{ active: false }`、`{ active: true }` |
| DELETE | `/api/admin/assignments/:id` | 绑定管理页 | 物理删除无效绑定记录 | 无 |

### 3.6 参数设置相关

| 方法 | 路径 | 调用位置 | 作用 | 请求参数/体 |
| --- | --- | --- | --- | --- |
| GET | `/api/admin/parameters` | 参数设置页 | 获取参数列表 | Query: `page`, `pageSize`, `keyword` |
| POST | `/api/admin/parameters` | 参数设置页 | 新增参数 | Body: `category`, `name`, `days`, `enabled`, `sortOrder`, `remark` |
| PUT | `/api/admin/parameters/:id` | 参数设置页 | 编辑参数或切换启用状态 | Body 支持完整更新，也支持局部更新如 `{ enabled }` |
| DELETE | `/api/admin/parameters/:id` | 参数设置页 | 删除参数 | 无 |

### 3.7 普通用户验证码相关

| 方法 | 路径 | 调用位置 | 作用 | 请求参数/体 |
| --- | --- | --- | --- | --- |
| GET | `/api/codes` | `src/pages/UserCodePage.vue` | 获取当前用户验证码列表 | 无 |

### 3.8 WebSocket 事件

来源：`src/pages/UserCodePage.vue`

| 协议 | 连接地址 | 鉴权方式 | 事件 | 作用 |
| --- | --- | --- | --- | --- |
| Socket.IO | `/`（实际走 `/socket.io`） | `auth.token = getToken()` | `new_code` | 收到新验证码后插入列表顶部并播放提示音 |

## 4. 页面渲染规则

### 4.1 登录页 `LoginPage.vue`

- 以全屏背景图 + 半透明登录卡片形式渲染。
- 只有两个输入项：用户名、密码。
- 点击登录按钮后调用登录接口。
- 登录失败时：
  - 弹出错误通知。
  - 播放错误音效。
  - 清空用户名和密码。
- 登录页没有独立字段级错误展示，主要依赖通知反馈。

### 4.2 普通用户验证码页 `UserCodePage.vue`

- 页面头部展示：
  - 当前账户名（优先 `accountEmail`，否则 `username`）。
  - 登录剩余有效时长（按 token `exp` 倒计时）。
- 主内容区规则：
  - 先调用 `GET /api/codes` 拉取初始验证码。
  - 再建立 Socket.IO 连接监听 `new_code`。
  - 仅渲染 `expiresAt > 当前时间` 的验证码。
  - 验证码按 `receivedAt` 倒序展示，最新的排最前。
  - 无可用验证码时展示等待态。
- 每个验证码卡片渲染字段：
  - 验证码本体
  - 发件人 `from`
  - 收件邮箱 `emailAddress`
  - 接收时间 `receivedAt`
  - 剩余有效期 `expiresAt - now`
- 复制验证码后按钮文案从 `Copy` 临时切换为 `Copied`。

### 4.3 后台壳 `App.vue`

- 左侧固定菜单，右侧为业务模块内容区。
- 详情页切换不是跳路由，而是通过组件条件渲染：
  - `adobe` -> Adobe 列表页
  - `adobeDetail` -> Adobe 详情页
  - `customers` -> 客户列表页
  - `customerDetail` -> 客户详情页
  - `assignments` -> 绑定管理页
  - `parameters` -> 参数设置页
- 会话加载中时渲染 loading 图标，不显示业务页面。

### 4.4 Adobe 账户列表页 `AdobeAccountsPage.vue`

#### 渲染结构

- 顶部 4 个统计卡片：
  - 账户总数
  - 正常账户数
  - 30 天内将到期数
  - 已停用数
- 筛选栏：
  - 关键字
  - 账户计划
  - 到期状态
  - 启用状态
  - 新增账户按钮
- 主表格列：
  - 账户编号（可点击进入详情）
  - 账户邮箱
  - 账户计划
  - 到期日
  - 剩余天数
  - 状态
  - 启用开关
  - 绑定用户数
  - 操作按钮（查看/编辑/删除）
- 底部分页区显示当前页记录范围与分页器。

#### 状态渲染规则

- `remainingDays < 0`：状态为“已到期”，颜色为 danger。
- `0 <= remainingDays <= 30`：状态为 warning。
- `remainingDays > 30`：状态为 success。
- 剩余天数显示时统一做 `Math.max(0, remainingDays)`，因此 UI 不显示负数。

#### 表单渲染规则

- 新增与编辑共用一个弹窗表单。
- 新增时：
  - 编号输入框禁用，提示“自动生成”。
  - `paidAt` 默认当天。
  - `plan` 默认配置中的第一个计划。
  - `verifyEmailDomain` 默认第一个可选域名，没有则兜底 `889100.xyz`。
- 编辑时：
  - 从当前记录回填所有字段。
  - `verificationEmail` 会拆成前缀和域名分别展示。
- 表单里会实时展示根据 `baseExpireAt` 计算出来的状态标签和剩余天数。

#### 自动计算规则

- `paidAt` 或 `plan` 变化时，如果弹窗已打开且表单已完成初始化，则自动重算 `baseExpireAt`。
- `baseExpireAt = paidAt + plan.days`，计算函数基于 UTC+8 日期逻辑。

### 4.5 Adobe 账户详情页 `AdobeAccountDetailPage.vue`

#### 数据来源

- `GET /api/admin/adobe-accounts/:id/detail` 返回：
  - `adobeAccount`
  - `customers`
  - `renewalRecords`
- 页面同时会加载：
  - 管理配置（计划、邮箱域名、验证码地址映射）
  - 客户选项（供新增绑定用）

#### 页面组成

- 顶部统计卡片：绑定客户数、续费次数、剩余天数。
- 账户详情卡：
  - 展示账户基础信息。
  - 支持一键复制“账户邮箱 + Adobe 密码 + 验证码网站地址”。
  - 单独点击邮箱/密码字段也支持复制。
- 当前客户表：展示当前绑定客户，可跳转客户详情。
- 续费记录表：展示基准记录 + 后续续费记录。

#### 续费记录渲染规则

- 页面会先构造一条“首次购买”基准记录：
  - 续费日期取 `paidAt`
  - 计划取初始计划
  - 到期日取 `baseExpireAt`
- 后续续费记录来自 `renewalRecords` 中 `initial !== true` 的数据。
- 后续记录渲染前先排序：
  - 先按 `renewalDate` 升序
  - 同一天再按 `createdAt` 升序
- 每条续费的 `afterExpireAt` 计算规则：
  - 如果续费日期晚于当前到期日，则从续费日期开始累加套餐天数。
  - 否则从当前到期日继续顺延。
- 基准记录不可删除，只有非基准记录显示删除按钮。

#### 编辑弹窗规则

- 与 Adobe 列表页字段基本一致。
- `paidAt` 或 `plan` 变化时自动重算 `baseExpireAt`。
- `verificationEmail` 域名对应的验证码网址取自 `mailDomainConfigs`，用于详情复制文本。

### 4.6 客户列表页 `CustomerManagementPage.vue`

#### 渲染结构

- 顶部 3 个统计卡片：
  - 客户总数
  - 售后正常数
  - 30 天内将到期数
- 筛选栏：关键字、购买计划、状态、新增客户按钮。
- 主表格列：
  - 客户编号（可跳详情）
  - 客户昵称
  - 联系方式
  - 购买计划
  - 售后到期日
  - 剩余天数
  - 续费状态
  - 绑定账户数
  - 备注
  - 操作
- 底部分页逻辑与 Adobe 列表页一致。

#### 表单与状态规则

- 新增/编辑共用一个弹窗表单。
- `firstPaidAt` 或 `plan` 变化时，自动重算 `baseExpireAt`。
- 状态判断、剩余天数颜色规则与 Adobe 列表页一致。
- 新增时客户编号禁用，保存后由后端生成。

### 4.7 客户详情页 `CustomerDetailPage.vue`

#### 数据来源

- `GET /api/admin/customers/:id/detail` 返回：
  - `customer`
  - `adobeAccounts`
  - `renewalRecords`
- 页面同时加载：
  - 管理配置（账户计划）
  - Adobe 账户选项（供新增绑定用）

#### 页面组成

- 顶部统计卡片：绑定账户数、续费次数、剩余天数。
- 客户详情卡：展示基础客户信息。
- Adobe 账户表：展示当前绑定账户，可跳转账户详情，并支持切换主备关系。
- 客户续费记录表：规则与 Adobe 账户详情页对称。

#### 绑定账户表规则

- 每条绑定显示主备开关：
  - `primary` 显示为主要
  - `backup` 显示为备用
- 开关切换时调用 `updateAssignment(assignmentId, { assignmentRole })`。
- 修改失败会重新拉取详情，保证 UI 与服务端一致。

#### 续费记录规则

- 基准记录由 `firstPaidAt + 初始计划 + baseAfterSalesExpireAt` 构造。
- 后续记录排序、顺延逻辑、不可删除基准记录等规则与 Adobe 账户详情页一致。

### 4.8 绑定管理页 `AssignmentManagementPage.vue`

#### 渲染结构

- 筛选栏：
  - 关键字
  - 主备关系
  - 是否有效
  - 新增绑定按钮
- 主表格列：
  - 客户编号（可跳客户详情）
  - 客户昵称
  - Adobe 账户编号（可跳账户详情）
  - Adobe 账户邮箱
  - 主备关系
  - 绑定日期
  - 是否有效
  - 操作

#### 操作渲染规则

- 有效绑定：
  - 显示“解绑”按钮。
  - 主备开关可修改。
  - 不允许直接删除。
- 无效绑定：
  - 显示“恢复”按钮。
  - 只有 `row.canRestore` 为真时才可恢复。
  - 允许删除。
- 删除弹窗只针对无效绑定记录。

#### 绑定弹窗规则

- 新增绑定时：客户和账户都可选。
- 从 Adobe 详情页进入时：账户锁定，仅选择客户。
- 从客户详情页进入时：客户锁定，仅选择账户。
- 解绑/恢复模式下：
  - 表单进入只读态。
  - 只确认动作，不允许改日期、主备、选择项。

### 4.9 参数设置页 `ParameterSettingsPage.vue`

#### 渲染结构

- 顶部为标题 + 搜索框 + 新增参数按钮。
- 主表格列：
  - 参数分类
  - 参数名称
  - 有效期天数
  - 启用状态
  - 排序
  - 备注
  - 创建时间
  - 操作
- 分类显示函数目前只对 `plan` 特判成人类可读名称，其余分类原样显示。

#### 行为规则

- 参数启用开关支持行内切换。
- 某一行启用状态切换中时：
  - 当前行显示 loading。
  - 其他行开关被禁用，防止并发切换。
- 列表搜索框变化即自动重新请求。

### 4.10 通用对话框渲染规则

#### `RenewalDialog.vue`

- 用于账户续费/客户续费。
- 打开时重置表单：
  - `renewalDate` 默认为当天。
  - `planId` 默认第一个计划。
  - `beforeExpireAt` 取当前到期日。
- 自动根据计划天数计算：
  - 增加天数 `days`
  - 续费后到期日 `afterExpireAt`
- 当 `renewalDate` 晚于当前到期日时，从续费日重新起算；否则从原到期日顺延。

#### `BindingDialog.vue`

- 根据 `mode` 渲染 3 种语义：`bind`、`unbind`、`restore`。
- 标题、说明文案、确认按钮文案、图标、主题色都会随 `mode` 改变。
- `lockedCustomer`、`lockedAccount` 用于从详情页打开时锁定一端选择。

#### `DeleteConfirmDialog.vue`

- 所有删除动作共用。
- 展示：标题、说明、待删除字段列表、风险提示。
- 提交中禁止关闭与重复点击。

### 4.11 响应式布局规则

来源：`src/style.css`

- 桌面端默认是左侧固定菜单 + 右侧内容区布局。
- `max-width: 980px`：
  - 后台壳改为纵向流式布局。
  - 侧边栏改为顶部整块展示。
  - 菜单改为两列。
- `max-width: 640px`：
  - 登录卡片缩小。
  - 用户验证码页卡片上下堆叠。
  - 后台各列表筛选工具栏改为单列。

## 5. 页面校验规则

### 5.1 结论先行

这个项目当前**没有建立集中式的 `el-form rules` 校验体系**。前端校验主要由以下几类方式组成：

- 表单项 `required` 视觉标识。
- 控件类型约束（日期选择器、数字输入器、开关、下拉选择器）。
- 计算字段自动联动，减少用户输入错误。
- 提交中禁用按钮，避免重复提交。
- 少量显式按钮禁用逻辑。
- 后端接口报错后，通过 `submitWithFeedback()` 统一提示。

换句话说：**大多数“必填”目前只是 UI 提示，不是严格的前端拦截**。

### 5.2 全局校验/保护规则

- 所有请求错误都会被统一拦截并弹出失败通知。
- 所有删除确认框在 `submitting` 期间：
  - 禁止关闭弹窗。
  - 禁止重复点击确认按钮。
- 所有编辑/新增弹窗在 `submitting` 期间：
  - 表单整体禁用。
  - `Esc` 关闭能力受限。
  - 点击遮罩不可关闭。

### 5.3 登录页校验规则

- 没有显式前端必填校验。
- 用户名、密码即使为空，点击后仍会发请求，由后端返回错误。
- 登录失败后会：
  - 清空输入框。
  - 播放错误音。
  - 弹出错误通知。

### 5.4 Adobe 账户表单校验规则

适用页面：Adobe 列表页、Adobe 详情页编辑弹窗

- 视觉上标记为必填的字段：
  - Adobe 账户邮箱
  - 验证码接收邮箱
- 没有前端 `rules` 或提交前 `if` 判断来阻止空值提交。
- 计划与支付日期联动自动生成 `baseExpireAt`，属于“自动修正型校验”。
- 状态标签完全来自 `baseExpireAt` 的剩余天数计算，不是用户手工输入。
- 启用状态使用 `el-switch`，天然只有布尔值。

### 5.5 客户表单校验规则

适用页面：客户列表页、客户详情页编辑弹窗

- 视觉上标记为必填的字段：
  - 客户昵称
  - 联系方式
  - 购买计划
  - 首次购买日期
  - 初始售后到期日
- 同样没有集中式前端拦截，空值理论上仍可提交到后端。
- `remark` 有长度限制：最多 200 字，并显示字数统计。
- `firstPaidAt + plan.days` 自动回填 `baseExpireAt`。

### 5.6 续费弹窗校验规则

适用组件：`RenewalDialog.vue`

这是当前前端里少数做了明确前端拦截的表单。

- 只有在同时满足以下条件时，保存按钮才可点击：
  - `renewalDate` 已选择
  - `planId` 已选择
- `days`、`beforeExpireAt`、`afterExpireAt` 均为只读字段，用户不能手改。
- 当计划或续费日期变化时，自动重新计算增加天数和续费后到期日。
- `remark` 为可选项。

### 5.7 绑定弹窗校验规则

适用组件：`BindingDialog.vue`

- 当前没有显式的前端“未选客户/未选账户禁止提交”逻辑。
- `bind` 模式下用户可编辑：
  - 绑定日期
  - 主备关系
  - 客户
  - Adobe 账户
- `unbind` / `restore` 模式下：
  - 表单只读
  - 本质上是确认动作，不允许用户改值
- 通过 `lockedCustomer` / `lockedAccount` 可以锁定选择项，避免详情页上下文被改坏。

### 5.8 参数表单校验规则

适用页面：参数设置页

- `days` 使用 `el-input-number`，最小值 `0`。
- `sortOrder` 使用 `el-input-number`，最小值 `1`。
- 启用状态只能通过布尔开关修改。
- `name`、`days`、`sortOrder` 没有额外前端非空校验，仍主要依赖后端校验。

### 5.9 列表筛选与状态校验规则

- 所有筛选条件变化后都会自动重新请求列表。
- 查询参数会自动过滤空字符串，因此“未选择”不会传递无意义参数。
- 状态/剩余天数判断统一遵循：
  - 小于 0：已到期
  - 0 到 30：预警
  - 大于 30：正常
- UI 展示剩余天数时统一截断为不小于 0，避免用户看到负天数。

### 5.10 时间计算校验规则

来源：`src/utils/utc8Date.js`

- 所有日期输入与日期推算都基于 UTC+8 逻辑处理，避免浏览器本地时区导致的日期偏移。
- `todayUtc8()`：返回东八区当天日期字符串。
- `dateInputValueUtc8()`：把任意日期值转成 `YYYY-MM-DD`。
- `addDaysUtc8()`：基于东八区日期字符串安全加天数。
- `remainingDaysFromDateUtc8()`：基于东八区口径计算剩余天数。

## 6. 可以直接给后续开发者的结论

- 这套前端已经把“管理后台主流程”跑通了：登录、账户、客户、绑定、参数、验证码展示都已串起来。
- 接口封装比较集中，HTTP API 都在 `src/api/admin.js` 和 `src/api/codes.js`，继续扩展成本不高。
- 渲染规则主要体现在：
  - `App.vue` 的角色/模块切换
  - 各列表页的筛选 + 统计卡片 + 状态色
  - 详情页对续费记录和绑定关系的二级展示
- 校验规则目前偏轻，主要依赖后端兜底；如果后续要提升录入质量，建议优先补：
  - Adobe 账户表单 `rules`
  - 客户表单 `rules`
  - 绑定弹窗的必选校验
  - 参数表单的名称/天数合法性校验

## 7. 相关源码入口

- `web-admin/src/api/client.js`
- `web-admin/src/api/admin.js`
- `web-admin/src/api/codes.js`
- `web-admin/src/App.vue`
- `web-admin/src/pages/LoginPage.vue`
- `web-admin/src/pages/UserCodePage.vue`
- `web-admin/src/pages/AdobeAccountsPage.vue`
- `web-admin/src/pages/AdobeAccountDetailPage.vue`
- `web-admin/src/pages/CustomerManagementPage.vue`
- `web-admin/src/pages/CustomerDetailPage.vue`
- `web-admin/src/pages/AssignmentManagementPage.vue`
- `web-admin/src/pages/ParameterSettingsPage.vue`
- `web-admin/src/components/RenewalDialog.vue`
- `web-admin/src/components/BindingDialog.vue`
- `web-admin/src/components/DeleteConfirmDialog.vue`
- `web-admin/src/utils/utc8Date.js`
- `web-admin/src/utils/databaseAction.js`

