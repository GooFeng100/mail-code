<script setup>
import { computed, ref } from "vue"
import {
  Calendar,
  CircleCheckFilled,
  CirclePlus,
  Delete,
  EditPen,
  Search,
  User,
  View,
} from "@element-plus/icons-vue"

const searchText = ref("")
const planFilter = ref("")
const statusFilter = ref("")
const currentPage = ref(1)
const pageSize = ref(10)

const customers = ref([
  ["C0009", "炸鸡求在炼丹炉背客人", "微信", "全家桶半年付（180天）", "2026/5/2", 2, "正常", 1, "-"],
  ["C0013", "张晶晶", "微信 张晶晶", "全家桶半年付（180天）", "2026/5/17", 17, "正常", 1, "-"],
  ["C0001", "大米先生", "微信 大米先生", "全家桶半年付（180天）", "2026/6/1", 32, "正常", 1, "-"],
  ["C0014", "袁博", "微信 HM_YB2023", "全家桶半年付（180天）", "2026/6/15", 46, "正常", 1, "-"],
  ["C0002", "Vian_Singleton", "闲鱼 Vian_Singleton", "全家桶半年付（180天）", "2026/7/10", 71, "正常", 1, "-"],
  ["C0010", "年年", "微信 年年", "全家桶半年付（180天）", "2026/7/27", 88, "正常", 1, "-"],
  ["C0015", "花雷", "微信 花雷", "全家桶半年付（180天）", "2026/8/6", 98, "正常", 1, "-"],
  ["C0011", "鱼丸粗面", "微信 鱼丸粗面", "全家桶半年付（180天）", "2026/9/11", 134, "正常", 1, "-"],
  ["C0012", "freeze Frame", "微信 CONCISE", "全家桶年付（365天）", "2026/9/26", 149, "正常", 1, "-"],
  ["C0005", "木木", "微信 木木", "全家桶半年付（180天）", "2026/10/4", 157, "正常", 1, "-"],
  ["C0006", "小风", "QQ 68190021", "全家桶月付（30天）", "2026/5/9", 9, "正常", 1, "-"],
  ["C0007", "老周", "微信 oldzhou", "全家桶半年付（180天）", "2026/4/22", 0, "已到期", 0, "待续费"],
  ["C0008", "Summer", "微信 summer2026", "全家桶半年付（180天）", "2026/4/25", 0, "已到期", 0, "暂停服务"],
  ["C0016", "阿澈", "微信 ache", "全家桶半年付（180天）", "2026/5/28", 28, "正常", 1, "-"],
  ["C0017", "蓝鲸", "QQ 77230018", "全家桶年付（365天）", "2026/12/8", 221, "正常", 2, "-"],
].map(([code, nickname, contact, plan, expiresAt, days, status, bindings, remark]) => ({
  code,
  nickname,
  contact,
  plan,
  expiresAt,
  days,
  status,
  bindings,
  remark,
})))

const filteredCustomers = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  return customers.value.filter((customer) => {
    const matchesKeyword = !keyword || [
      customer.code,
      customer.nickname,
      customer.contact,
    ].join(" ").toLowerCase().includes(keyword)
    const matchesPlan = !planFilter.value || customer.plan === planFilter.value
    const matchesStatus = !statusFilter.value || customer.status === statusFilter.value
    return matchesKeyword && matchesPlan && matchesStatus
  })
})

const pagedCustomers = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredCustomers.value.slice(start, start + pageSize.value)
})

const pageRangeText = computed(() => {
  const total = filteredCustomers.value.length
  if (total === 0) {
    return "本页 0 条 / 共 0 条"
  }

  const start = (currentPage.value - 1) * pageSize.value + 1
  const end = Math.min(start + pagedCustomers.value.length - 1, total)
  return `本页 ${start}-${end} 条 / 共 ${total} 条`
})

