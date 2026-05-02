<script setup>
import { WarningFilled } from "@element-plus/icons-vue"

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: "确认删除",
  },
  description: {
    type: String,
    default: "确认删除该记录？删除后无法恢复，请谨慎操作。",
  },
  fields: {
    type: Array,
    default: () => [],
  },
  warning: {
    type: String,
    default: "该操作不可撤销。",
  },
  confirmText: {
    type: String,
    default: "确认删除",
  },
  submitting: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(["update:modelValue", "confirm"])

function closeDialog() {
  if (props.submitting) return
  emit("update:modelValue", false)
}

function confirmDelete() {
  if (props.submitting) return
  emit("confirm")
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    class="delete-confirm-dialog"
    width="560px"
    align-center
    append-to-body
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="!submitting"
    @update:model-value="!submitting && emit('update:modelValue', $event)"
  >
    <template #header>
      <div class="delete-confirm-head">
        <div class="delete-confirm-icon">
          <el-icon><WarningFilled /></el-icon>
        </div>
        <h2>{{ title }}</h2>
      </div>
    </template>

    <div class="delete-confirm-body">
      <p>{{ description }}</p>

      <div class="delete-confirm-fields">
        <div v-for="field in fields" :key="field.label" class="delete-confirm-field">
          <span>{{ field.label }}</span>
          <strong>{{ field.value }}</strong>
        </div>
      </div>

      <div class="delete-confirm-warning">{{ warning }}</div>
    </div>

    <template #footer>
      <div class="delete-confirm-footer">
        <el-button round :disabled="submitting" @click="closeDialog">取消</el-button>
        <el-button type="danger" round :loading="submitting" :disabled="submitting" @click="confirmDelete">
          {{ submitting ? "确认中" : confirmText }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>
