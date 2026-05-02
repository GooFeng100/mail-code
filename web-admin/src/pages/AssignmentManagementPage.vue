<script setup>
import { computed, onMounted, ref, watch } from "vue"
import {
  CirclePlus,
  Delete,
  Link,
  RefreshRight,
  Search,
} from "@element-plus/icons-vue"
import BindingDialog from "../components/BindingDialog.vue"
import DeleteConfirmDialog from "../components/DeleteConfirmDialog.vue"
import {
  createAssignment,
  deleteAssignment,
  listAdobeAccounts,
  listAssignments,
  listCustomers,
  updateAssignment,
} from "../api/admin"
import { submitWithFeedback } from "../utils/databaseAction"
import { formatDate } from "../utils/format"

const emit = defineEmits(["view-account", "view-customer"])

const searchText = ref("")
const roleFilter = ref("")
const validFilter = ref("")
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const loading = ref(false)
const assignments = ref([])
const customerOptions = ref([])
const accountOptions = ref([])

const showBindingDialog = ref(false)
const bindingDialogMode = ref("bind")
const selectedBinding = ref({})
const showDeleteBindingDialog = ref(false)
const selectedDeleteBinding = ref(null)
const bindingSubmitting = ref(false)
const deleteBindingSubmitting = ref(false)

const pageRangeText = computed(() => {
  if (total.value === 0) {
    return "本页 0 条 / 共 0 条"
  }

  const start = (currentPage.value - 1) * pageSize.value + 1
  const end = Math.min(start + assignments.value.length - 1, total.value)
  return `本页 ${start}-${end} 条 / 共 ${total.value} 条`
})

const deleteBindingFields = computed(() => {
  const binding = selectedDeleteBinding.value
  if (!binding) return []
  return [
    { label: "客户", value: `${binding.customerCode} | ${binding.customerNickname}` },
    { label: "Adobe账户", value: `${binding.adobeCode} | ${binding.accountEmail}` },
    { label: "主备标识", value: roleLabel(binding.assignmentRole) === "主要" ? "主要账号" : "备用账号" },
    { label: "绑定日期", value: formatDate(binding.assignedAt) },
    { label: "当前状态", value: binding.active ? "已绑定" : "已取消" },
  ]
})

async function loadOptions() {
  const [customers, accounts] = await Promise.all([
    listCustomers({ page: 1, pageSize: 50 }),
    listAdobeAccounts({ page: 1, pageSize: 50 }),
  ])
  customerOptions.value = customers.items || []
  accountOptions.value = accounts.items || []
}

async function loadAssignments() {
  loading.value = true
  try {
    const data = await listAssignments({
      page: currentPage.value,
      pageSize: pageSize.value,
      keyword: searchText.value,
      role: roleFilter.value,
      active: validFilter.value,
    })
    assignments.value = data.items || []
    total.value = data.total || 0
  } finally {
    loading.value = false
  }
}

function handleSizeChange(size) {
  pageSize.value = size
  currentPage.value = 1
  loadAssignments()
}

function roleLabel(role) {
  return role === "primary" ? "主要" : "备用"
}

function viewCustomer(row) {
  emit("view-customer", { id: row.customerId, customerCode: row.customerCode, customerNickname: row.customerNickname })
}

function viewAccount(row) {
  emit("view-account", { id: row.adobeAccountId, adobeCode: row.adobeCode, accountEmail: row.accountEmail })
}

function openCreateBindingDialog() {
  bindingDialogMode.value = "bind"
  selectedBinding.value = {}
  showBindingDialog.value = true
}

function openUnbindDialog(row) {
  bindingDialogMode.value = "unbind"
  selectedBinding.value = row
  showBindingDialog.value = true
}

function openRestoreBindingDialog(row) {
  bindingDialogMode.value = "restore"
  selectedBinding.value = row
  showBindingDialog.value = true
}

function openDeleteBindingDialog(row) {
  selectedDeleteBinding.value = row
  showDeleteBindingDialog.value = true
}

function handleRoleChange(row) {
  submitWithFeedback({
    setLoading: () => {},
    action: () => updateAssignment(row.id, { assignmentRole: row.assignmentRole }),
    successMessage: "主备关系修改成功。",
    errorMessage: "主备关系修改失败。",
    onSuccess: loadAssignments,
  })
}

function handleBindingConfirm(payload) {
  const actionMap = {
    bind: () => createAssignment({
      customerId: payload.customerId,
      adobeAccountId: payload.adobeAccountId,
      assignmentRole: payload.assignmentRole,
      assignedAt: payload.assignedAt,
    }),
    unbind: () => updateAssignment(payload.id, { active: false }),
    restore: () => updateAssignment(payload.id, { active: true }),
  }
  const successMap = {
    bind: "绑定关系新增成功。",
    unbind: "绑定关系解绑成功。",
    restore: "绑定关系恢复成功。",
  }
  const errorMap = {
    bind: "绑定关系新增失败。",
    unbind: "绑定关系解绑失败。",
    restore: "绑定关系恢复失败。",
  }
  submitWithFeedback({
    setLoading: (value) => { bindingSubmitting.value = value },
    action: actionMap[payload.mode],
    successMessage: successMap[payload.mode],
    errorMessage: errorMap[payload.mode],
    onSuccess: () => {
      showBindingDialog.value = false
      loadAssignments()
    },
  })
}

