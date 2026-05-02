<script setup>
import { computed, reactive, watch } from "vue"
import {
  CircleClose,
  Clock,
  Connection,
  Link,
  RefreshRight,
  User,
  UserFilled,
} from "@element-plus/icons-vue"
import { dateInputValueUtc8, todayUtc8 } from "../utils/utc8Date"

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  mode: {
    type: String,
    default: "bind",
  },
  binding: {
    type: Object,
    default: () => ({}),
  },
  lockedCustomer: {
    type: Object,
    default: null,
  },
  lockedAccount: {
    type: Object,
    default: null,
  },
  customerOptions: {
    type: Array,
    default: () => [],
  },
  accountOptions: {
    type: Array,
    default: () => [],
  },
  submitting: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(["update:modelValue", "confirm"])

const form = reactive({
  assignedAt: "",
  role: "backup",
  customerId: "",
  adobeAccountId: "",
})

const visible = computed({
  get: () => props.modelValue,
  set: (value) => {
    if (!props.submitting) {
      emit("update:modelValue", value)
    }
  },
})

const isReadonly = computed(() => props.mode !== "bind")
const customerLocked = computed(() => Boolean(props.lockedCustomer) || isReadonly.value)
const accountLocked = computed(() => Boolean(props.lockedAccount) || isReadonly.value)

const dialogTitle = computed(() => {
  if (props.mode === "unbind") return "解绑关系"
  if (props.mode === "restore") return "恢复绑定"
  return "新增绑定"
})

const dialogDescription = computed(() => {
  if (props.mode === "unbind") return "确认解除当前客户与 Adobe账号的绑定关系。"
  if (props.mode === "restore") return "确认恢复当前客户与 Adobe账号的绑定关系。"
  return "将客户与 Adobe账号建立绑定关系，后续验证码和账号信息将按绑定关系展示。"
})

const confirmText = computed(() => {
  if (props.mode === "unbind") return "确认解绑"
  if (props.mode === "restore") return "确认恢复"
  return "确认绑定"
})

const titleIcon = computed(() => {
  if (props.mode === "unbind") return CircleClose
  if (props.mode === "restore") return RefreshRight
  return Link
})

const themeClass = computed(() => (
  props.mode === "unbind" ? "is-unbind" : "is-bind"
))

function today() {
  return todayUtc8()
}

function dateValue(value) {
  if (!value) return today()
  return dateInputValueUtc8(value) || today()
}

function resetForm() {
  form.assignedAt = today()
  form.role = "backup"
  form.customerId = ""
  form.adobeAccountId = ""

  if (props.mode !== "bind") {
    form.assignedAt = dateValue(props.binding.assignedAt)
    form.role = props.binding.assignmentRole || "backup"
    form.customerId = props.binding.customerId || ""
    form.adobeAccountId = props.binding.adobeAccountId || ""
  }

  if (props.lockedCustomer) {
    form.customerId = props.lockedCustomer.id || props.lockedCustomer.customerId || ""
  }
  if (props.lockedAccount) {
    form.adobeAccountId = props.lockedAccount.id || props.lockedAccount.adobeAccountId || ""
  }
}

function closeDialog() {
  if (props.submitting) return
  visible.value = false
}

function confirmDialog() {
  if (props.submitting) return
  emit("confirm", {
    mode: props.mode,
    id: props.binding.id,
    customerId: form.customerId,
    adobeAccountId: form.adobeAccountId,
    assignmentRole: form.role,
    assignedAt: form.assignedAt,
  })
}

watch(() => props.modelValue, (value) => {
  if (value) resetForm()
})

resetForm()
</script>

<template>
  <el-dialog
    v-model="visible"
    :class="['binding-dialog', themeClass]"
    width="504px"
    align-center
    append-to-body
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="!submitting"
  >
    <template #header>
      <div class="binding-dialog-head">
        <div class="binding-title-icon">
          <el-icon><component :is="titleIcon" /></el-icon>
        </div>
        <div>
          <h2>{{ dialogTitle }}</h2>
          <p>{{ dialogDescription }}</p>
        </div>
      </div>
    </template>

    <el-form class="binding-form" :model="form" label-position="left" :disabled="submitting">
      <el-form-item label="绑定时间">
        <template #label>
          <span class="binding-label"><el-icon><Clock /></el-icon>绑定日期</span>
        </template>
        <el-date-picker
          v-model="form.assignedAt"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="请选择绑定日期"
          :disabled="isReadonly"
        />
      </el-form-item>

      <el-form-item label="主备关系">
        <template #label>
          <span class="binding-label"><el-icon><Connection /></el-icon>主备关系</span>
        </template>
        <div class="binding-role-control">
          <el-switch
            v-model="form.role"
            active-value="primary"
            inactive-value="backup"
            :disabled="isReadonly"
          />
          <strong>{{ form.role === "primary" ? "主要" : "备用" }}</strong>
        </div>
      </el-form-item>

      <div class="binding-divider"></div>

      <el-form-item label="账户1">
        <template #label>
          <span class="binding-label"><el-icon><User /></el-icon>客户</span>
        </template>
        <el-select
          v-model="form.customerId"
          filterable
          clearable
          placeholder="请选择客户"
          :disabled="customerLocked"
        >
          <el-option
            v-for="customer in customerOptions"
            :key="customer.id"
            :label="`${customer.customerCode} ${customer.customerNickname}`"
            :value="customer.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="账户2">
        <template #label>
          <span class="binding-label"><el-icon><UserFilled /></el-icon>Adobe账号</span>
        </template>
        <el-select
          v-model="form.adobeAccountId"
          filterable
          clearable
          placeholder="请选择Adobe账号"
          :disabled="accountLocked"
        >
          <el-option
            v-for="account in accountOptions"
            :key="account.id"
            :label="`${account.adobeCode} ${account.accountEmail}`"
            :value="account.id"
          />
        </el-select>
      </el-form-item>

      <div class="binding-tip">
        <el-icon><Link /></el-icon>
        <span>{{ props.mode === "unbind" ? "解绑后，该绑定关系将标记为无效，可在后续恢复绑定。" : "绑定后，客户与 Adobe账号将建立关联关系。" }}</span>
      </div>
    </el-form>

    <template #footer>
      <div class="binding-dialog-footer">
        <el-button round :disabled="submitting" @click="closeDialog">取消</el-button>
        <el-button type="primary" round :loading="submitting" :disabled="submitting" @click="confirmDialog">
          {{ submitting ? "确认中" : confirmText }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>
