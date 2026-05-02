<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue"
import {
  CirclePlus,
  Delete,
  EditPen,
  Search,
  Setting,
} from "@element-plus/icons-vue"
import DeleteConfirmDialog from "../components/DeleteConfirmDialog.vue"
import {
  createParameter,
  deleteParameter,
  listParameters,
  updateParameter,
} from "../api/admin"
import { submitWithFeedback } from "../utils/databaseAction"
import { formatDate } from "../utils/format"

const searchText = ref("")
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const loading = ref(false)
const parameters = ref([])
const showParameterDialog = ref(false)
const parameterDialogMode = ref("create")
const editingParameter = ref(null)
const showDeleteParameterDialog = ref(false)
const selectedDeleteParameter = ref(null)
const parameterSubmitting = ref(false)
const deleteParameterSubmitting = ref(false)
const parameterSwitchingId = ref(null)

const parameterForm = reactive({
  category: "plan",
  name: "",
  days: "",
  enabled: true,
  sortOrder: 1,
  remark: "",
})

const parameterDialogTitle = computed(() => (
  parameterDialogMode.value === "edit" ? "编辑参数" : "新增参数"
))

const pageRangeText = computed(() => {
  if (total.value === 0) {
    return "本页 0 条 / 共 0 条"
  }

  const start = (currentPage.value - 1) * pageSize.value + 1
  const end = Math.min(start + parameters.value.length - 1, total.value)
  return `本页 ${start}-${end} 条 / 共 ${total.value} 条`
})

const deleteParameterFields = computed(() => {
  const parameter = selectedDeleteParameter.value
  if (!parameter) return []
  return [
    { label: "参数分类", value: categoryLabel(parameter.category) },
    { label: "参数名称", value: parameter.name },
    { label: "使用天数", value: parameter.days },
    { label: "启用状态", value: parameter.enabled ? "启用" : "禁用" },
  ]
})

function categoryLabel(category) {
  return category === "plan" ? "账户计划" : category
}

function parameterPayload() {
  return {
    category: parameterForm.category,
    name: parameterForm.name,
    days: Number(parameterForm.days || 0),
    enabled: parameterForm.enabled,
    sortOrder: Number(parameterForm.sortOrder || 1),
    remark: parameterForm.remark,
  }
}

async function loadParameters() {
  loading.value = true
  try {
    const data = await listParameters({
      page: currentPage.value,
      pageSize: pageSize.value,
      keyword: searchText.value,
    })
    parameters.value = data.items || []
    total.value = data.total || 0
  } finally {
    loading.value = false
  }
}

function handleSizeChange(size) {
  pageSize.value = size
  currentPage.value = 1
  loadParameters()
}

function resetParameterForm() {
  Object.assign(parameterForm, {
    category: "plan",
    name: "",
    days: "",
    enabled: true,
    sortOrder: 1,
    remark: "",
  })
}

function openCreateParameterDialog() {
  parameterDialogMode.value = "create"
  editingParameter.value = null
  resetParameterForm()
  showParameterDialog.value = true
}

function openEditParameterDialog(parameter) {
  parameterDialogMode.value = "edit"
  editingParameter.value = parameter
  Object.assign(parameterForm, {
    category: parameter.category,
    name: parameter.name,
    days: parameter.days,
    enabled: parameter.enabled,
    sortOrder: parameter.sortOrder,
    remark: parameter.remark || "",
  })
  showParameterDialog.value = true
}

function openDeleteParameterDialog(parameter) {
  selectedDeleteParameter.value = parameter
  showDeleteParameterDialog.value = true
}

function handleSaveParameter() {
  const isEdit = parameterDialogMode.value === "edit"
  submitWithFeedback({
    setLoading: (value) => { parameterSubmitting.value = value },
    action: () => isEdit
      ? updateParameter(editingParameter.value.id, parameterPayload())
      : createParameter(parameterPayload()),
    successMessage: isEdit ? "参数编辑成功。" : "参数新增成功。",
    errorMessage: isEdit ? "参数编辑失败。" : "参数新增失败。",
    onSuccess: () => {
      showParameterDialog.value = false
      loadParameters()
    },
  })
}

function handleDeleteParameter() {
  submitWithFeedback({
    setLoading: (value) => { deleteParameterSubmitting.value = value },
    action: () => deleteParameter(selectedDeleteParameter.value.id),
    successMessage: "参数删除成功。",
    errorMessage: "参数删除失败。",
    onSuccess: () => {
      showDeleteParameterDialog.value = false
      loadParameters()
    },
  })
}

async function handleParameterEnabledChange(parameter, enabled) {
  const previousEnabled = !enabled
  const parameterId = parameter.id
  parameterSwitchingId.value = parameterId

  const ok = await submitWithFeedback({
    setLoading: () => {},
    action: () => updateParameter(parameterId, { enabled }),
    successMessage: enabled ? "参数已启用。" : "参数已禁用。",
    errorMessage: "参数启用状态修改失败。",
    onSuccess: loadParameters,
  })

  if (!ok) {
    parameter.enabled = previousEnabled
  }

  parameterSwitchingId.value = null
}

