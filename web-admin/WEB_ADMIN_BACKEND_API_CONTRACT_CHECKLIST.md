# Web Admin 后端 API 契约清单

## 1. 说明

- 范围：基于 `web-admin` 当前前端代码反推的后端接口契约。
- 用途：给后端开发、联调、接口文档补齐、测试验收使用。
- 重要说明：
  - 本文中的“前端强依赖”表示前端当前代码直接读取或提交这些字段。
  - 本文中的“推断建议”表示前端没有直接强依赖，但从业务流看后端最好保证。
  - 当前前端没有完整表单规则体系，因此很多输入合法性需要后端负责兜底。

## 2. 全局契约

### 2.1 认证

- 除登录接口外，其余接口默认需要 Bearer Token。
- 前端会把 token 放在：`Authorization: Bearer <token>`。
- 如果接口返回 `401`：
  - 前端会清 token。
  - 前端会退回登录页。

### 2.2 返回格式

前端当前兼容两类成功条件：

- HTTP `2xx` 且返回体里没有 `ok: false`
- HTTP `2xx` 且返回体任意 JSON 对象

前端当前失败识别规则：

- HTTP 非 `2xx`
- 或返回体中有 `ok === false`

失败提示优先级：

1. `error.data.error`
2. `error.message`
3. 页面层默认错误文案

建议后端统一返回：

```json
{
  "ok": true,
  "message": "操作成功",
  "data": {}
}
```

但注意：前端目前**不是**按 `data.xxx` 取值，而是直接按顶层字段取值，所以如果要统一包一层 `data`，前端也需要同步改造。

更贴近当前前端实现的推荐格式：

```json
{
  "ok": true,
  "message": "操作成功",
  "items": [],
  "total": 0
}
```

或：

```json
{
  "ok": true,
  "message": "操作成功",
  "user": {},
  "token": "..."
}
```

### 2.3 时间字段

前端强依赖的日期字段基本都需要能被 `new Date(value)` 正常解析，推荐返回：

- `YYYY-MM-DD`
- 或 ISO 8601 字符串

涉及字段包括但不限于：

- `paidAt`
- `baseExpireAt`
- `accountExpireAt`
- `firstPaidAt`
- `baseAfterSalesExpireAt`
- `afterSalesExpireAt`
- `assignedAt`
- `renewalDate`
- `createdAt`
- `receivedAt`
- `expiresAt`

### 2.4 分页字段

所有列表接口建议统一：

- 请求参数：`page`, `pageSize`, `keyword`
- 返回字段：`items`, `total`

前端强依赖：

- `items` 必须是数组
- `total` 必须是数字

## 3. 认证与用户侧接口

### 3.1 `POST /api/auth/login`

#### 请求体

```json
{
  "username": "string",
  "password": "string"
}
```

#### 前端强依赖返回字段

```json
{
  "token": "jwt-or-token",
  "user": {
    "role": "admin|user",
    "type": "admin|user",
    "username": "string",
    "accountEmail": "string"
  }
}
```

#### 契约要求

- 必须返回 `token`，否则前端不会保存登录态。
- `user.role` 或 `user.type` 至少要有一个可用于区分 `admin` / 非 `admin`。
- 登录失败建议返回：

```json
{
  "ok": false,
  "error": "账号或密码错误"
}
```

### 3.2 `GET /api/me`

#### 前端强依赖返回字段

```json
{
  "user": {
    "role": "admin|user",
    "type": "admin|user",
    "username": "string",
    "accountEmail": "string"
  }
}
```

#### 契约要求

- 当 token 失效时返回 `401`。
- 成功时返回的用户结构最好与登录接口一致。

### 3.3 `GET /api/codes`

#### 前端强依赖返回字段

```json
{
  "codes": [
    {
      "id": "string|number",
      "code": "string",
      "from": "string|null",
      "emailAddress": "string|null",
      "receivedAt": "date-string",
      "expiresAt": "date-string"
    }
  ]
}
```

#### 契约要求

- `code` 必须可直接展示和复制。
- `expiresAt` 必须是未来时间才会展示，否则前端自动过滤。
- 建议 `id` 全局唯一，否则实时去重会异常。

### 3.4 Socket.IO `new_code`

#### 握手

- 客户端通过 `auth.token` 传 token。

