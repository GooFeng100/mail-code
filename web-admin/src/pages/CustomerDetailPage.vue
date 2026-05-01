<script setup>
import { reactive, ref } from "vue"
import {
  Back,
  Calendar,
  DataAnalysis,
  EditPen,
  Link,
  ShoppingCartFull,
  View,
} from "@element-plus/icons-vue"
import RenewalDialog from "../components/RenewalDialog.vue"
import BindingDialog from "../components/BindingDialog.vue"
import { submitWithFeedback } from "../utils/databaseAction"

const props = defineProps({
  customer: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(["back"])
const showEditCustomerDialog = ref(false)
const showRenewalDialog = ref(false)
const showBindingDialog = ref(false)
const editCustomerSubmitting = ref(false)
const renewalSubmitting = ref(false)
const bindingSubmitting = ref(false)

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

const editCustomerForm = reactive({
  code: "",
  nickname: "",
  contact: "",
  email: "",
  plan: "全家桶月付（30天）",
  firstPaidAt: "",
  baseExpireAt: "",
  status: "",
  remark: "",
})

function openEditCustomerDialog() {
  Object.assign(editCustomerForm, {
    code: detail.code,
    nickname: detail.nickname,
    contact: detail.contact,
    email: detail.email === "-" ? "" : detail.email,
    plan: detail.plan,
    firstPaidAt: "",
    baseExpireAt: detail.expiresAt,
    status: detail.status,
    remark: detail.remark === "-" ? "" : detail.remark,
  })
  showEditCustomerDialog.value = true
}

function openRenewalDialog() {
  showRenewalDialog.value = true
}

function openBindingDialog() {
  showBindingDialog.value = true
}

function handleSaveCustomer() {
  submitWithFeedback({
    setLoading: (value) => { editCustomerSubmitting.value = value },
    successMessage: "客户编辑成功。",
    errorMessage: "客户编辑失败。",
    onSuccess: () => { showEditCustomerDialog.value = false },
  })
}

function handleRenewalSave() {
  submitWithFeedback({
    setLoading: (value) => { renewalSubmitting.value = value },
    successMessage: "客户续费成功。",
    errorMessage: "客户续费失败。",
    onSuccess: () => { showRenewalDialog.value = false },
  })
}

function handleBindingConfirm() {
  submitWithFeedback({
    setLoading: (value) => { bindingSubmitting.value = value },
    successMessage: "绑定关系新增成功。",
    errorMessage: "绑定关系新增失败。",
    onSuccess: () => { showBindingDialog.value = false },
  })
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
            <el-button :icon="EditPen" round @click="openEditCustomerDialog">编辑客户</el-button>
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
          <el-button class="detail-primary-button" type="primary" round @click="openBindingDialog">
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
          <el-button class="detail-primary-button" type="primary" round @click="openRenewalDialog">
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

    <el-dialog
      v-model="showEditCustomerDialog"
      class="account-form-dialog"
      width="800px"
      align-center
      append-to-body
      :show-close="false"
      :close-on-click-modal="false"
      :close-on-press-escape="!editCustomerSubmitting"
    >
      <template #header>
        <h2 class="account-form-title">编辑客户</h2>
      </template>

      <el-form class="account-form-grid" :model="editCustomerForm" label-position="top" :disabled="editCustomerSubmitting">
        <el-form-item label="客户编号（自动生成）">
          <el-input v-model="editCustomerForm.code" placeholder="保存后自动生成" disabled />
        </el-form-item>

        <el-form-item label="客户昵称" required>
          <el-input v-model="editCustomerForm.nickname" placeholder="请输入客户昵称" />
        </el-form-item>

        <el-form-item label="联系方式" required>
          <el-input v-model="editCustomerForm.contact" placeholder="QQ / 微信 / 电话" />
        </el-form-item>

        <el-form-item label="联系邮箱">
          <el-input v-model="editCustomerForm.email" placeholder="请输入联系邮箱" />
        </el-form-item>

        <el-form-item label="购买计划" required>
          <el-select v-model="editCustomerForm.plan">
            <el-option label="全家桶月付（30天）" value="全家桶月付（30天）" />
            <el-option label="全家桶半年付（180天）" value="全家桶半年付（180天）" />
            <el-option label="全家桶年付（365天）" value="全家桶年付（365天）" />
          </el-select>
        </el-form-item>

        <el-form-item label="首次购买日期" required>
          <el-date-picker
            v-model="editCustomerForm.firstPaidAt"
            type="date"
            placeholder="yyyy / mm / dd"
            value-format="YYYY/M/D"
          />
        </el-form-item>

        <el-form-item label="初始售后到期日" required>
          <el-date-picker
            v-model="editCustomerForm.baseExpireAt"
            type="date"
            placeholder="yyyy / mm / dd"
            value-format="YYYY/M/D"
          />
        </el-form-item>

        <el-form-item label="续费状态">
          <el-input v-model="editCustomerForm.status" placeholder="根据到期日自动计算" disabled />
        </el-form-item>

        <el-form-item label="备注" class="account-form-remark">
          <el-input
            v-model="editCustomerForm.remark"
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
          <el-button class="account-form-cancel" round :disabled="editCustomerSubmitting" @click="showEditCustomerDialog = false">取消</el-button>
          <el-button class="account-form-submit" type="primary" round :loading="editCustomerSubmitting" :disabled="editCustomerSubmitting" @click="handleSaveCustomer">
            {{ editCustomerSubmitting ? "确认中" : "保存" }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <RenewalDialog
      v-model="showRenewalDialog"
      subject-label="客户"
      :previous-expire-at="detail.expiresAt"
      :submitting="renewalSubmitting"
      @save="handleRenewalSave"
    />

    <BindingDialog
      v-model="showBindingDialog"
      mode="bind"
      :locked-customer="{ code: detail.code, name: detail.nickname, contact: detail.contact }"
      :default-account="activeAccounts[0]"
      :submitting="bindingSubmitting"
      @confirm="handleBindingConfirm"
    />
  </el-main>
</template>