function handleDeleteBinding() {
  submitWithFeedback({
    setLoading: (value) => { deleteBindingSubmitting.value = value },
    action: () => deleteAssignment(selectedDeleteBinding.value.id),
    successMessage: "绑定关系删除成功。",
    errorMessage: "绑定关系删除失败。",
    onSuccess: () => {
      showDeleteBindingDialog.value = false
      loadAssignments()
    },
  })
}

watch([searchText, roleFilter, validFilter], () => {
  currentPage.value = 1
  loadAssignments()
})

onMounted(async () => {
  await Promise.all([loadOptions(), loadAssignments()])
})
</script>

<template>
  <el-main class="main-panel admin-dashboard assignment-dashboard">
    <section class="admin-main-content">
      <section class="account-title-section assignment-title-section">
        <div class="account-table-title">
          <h1>绑定列表</h1>
          <p>仅展示客户、Adobe账户、绑定日期、状态和必要操作。</p>
        </div>
      </section>

      <section class="account-filter-section">
        <div class="account-toolbar assignment-toolbar">
          <el-input
            v-model="searchText"
            clearable
            class="account-search"
            :prefix-icon="Search"
            placeholder="搜索客户昵称 / 联系方式 / Adobe账户邮箱"
          />
          <el-select v-model="roleFilter" clearable placeholder="全部主备">
            <el-option label="主要" value="primary" />
            <el-option label="备用" value="backup" />
          </el-select>
          <el-select v-model="validFilter" clearable placeholder="全部有效性">
            <el-option label="有效" value="true" />
            <el-option label="无效" value="false" />
          </el-select>
          <el-button class="add-account-button" type="primary" :icon="CirclePlus" @click="openCreateBindingDialog">
            新增绑定
          </el-button>
        </div>
      </section>

      <section class="account-list-section">
        <el-table
          v-loading="loading"
          class="account-table assignment-table"
          :data="assignments"
          height="100%"
          stripe
          row-key="id"
        >
          <el-table-column label="客户编号" width="120">
            <template #default="{ row }">
              <button class="inline-nav-link" type="button" @click="viewCustomer(row)">{{ row.customerCode }}</button>
            </template>
          </el-table-column>
          <el-table-column prop="customerNickname" label="客户昵称" min-width="180" show-overflow-tooltip />
          <el-table-column label="Adobe账户编号" width="160">
            <template #default="{ row }">
              <button class="inline-nav-link" type="button" @click="viewAccount(row)">{{ row.adobeCode }}</button>
            </template>
          </el-table-column>
          <el-table-column prop="accountEmail" label="Adobe账户邮箱" min-width="260" show-overflow-tooltip />
          <el-table-column label="主备" width="150">
            <template #default="{ row }">
              <span class="assignment-role" :class="{ 'is-backup': row.assignmentRole === 'backup' }">
                <el-switch
                  v-model="row.assignmentRole"
                  active-value="primary"
                  inactive-value="backup"
                  :disabled="!row.active"
                  @change="handleRoleChange(row)"
                />
                <strong>{{ roleLabel(row.assignmentRole) }}</strong>
              </span>
            </template>
          </el-table-column>
          <el-table-column label="绑定日期" width="150">
            <template #default="{ row }">{{ formatDate(row.assignedAt) }}</template>
          </el-table-column>
          <el-table-column label="是否有效" width="130">
            <template #default="{ row }">
              <el-tag :type="row.active ? 'success' : 'info'" effect="light" round>
                {{ row.active ? "有效" : "无效" }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="220">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button
                  v-if="row.active"
                  size="small"
                  :icon="Link"
                  round
                  type="danger"
                  plain
                  @click="openUnbindDialog(row)"
                >
                  解绑
                </el-button>
                <el-button
                  v-else
                  size="small"
                  :icon="RefreshRight"
                  round
                  type="primary"
                  plain
                  :disabled="!row.canRestore"
                  @click="openRestoreBindingDialog(row)"
                >
                  恢复
                </el-button>
                <el-button size="small" :icon="Delete" round :disabled="row.active" @click="openDeleteBindingDialog(row)">删除</el-button>
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
          @current-change="currentPage = $event; loadAssignments()"
          @size-change="handleSizeChange"
        />
      </div>
    </section>

    <BindingDialog
      v-model="showBindingDialog"
      :mode="bindingDialogMode"
      :binding="selectedBinding"
      :customer-options="customerOptions"
      :account-options="accountOptions"
      :submitting="bindingSubmitting"
      @confirm="handleBindingConfirm"
    />

    <DeleteConfirmDialog
      v-model="showDeleteBindingDialog"
      title="确认删除绑定关系"
      description="您即将删除以下绑定记录，此操作不可撤销。"
      :fields="deleteBindingFields"
      warning="删除后该绑定关系记录将从数据库移除。"
      confirm-text="确认删除绑定关系"
      :submitting="deleteBindingSubmitting"
      @confirm="handleDeleteBinding"
    />
  </el-main>
</template>
