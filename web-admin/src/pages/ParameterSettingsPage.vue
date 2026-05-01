<script setup>
import { computed, reactive, ref, watch } from "vue"
import {
  CirclePlus,
  Delete,
  EditPen,
  Search,
  Setting,
} from "@element-plus/icons-vue"

const searchText = ref("")
const currentPage = ref(1)
const pageSize = ref(10)
const showParameterDialog = ref(false)
const parameterDialogMode = ref("create")

const parameterForm = reactive({
  category: "账户计划",
  name: "",
  days: null,
  sortOrder: null,
  enabled: true,
  remark: "",
})

const parameterDialogTitle = computed(() => (
  parameterDialogMode.value === "edit" ? "编辑参数" : "新增参数"
))

const parameters = ref([
  ["账户计划", "全家桶月付", 30, true, 1, "-", "2026/4/30"],
  ["账户计划", "全家桶半年付", 180, true, 2, "-", "2026/4/29"],
  ["账户计划", "全家桶年付", 365, true, 3, "-", "2026/4/30"],
  ["账户计划", "摄影计划月付", 30, true, 4, "-", "2026/4/30"],
  ["账户计划", "摄影计划年付", 365, true, 4, "-", "2026/4/30"],
].map(([category, name, days, enabled, sortOrder, remark, createdAt], index) => ({
  id: `parameter-${index}`,
  category,
  name,
  days,
  enabled,
  sortOrder,
  remark,
  createdAt,
})))

const filteredParameters = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  if (!keyword) {
    return parameters.value
  }

  return parameters.value.filter((parameter) => [
    parameter.category,
    parameter.name,
    parameter.remark,
  ].join(" ").toLowerCase().includes(keyword))
})

const pagedParameters = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredParameters.value.slice(start, start + pageSize.value)
})

const pageRangeText = computed(() => {
  const total = filteredParameters.value.length
  if (total === 0) {
    return "本页 0 条 / 共 0 条"
  }

  const start = (currentPage.value - 1) * pageSize.value + 1
  const end = Math.min(start + pagedParameters.value.length - 1, total)
  return `本页 ${start}-${end} 条 / 共 ${total} 条`
})

watch(searchText, () => {
  currentPage.value = 1
})

function handleSizeChange(size) {
  pageSize.value = size
  currentPage.value = 1
}

function openCreateParameterDialog() {
  parameterDialogMode.value = "create"
  Object.assign(parameterForm, {
    category: "账户计划",
    name: "",
    days: null,
    sortOrder: null,
    enabled: true,
    remark: "",
  })
  showParameterDialog.value = true
}

function openEditParameterDialog(parameter) {
  parameterDialogMode.value = "edit"
  Object.assign(parameterForm, {
    category: parameter.category,
    name: parameter.name,
    days: parameter.days,
    sortOrder: parameter.sortOrder,
    enabled: parameter.enabled,
    remark: parameter.remark === "-" ? "" : parameter.remark,
  })
  showParameterDialog.value = true
}
</script>

<template>
  <el-main class="main-panel admin-dashboard parameter-dashboard">
    <section class="admin-main-content">
      <section class="account-title-section parameter-title-section">
        <div class="account-table-title">
          <h1>参数列表</h1>
          <p>仅展示当前模型已有字段，不包含价格、计划类型等额外信息。</p>
        </div>

        <div class="parameter-title-actions">
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
          class="account-table parameter-table"
          :data="pagedParameters"
          height="100%"
          stripe
          row-key="id"
        >
          <el-table-column prop="category" label="参数分类" min-width="160" />
          <el-table-column prop="name" label="参数名称" min-width="210" show-overflow-tooltip />
          <el-table-column prop="days" label="有效期天数" width="160" />
          <el-table-column label="启用状态" width="160">
            <template #default="{ row }">
              <el-tag :type="row.enabled ? 'success' : 'info'" effect="light" round>
                {{ row.enabled ? "启用" : "禁用" }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="sortOrder" label="排序" width="120" />
          <el-table-column prop="remark" label="备注" min-width="120" />
          <el-table-column prop="createdAt" label="创建时间" width="170" />
          <el-table-column label="操作" fixed="right" width="220">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button size="small" :icon="EditPen" round @click="openEditParameterDialog(row)">编辑</el-button>
                <el-button size="small" :icon="Delete" round type="danger" plain>删除</el-button>
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
          :total="filteredParameters.length"
          @current-change="currentPage = $event"
          @size-change="handleSizeChange"
        />
      </div>
    </section>

    <el-dialog
      v-model="showParameterDialog"
      class="account-form-dialog parameter-form-dialog"
      width="800px"
      align-center
      append-to-body
      :show-close="false"
    >
      <template #header>
        <div class="parameter-form-head">
          <div class="parameter-form-icon">
            <el-icon><Setting /></el-icon>
          </div>
          <div>
            <h2 class="account-form-title">{{ parameterDialogTitle }}</h2>
            <p>维护账户计划。账户计划的有效期会用于自动计算到期日和续费天数。</p>
          </div>
        </div>
      </template>

      <el-form class="account-form-grid parameter-form-grid" :model="parameterForm" label-position="top">
        <el-form-item label="名称" required>
          <el-input v-model="parameterForm.name" placeholder="例如 全家桶年付" />
        </el-form-item>

        <el-form-item label="有效期天数">
          <el-input-number
            v-model="parameterForm.days"
            :min="0"
            :controls="true"
            placeholder="仅账户计划需要"
          />
        </el-form-item>

        <el-form-item label="排序">
          <el-input-number
            v-model="parameterForm.sortOrder"
            :min="0"
            :controls="true"
            placeholder="数字越小越靠前"
          />
        </el-form-item>

        <el-form-item label="启用" class="parameter-form-enabled">
          <div class="parameter-enabled-control">
            <span>启用</span>
            <el-switch v-model="parameterForm.enabled" />
            <strong>{{ parameterForm.enabled ? "已启用" : "已禁用" }}</strong>
          </div>
        </el-form-item>

        <el-form-item label="备注" class="account-form-remark">
          <el-input
            v-model="parameterForm.remark"
            type="textarea"
            :rows="4"
            placeholder="请输入备注（可选）"
            resize="vertical"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="account-form-footer">
          <el-button class="account-form-cancel" round @click="showParameterDialog = false">取消</el-button>
          <el-button class="account-form-submit" type="primary" round>保存</el-button>
        </div>
      </template>
    </el-dialog>
  </el-main>
</template>