#### 事件 payload

```json
{
  "id": "string|number",
  "code": "string",
  "from": "string|null",
  "emailAddress": "string|null",
  "receivedAt": "date-string",
  "expiresAt": "date-string"
}
```

#### 契约要求

- 新事件到达后前端会按 `id` 去重。
- 推荐同一条验证码的推送与列表接口字段完全一致。

## 4. 配置接口

### 4.1 `GET /api/admin/config`

#### 前端强依赖返回字段

```json
{
  "plans": [
    {
      "id": "string|number",
      "name": "string",
      "days": 30,
      "enabled": true,
      "sortOrder": 1,
      "remark": "string"
    }
  ],
  "mailDomainConfigs": [
    {
      "domain": "example.com",
      "verificationCodeUrl": "https://example.com"
    }
  ],
  "mailDomains": ["example.com"]
}
```

#### 契约要求

- `plans` 是账户计划和续费天数计算的核心数据。
- 推荐 `plans` 已按 `sortOrder` 升序返回，因为前端默认取第一项作为默认值。
- `mailDomainConfigs` 与 `mailDomains` 至少保证一个可用：
  - 如果有 `mailDomainConfigs`，前端优先用它的 `domain`。
  - 如果没有，前端退回 `mailDomains`。
- `verificationCodeUrl` 推荐返回完整 URL；当前前端也能容忍域名字符串。

## 5. Adobe 账户接口

### 5.1 `GET /api/admin/adobe-accounts`

#### Query

- `page`
- `pageSize`
- `keyword`
- `planId`
- `status`：前端会传 `normal | expiring | expired`
- `enabled`：前端会传字符串 `true | false`

#### 前端强依赖返回结构

```json
{
  "items": [
    {
      "id": 1,
      "adobeCode": "A0001",
      "accountEmail": "adobe001@outlook.com",
      "adobePassword": "string",
      "accountEmailPassword": "string",
      "verificationEmail": "prefix@example.com",
      "accountPlan": "家庭版包年",
      "accountPlanId": "plan_1",
      "paidAt": "2026-05-01",
      "baseExpireAt": "2026-06-01",
      "accountExpireAt": "2026-06-01",
      "remainingDays": 26,
      "enabled": true,
      "assignmentCount": 2,
      "remark": "string"
    }
  ],
  "total": 100,
  "stats": {
    "total": 100,
    "normal": 80,
    "expiring": 15,
    "expired": 5,
    "disabled": 3
  }
}
```

#### 契约要求

- `remainingDays` 建议后端直接返回，前端当前依赖它做状态色和统计展示。
- `stats` 建议与当前筛选无关，返回总体统计；如果要改成随筛选变化，前端需要认知一致。
- `accountPlan` 允许是展示名，`accountPlanId` 用于编辑回填。

### 5.2 `POST /api/admin/adobe-accounts`

#### 请求体

```json
{
  "adobeCode": "",
  "accountEmail": "string",
  "adobePassword": "string",
  "accountEmailPassword": "string",
  "verificationEmail": "prefix@example.com",
  "accountPlan": "plan-id-or-name",
  "paidAt": "2026-05-06",
  "baseExpireAt": "2026-06-05",
  "enabled": true,
  "remark": "string"
}
```

#### 契约要求

- 前端新增时 `adobeCode` 可能为空字符串，建议后端自动生成。
- 后端应校验：
  - `accountEmail` 非空且格式合法
  - `verificationEmail` 非空且格式合法
  - `accountPlan` 可映射到有效计划
  - `paidAt`、`baseExpireAt` 合法
- 成功建议返回 `message`，前端会优先展示后端返回的消息。

### 5.3 `PUT /api/admin/adobe-accounts/:id`

#### 请求体类型 A：完整编辑

同新增结构。

#### 请求体类型 B：局部更新

```json
{ "enabled": true }
```

#### 契约要求

- 建议支持局部更新，否则行内启用开关会失败。
- 找不到 `id` 时建议返回 404。

### 5.4 `DELETE /api/admin/adobe-accounts/:id`

#### 契约要求

- 前端文案预期：删除账户会连带删除续费记录和绑定关系。
- 如果后端不支持级联删除，需要前端文案或后端实现二选一保持一致。
- 建议删除失败时返回明确原因，如“账户仍存在不可删除的依赖关系”。

