<script setup>
import { computed, ref, watch } from "vue"
import {
  CirclePlus,
  Delete,
  Link,
  RefreshRight,
  Search,
} from "@element-plus/icons-vue"
import BindingDialog from "../components/BindingDialog.vue"
import DeleteConfirmDialog from "../components/DeleteConfirmDialog.vue"
import { submitWithFeedback } from "../utils/databaseAction"

const searchText = ref("")
const roleFilter = ref("")
const validFilter = ref("")
const currentPage = ref(1)
const pageSize = ref(10)
const showBindingDialog = ref(false)
const bindingDialogMode = ref("bind")
const selectedBinding = ref({})
const showDeleteBindingDialog = ref(false)
const selectedDeleteBinding = ref(null)
const bindingSubmitting = ref(false)
const deleteBindingSubmitting = ref(false)

const customerContacts = {
  C0001: "微信 大米先生",
  C0002: "闲鱼 Vian_Singleton",
  C0006: "QQ 68190021",
  C0007: "微信 oldzhou",
  C0008: "微信 陌上人如玉",
  C0009: "微信",
  C0010: "微信 年年",
  C0011: "微信 鱼丸粗面",
  C0012: "微信 CONCISE",
  C0013: "微信 张晶晶",
  C0014: "微信 HM_YB2023",
  C0015: "微信 花雷",
}

const assignments = ref([
  ["C0015", "花雷", "A0016", "tracygunther@proton.me", "primary", "2026/4/27", true],
  ["C0014", "袁博", "A0015", "784774726@qq.com", "primary", "2026/4/27", true],
  ["C0013", "张晶晶", "A0014", "shanshanz1878313@proton.me", "primary", "2026/4/27", true],
  ["C0012", "freeze Frame", "A0013", "lutherbrooke@proton.me", "primary", "2026/4/27", true],
  ["C0011", "鱼丸粗面", "A0012", "mrlee19900517@outlook.com", "primary", "2026/4/27", true],
  ["C0008", "陌上人如玉", "A0002", "tuzki98@icloud.com", "backup", "2026/4/27", true],
  ["C0008", "陌上人如玉", "A0011", "elmerhoyle23@outlook.com", "primary", "2026/4/27", true],
  ["C0010", "年年", "A0003", "hildaella@proton.me", "primary", "2026/4/27", true],
  ["C0002", "Vian_Singleton", "A0002", "tuzki98@icloud.com", "primary", "2026/4/27", true],
  ["C0001", "大米先生", "A0001", "1170175069@qq.com", "primary", "2026/4/27", true],
  ["C0009", "炸鸡求在炼丹炉背客人", "A0009", "jeremyhosea24@proton.me", "primary", "2026/4/27", true],
  ["C0006", "小风", "A0008", "hirambrook@proton.me", "backup", "2026/4/18", false],
  ["C0007", "老周", "A0007", "nellyhosea@proton.me", "primary", "2026/4/12", false],
].map(([customerCode, customerName, accountCode, accountEmail, role, assignedAt, valid], index) => ({
  id: `${customerCode}-${accountCode}-${index}`,
  customerCode,
  customerName,
  customerContact: customerContacts[customerCode] || "",
  accountCode,
  accountEmail,
  role,
  assignedAt,
  valid,
})))

const filteredAssignments = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  return assignments.value.filter((assignment) => {
    const matchesKeyword = !keyword || [
      assignment.customerName,
      assignment.customerContact,
      assignment.accountEmail,
    ].join(" ").toLowerCase().includes(keyword)
    const matchesRole = !roleFilter.value || assignment.role === roleFilter.value
    const matchesValid = !validFilter.value || String(assignment.valid) === validFilter.value
    return matchesKeyword && matchesRole && matchesValid
  })
})

const pagedAssignments = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredAssignments.value.slice(start, start + pageSize.value)
})

const deleteBindingFields = computed(() => {
  const binding = selectedDeleteBinding.value
  if (!binding) return []
  return [
    { label: "客户", value: `${binding.customerCode} | ${binding.customerName}` },
    { label: "Adobe账户", value: `${binding.accountCode} | ${binding.accountEmail}` },
    { label: "主备标识", value: roleLabel(binding.role) === "主要" ? "主要账号" : "备用账号" },
    { label: "绑定日期", value: binding.assignedAt },
    { label: "当前状态", value: binding.valid ? "已绑定" : "已取消" },
  ]
})

watch([searchText, roleFilter, validFilter], () => {
  currentPage.value = 1
})

const pageRangeText = computed(() => {
  const total = filteredAssignments.value.length
  if (total === 0) {
    return "本页 0 条 / 共 0 条"
  }

  const start = (currentPage.value - 1) * pageSize.value + 1
  const end = Math.min(start + pagedAssignments.value.length - 1, total)
  return `本页 ${start}-${end} 条 / 共 ${total} 条`
})

function handleSizeChange(size) {
  pageSize.value = size
  currentPage.value = 1
}

function roleLabel(role) {
  return role === "primary" ? "主要" : "备用"
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

function handleBindingConfirm(payload) {
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
    successMessage: successMap[payload.mode],
    errorMessage: errorMap[payload.mode],
    onSuccess: () => { showBindingDialog.value = false },
  })
}

function handleDeleteBinding() {
  submitWithFeedback({
    setLoading: (value) => { deleteBindingSubmitting.value = value },
    successMessage: "绑定关系删除成功。",
    errorMessage: "绑定关系删除失败。",
    onSuccess: () => { showDeleteBindingDialog.value = false },
  })
}
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
          class="account-table assignment-table"
          :data="pagedAssignments"
          height="100%"
          stripe
          row-key="id"
        >
          <el-table-column prop="customerCode" label="客户编号" width="120" />
          <el-table-column prop="customerName" label="客户昵称" min-width="180" show-overflow-tooltip />
          <el-table-column prop="accountCode" label="Adobe账户编号" width="160" />
          <el-table-column prop="accountEmail" label="Adobe账户邮箱" min-width="260" show-overflow-tooltip />
          <el-table-column label="主备" width="150">
            <template #default="{ row }">
              <span class="assignment-role" :class="{ 'is-backup': row.role === 'backup' }">
                <el-switch v-model="row.role" active-value="primary" inactive-value="backup" />
                <strong>{{ roleLabel(row.role) }}</strong>
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="assignedAt" label="绑定日期" width="150" />
          <el-table-column label="是否有效" width="130">
            <template #default="{ row }">
              <el-tag :type="row.valid ? 'success' : 'info'" effect="light" round>
                {{ row.valid ? "有效" : "无效" }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="220">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button
                  v-if="row.valid"
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
                  @click="openRestoreBindingDialog(row)"
                >
                  恢复
                </el-button>
                <el-button size="small" :icon="Delete" round :disabled="row.valid" @click="openDeleteBindingDialog(row)">删除</el-button>
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
          :total="filteredAssignments.length"
          @current-change="currentPage = $event"
          @size-change="handleSizeChange"
        />
      </div>
    </section>

    <BindingDialog
      v-model="showBindingDialog"
      :mode="bindingDialogMode"
      :binding="selectedBinding"
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
