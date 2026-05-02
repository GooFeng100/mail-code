<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue"
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
import DeleteConfirmDialog from "../components/DeleteConfirmDialog.vue"
import {
  createCustomer,
  deleteCustomer,
  getAdminConfig,
  listCustomers,
  updateCustomer,
} from "../api/admin"
import { submitWithFeedback } from "../utils/databaseAction"
import { formatDate } from "../utils/format"
import { addDaysUtc8, dateInputValueUtc8, remainingDaysFromDateUtc8, todayUtc8 } from "../utils/utc8Date"

const emit = defineEmits(["view-detail"])

const searchText = ref("")
const planFilter = ref("")
const statusFilter = ref("")
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const loading = ref(false)
const customers = ref([])
const stats = ref({ total: 0, normal: 0, expiring: 0 })
const plans = ref([])

const showCustomerDialog = ref(false)
const customerDialogMode = ref("create")
const editingCustomer = ref(null)
const showDeleteCustomerDialog = ref(false)
const selectedDeleteCustomer = ref(null)
const customerSubmitting = ref(false)
const deleteCustomerSubmitting = ref(false)
let customerFormReady = false

const customerForm = reactive({
  code: "",
  nickname: "",
  contact: "",
  email: "",
  plan: "",
  firstPaidAt: "",
  baseExpireAt: "",
  status: "",
  remark: "",
})

const customerDialogTitle = computed(() => (
  customerDialogMode.value === "edit" ? "编辑客户" : "新增客户"
))

const customerFormStatus = computed(() => formStatus(customerForm.baseExpireAt))

const pageRangeText = computed(() => {
  if (total.value === 0) {
    return "本页 0 条 / 共 0 条"
  }

  const start = (currentPage.value - 1) * pageSize.value + 1
  const end = Math.min(start + customers.value.length - 1, total.value)
  return `本页 ${start}-${end} 条 / 共 ${total.value} 条`
})