### 5.5 `GET /api/admin/adobe-accounts/:id/detail`

#### 前端强依赖返回结构

```json
{
  "adobeAccount": {
    "id": 1,
    "adobeCode": "A0001",
    "accountEmail": "string",
    "adobePassword": "string",
    "accountEmailPassword": "string",
    "verificationEmail": "prefix@example.com",
    "accountPlan": "家庭版包年",
    "accountPlanId": "plan_1",
    "initialAccountPlan": "家庭版包年",
    "initialAccountPlanId": "plan_1",
    "paidAt": "2026-05-01",
    "baseExpireAt": "2026-06-01",
    "accountExpireAt": "2026-07-01",
    "remainingDays": 56,
    "enabled": true,
    "remark": "string"
  },
  "customers": [
    {
      "id": 1,
      "customerCode": "C0001",
      "customerNickname": "张三",
      "customerContact": "微信xxx",
      "purchasedPlan": "家庭版包年",
      "afterSalesExpireAt": "2026-07-01",
      "remainingDays": 56
    }
  ],
  "renewalRecords": [
    {
      "id": 1,
      "initial": false,
      "renewalDate": "2026-06-01",
      "planId": "plan_1",
      "remark": "string",
      "createdAt": "2026-06-01T12:00:00.000Z"
    }
  ]
}
```

#### 契约要求

- `renewalRecords` 中前端会自行过滤 `initial`，也会自己补一条基准记录，因此后端可以返回也可以不返回首条初始记录，但字段语义要稳定。
- `customers[]` 最好只返回当前有效绑定客户；如果返回无效绑定，也需要前端同步改造。

### 5.6 `POST /api/admin/adobe-accounts/:id/renewals`

#### 请求体

```json
{
  "planId": "plan_1",
  "renewalDate": "2026-05-06",
  "remark": "string"
}
```

#### 契约要求

- `planId` 必须可映射到配置中的有效计划。
- 后端最好自己重算最终到期日，不信任前端展示计算值。
- 建议拒绝非法日期、非法计划、已删除账户等情况。

### 5.7 `DELETE /api/admin/adobe-accounts/:id/renewals/:renewalId`

#### 契约要求

- 前端不允许删基准记录，但后端仍应二次校验，避免误删首条基准记录。
- 删除后建议重新计算账户最终到期日。

## 6. 客户接口

### 6.1 `GET /api/admin/customers`

#### Query

- `page`
- `pageSize`
- `keyword`
- `planId`
- `status`：前端会传 `normal | expiring | expired`

#### 前端强依赖返回结构

```json
{
  "items": [
    {
      "id": 1,
      "customerCode": "C0001",
      "customerNickname": "张三",
      "customerContact": "微信xxx",
      "customerContactEmail": "a@example.com",
      "purchasedPlan": "家庭版包年",
      "purchasedPlanId": "plan_1",
      "firstPaidAt": "2026-05-01",
      "baseAfterSalesExpireAt": "2026-06-01",
      "afterSalesExpireAt": "2026-06-01",
      "remainingDays": 26,
      "assignmentCount": 1,
      "remark": "string"
    }
  ],
  "total": 100,
  "stats": {
    "total": 100,
    "normal": 90,
    "expiring": 10
  }
}
```

#### 契约要求

- `remainingDays` 建议后端直接返回。
- `assignmentCount` 建议后端聚合返回。

### 6.2 `POST /api/admin/customers`

#### 请求体

```json
{
  "customerCode": "",
  "customerNickname": "string",
  "customerContact": "string",
  "customerContactEmail": "string",
  "purchasedPlan": "plan-id-or-name",
  "firstPaidAt": "2026-05-06",
  "baseAfterSalesExpireAt": "2026-06-05",
  "remark": "string"
}
```

#### 契约要求

- 前端新增时 `customerCode` 可能为空字符串，建议后端自动生成。
- 后端应校验：
  - `customerNickname` 非空
  - `customerContact` 非空
  - `purchasedPlan` 可映射到有效计划
  - 日期合法
- `remark` 前端限制 200 字，但后端仍建议做长度兜底。

### 6.3 `PUT /api/admin/customers/:id`

- 请求体同新增。
- 建议支持完整更新。

