<script setup>
import { computed, ref, watch } from "vue"
import {
  CirclePlus,
  Delete,
  EditPen,
  Search,
} from "@element-plus/icons-vue"

const searchText = ref("")
const currentPage = ref(1)
const pageSize = ref(10)

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
          <el-button class="add-account-button" type="primary" :icon="CirclePlus">
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
            <template #default>
              <div class="table-actions">
                <el-button size="small" :icon="EditPen" round>编辑</el-button>
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
  </el-main>
</template>
