<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue"
import {
  Calendar,
  CircleCheckFilled,
  CirclePlus,
  DataAnalysis,
  Delete,
  EditPen,
  Search,
  View,
  WarningFilled,
} from "@element-plus/icons-vue"
import DeleteConfirmDialog from "../components/DeleteConfirmDialog.vue"
import {
  createAdobeAccount,
  deleteAdobeAccount,
  getAdminConfig,
  listAdobeAccounts,
  updateAdobeAccount,
} from "../api/admin"
import { submitWithFeedback } from "../utils/databaseAction"
import { formatDate } from "../utils/format"
import { addDaysUtc8, dateInputValueUtc8, remainingDaysFromDateUtc8, todayUtc8 } from "../utils/utc8Date"

const emit = defineEmits(["view-detail"])

const searchText = ref("")
const planFilter = ref("")
const statusFilter = ref("")
const enabledFilter = ref("")
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const loading = ref(false)
const accounts = ref([])
const stats = ref({ total: 0, normal: 0, expiring: 0, expired: 0, disabled: 0 })
const plans = ref([])
const mailDomains = ref([])
const mailDomainConfigs = ref([])

const showCreateAccountDialog = ref(false)
const accountDialogMode = ref("create")
const editingAccount = ref(null)
const showDeleteAccountDialog = ref(false)
const selectedDeleteAccount = ref(null)
const accountSubmitting = ref(false)
const deleteAccountSubmitting = ref(false)
let accountFormReady = false

const createAccountForm = reactive({
  code: "",
  email: "",
  password: "",
  emailPassword: "",
  verifyEmailPrefix: "",
  verifyEmailDomain: "",
  plan: "",
  paidAt: "",
  baseExpireAt: "",
  status: "",
  enabled: true,
  remark: "",
})

const accountDialogTitle = computed(() => (
  accountDialogMode.value === "edit" ? "编辑Adobe账户" : "新增Adobe账户"
))

const accountFormStatus = computed(() => formStatus(createAccountForm.baseExpireAt))

const pageRangeText = computed(() => {
  if (total.value === 0) {
    return "本页 0 条 / 共 0 条"
  }

  const start = (currentPage.value - 1) * pageSize.value + 1
  const end = Math.min(start + accounts.value.length - 1, total.value)
  return `本页 ${start}-${end} 条 / 共 ${total.value} 条`
})

const deleteAccountFields = computed(() => {
  const account = selectedDeleteAccount.value
  if (!account) return []
  return [
    { label: "账户编号", value: account.adobeCode },
    { label: "Adobe账户", value: account.accountEmail },
    { label: "验证码邮箱", value: account.verificationEmail },
    { label: "到期日", value: formatDate(account.accountExpireAt) },
  ]
})

function statusType(row) {
  const days = Number(row.remainingDays || 0)
  if (days < 0) return "danger"
  if (days <= 30) return "warning"
  return "success"
}

function statusText(row) {
  return Number(row.remainingDays || 0) < 0 ? "已到期" : "正常"
}

function dayClass(days) {
  if (Number(days || 0) < 0) {
    return "is-expired"
  }
  if (Number(days || 0) <= 30) {
    return "is-warning"
  }
  return "is-success"
}

function dateInputValue(value) {
  return dateInputValueUtc8(value)
}

function today() {
  return todayUtc8()
}

function addDays(dateText, days) {
  return addDaysUtc8(dateText, days)
}

function planDays(planValue) {
  const plan = plans.value.find((item) => item.id === planValue || item.name === planValue)
  return Number(plan?.days || 0)
}

function initialExpireAt(dateText, planValue) {
  return addDays(dateText, planDays(planValue)) || dateText || ""
}

function remainingDaysFromDate(dateText) {
  return remainingDaysFromDateUtc8(dateText)
}

function formStatus(dateText) {
  const days = remainingDaysFromDate(dateText)
  if (days === null) {
    return { text: "未设置", days: null, type: "info", className: "" }
  }
  if (days < 0) {
    return { text: "已到期", days: 0, type: "danger", className: "is-expired" }
  }
  if (days <= 30) {
    return { text: "正常", days, type: "warning", className: "is-warning" }
  }
  return { text: "正常", days, type: "success", className: "is-success" }
}

function syncAccountBaseExpireAt() {
  createAccountForm.baseExpireAt = initialExpireAt(createAccountForm.paidAt, createAccountForm.plan)
}