const stats = computed(() => {
  const normal = customers.value.filter((item) => item.status === "正常").length
  const expiring = customers.value.filter((item) => item.days > 0 && item.days <= 30).length
  return {
    total: customers.value.length,
    normal,
    expiring,
  }
})

function statusType(status) {
  return status === "已到期" ? "danger" : "success"
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
      <el-row class="admin-stat-row customer-stat-row">
        <el-col :xs="24" :sm="8" :md="8" :lg="8" :xl="8">
          <el-card class="metric-card" shadow="never">
            <div class="metric-icon"><el-icon><User /></el-icon></div>
            <div>
              <span>用户总数</span>
              <strong>{{ stats.total }}</strong>
              <small>售后正常</small>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="8" :md="8" :lg="8" :xl="8">
          <el-card class="metric-card" shadow="never">
            <div class="metric-icon success"><el-icon><CircleCheckFilled /></el-icon></div>
            <div>
              <span>正常账户数</span>
              <strong class="success-text">{{ stats.normal }}</strong>
              <small>售后正常</small>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="8" :md="8" :lg="8" :xl="8">
          <el-card class="metric-card" shadow="never">
            <div class="metric-icon warning"><el-icon><Calendar /></el-icon></div>
            <div>
              <span>即将到期日</span>
              <strong class="warning-text">{{ stats.expiring }}</strong>
              <small>30天内到期</small>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-header>

    <section class="admin-main-content">
      <section class="account-title-section">
        <div class="account-table-title">
          <h1>客户列表</h1>
          <p>只显示客户管理所需核心信息，详情、编辑和续费记录在弹窗中处理。</p>
        </div>
      </section>

      <section class="account-filter-section">
        <div class="account-toolbar customer-toolbar">
          <el-input
            v-model="searchText"
            clearable
            class="account-search"
            :prefix-icon="Search"
            placeholder="搜索客户编号 / 昵称 / 联系方式"
          />
          <el-select v-model="planFilter" clearable placeholder="全部购买计划">
            <el-option label="全家桶半年付（180天）" value="全家桶半年付（180天）" />
            <el-option label="全家桶年付（365天）" value="全家桶年付（365天）" />
            <el-option label="全家桶月付（30天）" value="全家桶月付（30天）" />
          </el-select>
          <el-select v-model="statusFilter" clearable placeholder="全部状态">
            <el-option label="正常" value="正常" />
            <el-option label="已到期" value="已到期" />
          </el-select>
          <el-button class="add-account-button" type="primary" :icon="CirclePlus">
            新增客户
          </el-button>
        </div>
      </section>

      <section class="account-list-section">
        <el-table
          class="account-table customer-table"
          :data="pagedCustomers"
          height="100%"
          row-key="code"
        >
          <el-table-column prop="code" label="客户编号" width="120" />
          <el-table-column prop="nickname" label="客户昵称" min-width="180" show-overflow-tooltip />
          <el-table-column prop="contact" label="联系方式" min-width="190" show-overflow-tooltip />
          <el-table-column prop="plan" label="购买计划" min-width="190" />
          <el-table-column prop="expiresAt" label="售后到期日" width="130" />
          <el-table-column label="剩余天数" width="120">
            <template #default="{ row }">
              <strong class="days-text" :class="dayClass(row.days)">
                {{ row.days }} 天
              </strong>
            </template>
          </el-table-column>
          <el-table-column label="续费状态" width="120">
            <template #default="{ row }">
              <el-tag :type="statusType(row.status)" effect="light" round>
                {{ row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="bindings" label="绑定账户数" width="120" align="center" />
          <el-table-column prop="remark" label="备注" min-width="100" align="center" />
          <el-table-column label="操作" fixed="right" width="260">
            <template #default>
              <div class="table-actions">
                <el-button size="small" :icon="View" round>查看</el-button>
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
          :total="filteredCustomers.length"
          @current-change="currentPage = $event"
          @size-change="handleSizeChange"
        />
      </div>
    </section>
  </el-main>
</template>