### 6.4 `DELETE /api/admin/customers/:id`

#### 契约要求

- 前端文案预期：删除客户会连带删除续费记录和绑定关系。
- 如不做级联删除，需要同步修正文案或改前端流程。

### 6.5 `GET /api/admin/customers/:id/detail`

#### 前端强依赖返回结构

```json
{
  "customer": {
    "id": 1,
    "customerCode": "C0001",
    "customerNickname": "张三",
    "customerContact": "微信xxx",
    "customerContactEmail": "a@example.com",
    "purchasedPlan": "家庭版包年",
    "purchasedPlanId": "plan_1",
    "initialPurchasedPlan": "家庭版包年",
    "initialPurchasedPlanId": "plan_1",
    "firstPaidAt": "2026-05-01",
    "baseAfterSalesExpireAt": "2026-06-01",
    "afterSalesExpireAt": "2026-07-01",
    "remainingDays": 56,
    "remark": "string"
  },
  "adobeAccounts": [
    {
      "id": 1,
      "adobeCode": "A0001",
      "accountEmail": "string",
      "accountPlan": "家庭版包年",
      "accountExpireAt": "2026-07-01",
      "remainingDays": 56,
      "assignmentRole": "primary",
      "assignmentId": 11
    }
  ],
  "renewalRecords": [
    {
      "id": 1,
      "initial": false,
      "renewalDate": "2026-06-01",
      "planId": "plan_1",
      "remark": "string",
      "createdAt": "2026-06-01T12:00:00.000Z"
    }
  ]
}
```

#### 契约要求

- `adobeAccounts[]` 里必须带 `assignmentId`，否则客户详情页无法改单条绑定的主备关系。
- `assignmentRole` 只能是 `primary` 或 `backup`。

### 6.6 `POST /api/admin/customers/:id/renewals`

- 请求体同 Adobe 账户续费：`{ planId, renewalDate, remark }`
- 建议后端自行重算售后到期日。

### 6.7 `DELETE /api/admin/customers/:id/renewals/:renewalId`

- 建议后端禁止删除首条基准记录。
- 删除后建议重算客户最终售后到期日。

## 7. 绑定关系接口

### 7.1 `GET /api/admin/assignments`

#### Query

- `page`
- `pageSize`
- `keyword`
- `role`：`primary | backup`
- `active`：字符串 `true | false`

#### 前端强依赖返回结构

```json
{
  "items": [
    {
      "id": 11,
      "customerId": 1,
      "customerCode": "C0001",
      "customerNickname": "张三",
      "adobeAccountId": 2,
      "adobeCode": "A0002",
      "accountEmail": "string",
      "assignmentRole": "primary",
      "assignedAt": "2026-05-06",
      "active": true,
      "canRestore": true
    }
  ],
  "total": 10
}
```

#### 契约要求

- `assignmentRole` 只能返回 `primary` 或 `backup`。
- `active` 必须是布尔值。
- `canRestore` 仅在无效绑定场景下生效，前端据此禁用恢复按钮。

### 7.2 `POST /api/admin/assignments`

#### 请求体

```json
{
  "customerId": 1,
  "adobeAccountId": 2,
  "assignmentRole": "primary",
  "assignedAt": "2026-05-06"
}
```

#### 契约要求

- 后端应校验：
  - 客户存在
  - Adobe 账户存在
  - `assignmentRole` 合法
  - 日期合法
  - 绑定关系是否重复
- 建议明确主要/备用的业务规则：
  - 一个客户是否允许多个 `primary`
  - 一个账户是否允许多个 `primary`
  - 重复绑定是否允许恢复旧记录而不是新建

### 7.3 `PUT /api/admin/assignments/:id`

#### 前端会发出的三类请求体

```json
{ "assignmentRole": "backup" }
```

```json
{ "active": false }
```

```json
{ "active": true }
```

#### 契约要求

- 建议支持局部更新。
- `active: true` 恢复失败时建议返回明确错误，比如“客户已绑定其他主要账户，无法恢复”。

### 7.4 `DELETE /api/admin/assignments/:id`

#### 契约要求

- 前端只允许删除无效绑定，但后端仍建议二次校验。
- 建议删除有效绑定时直接拒绝并给出业务提示。

## 8. 参数接口

### 8.1 `GET /api/admin/parameters`

