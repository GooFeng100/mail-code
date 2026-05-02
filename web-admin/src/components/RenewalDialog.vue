<script setup>
import { computed, reactive, watch } from "vue"
import { addDaysUtc8, dateInputValueUtc8, todayUtc8 } from "../utils/utc8Date"

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
    default: "",
  },
  plans: {
    type: Array,
    default: () => [],
  },
  submitting: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(["update:modelValue", "save"])

const renewalForm = reactive({
  renewalDate: "",
  planId: "",
  days: 0,
  beforeExpireAt: "",
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

const canSaveRenewal = computed(() => Boolean(renewalForm.renewalDate && renewalForm.planId))

function dateOnly(value) {
  return dateInputValueUtc8(value)
}

function today() {
  return todayUtc8()
}

function addDays(dateText, days) {
  return addDaysUtc8(dateOnly(dateText), days)
}

function isAfterDate(dateText, baselineText) {
  const date = dateOnly(dateText)
  const baseline = dateOnly(baselineText)
  return Boolean(date && baseline && date > baseline)
}

function renewalBaseDate() {
  return isAfterDate(renewalForm.renewalDate, renewalForm.beforeExpireAt)
    ? renewalForm.renewalDate
    : renewalForm.beforeExpireAt || renewalForm.renewalDate
}

function syncPlanDays() {
  const selectedPlan = props.plans.find((item) => item.id === renewalForm.planId)
  renewalForm.days = selectedPlan?.days ?? 0
  renewalForm.afterExpireAt = addDays(renewalBaseDate(), renewalForm.days)
}

function resetForm() {
  renewalForm.renewalDate = today()
  renewalForm.planId = props.plans[0]?.id || ""
  renewalForm.beforeExpireAt = dateOnly(props.previousExpireAt)
  renewalForm.remark = ""
  syncPlanDays()
}

function closeDialog() {
  if (props.submitting) return
  visible.value = false
}

function saveRenewal() {
  if (props.submitting) return
  emit("save", {
    planId: renewalForm.planId,
    renewalDate: renewalForm.renewalDate,
    remark: renewalForm.remark,
  })
}

watch(() => props.modelValue, (value) => {
  if (value) resetForm()
})

watch(() => props.previousExpireAt, (value) => {
  renewalForm.beforeExpireAt = dateOnly(value)
  syncPlanDays()
})

watch(() => props.plans, () => {
  if (!renewalForm.planId) {
    renewalForm.planId = props.plans[0]?.id || ""
  }
  syncPlanDays()
})

watch(() => renewalForm.planId, syncPlanDays)

watch(() => renewalForm.renewalDate, syncPlanDays)

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
    :close-on-click-modal="false"
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
          v-model="renewalForm.renewalDate"
          type="date"
          placeholder="年 / 月 / 日"
          value-format="YYYY-MM-DD"
        />
      </el-form-item>

      <el-form-item label="续费套餐">
        <el-select v-model="renewalForm.planId">
          <el-option
            v-for="option in plans"
            :key="option.id"
            :label="option.name"
            :value="option.id"
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
        <el-button type="primary" round :loading="submitting" :disabled="submitting || !canSaveRenewal" @click="saveRenewal">
          {{ submitting ? "确认中" : "保存续费" }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>
