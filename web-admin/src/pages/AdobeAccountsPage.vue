<script setup>
import { computed, ref } from "vue"
import {
  Calendar,
  CirclePlus,
  CircleCheckFilled,
  DataAnalysis,
  Delete,
  EditPen,
  Search,
  View,
  WarningFilled,
} from "@element-plus/icons-vue"

const emit = defineEmits(["view-detail"])

const searchText = ref("")
const planFilter = ref("")
const statusFilter = ref("")
const enabledFilter = ref("")
const currentPage = ref(1)
const pageSize = ref(10)

const accounts = ref([
  ["A0014", "shanshanz1878313@proton.me", "shanshanz1878313@889100.xyz", "全家桶半年付（180天）", "2026/5/7", 7, "正常", false, 1],
  ["A0010", "alstonlewis@proton.me", "alstonlewis@889100.xyz", "全家桶半年付（180天）", "2026/5/9", 9, "正常", true, 0],
  ["A0009", "jeremyhosea24@proton.me", "jeremyhosea24@889100.xyz", "全家桶半年付（180天）", "2026/5/10", 10, "正常", true, 2],
  ["A0007", "nellyhosea@proton.me", "nellyhosea@889100.xyz", "全家桶半年付（180天）", "2026/5/11", 11, "正常", true, 1],
  ["A0006", "leeforster25@proton.me", "leeforster25@889100.xyz", "全家桶半年付（180天）", "2026/5/11", 11, "正常", true, 1],
  ["A0005", "tracydolly551@gmail.com", "tracydolly551@889100.xyz", "全家桶半年付（180天）", "2026/5/11", 11, "正常", true, 1],
  ["A0001", "1170175069@qq.com", "1170175069@889100.xyz", "全家桶半年付（180天）", "2026/6/1", 32, "正常", true, 1],
  ["A0015", "784774726@qq.com", "784774726@889100.xyz", "全家桶半年付（180天）", "2026/6/15", 46, "正常", true, 1],
  ["A0002", "tuzki98@icloud.com", "tuzki98@889100.xyz", "全家桶半年付（180天）", "2026/7/10", 71, "正常", true, 2],
  ["A0016", "tracygunther@proton.me", "tracygunther@889100.xyz", "全家桶半年付（180天）", "2026/8/6", 98, "正常", true, 1],
  ["A0012", "mrlee19900517@outlook.com", "mrlee19900517@889100.xyz", "全家桶半年付（180天）", "2026/9/11", 134, "正常", false, 1],
  ["A0004", "rachelmike@proton.me", "rachelmike@889100.xyz", "全家桶半年付（180天）", "2026/10/24", 177, "正常", true, 1],
  ["A0013", "lutherbrooke@proton.me", "lutherbrooke@889100.xyz", "全家桶半年付（180天）", "2026/3/19", 0, "已到期", true, 1],
  ["A0011", "elmerhoyle23@outlook.com", "elmerhoyle23@889100.xyz", "全家桶月付（30天）", "2025/10/4", 0, "已到期", true, 1],
  ["A0008", "hirambrook@proton.me", "hirambrook@889100.xyz", "全家桶半年付（180天）", "2025/12/20", 0, "已到期", true, 1],
  ["A0017", "mollyreed@proton.me", "mollyreed@889100.xyz", "全家桶半年付（180天）", "2026/4/28", 0, "已到期", false, 1],
].map(([code, email, verifyEmail, plan, expiresAt, days, status, enabled, bindings]) => ({
  code,
  email,
  verifyEmail,
  plan,
  expiresAt,
  days,
  status,
  enabled,
  bindings,
})))

const filteredAccounts = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  return accounts.value.filter((account) => {
    const matchesKeyword = !keyword || [
      account.code,
      account.email,
      account.verifyEmail,
    ].join(" ").toLowerCase().includes(keyword)
    const matchesPlan = !planFilter.value || account.plan === planFilter.value
    const matchesStatus = !statusFilter.value || account.status === statusFilter.value
    const matchesEnabled = !enabledFilter.value || String(account.enabled) === enabledFilter.value
    return matchesKeyword && matchesPlan && matchesStatus && matchesEnabled
  })
})

const pagedAccounts = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredAccounts.value.slice(start, start + pageSize.value)
})

const pageRangeText = computed(() => {
  const total = filteredAccounts.value.length
  if (total === 0) {
    return "本页 0 条 / 共 0 条"
  }

  const start = (currentPage.value - 1) * pageSize.value + 1
  const end = Math.min(start + pagedAccounts.value.length - 1, total)
  return `本页 ${start}-${end} 条 / 共 ${total} 条`
})