const deleteCustomerFields = computed(() => {
  const customer = selectedDeleteCustomer.value
  if (!customer) return []
  return [
    { label: "客户编号", value: customer.customerCode },
    { label: "客户昵称", value: customer.customerNickname },
    { label: "联系方式", value: customer.customerContact },
    { label: "售后到期日", value: formatDate(customer.afterSalesExpireAt) },
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

function syncCustomerBaseExpireAt() {
  customerForm.baseExpireAt = initialExpireAt(customerForm.firstPaidAt, customerForm.plan)
}

function customerPayload() {
  return {
    customerCode: customerForm.code,
    customerNickname: customerForm.nickname,
    customerContact: customerForm.contact,
    customerContactEmail: customerForm.email,
    purchasedPlan: customerForm.plan,
    firstPaidAt: customerForm.firstPaidAt,
    baseAfterSalesExpireAt: customerForm.baseExpireAt,
    remark: customerForm.remark,
  }
}

async function loadConfig() {
  const data = await getAdminConfig()
  plans.value = data.plans || []
  if (!customerForm.plan) {
    customerForm.plan = plans.value[0]?.id || ""
  }
}

async function loadCustomers() {
  loading.value = true
  try {
    const data = await listCustomers({
      page: currentPage.value,
      pageSize: pageSize.value,
      keyword: searchText.value,
      planId: planFilter.value,
      status: statusFilter.value,
    })
    customers.value = data.items || []
    total.value = data.total || 0
    stats.value = data.stats || stats.value
  } finally {
    loading.value = false
  }
}

function handleSizeChange(size) {
  pageSize.value = size
  currentPage.value = 1
  loadCustomers()
}

function resetCustomerForm() {
  const currentDate = today()
  const defaultPlan = plans.value[0]?.id || ""
  Object.assign(customerForm, {
    code: "",
    nickname: "",
    contact: "",
    email: "",
    plan: defaultPlan,
    firstPaidAt: currentDate,
    baseExpireAt: initialExpireAt(currentDate, defaultPlan),
    status: "",
    remark: "",
  })
}

function openCreateCustomerDialog() {
  customerDialogMode.value = "create"
  editingCustomer.value = null
  customerFormReady = false
  resetCustomerForm()
  showCustomerDialog.value = true
  queueMicrotask(() => { customerFormReady = true })
}

function openEditCustomerDialog(customer) {
  customerDialogMode.value = "edit"
  editingCustomer.value = customer
  customerFormReady = false
  Object.assign(customerForm, {
    code: customer.customerCode,
    nickname: customer.customerNickname,
    contact: customer.customerContact,
    email: customer.customerContactEmail || "",
    plan: customer.purchasedPlanId || customer.purchasedPlan,
    firstPaidAt: dateInputValue(customer.firstPaidAt),
    baseExpireAt: dateInputValue(customer.baseAfterSalesExpireAt),
    status: statusText(customer),
    remark: customer.remark || "",
  })
  showCustomerDialog.value = true
  queueMicrotask(() => { customerFormReady = true })
}

function openDeleteCustomerDialog(customer) {
  selectedDeleteCustomer.value = customer
  showDeleteCustomerDialog.value = true
}

function handleSaveCustomer() {
  const isEdit = customerDialogMode.value === "edit"
  submitWithFeedback({
    setLoading: (value) => { customerSubmitting.value = value },
    action: () => isEdit
      ? updateCustomer(editingCustomer.value.id, customerPayload())
      : createCustomer(customerPayload()),
    successMessage: isEdit ? "客户编辑成功。" : "客户新增成功。",
    errorMessage: isEdit ? "客户编辑失败。" : "客户新增失败。",
    onSuccess: () => {
      showCustomerDialog.value = false
      loadCustomers()
    },
  })
}

function handleDeleteCustomer() {
  submitWithFeedback({
    setLoading: (value) => { deleteCustomerSubmitting.value = value },
    action: () => deleteCustomer(selectedDeleteCustomer.value.id),
    successMessage: "客户删除成功。",
    errorMessage: "客户删除失败。",
    onSuccess: () => {
      showDeleteCustomerDialog.value = false
      loadCustomers()
    },
  })
}

watch([searchText, planFilter, statusFilter], () => {
  currentPage.value = 1
  loadCustomers()
})

watch(() => [customerForm.firstPaidAt, customerForm.plan], () => {
  if (showCustomerDialog.value && customerFormReady) {
    syncCustomerBaseExpireAt()
  }
})

onMounted(async () => {
  await loadConfig()
  await loadCustomers()
})
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
            placeholder="搜索客户编号 / 昵称 / 联系方式 / 备注"
          />
          <el-select v-model="planFilter" clearable placeholder="全部购买计划">
            <el-option v-for="plan in plans" :key="plan.id" :label="plan.name" :value="plan.id" />
          </el-select>
          <el-select v-model="statusFilter" clearable placeholder="全部状态">
            <el-option label="正常" value="normal" />
            <el-option label="30天内到期" value="expiring" />
            <el-option label="已到期" value="expired" />
          </el-select>
          <el-button class="add-account-button" type="primary" :icon="CirclePlus" @click="openCreateCustomerDialog">
            新增客户
          </el-button>
        </div>
      </section>

      <section class="account-list-section">
        <el-table
          v-loading="loading"
          class="account-table customer-table"
          :data="customers"
          height="100%"
          stripe
          row-key="id"
        >
          <el-table-column label="客户编号" width="96">
            <template #default="{ row }">
              <button class="inline-nav-link" type="button" @click="emit('view-detail', row)">{{ row.customerCode }}</button>
            </template>
          </el-table-column>
          <el-table-column prop="customerNickname" label="客户昵称" min-width="160" show-overflow-tooltip />
          <el-table-column prop="customerContact" label="联系方式" min-width="170" show-overflow-tooltip />
          <el-table-column prop="purchasedPlan" label="购买计划" min-width="170" />
          <el-table-column label="售后到期日" width="118">
            <template #default="{ row }">{{ formatDate(row.afterSalesExpireAt) }}</template>
          </el-table-column>
          <el-table-column label="剩余天数" width="100">
            <template #default="{ row }">
              <strong class="days-text" :class="dayClass(row.remainingDays)">
                {{ Math.max(0, Number(row.remainingDays || 0)) }} 天
              </strong>
            </template>
          </el-table-column>
          <el-table-column label="续费状态" width="100">
            <template #default="{ row }">
              <el-tag :type="statusType(row)" effect="light" round>
                {{ statusText(row) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="assignmentCount" label="绑定账户数" width="104" align="center" />
          <el-table-column prop="remark" label="备注" min-width="90" align="center" />
          <el-table-column label="操作" fixed="right" width="300">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button size="small" :icon="View" round @click="emit('view-detail', row)">查看</el-button>
                <el-button size="small" :icon="EditPen" round @click="openEditCustomerDialog(row)">编辑</el-button>
                <el-button size="small" :icon="Delete" round type="danger" plain @click="openDeleteCustomerDialog(row)">删除</el-button>
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
          @current-change="currentPage = $event; loadCustomers()"
          @size-change="handleSizeChange"
        />
      </div>
    </section>

    <el-dialog
      v-model="showCustomerDialog"
      class="account-form-dialog"
      width="800px"
      align-center
      append-to-body
      :show-close="false"
      :close-on-click-modal="false"
      :close-on-press-escape="!customerSubmitting"
    >
      <template #header>
        <h2 class="account-form-title">{{ customerDialogTitle }}</h2>
      </template>

      <el-form class="account-form-grid" :model="customerForm" label-position="top" :disabled="customerSubmitting">
        <el-form-item label="客户编号（自动生成）">
          <el-input v-model="customerForm.code" placeholder="保存后自动生成" :disabled="customerDialogMode === 'create'" />
        </el-form-item>

        <el-form-item label="客户昵称" required>
          <el-input v-model="customerForm.nickname" placeholder="请输入客户昵称" />
        </el-form-item>

        <el-form-item label="联系方式" required>
          <el-input v-model="customerForm.contact" placeholder="QQ / 微信 / 电话" />
        </el-form-item>

        <el-form-item label="联系邮箱">
          <el-input v-model="customerForm.email" placeholder="请输入联系邮箱" />
        </el-form-item>

        <el-form-item label="购买计划" required>
          <el-select v-model="customerForm.plan">
            <el-option v-for="plan in plans" :key="plan.id" :label="plan.name" :value="plan.id" />
          </el-select>
        </el-form-item>

        <el-form-item label="首次购买日期" required>
          <el-date-picker v-model="customerForm.firstPaidAt" type="date" placeholder="yyyy / mm / dd" value-format="YYYY-MM-DD" />
        </el-form-item>

        <el-form-item label="初始售后到期日" required>
          <el-date-picker v-model="customerForm.baseExpireAt" type="date" placeholder="yyyy / mm / dd" value-format="YYYY-MM-DD" />
        </el-form-item>

        <el-form-item label="续费状态">
          <div class="account-form-status">
            <el-tag :type="customerFormStatus.type" effect="light" round>{{ customerFormStatus.text }}</el-tag>
            <strong v-if="customerFormStatus.days !== null" class="days-text" :class="customerFormStatus.className">
              {{ customerFormStatus.days }} 天
            </strong>
          </div>
        </el-form-item>

        <el-form-item label="备注" class="account-form-remark">
          <el-input
            v-model="customerForm.remark"
            type="textarea"
            maxlength="200"
            show-word-limit
            :rows="4"
            placeholder="请输入备注（选填）"
            resize="vertical"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="account-form-footer">
          <el-button class="account-form-cancel" round :disabled="customerSubmitting" @click="showCustomerDialog = false">取消</el-button>
          <el-button class="account-form-submit" type="primary" round :loading="customerSubmitting" :disabled="customerSubmitting" @click="handleSaveCustomer">
            {{ customerSubmitting ? "确认中" : "保存" }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <DeleteConfirmDialog
      v-model="showDeleteCustomerDialog"
      title="确认删除客户"
      description="确认删除该客户？删除后将同时删除该客户的续费记录和所有绑定关系，且无法恢复。"
      :fields="deleteCustomerFields"
      warning="该操作不可撤销。"
      confirm-text="确认删除客户"
      :submitting="deleteCustomerSubmitting"
      @confirm="handleDeleteCustomer"
    />
  </el-main>
</template>
