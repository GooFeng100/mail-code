<script setup>
import {
  Back,
  Calendar,
  DataAnalysis,
  EditPen,
  Link,
  ShoppingCartFull,
  View,
} from "@element-plus/icons-vue"

const props = defineProps({
  customer: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(["back"])

const detail = {
  code: props.customer.code || "C0009",
  nickname: props.customer.nickname || "炸鸡求在炼丹炉背客人",
  contact: props.customer.contact || "微信",
  email: "-",
  plan: props.customer.plan || "全家桶半年付（180天）",
  status: props.customer.status || "正常",
  expiresAt: props.customer.expiresAt || "2026/5/2",
  days: props.customer.days ?? 2,
  remark: props.customer.remark || "-",
}

const activeAccounts = [
  {
    code: "A0009",
    email: "jeremyhosea24@proton.me",
    role: "primary",
    plan: "全家桶半年付（180天）",
    expiresAt: "2026/5/10",
    days: 10,
    status: "正常",
  },
]

const renewals = [
  {
    date: "2025/11/3",
    plan: "全家桶半年付（180天）",
    days: 180,
    before: "-",
    after: "2026/5/2",
    remark: "首次购买",
    action: "基准记录",
  },
]

function roleLabel(role) {
  return role === "primary" ? "主要" : "备用"
}
</script>

<template>
  <el-main class="main-panel admin-dashboard account-detail-page">
    <el-header class="admin-main-header" height="124px">
      <el-row class="admin-stat-row customer-stat-row">
        <el-col :xs="24" :sm="8" :md="8" :lg="8" :xl="8">
          <el-card class="metric-card" shadow="never">
            <div class="metric-icon"><el-icon><DataAnalysis /></el-icon></div>
            <div>
              <span>绑定账户数</span>
              <strong>1</strong>
              <small>个</small>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="8" :md="8" :lg="8" :xl="8">
          <el-card class="metric-card" shadow="never">
            <div class="metric-icon success"><el-icon><ShoppingCartFull /></el-icon></div>
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
            <h1>客户详情</h1>
          </div>
          <div class="detail-actions">
            <el-button :icon="EditPen" round>编辑客户</el-button>
            <el-button :icon="Back" round @click="emit('back')">返回客户列表</el-button>
          </div>
        </div>

        <div class="account-detail-grid customer-detail-grid">
          <div><span>客户编号</span><strong>{{ detail.code }}</strong></div>
          <div><span>客户昵称</span><strong>{{ detail.nickname }}</strong></div>
          <div><span>联系方式</span><strong>{{ detail.contact }}</strong></div>

          <div><span>购买计划</span><strong>{{ detail.plan }}</strong></div>
          <div><span>联系邮箱</span><strong>{{ detail.email }}</strong></div>
          <div><span>续费状态</span><strong class="warning-text">{{ detail.status }}</strong></div>

          <div><span>售后到期日</span><strong>{{ detail.expiresAt }}</strong></div>
          <div><span>剩余天数</span><strong class="warning-text">{{ detail.days }} 天</strong></div>
          <div><span>备注</span><strong>{{ detail.remark }}</strong></div>
        </div>
      </section>

      <section class="detail-card detail-table-card">
        <div class="detail-card-head compact">
          <h2>使用中的 Adobe账户</h2>
          <el-button class="detail-primary-button" type="primary" round>
            <el-icon><Link /></el-icon>
            <span>新增绑定</span>
          </el-button>
        </div>
        <el-table class="account-table detail-table" :data="activeAccounts" stripe>
          <el-table-column prop="code" label="Adobe账户编号" width="150" />
          <el-table-column prop="email" label="Adobe账户邮箱" min-width="260" />
          <el-table-column label="主备" width="130">
            <template #default="{ row }">
              <span class="assignment-role" :class="{ 'is-backup': row.role === 'backup' }">
                <el-switch v-model="row.role" active-value="primary" inactive-value="backup" />
                <strong>{{ roleLabel(row.role) }}</strong>
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="plan" label="账户计划" min-width="200" />
          <el-table-column prop="expiresAt" label="到期日" width="140" />
          <el-table-column label="剩余天数" width="120">
            <template #default="{ row }">
              <strong class="days-text is-warning">{{ row.days }} 天</strong>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="120">
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
          <h2>客户续费记录</h2>
          <el-button class="detail-primary-button" type="primary" round>
            <el-icon><ShoppingCartFull /></el-icon>
            <span>新增续费</span>
          </el-button>
        </div>
        <el-table class="account-table detail-table" :data="renewals" stripe>
          <el-table-column prop="date" label="续费日期" width="150" />
          <el-table-column prop="plan" label="续费套餐" min-width="220" />
          <el-table-column prop="days" label="增加天数" width="140" />
          <el-table-column prop="before" label="续费前售后到期日" width="190" />
          <el-table-column prop="after" label="续费后售后到期日" width="190" />
          <el-table-column prop="remark" label="备注" min-width="160" />
          <el-table-column prop="action" label="操作" width="140" />
        </el-table>
      </section>
    </section>
  </el-main>
</template>