const stats = computed(() => {
  const expired = accounts.value.filter((item) => item.status === "已到期").length
  const disabled = accounts.value.filter((item) => !item.enabled).length
  const expiring = accounts.value.filter((item) => item.days > 0 && item.days <= 30).length
  const normal = accounts.value.filter((item) => item.status === "正常").length
  return {
    total: accounts.value.length,
    expired,
    disabled,
    expiring,
    normal,
  }
})

function statusType(status) {
  return status === "已到期" ? "danger" : "warning"
}

function dayClass(days) {
  if (days <= 0) {
    return "is-expired"
  }
  if (days <= 30) {
    return "is-warning"
  }
  return ""
}

function handleSizeChange(size) {
  pageSize.value = size
  currentPage.value = 1
}
</script>

<template>
  <el-main class="main-panel admin-dashboard">
    <el-header class="admin-main-header" height="124px">
      <el-row class="admin-stat-row">
        <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
          <el-card class="metric-card" shadow="never">
            <div class="metric-icon adobe-icon"><el-icon><DataAnalysis /></el-icon></div>
            <div>
              <span>账户总数</span>
              <strong>{{ stats.total }}</strong>
              <small>{{ stats.expired }} 个已到期</small>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
          <el-card class="metric-card" shadow="never">
            <div class="metric-icon success"><el-icon><CircleCheckFilled /></el-icon></div>
            <div>
              <span>正常账户</span>
              <strong class="success-text">{{ stats.normal }}</strong>
              <small>当前可用</small>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
          <el-card class="metric-card" shadow="never">
            <div class="metric-icon warning"><el-icon><Calendar /></el-icon></div>
            <div>
              <span>即将到期</span>
              <strong class="warning-text">{{ stats.expiring }}</strong>
              <small>30天内到期</small>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
          <el-card class="metric-card" shadow="never">
            <div class="metric-icon danger"><el-icon><WarningFilled /></el-icon></div>
            <div>
              <span>已停用</span>
              <strong class="danger-text">{{ stats.disabled }}</strong>
              <small>需关注</small>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-header>

    <section class="admin-main-content">
      <section class="account-title-section">
        <div class="account-table-title">
          <h1>账户列表</h1>
          <p>只显示必要信息，详情、编辑和续费记录在弹窗中处理。</p>
        </div>
      </section>

      <section class="account-filter-section">
        <div class="account-toolbar">
          <el-input
            v-model="searchText"
            clearable
            class="account-search"
            :prefix-icon="Search"
            placeholder="搜索账户编号 / 账户邮箱 / 验证码邮箱"
          />
          <el-select v-model="planFilter" clearable placeholder="全部账户计划">
            <el-option label="全家桶半年付（180天）" value="全家桶半年付（180天）" />
            <el-option label="全家桶月付（30天）" value="全家桶月付（30天）" />
          </el-select>
          <el-select v-model="statusFilter" clearable placeholder="全部状态">
            <el-option label="正常" value="正常" />
            <el-option label="已到期" value="已到期" />
          </el-select>
          <el-select v-model="enabledFilter" clearable placeholder="全部启用状态">
            <el-option label="启用" value="true" />
            <el-option label="禁用" value="false" />
          </el-select>
          <el-button class="add-account-button" type="primary" :icon="CirclePlus">
            新增Adobe账户
          </el-button>
        </div>
      </section>

      <section class="account-list-section">
        <el-table
          class="account-table"
          :data="pagedAccounts"
          height="100%"
          stripe
          row-key="code"
        >
          <el-table-column prop="code" label="账户编号" width="92" />
          <el-table-column prop="email" label="账户邮箱" min-width="220" show-overflow-tooltip />
          <el-table-column prop="plan" label="账户计划" min-width="170" />
          <el-table-column prop="expiresAt" label="到期日" width="108" />
          <el-table-column label="剩余天数" width="98">
            <template #default="{ row }">
              <strong class="days-text" :class="dayClass(row.days)">
                {{ row.days }} 天
              </strong>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="92">
            <template #default="{ row }">
              <el-tag :type="statusType(row.status)" effect="light" round>
                {{ row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="启用" width="82">
            <template #default="{ row }">
              <el-switch v-model="row.enabled" />
            </template>
          </el-table-column>
          <el-table-column prop="bindings" label="绑定用户数" width="104" align="center" />
          <el-table-column label="操作" fixed="right" width="300">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button size="small" :icon="View" round @click="emit('view-detail', row)">查看</el-button>
                <el-button size="small" :icon="EditPen" round>编辑</el-button>
                <el-button size="small" :icon="Delete" round type="danger" plain>删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <div class="account-table-footer">
        <strong>{{ pageRangeText }}</strong>
        <el-pagination
          background
          layout="sizes, prev, pager, next"
          :current-page="currentPage"
          :page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="filteredAccounts.length"
          @current-change="currentPage = $event"
          @size-change="handleSizeChange"
        />
      </div>
    </section>
  </el-main>
</template>
