<script setup>
import { reactive, ref } from "vue"
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
import RenewalDialog from "../components/RenewalDialog.vue"
import BindingDialog from "../components/BindingDialog.vue"

const props = defineProps({
  account: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(["back"])
const showEditAccountDialog = ref(false)
const showRenewalDialog = ref(false)
const showBindingDialog = ref(false)

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

const editAccountForm = reactive({
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

function openEditAccountDialog() {
  const [verifyEmailPrefix = "", verifyEmailDomain = "889100.xyz"] = detail.verifyEmail.split("@")
  Object.assign(editAccountForm, {
    code: detail.code,
    email: detail.email,
    password: detail.password === "-" ? "" : detail.password,
    emailPassword: detail.emailPassword === "-" ? "" : detail.emailPassword,
    verifyEmailPrefix,
    verifyEmailDomain,
    plan: detail.plan,
    paidAt: detail.paidAt,
    baseExpireAt: detail.expiresAt,
    status: detail.status,
    enabled: detail.enabled === "启用",
    remark: detail.remark === "-" ? "" : detail.remark,
  })
  showEditAccountDialog.value = true
}

function openRenewalDialog() {
  showRenewalDialog.value = true
}

function openBindingDialog() {
  showBindingDialog.value = true
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
            <el-button :icon="EditPen" round @click="openEditAccountDialog">编辑账户</el-button>
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
          <el-button class="detail-primary-button" type="primary" round @click="openBindingDialog">
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
          <el-button class="detail-primary-button" type="primary" round @click="openRenewalDialog">
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

    <el-dialog
      v-model="showEditAccountDialog"
      class="account-form-dialog"
      width="800px"
      align-center
      append-to-body
      :show-close="false"
      :close-on-click-modal="false"
    >
      <template #header>
        <h2 class="account-form-title">编辑Adobe账户</h2>
      </template>

      <el-form class="account-form-grid" :model="editAccountForm" label-position="top">
        <el-form-item label="Adobe账户编号">
          <el-input v-model="editAccountForm.code" placeholder="自动生成，例如 A0001" disabled />
        </el-form-item>

        <el-form-item label="Adobe账户邮箱" required>
          <el-input v-model="editAccountForm.email" placeholder="adobe001@outlook.com" />
        </el-form-item>

        <el-form-item label="Adobe密码">
          <el-input v-model="editAccountForm.password" placeholder="至少 6 位" show-password />
        </el-form-item>

        <el-form-item label="Adobe邮箱密码">
          <el-input v-model="editAccountForm.emailPassword" placeholder="至少 6 位" show-password />
        </el-form-item>

        <el-form-item label="验证码接收邮箱" required>
          <div class="verification-email-control">
            <el-input v-model="editAccountForm.verifyEmailPrefix" placeholder="请输入邮箱前缀" />
            <el-select v-model="editAccountForm.verifyEmailDomain">
              <el-option label="889100.xyz" value="889100.xyz" />
              <el-option label="889100.site" value="889100.site" />
            </el-select>
          </div>
        </el-form-item>

        <el-form-item label="账户计划">
          <el-select v-model="editAccountForm.plan">
            <el-option label="全家桶月付（30天）" value="全家桶月付（30天）" />
            <el-option label="全家桶半年付（180天）" value="全家桶半年付（180天）" />
            <el-option label="全家桶年付（365天）" value="全家桶年付（365天）" />
          </el-select>
        </el-form-item>

        <el-form-item label="付费日期">
          <el-date-picker
            v-model="editAccountForm.paidAt"
            type="date"
            placeholder="yyyy / mm / dd"
            value-format="YYYY/M/D"
          />
        </el-form-item>

        <el-form-item label="初始到期日">
          <el-date-picker
            v-model="editAccountForm.baseExpireAt"
            type="date"
            placeholder="yyyy / mm / dd"
            value-format="YYYY/M/D"
          />
        </el-form-item>

        <el-form-item label="状态">
          <el-input v-model="editAccountForm.status" placeholder="根据到期日自动计算" disabled />
        </el-form-item>

        <el-form-item label="启用" class="account-form-switch">
          <el-switch v-model="editAccountForm.enabled" />
        </el-form-item>

        <el-form-item label="备注" class="account-form-remark">
          <el-input v-model="editAccountForm.remark" type="textarea" :rows="4" resize="vertical" />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="account-form-footer">
          <el-button class="account-form-cancel" round @click="showEditAccountDialog = false">取消</el-button>
          <el-button class="account-form-submit" type="primary" round>保存 Adobe账户</el-button>
        </div>
      </template>
    </el-dialog>

    <RenewalDialog
      v-model="showRenewalDialog"
      subject-label="Adobe账户"
      :previous-expire-at="detail.expiresAt"
    />

    <BindingDialog
      v-model="showBindingDialog"
      mode="bind"
      :locked-account="{ code: detail.code, email: detail.email }"
    />
  </el-main>
</template>
