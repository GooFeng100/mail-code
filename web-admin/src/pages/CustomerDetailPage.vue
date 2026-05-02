<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue"
import {
  Back,
  Calendar,
  DataAnalysis,
  Delete,
  EditPen,
  Link,
  ShoppingCartFull,
  View,
} from "@element-plus/icons-vue"
import RenewalDialog from "../components/RenewalDialog.vue"
import BindingDialog from "../components/BindingDialog.vue"
import DeleteConfirmDialog from "../components/DeleteConfirmDialog.vue"
import {
  createAssignment,
  createCustomerRenewal,
  deleteCustomerRenewal,
  getAdminConfig,
  getCustomerDetail,
  listAdobeAccounts,
  updateAssignment,
  updateCustomer,
} from "../api/admin"
import { submitWithFeedback } from "../utils/databaseAction"
import { displayValue, formatDate } from "../utils/format"
import { addDaysUtc8, dateInputValueUtc8, remainingDaysFromDateUtc8 } from "../utils/utc8Date"

const props = defineProps({
  customer: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(["back", "view-account"])

const loading = ref(false)
const detailData = ref(null)
const plans = ref([])
const accountOptions = ref([])
const showEditCustomerDialog = ref(false)
const showRenewalDialog = ref(false)
const showBindingDialog = ref(false)
const showDeleteRenewalDialog = ref(false)
const selectedRenewal = ref(null)
const editCustomerSubmitting = ref(false)
const renewalSubmitting = ref(false)
const bindingSubmitting = ref(false)
const deleteRenewalSubmitting = ref(false)
let editCustomerFormReady = false

const editCustomerForm = reactive({
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

const customer = computed(() => detailData.value?.customer || props.customer || {})
const activeAccounts = computed(() => detailData.value?.adobeAccounts || [])
const renewalSourceRecords = computed(() => detailData.value?.renewalRecords || [])
const renewals = computed(() => buildRenewalRows())
const editCustomerFormStatus = computed(() => formStatus(editCustomerForm.baseExpireAt))

const deleteRenewalFields = computed(() => {
  const renewal = selectedRenewal.value
  if (!renewal) return []
  return [
    { label: "续费日期", value: formatDate(renewal.renewalDate) },
    { label: "续费套餐", value: renewal.planName },
    { label: "增加天数", value: renewal.planDays },
    { label: "续费后到期日", value: formatDate(renewal.afterExpireAt) },
  ]
})

function dateInputValue(value) {
  return dateInputValueUtc8(value)
}

function addDays(dateText, days) {
  return addDaysUtc8(dateText, days)
}

function planDays(planValue) {
  const plan = plans.value.find((item) => item.id === planValue || item.name === planValue)
  return Number(plan?.days || 0)
}

function planName(planValue) {
  const plan = plans.value.find((item) => item.id === planValue || item.name === planValue)
  return plan?.name || ""
}

function initialExpireAt(dateText, planValue) {
  return addDays(dateText, planDays(planValue)) || dateText || ""
}

function renewalExpireAt(currentExpireAt, renewalDate, days) {
  const renewalDateText = dateInputValue(renewalDate)
  const baseDate = renewalDateText && (!currentExpireAt || renewalDateText > currentExpireAt)
    ? renewalDateText
    : currentExpireAt || renewalDateText
  return addDays(baseDate, days)
}

function buildRenewalRows() {
  const currentCustomer = customer.value || {}
  const rows = []
  let currentExpireAt = dateInputValue(currentCustomer.baseAfterSalesExpireAt)
  const initialPlanId = currentCustomer.initialPurchasedPlanId || currentCustomer.purchasedPlanId || currentCustomer.initialPurchasedPlan || currentCustomer.purchasedPlan

  rows.push({
    id: `initial-${currentCustomer.id || ""}`,
    initial: true,
    renewalDate: currentCustomer.firstPaidAt,
    planId: initialPlanId,
    planName: planName(initialPlanId),
    planDays: planDays(initialPlanId),
    beforeExpireAt: null,
    afterExpireAt: currentExpireAt,
    remark: "首次购买",
  })

  renewalSourceRecords.value
    .filter((record) => !record.initial)
    .slice()
    .sort((left, right) => {
      const leftDate = dateInputValue(left.renewalDate)
      const rightDate = dateInputValue(right.renewalDate)
      if (leftDate !== rightDate) return leftDate.localeCompare(rightDate)
      return String(left.createdAt || "").localeCompare(String(right.createdAt || ""))
    })
    .forEach((record) => {
      const beforeExpireAt = currentExpireAt
      const days = planDays(record.planId)
      currentExpireAt = renewalExpireAt(currentExpireAt, record.renewalDate, days)
      rows.push({
        id: record.id,
        initial: false,
        renewalDate: record.renewalDate,
        planId: record.planId,
        planName: planName(record.planId),
        planDays: days,
        beforeExpireAt,
        afterExpireAt: currentExpireAt,
        remark: record.remark || "",
      })
    })

  return rows
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

function syncEditCustomerBaseExpireAt() {
  editCustomerForm.baseExpireAt = initialExpireAt(editCustomerForm.firstPaidAt, editCustomerForm.plan)
}

function statusText(item) {
  return Number(item?.remainingDays || 0) < 0 ? "已到期" : "正常"
}

function statusType(item) {
  const days = Number(item?.remainingDays || 0)
  if (days < 0) return "danger"
  if (days <= 30) return "warning"
  return "success"
}

function dayClass(days) {
  const value = Number(days || 0)
  if (value < 0) return "is-expired"
  if (value <= 30) return "is-warning"
  return "is-success"
}

function displayDays(days) {
  return Math.max(0, Number(days || 0))
}

function roleLabel(role) {
  return role === "primary" ? "主要" : "备用"
}

function customerPayload() {
  return {
    customerCode: editCustomerForm.code,
    customerNickname: editCustomerForm.nickname,
    customerContact: editCustomerForm.contact,
    customerContactEmail: editCustomerForm.email,
    purchasedPlan: editCustomerForm.plan,
    firstPaidAt: editCustomerForm.firstPaidAt,
    baseAfterSalesExpireAt: editCustomerForm.baseExpireAt,
    remark: editCustomerForm.remark,
  }
}

async function loadConfig() {
  const data = await getAdminConfig()
  plans.value = data.plans || []
  const accounts = await listAdobeAccounts({ page: 1, pageSize: 50 })
  accountOptions.value = accounts.items || []
}

async function loadDetail() {
  if (!props.customer?.id) return
  loading.value = true
  try {
    detailData.value = await getCustomerDetail(props.customer.id)
  } finally {
    loading.value = false
  }
}

function openEditCustomerDialog() {
  editCustomerFormReady = false
  Object.assign(editCustomerForm, {
    code: customer.value.customerCode,
    nickname: customer.value.customerNickname,
    contact: customer.value.customerContact,
    email: customer.value.customerContactEmail || "",
    plan: customer.value.purchasedPlanId || customer.value.purchasedPlan,
    firstPaidAt: dateInputValue(customer.value.firstPaidAt),
    baseExpireAt: dateInputValue(customer.value.baseAfterSalesExpireAt),
    status: statusText(customer.value),
    remark: customer.value.remark || "",
  })
  showEditCustomerDialog.value = true
  queueMicrotask(() => { editCustomerFormReady = true })
}

function openRenewalDialog() {
  showRenewalDialog.value = true
}

function openBindingDialog() {
  showBindingDialog.value = true
}

function openDeleteRenewalDialog(row) {
  selectedRenewal.value = row
  showDeleteRenewalDialog.value = true
}

function handleSaveCustomer() {
  submitWithFeedback({
    setLoading: (value) => { editCustomerSubmitting.value = value },
    action: () => updateCustomer(customer.value.id, customerPayload()),
    successMessage: "客户编辑成功。",
    errorMessage: "客户编辑失败。",
    onSuccess: () => {
      showEditCustomerDialog.value = false
      loadDetail()
    },
  })
}

function handleRenewalSave(payload) {
  submitWithFeedback({
    setLoading: (value) => { renewalSubmitting.value = value },
    action: () => createCustomerRenewal(customer.value.id, payload),
    successMessage: "客户续费成功。",
    errorMessage: "客户续费失败。",
    onSuccess: () => {
      showRenewalDialog.value = false
      loadDetail()
    },
  })
}

function handleDeleteRenewal() {
  submitWithFeedback({
    setLoading: (value) => { deleteRenewalSubmitting.value = value },
    action: () => deleteCustomerRenewal(customer.value.id, selectedRenewal.value.id),
    successMessage: "续费记录删除成功。",
    errorMessage: "续费记录删除失败。",
    onSuccess: () => {
      showDeleteRenewalDialog.value = false
      loadDetail()
    },
  })
}

function handleBindingConfirm(payload) {
  submitWithFeedback({
    setLoading: (value) => { bindingSubmitting.value = value },
    action: () => createAssignment({
      customerId: customer.value.id,
      adobeAccountId: payload.adobeAccountId,
      assignmentRole: payload.assignmentRole,
      assignedAt: payload.assignedAt,
    }),
    successMessage: "绑定关系新增成功。",
    errorMessage: "绑定关系新增失败。",
    onSuccess: () => {
      showBindingDialog.value = false
      loadDetail()
    },
  })
}

function handleRoleChange(row) {
  submitWithFeedback({
    setLoading: () => {},
    action: () => updateAssignment(row.assignmentId, { assignmentRole: row.assignmentRole }),
    successMessage: "主备关系修改成功。",
    errorMessage: "主备关系修改失败。",
    onSuccess: loadDetail,
  }).then((ok) => {
    if (!ok) loadDetail()
  })
}

onMounted(async () => {
  await loadConfig()
  await loadDetail()
})

watch(() => [editCustomerForm.firstPaidAt, editCustomerForm.plan], () => {
  if (showEditCustomerDialog.value && editCustomerFormReady) {
    syncEditCustomerBaseExpireAt()
  }
})
</script>

<template>
  <el-main v-loading="loading" class="main-panel admin-dashboard account-detail-page">
    <el-header class="admin-main-header" height="124px">
      <el-row class="admin-stat-row customer-stat-row">
        <el-col :xs="24" :sm="8" :md="8" :lg="8" :xl="8">
          <el-card class="metric-card" shadow="never"><div class="metric-icon"><el-icon><DataAnalysis /></el-icon></div><div><span>绑定账户数</span><strong>{{ activeAccounts.length }}</strong></div></el-card>
        </el-col>
        <el-col :xs="24" :sm="8" :md="8" :lg="8" :xl="8">
          <el-card class="metric-card" shadow="never"><div class="metric-icon success"><el-icon><ShoppingCartFull /></el-icon></div><div><span>续费次数</span><strong class="success-text">{{ renewals.length }}</strong></div></el-card>
        </el-col>
        <el-col :xs="24" :sm="8" :md="8" :lg="8" :xl="8">
          <el-card class="metric-card" shadow="never"><div class="metric-icon warning"><el-icon><Calendar /></el-icon></div><div><span>剩余天数</span><strong class="days-text" :class="dayClass(customer.remainingDays)">{{ displayDays(customer.remainingDays) }}天</strong></div></el-card>
        </el-col>
      </el-row>
    </el-header>

    <section class="account-detail-scroll">
      <section class="detail-card account-profile-card">
        <div class="detail-card-head">
          <div class="account-table-title"><h1>客户详情</h1></div>
          <div class="detail-actions"><el-button :icon="EditPen" round @click="openEditCustomerDialog">编辑客户</el-button><el-button :icon="Back" round @click="emit('back')">返回客户列表</el-button></div>
        </div>

        <div class="account-detail-grid customer-detail-grid">
          <div><span>客户编号</span><strong>{{ displayValue(customer.customerCode) }}</strong></div>
          <div><span>客户昵称</span><strong>{{ displayValue(customer.customerNickname) }}</strong></div>
          <div><span>联系方式</span><strong>{{ displayValue(customer.customerContact) }}</strong></div>
          <div><span>购买计划</span><strong>{{ displayValue(customer.purchasedPlan) }}</strong></div>
          <div><span>联系邮箱</span><strong>{{ displayValue(customer.customerContactEmail) }}</strong></div>
          <div><span>续费状态</span><strong class="days-text" :class="dayClass(customer.remainingDays)">{{ statusText(customer) }}</strong></div>
          <div><span>售后到期日</span><strong>{{ formatDate(customer.afterSalesExpireAt) }}</strong></div>
          <div><span>剩余天数</span><strong class="days-text" :class="dayClass(customer.remainingDays)">{{ displayDays(customer.remainingDays) }} 天</strong></div>
          <div><span>备注</span><strong>{{ displayValue(customer.remark) }}</strong></div>
        </div>
      </section>

      <section class="detail-card detail-table-card">
        <div class="detail-card-head compact">
          <h2>使用中的 Adobe账户</h2>
          <el-button class="detail-primary-button" type="primary" round @click="openBindingDialog"><el-icon><Link /></el-icon><span>新增绑定</span></el-button>
        </div>
        <el-table class="account-table detail-table" :data="activeAccounts" stripe>
          <el-table-column label="Adobe账户编号" width="150">
            <template #default="{ row }">
              <button class="inline-nav-link" type="button" @click="emit('view-account', row)">{{ row.adobeCode }}</button>
            </template>
          </el-table-column>
          <el-table-column prop="accountEmail" label="Adobe账户邮箱" min-width="260" />
          <el-table-column prop="accountPlan" label="账户计划" min-width="200" />
          <el-table-column label="主备" width="130"><template #default="{ row }"><span class="assignment-role" :class="{ 'is-backup': row.assignmentRole === 'backup' }"><el-switch v-model="row.assignmentRole" active-value="primary" inactive-value="backup" @change="handleRoleChange(row)" /><strong>{{ roleLabel(row.assignmentRole) }}</strong></span></template></el-table-column>
          <el-table-column label="到期日" width="140"><template #default="{ row }">{{ formatDate(row.accountExpireAt) }}</template></el-table-column>
          <el-table-column label="剩余天数" width="120"><template #default="{ row }"><strong class="days-text" :class="dayClass(row.remainingDays)">{{ displayDays(row.remainingDays) }} 天</strong></template></el-table-column>
          <el-table-column label="状态" width="120"><template #default="{ row }"><el-tag :type="statusType(row)" effect="light" round>{{ statusText(row) }}</el-tag></template></el-table-column>
          <el-table-column label="操作" width="110"><template #default="{ row }"><el-button size="small" :icon="View" round @click="emit('view-account', row)">查看</el-button></template></el-table-column>
        </el-table>
      </section>

      <section class="detail-card detail-table-card">
        <div class="detail-card-head compact">
          <h2>客户续费记录</h2>
          <el-button class="detail-primary-button" type="primary" round @click="openRenewalDialog"><el-icon><ShoppingCartFull /></el-icon><span>新增续费</span></el-button>
        </div>
        <el-table class="account-table detail-table" :data="renewals" stripe>
          <el-table-column label="续费日期" width="150"><template #default="{ row }">{{ formatDate(row.renewalDate) }}</template></el-table-column>
          <el-table-column prop="planName" label="续费套餐" min-width="220" />
          <el-table-column prop="planDays" label="增加天数" width="140" />
          <el-table-column label="续费前售后到期日" width="190"><template #default="{ row }">{{ formatDate(row.beforeExpireAt) }}</template></el-table-column>
          <el-table-column label="续费后售后到期日" width="190"><template #default="{ row }">{{ formatDate(row.afterExpireAt) }}</template></el-table-column>
          <el-table-column prop="remark" label="备注" min-width="160" />
          <el-table-column label="操作" width="140"><template #default="{ row }"><span v-if="row.initial">基准记录</span><el-button v-else size="small" :icon="Delete" round type="danger" plain @click="openDeleteRenewalDialog(row)">删除</el-button></template></el-table-column>
        </el-table>
      </section>
    </section>

    <el-dialog v-model="showEditCustomerDialog" class="account-form-dialog" width="800px" align-center append-to-body :show-close="false" :close-on-click-modal="false" :close-on-press-escape="!editCustomerSubmitting">
      <template #header><h2 class="account-form-title">编辑客户</h2></template>
      <el-form class="account-form-grid" :model="editCustomerForm" label-position="top" :disabled="editCustomerSubmitting">
        <el-form-item label="客户编号（自动生成）"><el-input v-model="editCustomerForm.code" /></el-form-item>
        <el-form-item label="客户昵称" required><el-input v-model="editCustomerForm.nickname" /></el-form-item>
        <el-form-item label="联系方式" required><el-input v-model="editCustomerForm.contact" /></el-form-item>
        <el-form-item label="联系邮箱"><el-input v-model="editCustomerForm.email" /></el-form-item>
        <el-form-item label="购买计划" required><el-select v-model="editCustomerForm.plan"><el-option v-for="plan in plans" :key="plan.id" :label="plan.name" :value="plan.id" /></el-select></el-form-item>
        <el-form-item label="首次购买日期" required><el-date-picker v-model="editCustomerForm.firstPaidAt" type="date" value-format="YYYY-MM-DD" /></el-form-item>
        <el-form-item label="初始售后到期日" required><el-date-picker v-model="editCustomerForm.baseExpireAt" type="date" value-format="YYYY-MM-DD" /></el-form-item>
        <el-form-item label="续费状态">
          <div class="account-form-status">
            <el-tag :type="editCustomerFormStatus.type" effect="light" round>{{ editCustomerFormStatus.text }}</el-tag>
            <strong v-if="editCustomerFormStatus.days !== null" class="days-text" :class="editCustomerFormStatus.className">
              {{ editCustomerFormStatus.days }} 天
            </strong>
          </div>
        </el-form-item>
        <el-form-item label="备注" class="account-form-remark"><el-input v-model="editCustomerForm.remark" type="textarea" maxlength="200" show-word-limit :rows="4" resize="vertical" /></el-form-item>
      </el-form>
      <template #footer><div class="account-form-footer"><el-button class="account-form-cancel" round :disabled="editCustomerSubmitting" @click="showEditCustomerDialog = false">取消</el-button><el-button class="account-form-submit" type="primary" round :loading="editCustomerSubmitting" :disabled="editCustomerSubmitting" @click="handleSaveCustomer">{{ editCustomerSubmitting ? "确认中" : "保存" }}</el-button></div></template>
    </el-dialog>

    <RenewalDialog v-model="showRenewalDialog" subject-label="客户" :plans="plans" :previous-expire-at="customer.afterSalesExpireAt" :submitting="renewalSubmitting" @save="handleRenewalSave" />
    <BindingDialog v-model="showBindingDialog" mode="bind" :locked-customer="customer" :customer-options="[customer]" :account-options="accountOptions" :submitting="bindingSubmitting" @confirm="handleBindingConfirm" />
    <DeleteConfirmDialog v-model="showDeleteRenewalDialog" title="确认删除续费记录" description="确认删除该续费记录？首条基准记录不可删除。" :fields="deleteRenewalFields" warning="该操作不可撤销。" confirm-text="确认删除续费" :submitting="deleteRenewalSubmitting" @confirm="handleDeleteRenewal" />
  </el-main>
</template>
