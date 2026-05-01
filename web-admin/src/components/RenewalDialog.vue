<script setup>
import { computed, reactive, watch } from "vue"

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  subjectLabel: {
    type: String,
    default: "Adobe账户",
  },
  previousExpireAt: {
    type: String,
    default: "2026-05-07",
  },
  submitting: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(["update:modelValue", "save"])

const planOptions = [
  { label: "全家桶月付（30天）", value: "全家桶月付（30天）", days: 30 },
  { label: "全家桶半年付（180天）", value: "全家桶半年付（180天）", days: 180 },
  { label: "全家桶年付（365天）", value: "全家桶年付（365天）", days: 365 },
]

const renewalForm = reactive({
  renewedAt: "",
  plan: "全家桶月付（30天）",
  days: 30,
  beforeExpireAt: props.previousExpireAt,
  afterExpireAt: "",
  remark: "",
})

const visible = computed({
  get: () => props.modelValue,
  set: (value) => {
    if (!props.submitting) {
      emit("update:modelValue", value)
    }
  },
})

function normalizeDate(value) {
  return value.replaceAll("/", "-")
}

function addDays(dateText, days) {
  const date = new Date(`${normalizeDate(dateText)}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return ""
  }
  date.setDate(date.getDate() + days)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function syncPlanDays() {
  const selectedPlan = planOptions.find((item) => item.value === renewalForm.plan)
  renewalForm.days = selectedPlan?.days ?? 0
  renewalForm.afterExpireAt = addDays(renewalForm.beforeExpireAt, renewalForm.days)
}

function resetForm() {
  renewalForm.renewedAt = ""
  renewalForm.plan = "全家桶月付（30天）"
  renewalForm.beforeExpireAt = props.previousExpireAt
  renewalForm.remark = ""
  syncPlanDays()
}

function closeDialog() {
  if (props.submitting) return
  visible.value = false
}

function saveRenewal() {
  if (props.submitting) return
  emit("save", { ...renewalForm })
}

watch(() => props.modelValue, (value) => {
  if (value) {
    resetForm()
  }
})

watch(() => props.previousExpireAt, (value) => {
  renewalForm.beforeExpireAt = value
  syncPlanDays()
})

watch(() => renewalForm.plan, syncPlanDays)

resetForm()
</script>

<template>
  <el-dialog
    v-model="visible"
    class="renewal-dialog"
    width="560px"
    align-center
    append-to-body
    :show-close="false"
    :close-on-press-escape="!submitting"
  >
    <template #header>
      <div class="renewal-dialog-head">
        <div>
          <h2>新增续费记录</h2>
          <p>为当前{{ subjectLabel }}新增续费记录，系统将根据套餐天数自动计算新的到期日。</p>
        </div>
      </div>
    </template>

    <el-form class="renewal-form" :model="renewalForm" label-position="left" :disabled="submitting">
      <el-form-item label="续费日期">
        <el-date-picker
          v-model="renewalForm.renewedAt"
          type="date"
          placeholder="年 / 月 / 日"
          value-format="YYYY-MM-DD"
        />
      </el-form-item>

      <el-form-item label="续费套餐">
        <el-select v-model="renewalForm.plan">
          <el-option
            v-for="option in planOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="增加天数">
        <el-input :model-value="`${renewalForm.days} 天`" disabled />
      </el-form-item>

      <el-form-item label="续费前到期日">
        <el-input v-model="renewalForm.beforeExpireAt" disabled />
      </el-form-item>

      <el-form-item label="续费后到期日">
        <el-input v-model="renewalForm.afterExpireAt" disabled />
      </el-form-item>

      <el-form-item label="备注">
        <el-input
          v-model="renewalForm.remark"
          type="textarea"
          :rows="4"
          placeholder="请输入备注（选填）"
          resize="vertical"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="renewal-dialog-footer">
        <el-button round :disabled="submitting" @click="closeDialog">取消</el-button>
        <el-button type="primary" round :loading="submitting" :disabled="submitting" @click="saveRenewal">
          {{ submitting ? "确认中" : "保存续费" }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>