function accountPayload() {
  return {
    adobeCode: createAccountForm.code,
    accountEmail: createAccountForm.email,
    adobePassword: createAccountForm.password,
    accountEmailPassword: createAccountForm.emailPassword,
    verificationEmail: `${createAccountForm.verifyEmailPrefix}@${createAccountForm.verifyEmailDomain}`,
    accountPlan: createAccountForm.plan,
    paidAt: createAccountForm.paidAt,
    baseExpireAt: createAccountForm.baseExpireAt,
    enabled: createAccountForm.enabled,
    remark: createAccountForm.remark,
  }
}

async function loadConfig() {
  const data = await getAdminConfig()
  plans.value = data.plans || []
  mailDomainConfigs.value = data.mailDomainConfigs || []
  mailDomains.value = mailDomainConfigs.value.length
    ? mailDomainConfigs.value.map((item) => item.domain).filter(Boolean)
    : data.mailDomains || []
  if (!createAccountForm.verifyEmailDomain) {
    createAccountForm.verifyEmailDomain = mailDomains.value[0] || "889100.xyz"
  }
  if (!createAccountForm.plan) {
    createAccountForm.plan = plans.value[0]?.id || ""
  }
}

async function loadAccounts() {
  loading.value = true
  try {
    const data = await listAdobeAccounts({
      page: currentPage.value,
      pageSize: pageSize.value,
      keyword: searchText.value,
      planId: planFilter.value,
      status: statusFilter.value,
      enabled: enabledFilter.value,
    })
    accounts.value = data.items || []
    total.value = data.total || 0
    stats.value = data.stats || stats.value
  } finally {
    loading.value = false
  }
}

function handleSizeChange(size) {
  pageSize.value = size
  currentPage.value = 1
  loadAccounts()
}

function resetAccountForm() {
  const currentDate = today()
  const defaultPlan = plans.value[0]?.id || ""
  Object.assign(createAccountForm, {
    code: "",
    email: "",
    password: "",
    emailPassword: "",
    verifyEmailPrefix: "",
    verifyEmailDomain: mailDomains.value[0] || "889100.xyz",
    plan: defaultPlan,
    paidAt: currentDate,
    baseExpireAt: initialExpireAt(currentDate, defaultPlan),
    status: "",
    enabled: true,
    remark: "",
  })
}

function openCreateAccountDialog() {
  accountDialogMode.value = "create"
  editingAccount.value = null
  accountFormReady = false
  resetAccountForm()
  showCreateAccountDialog.value = true
  queueMicrotask(() => { accountFormReady = true })
}

function openEditAccountDialog(account) {
  const [verifyEmailPrefix = "", verifyEmailDomain = mailDomains.value[0] || "889100.xyz"] = String(account.verificationEmail || "").split("@")
  accountDialogMode.value = "edit"
  editingAccount.value = account
  accountFormReady = false
  Object.assign(createAccountForm, {
    code: account.adobeCode,
    email: account.accountEmail,
    password: account.adobePassword || "",
    emailPassword: account.accountEmailPassword || "",
    verifyEmailPrefix,
    verifyEmailDomain,
    plan: account.accountPlanId || account.accountPlan,
    paidAt: dateInputValue(account.paidAt),
    baseExpireAt: dateInputValue(account.baseExpireAt),
    status: statusText(account),
    enabled: account.enabled,
    remark: account.remark || "",
  })
  showCreateAccountDialog.value = true
  queueMicrotask(() => { accountFormReady = true })
}

function openDeleteAccountDialog(account) {
  selectedDeleteAccount.value = account
  showDeleteAccountDialog.value = true
}

function handleSaveAccount() {
  const isEdit = accountDialogMode.value === "edit"
  submitWithFeedback({
    setLoading: (value) => { accountSubmitting.value = value },
    action: () => isEdit
      ? updateAdobeAccount(editingAccount.value.id, accountPayload())
      : createAdobeAccount(accountPayload()),
    successMessage: isEdit ? "Adobe账户编辑成功。" : "Adobe账户新增成功。",
    errorMessage: isEdit ? "Adobe账户编辑失败。" : "Adobe账户新增失败。",
    onSuccess: () => {
      showCreateAccountDialog.value = false
      loadAccounts()
    },
  })
}

function handleDeleteAccount() {
  submitWithFeedback({
    setLoading: (value) => { deleteAccountSubmitting.value = value },
    action: () => deleteAdobeAccount(selectedDeleteAccount.value.id),
    successMessage: "Adobe账户删除成功。",
    errorMessage: "Adobe账户删除失败。",
    onSuccess: () => {
      showDeleteAccountDialog.value = false
      loadAccounts()
    },
  })
}

watch([searchText, planFilter, statusFilter, enabledFilter], () => {
  currentPage.value = 1
  loadAccounts()
})

