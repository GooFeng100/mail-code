<script setup>
import {
  Back,
  Calendar,
  CopyDocument,
  EditPen,
  Link,
  ShoppingCartFull,
  Tickets,
  User,
  View,
} from "@element-plus/icons-vue"

const props = defineProps({
  account: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(["back"])

const detail = {
  code: props.account.code || "A0014",
  email: props.account.email || "shanshanz1878313@proton.me",
  password: "000000",
  emailPassword: "-",
  verifyEmail: props.account.verifyEmail || "shanshanz1878313@889100.xyz",
  plan: props.account.plan || "全家桶半年付（180天）",
  paidAt: "2025/11/8",
  expiresAt: props.account.expiresAt || "2026/5/7",
  days: props.account.days ?? 7,
  status: props.account.status || "正常",
  enabled: props.account.enabled === false ? "禁用" : "启用",
  remark: "-",
}

const currentCustomers = [
  {
    code: "C0013",
    nickname: "张晶晶",
    contact: "微信 张晶晶",
    plan: "全家桶半年付（180天）",
    expiresAt: "2026/5/17",
    days: 17,
    status: "正常",
  },
]

const renewals = [
  {
    date: "2025/11/8",
    plan: "全家桶半年付（180天）",
    days: 180,
    before: "-",
    after: "2026/5/7",
    remark: "首次购买",
    action: "基准记录",
  },
]
</script>

<template>
  <el-main class="main-panel admin-dashboard account-detail-page">
    <el-header class="admin-main-header" height="124px">
      <el-row class="admin-stat-row customer-stat-row">
        <el-col :xs="24" :sm="8" :md="8" :lg="8" :xl="8">
          <el-card class="metric-card" shadow="never">
            <div class="metric-icon"><el-icon><User /></el-icon></div>
            <div>
              <span>绑定客户数</span>
              <strong>1</strong>
              <small>人</small>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="8" :md="8" :lg="8" :xl="8">
          <el-card class="metric-card" shadow="never">
            <div class="metric-icon success"><el-icon><Tickets /></el-icon></div>
            <div>
              <span>续费次数</span>
              <strong class="success-text">1</strong>
              <small>次</small>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="8" :md="8" :lg="8" :xl="8">
          <el-card class="metric-card" shadow="never">
            <div class="metric-icon warning"><el-icon><Calendar /></el-icon></div>
            <div>
              <span>剩余天数</span>
              <strong class="warning-text">{{ detail.days }}</strong>
              <small>天</small>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-header>

    <section class="account-detail-scroll">
      <section class="detail-card account-profile-card">
        <div class="detail-card-head">
          <div class="account-table-title">
            <h1>Adobe账户详情</h1>
          </div>
          <div class="detail-actions">
            <el-button :icon="CopyDocument" round>详情复制</el-button>
            <el-button :icon="EditPen" round>编辑账户</el-button>
            <el-button :icon="Back" round @click="emit('back')">返回账户列表</el-button>
          </div>
        </div>

        <div class="account-detail-grid">
          <div><span>账号编号</span><strong>{{ detail.code }}</strong></div>
          <div><span>Adobe账户邮箱</span><strong class="detail-link">{{ detail.email }}</strong></div>
          <div><span>Adobe密码</span><strong class="detail-link">{{ detail.password }}</strong></div>

          <div><span>账户计划</span><strong>{{ detail.plan }}</strong></div>
          <div><span>验证码接收邮箱</span><strong>{{ detail.verifyEmail }}</strong></div>
          <div><span>Adobe账户邮箱密码</span><strong>{{ detail.emailPassword }}</strong></div>

          <div><span>付费日期</span><strong>{{ detail.paidAt }}</strong></div>
          <div><span>Adobe账户到期日</span><strong>{{ detail.expiresAt }}</strong></div>
          <div><span>剩余天数</span><strong class="warning-text">{{ detail.days }} 天</strong></div>

          <div><span>启用状态</span><strong>{{ detail.enabled }}</strong></div>
          <div><span>状态</span><strong class="warning-text">{{ detail.status }}</strong></div>
          <div><span>备注</span><strong>{{ detail.remark }}</strong></div>
        </div>
      </section>

      <section class="detail-card detail-table-card">
        <div class="detail-card-head compact">
          <h2>当前使用客户</h2>
          <el-button class="detail-primary-button" type="primary" round>
            <el-icon><Link /></el-icon>
            <span>新增绑定</span>
          </el-button>
        </div>
        <el-table class="account-table detail-table" :data="currentCustomers" stripe>
          <el-table-column prop="code" label="客户编号" width="120" />
          <el-table-column prop="nickname" label="客户昵称" min-width="160" />
          <el-table-column prop="contact" label="联系方式" min-width="180" />
          <el-table-column prop="plan" label="购买计划" min-width="200" />
          <el-table-column prop="expiresAt" label="售后到期日" width="140" />
          <el-table-column label="剩余天数" width="120">
            <template #default="{ row }">
              <strong class="days-text is-warning">{{ row.days }} 天</strong>
            </template>
          </el-table-column>
          <el-table-column label="续费状态" width="120">
            <template #default="{ row }">
              <el-tag type="warning" effect="light" round>{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="110">
            <template #default>
              <el-button size="small" :icon="View" round>查看</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <section class="detail-card detail-table-card">
        <div class="detail-card-head compact">
          <h2>Adobe账户续费记录</h2>
          <el-button class="detail-primary-button" type="primary" round>
            <el-icon><ShoppingCartFull /></el-icon>
            <span>新增续费</span>
          </el-button>
        </div>
        <el-table class="account-table detail-table" :data="renewals" stripe>
          <el-table-column prop="date" label="续费日期" width="150" />
          <el-table-column prop="plan" label="续费套餐" min-width="220" />
          <el-table-column prop="days" label="增加天数" width="140" />
          <el-table-column prop="before" label="续费前到期日" width="170" />
          <el-table-column prop="after" label="续费后到期日" width="170" />
          <el-table-column prop="remark" label="备注" min-width="160" />
          <el-table-column prop="action" label="操作" width="140" />
        </el-table>
      </section>
    </section>
  </el-main>
</template>
