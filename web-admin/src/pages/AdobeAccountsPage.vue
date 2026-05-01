<script setup>
import { computed, reactive, ref } from "vue"
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
import DeleteConfirmDialog from "../components/DeleteConfirmDialog.vue"
import { submitWithFeedback } from "../utils/databaseAction"

const emit = defineEmits(["view-detail"])

const searchText = ref("")
const planFilter = ref("")
const statusFilter = ref("")
const enabledFilter = ref("")
const currentPage = ref(1)
const pageSize = ref(10)
const showCreateAccountDialog = ref(false)
const accountDialogMode = ref("create")
const showDeleteAccountDialog = ref(false)
const selectedDeleteAccount = ref(null)
const accountSubmitting = ref(false)
const deleteAccountSubmitting = ref(false)

const createAccountForm = reactive({
  code: "",
  email: "",
  password: "",
  emailPassword: "",
  verifyEmailPrefix: "",
  verifyEmailDomain: "889100.xyz",
  plan: "全家桶月付（30天）",
  paidAt: "",
  baseExpireAt: "",
  status: "",
  enabled: true,
  remark: "",
})

const accountDialogTitle = computed(() => (
  accountDialogMode.value === "edit" ? "编辑Adobe账户" : "新增Adobe账户"
))

const deleteAccountFields = computed(() => {
  const account = selectedDeleteAccount.value
  if (!account) return []
  return [
    { label: "账户编号", value: account.code },
    { label: "Adobe账户", value: account.email },
    { label: "验证码邮箱", value: account.verifyEmail },
    { label: "到期日", value: account.expiresAt },
  ]
})

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

function resetAccountForm() {
  Object.assign(createAccountForm, {
    code: "",
    email: "",
    password: "",
    emailPassword: "",
    verifyEmailPrefix: "",
    verifyEmailDomain: "889100.xyz",
    plan: "全家桶月付（30天）",
    paidAt: "",
    baseExpireAt: "",
    status: "",
    enabled: true,
    remark: "",
  })
}

function openCreateAccountDialog() {
  accountDialogMode.value = "create"
  resetAccountForm()
  showCreateAccountDialog.value = true
}

function openEditAccountDialog(account) {
  const [verifyEmailPrefix = "", verifyEmailDomain = "889100.xyz"] = account.verifyEmail.split("@")
  accountDialogMode.value = "edit"
  Object.assign(createAccountForm, {
    code: account.code,
    email: account.email,
    password: "",
    emailPassword: "",
    verifyEmailPrefix,
    verifyEmailDomain,
    plan: account.plan,
    paidAt: "",
    baseExpireAt: account.expiresAt,
    status: account.status,
    enabled: account.enabled,
    remark: "",
  })
  showCreateAccountDialog.value = true
}

function openDeleteAccountDialog(account) {
  selectedDeleteAccount.value = account
  showDeleteAccountDialog.value = true
}

function handleSaveAccount() {
  submitWithFeedback({
    setLoading: (value) => { accountSubmitting.value = value },
    successMessage: accountDialogMode.value === "edit" ? "Adobe账户编辑成功。" : "Adobe账户新增成功。",
    errorMessage: accountDialogMode.value === "edit" ? "Adobe账户编辑失败。" : "Adobe账户新增失败。",
    onSuccess: () => { showCreateAccountDialog.value = false },
  })
}

function handleDeleteAccount() {
  submitWithFeedback({
    setLoading: (value) => { deleteAccountSubmitting.value = value },
    successMessage: "Adobe账户删除成功。",
    errorMessage: "Adobe账户删除失败。",
    onSuccess: () => { showDeleteAccountDialog.value = false },
  })
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
          <el-button class="add-account-button" type="primary" :icon="CirclePlus" @click="openCreateAccountDialog">
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
                <el-button size="small" :icon="EditPen" round @click="openEditAccountDialog(row)">编辑</el-button>
                <el-button size="small" :icon="Delete" round type="danger" plain @click="openDeleteAccountDialog(row)">删除</el-button>
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

    <el-dialog
      v-model="showCreateAccountDialog"
      class="account-form-dialog"
      width="800px"
      align-center
      append-to-body
      :show-close="false"
      :close-on-click-modal="false"
      :close-on-press-escape="!accountSubmitting"
    >
      <template #header>
        <h2 class="account-form-title">{{ accountDialogTitle }}</h2>
      </template>

      <el-form class="account-form-grid" :model="createAccountForm" label-position="top" :disabled="accountSubmitting">
        <el-form-item label="Adobe账户编号">
          <el-input v-model="createAccountForm.code" placeholder="自动生成，例如 A0001" disabled />
        </el-form-item>

        <el-form-item label="Adobe账户邮箱" required>
          <el-input v-model="createAccountForm.email" placeholder="adobe001@outlook.com" />
        </el-form-item>

        <el-form-item label="Adobe密码">
          <el-input v-model="createAccountForm.password" placeholder="至少 6 位" show-password />
        </el-form-item>

        <el-form-item label="Adobe邮箱密码">
          <el-input v-model="createAccountForm.emailPassword" placeholder="至少 6 位" show-password />
        </el-form-item>

        <el-form-item label="验证码接收邮箱" required>
          <div class="verification-email-control">
            <el-input v-model="createAccountForm.verifyEmailPrefix" placeholder="请输入邮箱前缀" />
            <el-select v-model="createAccountForm.verifyEmailDomain">
              <el-option label="889100.xyz" value="889100.xyz" />
              <el-option label="889100.site" value="889100.site" />
            </el-select>
          </div>
        </el-form-item>

        <el-form-item label="账户计划">
          <el-select v-model="createAccountForm.plan">
            <el-option label="全家桶月付（30天）" value="全家桶月付（30天）" />
            <el-option label="全家桶半年付（180天）" value="全家桶半年付（180天）" />
            <el-option label="全家桶年付（365天）" value="全家桶年付（365天）" />
          </el-select>
        </el-form-item>

        <el-form-item label="付费日期">
          <el-date-picker
            v-model="createAccountForm.paidAt"
            type="date"
            placeholder="yyyy / mm / dd"
            value-format="YYYY/M/D"
          />
        </el-form-item>

        <el-form-item label="初始到期日">
          <el-date-picker
            v-model="createAccountForm.baseExpireAt"
            type="date"
            placeholder="yyyy / mm / dd"
            value-format="YYYY/M/D"
          />
        </el-form-item>

        <el-form-item label="状态">
          <el-input v-model="createAccountForm.status" placeholder="根据到期日自动计算" disabled />
        </el-form-item>

        <el-form-item label="启用" class="account-form-switch">
          <el-switch v-model="createAccountForm.enabled" />
        </el-form-item>

        <el-form-item label="备注" class="account-form-remark">
          <el-input v-model="createAccountForm.remark" type="textarea" :rows="4" resize="vertical" />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="account-form-footer">
          <el-button class="account-form-cancel" round :disabled="accountSubmitting" @click="showCreateAccountDialog = false">取消</el-button>
          <el-button class="account-form-submit" type="primary" round :loading="accountSubmitting" :disabled="accountSubmitting" @click="handleSaveAccount">
            {{ accountSubmitting ? "确认中" : "保存 Adobe账户" }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <DeleteConfirmDialog
      v-model="showDeleteAccountDialog"
      title="确认删除 Adobe账户"
      description="确认删除该 Adobe账户？删除后无法恢复，请谨慎操作。"
      :fields="deleteAccountFields"
      warning="该操作不可撤销。"
      confirm-text="确认删除账户"
      :submitting="deleteAccountSubmitting"
      @confirm="handleDeleteAccount"
    />
  </el-main>
</template>