watch(() => [createAccountForm.paidAt, createAccountForm.plan], () => {
  if (showCreateAccountDialog.value && accountFormReady) {
    syncAccountBaseExpireAt()
  }
})

onMounted(async () => {
  await loadConfig()
  await loadAccounts()
})
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
            <el-option v-for="plan in plans" :key="plan.id" :label="plan.name" :value="plan.id" />
          </el-select>
          <el-select v-model="statusFilter" clearable placeholder="全部状态">
            <el-option label="正常" value="normal" />
            <el-option label="30天内到期" value="expiring" />
            <el-option label="已到期" value="expired" />
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
          v-loading="loading"
          class="account-table"
          :data="accounts"
          height="100%"
          stripe
          row-key="id"
        >
          <el-table-column label="账户编号" width="92">
            <template #default="{ row }">
              <button class="inline-nav-link" type="button" @click="emit('view-detail', row)">{{ row.adobeCode }}</button>
            </template>
          </el-table-column>
          <el-table-column prop="accountEmail" label="账户邮箱" min-width="220" show-overflow-tooltip />
          <el-table-column prop="accountPlan" label="账户计划" min-width="170" />
          <el-table-column label="到期日" width="108">
            <template #default="{ row }">{{ formatDate(row.accountExpireAt) }}</template>
          </el-table-column>
          <el-table-column label="剩余天数" width="98">
            <template #default="{ row }">
              <strong class="days-text" :class="dayClass(row.remainingDays)">
                {{ Math.max(0, Number(row.remainingDays || 0)) }} 天
              </strong>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="92">
            <template #default="{ row }">
              <el-tag :type="statusType(row)" effect="light" round>
                {{ statusText(row) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="启用" width="82">
            <template #default="{ row }">
              <el-switch
                v-model="row.enabled"
                @change="updateAdobeAccount(row.id, { enabled: row.enabled }).then(loadAccounts)"
              />
            </template>
          </el-table-column>
          <el-table-column prop="assignmentCount" label="绑定用户数" width="104" align="center" />
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
          :total="total"
          @current-change="currentPage = $event; loadAccounts()"
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
          <el-input v-model="createAccountForm.code" placeholder="自动生成，例如 A0001" :disabled="accountDialogMode === 'create'" />
        </el-form-item>

        <el-form-item label="Adobe账户邮箱" required>
          <el-input v-model="createAccountForm.email" placeholder="adobe001@outlook.com" />
        </el-form-item>

        <el-form-item label="Adobe密码">
          <el-input v-model="createAccountForm.password" placeholder="至少 6 位" />
        </el-form-item>

        <el-form-item label="Adobe邮箱密码">
          <el-input v-model="createAccountForm.emailPassword" placeholder="至少 6 位" />
        </el-form-item>

        <el-form-item label="验证码接收邮箱" required>
          <div class="verification-email-control">
            <el-input v-model="createAccountForm.verifyEmailPrefix" placeholder="请输入邮箱前缀" />
            <el-select v-model="createAccountForm.verifyEmailDomain">
              <el-option v-for="domain in mailDomains" :key="domain" :label="domain" :value="domain" />
            </el-select>
          </div>
        </el-form-item>

        <el-form-item label="账户计划">
          <el-select v-model="createAccountForm.plan">
            <el-option v-for="plan in plans" :key="plan.id" :label="plan.name" :value="plan.id" />
          </el-select>
        </el-form-item>

        <el-form-item label="付费日期">
          <el-date-picker v-model="createAccountForm.paidAt" type="date" placeholder="yyyy / mm / dd" value-format="YYYY-MM-DD" />
        </el-form-item>

        <el-form-item label="初始到期日">
          <el-date-picker v-model="createAccountForm.baseExpireAt" type="date" placeholder="yyyy / mm / dd" value-format="YYYY-MM-DD" />
        </el-form-item>

        <el-form-item label="状态">
          <div class="account-form-status">
            <el-tag :type="accountFormStatus.type" effect="light" round>{{ accountFormStatus.text }}</el-tag>
            <strong v-if="accountFormStatus.days !== null" class="days-text" :class="accountFormStatus.className">
              {{ accountFormStatus.days }} 天
            </strong>
          </div>
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
      description="确认删除该 Adobe账户？删除后将同时删除该账户的续费记录和所有绑定关系，且无法恢复。"
      :fields="deleteAccountFields"
      warning="该操作不可撤销。"
      confirm-text="确认删除账户"
      :submitting="deleteAccountSubmitting"
      @confirm="handleDeleteAccount"
    />
  </el-main>
</template>