#### Query

- `page`
- `pageSize`
- `keyword`

#### 前端强依赖返回结构

```json
{
  "items": [
    {
      "id": 1,
      "category": "plan",
      "name": "家庭版包年",
      "days": 365,
      "enabled": true,
      "sortOrder": 1,
      "remark": "string",
      "createdAt": "2026-05-01T12:00:00.000Z"
    }
  ],
  "total": 10
}
```

#### 契约要求

- `category=plan` 时会被用于账户计划显示。
- 推荐服务端按 `sortOrder` 升序返回。

### 8.2 `POST /api/admin/parameters`

#### 请求体

```json
{
  "category": "plan",
  "name": "string",
  "days": 365,
  "enabled": true,
  "sortOrder": 1,
  "remark": "string"
}
```

#### 契约要求

- 后端应校验：
  - `name` 非空
  - `days >= 0`
  - `sortOrder >= 1`
  - `category` 合法
- 若 `category=plan`，建议避免重名导致下游计划匹配混乱。

### 8.3 `PUT /api/admin/parameters/:id`

#### 前端会发出的两类请求体

```json
{
  "category": "plan",
  "name": "string",
  "days": 365,
  "enabled": true,
  "sortOrder": 1,
  "remark": "string"
}
```

```json
{ "enabled": true }
```

#### 契约要求

- 必须支持局部更新 `{ enabled }`，否则列表行内开关会失败。

### 8.4 `DELETE /api/admin/parameters/:id`

#### 契约要求

- 前端文案预期：已被引用的参数会被后端阻止删除。
- 建议实际实现该保护逻辑，并返回明确错误信息，例如：

```json
{
  "ok": false,
  "error": "该参数已被账户/客户/续费记录引用，无法删除"
}
```

## 9. 后端最容易漏掉的点

### 9.1 字段名一致性

前端当前对字段名非常敏感，以下字段如果改名，前端会直接显示空值或功能失效：

- `items`, `total`, `stats`
- `remainingDays`
- `assignmentCount`
- `accountPlanId`, `purchasedPlanId`
- `assignmentId`
- `mailDomainConfigs[].domain`
- `mailDomainConfigs[].verificationCodeUrl`

### 9.2 列表与详情字段差异

建议不要让“列表字段”和“详情字段”同名但语义不同，尤其是：

- `accountPlan`
- `purchasedPlan`
- `baseExpireAt`
- `baseAfterSalesExpireAt`
- `accountExpireAt`
- `afterSalesExpireAt`

### 9.3 前端未拦截的输入

后端必须兜底校验，因为前端当前不会严格阻止这些情况：

- 空用户名/空密码登录
- Adobe 账户邮箱为空
- 验证码接收邮箱为空
- 客户昵称为空
- 联系方式为空
- 绑定弹窗未选客户/未选账户
- 参数名称为空

### 9.4 状态与统计口径

建议后端统一口径：

- `remainingDays < 0`：已到期
- `remainingDays <= 30`：即将到期
- `remainingDays > 30`：正常

并确保：

- 列表 `stats` 与行内 `remainingDays` 的统计口径一致
- 详情页对象的 `remainingDays` 与列表页同口径

## 10. 联调优先级建议

### P0

- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/admin/config`
- `GET /api/admin/adobe-accounts`
- `GET /api/admin/customers`
- `GET /api/admin/assignments`
- `GET /api/admin/parameters`
- `GET /api/codes`
- Socket.IO `new_code`

### P1

- `POST/PUT/DELETE /api/admin/adobe-accounts...`
- `POST/PUT/DELETE /api/admin/customers...`
- `POST/PUT/DELETE /api/admin/assignments...`
- `POST/PUT/DELETE /api/admin/parameters...`

### P2

- 详情接口的续费记录正确计算
- 参数引用删除保护
- 绑定恢复业务规则
- 统计口径完全对齐

## 11. 如果要把这份清单变成正式 Swagger / Apifox 文档

建议优先补齐：

- 每个接口的成功返回示例
- 每个接口的失败返回示例
- 每个枚举字段的可选值说明：
  - `role`
  - `status`
  - `active`
  - `enabled`
  - `assignmentRole`
  - `category`
- 级联删除、恢复绑定、参数删除限制等业务规则说明