watch(searchText, () => {
  currentPage.value = 1
  loadParameters()
})

onMounted(loadParameters)
</script>

<template>
  <el-main class="main-panel admin-dashboard assignment-dashboard">
    <section class="admin-main-content">
      <section class="account-title-section assignment-title-section">
        <div class="account-table-title">
          <h1>参数列表</h1>
          <p>仅展示当前模型已有字段，不包含价格、计划类型等额外信息。</p>
        </div>
      </section>

      <section class="account-filter-section">
        <div class="account-toolbar parameter-toolbar">
          <el-input
            v-model="searchText"
            clearable
            class="account-search"
            :prefix-icon="Search"
            placeholder="搜索参数类型或名称"
          />
          <el-button class="add-account-button" type="primary" :icon="CirclePlus" @click="openCreateParameterDialog">
            新增参数
          </el-button>
        </div>
      </section>

      <section class="account-list-section">
        <el-table
          v-loading="loading"
          class="account-table parameter-table"
          :data="parameters"
          height="100%"
          stripe
          row-key="id"
        >
          <el-table-column label="参数分类" min-width="160">
            <template #default="{ row }">{{ categoryLabel(row.category) }}</template>
          </el-table-column>
          <el-table-column prop="name" label="参数名称" min-width="200" />
          <el-table-column prop="days" label="有效期天数" width="150" />
          <el-table-column label="启用状态" width="150">
            <template #default="{ row }">
              <el-switch
                v-model="row.enabled"
                :loading="parameterSwitchingId === row.id"
                :disabled="parameterSwitchingId !== null && parameterSwitchingId !== row.id"
                @change="handleParameterEnabledChange(row, $event)"
              />
            </template>
          </el-table-column>
          <el-table-column prop="sortOrder" label="排序" width="120" />
          <el-table-column prop="remark" label="备注" min-width="160" />
          <el-table-column label="创建时间" width="160">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="220">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button size="small" :icon="EditPen" round @click="openEditParameterDialog(row)">编辑</el-button>
                <el-button size="small" :icon="Delete" round type="danger" plain @click="openDeleteParameterDialog(row)">删除</el-button>
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
          @current-change="currentPage = $event; loadParameters()"
          @size-change="handleSizeChange"
        />
      </div>
    </section>

    <el-dialog
      v-model="showParameterDialog"
      class="parameter-form-dialog"
      width="450px"
      align-center
      append-to-body
      :show-close="false"
      :close-on-click-modal="false"
      :close-on-press-escape="!parameterSubmitting"
    >
      <template #header>
        <div class="parameter-dialog-head">
          <div class="parameter-dialog-icon">
            <el-icon><Setting /></el-icon>
          </div>
          <div>
            <h2>{{ parameterDialogTitle }}</h2>
            <p>维护账户计划。账户计划的有效期会用于自动计算到期日和续费天数。</p>
          </div>
        </div>
      </template>

      <el-form class="parameter-form-grid" :model="parameterForm" label-position="top" :disabled="parameterSubmitting">
        <el-form-item label="名称">
          <el-input v-model="parameterForm.name" placeholder="例如 全家桶年付" />
        </el-form-item>

        <el-form-item label="有效期天数">
          <el-input-number v-model="parameterForm.days" :min="0" controls-position="right" placeholder="仅账户计划需要" />
        </el-form-item>

        <el-form-item label="排序">
          <el-input-number v-model="parameterForm.sortOrder" :min="1" controls-position="right" placeholder="数字越小越靠前" />
        </el-form-item>

        <div class="parameter-enable-row">
          <span>启用</span>
          <el-switch v-model="parameterForm.enabled" />
          <strong>{{ parameterForm.enabled ? "已启用" : "已禁用" }}</strong>
        </div>

        <el-form-item label="备注" class="parameter-remark">
          <el-input v-model="parameterForm.remark" type="textarea" :rows="4" placeholder="请输入备注（可选）" />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="parameter-form-footer">
          <el-button round :disabled="parameterSubmitting" @click="showParameterDialog = false">取消</el-button>
          <el-button type="primary" round :loading="parameterSubmitting" :disabled="parameterSubmitting" @click="handleSaveParameter">
            {{ parameterSubmitting ? "确认中" : "保存" }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <DeleteConfirmDialog
      v-model="showDeleteParameterDialog"
      title="确认删除参数"
      description="确认删除该参数？删除后相关下拉选项将不再显示，请谨慎操作。已被引用的参数会被系统阻止删除。"
      :fields="deleteParameterFields"
      warning="该操作不可撤销。"
      confirm-text="确认删除参数"
      :submitting="deleteParameterSubmitting"
      @confirm="handleDeleteParameter"
    />
  </el-main>
</template>
