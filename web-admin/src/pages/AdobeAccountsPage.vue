<script setup>
import { computed, onMounted, ref } from "vue"
import { Plus, Refresh } from "@element-plus/icons-vue"
import { listAdobeAccounts } from "../api/admin"
import { accountStatus, displayValue, formatDate, remainingDays } from "../utils/format"

const accounts = ref([])
const loading = ref(false)
const errorMessage = ref("")
const searchText = ref("")

const filteredAccounts = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  if (!keyword) {
    return accounts.value
  }

  return accounts.value.filter((account) => {
    const searchable = [
      account.adobeCode,
      account.accountEmail,
      account.verificationEmail,
      account.accountPlan,
      account.remark,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()

    return keyword.split(/\s+/).every((word) => searchable.includes(word))
  })
})

const stats = computed(() => {
  const total = accounts.value.length
  const normal = accounts.value.filter((account) => accountStatus(account).kind === "success").length
  const soon = accounts.value.filter((account) => accountStatus(account).kind === "warning").length
  const disabled = accounts.value.filter((account) => !account.enabled).length

  return { total, normal, soon, disabled }
})

async function loadAccounts() {
  loading.value = true
  errorMessage.value = ""

  try {
    accounts.value = await listAdobeAccounts()
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      errorMessage.value = "请先登录。当前 Vue 管理台会沿用浏览器里的 mailCodeToken。"
    } else {
      errorMessage.value = error.message || "账户列表加载失败"
    }
  } finally {
    loading.value = false
  }
}

function remainingText(account) {
  const days = remainingDays(account.accountExpireAt)
  if (!Number.isFinite(days)) {
    return "-"
  }
  return days <= 0 ? "0 天" : `${days} 天`
}

function tagType(kind) {
  if (kind === "success") {
    return "success"
  }
  if (kind === "warning") {
    return "warning"
  }
  if (kind === "danger") {
    return "danger"
  }
  return "info"
}

onMounted(loadAccounts)
</script>

<template>
  <el-main class="main-panel">
    <el-card class="hero-card" shadow="never">
      <div class="hero-content">
        <div>
          <p class="eyebrow">Web Admin</p>
          <h1>Adobe账户管理</h1>
          <span>Vue 版本已接入现有 Express API，后续逐步迁移编辑、详情和续费功能。</span>
        </div>
        <div class="hero-actions">
          <el-button :icon="Refresh" @click="loadAccounts">刷新</el-button>
          <el-button type="primary" :icon="Plus" disabled>新增账户</el-button>
        </div>
      </div>
    </el-card>

    <el-row :gutter="16">
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card class="stat-card" shadow="never">
          <span>账户总数</span>
          <strong>{{ stats.total }}</strong>
          <small>{{ loading ? "加载中" : "实时接口" }}</small>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card class="stat-card" shadow="never">
          <span>正常账户</span>
          <strong>{{ stats.normal }}</strong>
          <small>当前可用</small>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card class="stat-card" shadow="never">
          <span>即将到期</span>
          <strong>{{ stats.soon }}</strong>
          <small>30天内</small>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card class="stat-card" shadow="never">
          <span>已停用</span>
          <strong>{{ stats.disabled }}</strong>
          <small>需关注</small>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="content-card" shadow="never">
      <template #header>
        <div class="card-head">
          <div>
            <h2>账户列表</h2>
            <p>当前先完成只读列表迁移，避免把新增/编辑/删除一次性搬进来导致风险变大。</p>
          </div>
          <el-input
            v-model="searchText"
            clearable
            class="search-input"
            placeholder="搜索账户编号 / 邮箱 / 验证码邮箱"
          />
        </div>
      </template>

      <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" />

      <el-table v-else v-loading="loading" :data="filteredAccounts" row-key="id" stripe>
        <el-table-column prop="adobeCode" label="账户编号" min-width="120">
          <template #default="{ row }">{{ displayValue(row.adobeCode) }}</template>
        </el-table-column>
        <el-table-column prop="accountEmail" label="账户邮箱" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">{{ displayValue(row.accountEmail) }}</template>
        </el-table-column>
        <el-table-column prop="verificationEmail" label="验证码邮箱" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">{{ displayValue(row.verificationEmail) }}</template>
        </el-table-column>
        <el-table-column prop="accountPlan" label="账户计划" min-width="140">
          <template #default="{ row }">{{ displayValue(row.accountPlan) }}</template>
        </el-table-column>
        <el-table-column prop="accountExpireAt" label="到期日" min-width="130">
          <template #default="{ row }">{{ formatDate(row.accountExpireAt) }}</template>
        </el-table-column>
        <el-table-column label="剩余天数" min-width="120">
          <template #default="{ row }">{{ remainingText(row) }}</template>
        </el-table-column>
        <el-table-column label="状态" min-width="110">
          <template #default="{ row }">
            <el-tag :type="tagType(accountStatus(row).kind)" effect="light" round>
              {{ accountStatus(row).text }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="启用" min-width="100">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'" effect="plain" round>
              {{ row.enabled ? "启用" : "禁用" }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </el-main>
</template>
