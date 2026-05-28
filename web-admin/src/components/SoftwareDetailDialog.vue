<template>
  <el-dialog
    :model-value="modelValue"
    class="software-detail-dialog"
    width="1080px"
    top="6vh"
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    append-to-body
    @update:model-value="onDialogModelUpdate"
  >
    <div class="detail-root" v-loading="loading">
      <header class="detail-header">
        <h2>软件详情</h2>
        <p>查看该软件的详细信息与当前状态</p>
      </header>

      <section class="summary-bar">
        <div class="summary-left">
          <div class="summary-icon">
            <img v-if="normalizedDetail.iconPath" :src="normalizedDetail.iconPath" alt="软件图标" />
            <span v-else>{{ initial }}</span>
          </div>
          <div class="summary-text">
            <h3 :title="normalizedDetail.name">{{ normalizedDetail.name || "-" }}</h3>
          </div>
        </div>
        <div class="summary-tags">
          <span class="status-pill source" :class="sourcePillClass">{{ normalizedDetail.sourceType || "-" }}</span>
          <span class="status-pill validity" :class="validityPillClass">{{ normalizedDetail.validity || "-" }}</span>
          <span class="status-pill publish" :class="publishPillClass">{{ normalizedDetail.publishStatus || "-" }}</span>
        </div>
      </section>

      <section class="detail-section">
        <div class="section-title"><i></i><span>基本信息</span></div>
        <div class="info-rows info-rows-3col">
          <div v-for="(row, rowIndex) in basicInfoRows" :key="`basic-row-${rowIndex}`" class="info-row" :class="{ 'is-last': rowIndex === basicInfoRows.length - 1 }">
            <div v-for="item in row" :key="item.label" class="info-cell">
              <span class="cell-label">{{ item.label }}：</span>
              <span class="cell-value" :class="item.className" :title="String(item.value)">{{ item.value }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="detail-section">
        <div class="section-title"><i></i><span>软件描述</span></div>
        <div class="desc-box" :title="normalizedDetail.description || '暂无描述'">{{ normalizedDetail.description || "暂无描述" }}</div>
      </section>

      <section class="detail-section">
        <div class="section-title"><i></i><span>文件信息</span></div>
        <div class="info-rows info-rows-2col">
          <div v-for="(row, rowIndex) in fileInfoRows" :key="`file-row-${rowIndex}`" class="info-row" :class="{ 'is-last': rowIndex === fileInfoRows.length - 1 }">
            <div v-for="item in row" :key="item.label" class="info-cell">
              <span class="cell-label">{{ item.label }}：</span>
              <span class="cell-value" :class="item.className" :title="String(item.value)">{{ item.value }}</span>
            </div>
          </div>
        </div>
      </section>

      <footer class="detail-footer">
        <el-button class="btn-cancel" @click="handleCancel">取消</el-button>
        <el-button type="primary" class="btn-edit" @click="handleEdit">编辑软件</el-button>
      </footer>
    </div>
  </el-dialog>
</template>

<script setup>
import { computed } from "vue"

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  detail: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(["update:modelValue", "close", "edit"])

const normalizedDetail = computed(() => (props.detail || {}))

const initial = computed(() => {
  const text = String(normalizedDetail.value.name || "").trim()
  return text ? text.slice(0, 1).toUpperCase() : "S"
})

const sourcePillClass = computed(() => {
  const value = String(normalizedDetail.value.sourceType || "")
  if (value.includes("云") || value.includes("服务器")) return "is-cloud"
  if (value.includes("外链")) return "is-link"
  return "is-local"
})

const validityPillClass = computed(() => {
  const value = String(normalizedDetail.value.validity || "")
  if (value.includes("缺失") || value.includes("失效")) return "is-danger"
  return "is-success"
})

const publishPillClass = computed(() => {
  const value = String(normalizedDetail.value.publishStatus || "")
  return value.includes("已上架") ? "is-success" : "is-muted"
})

const basicInfoItems = computed(() => [
  { label: "软件名称", value: normalizedDetail.value.name || "-" },
  { label: "所属分类", value: normalizedDetail.value.category || "-" },
  { label: "支持平台", value: normalizedDetail.value.platform || "-" },
  { label: "软件版本", value: normalizedDetail.value.appVersion || normalizedDetail.value.softwareVersion || "-" },
  { label: "文件大小", value: normalizedDetail.value.fileSize || "-" },
  { label: "下载次数", value: normalizedDetail.value.downloadCount || "-" },
  { label: "来源方式", value: normalizedDetail.value.sourceType || "-", className: "is-primary" },
  { label: "有效性", value: normalizedDetail.value.validity || "-", className: validityPillClass.value === "is-danger" ? "is-danger" : "is-success" },
  { label: "上架状态", value: normalizedDetail.value.publishStatus || "-", className: publishPillClass.value === "is-muted" ? "is-muted" : "is-success" },
  { label: "排序", value: normalizedDetail.value.sort ?? "-" },
  { label: "创建时间", value: normalizedDetail.value.createdAt || "-" },
  { label: "更新时间", value: normalizedDetail.value.updatedAt || "-" },
])

const fileInfoItems = computed(() => [
  { label: "原始文件名", value: normalizedDetail.value.originalName || "-" },
  { label: "服务器文件名", value: normalizedDetail.value.fileName || "-" },
  { label: "文件路径", value: normalizedDetail.value.filePath || "-" },
  { label: "文件哈希", value: normalizedDetail.value.fileHash || "-" },
  { label: "存储位置", value: normalizedDetail.value.storageLocation || "-" },
  { label: "安全检测", value: normalizedDetail.value.securityCheck || "-", className: String(normalizedDetail.value.securityCheck || "").includes("通过") ? "is-success" : "" },
])

const basicInfoRows = computed(() => {
  const rows = []
  for (let i = 0; i < basicInfoItems.value.length; i += 3) {
    rows.push(basicInfoItems.value.slice(i, i + 3))
  }
  return rows
})

const fileInfoRows = computed(() => {
  const rows = []
  for (let i = 0; i < fileInfoItems.value.length; i += 2) {
    rows.push(fileInfoItems.value.slice(i, i + 2))
  }
  return rows
})

function onDialogModelUpdate(value) {
  emit("update:modelValue", value)
  if (!value) emit("close")
}

function handleCancel() {
  emit("update:modelValue", false)
  emit("close")
}

function handleEdit() {
  emit("edit", normalizedDetail.value)
}
</script>

<style scoped>
:deep(.software-detail-dialog .el-dialog) {
  width: 1080px;
  max-width: calc(100vw - 80px);
  border-radius: 20px;
  border: 1px solid #e8eef7;
  background: #ffffff;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.12);
}

:deep(.software-detail-dialog .el-dialog__header) {
  display: none;
}

:deep(.software-detail-dialog .el-dialog__body) {
  padding: 0;
  background: #ffffff;
}

.detail-root {
  padding: 28px 32px 24px;
  color: #1f2937;
}

.detail-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
  color: #1f2937;
}

.detail-header p {
  margin: 4px 0 0;
  font-size: 14px;
  color: #667085;
}

.summary-bar {
  margin-top: 18px;
  min-height: 72px;
  border: 1px solid #eef2f7;
  border-radius: 15px;
  padding: 12px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: #ffffff;
}

.summary-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.summary-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: #e8f1ff;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex: 0 0 auto;
}

.summary-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.summary-icon span {
  font-size: 26px;
  font-weight: 800;
  color: #1677ff;
  line-height: 1;
}

.summary-text h3 {
  margin: 0;
  font-size: 21px;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 460px;
}

.summary-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.status-pill {
  height: 30px;
  line-height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid transparent;
  white-space: nowrap;
}

.status-pill.source.is-local,
.status-pill.source.is-link {
  color: #1677ff;
  background: #eaf2ff;
  border-color: #d5e7ff;
}

.status-pill.source.is-cloud {
  color: #7c3aed;
  background: #f1ebff;
  border-color: #e3d7ff;
}

.status-pill.validity.is-success,
.status-pill.publish.is-success {
  color: #16a34a;
  background: #e9f8ef;
  border-color: #ccefd9;
}

.status-pill.validity.is-danger {
  color: #dc2626;
  background: #feeeee;
  border-color: #f9d0d0;
}

.status-pill.publish.is-muted {
  color: #667085;
  background: #f3f4f6;
  border-color: #e5e7eb;
}

.detail-section {
  margin-top: 18px;
}

.section-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.section-title i {
  width: 3px;
  height: 16px;
  border-radius: 2px;
  background: #1677ff;
}

.section-title span {
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}

.info-rows {
  background: #fff;
  border-radius: 10px;
}

.info-row {
  border-bottom: 1px solid #f0f3f8;
}

.info-row.is-last {
  border-bottom: none;
}

.info-rows-3col .info-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.info-rows-2col .info-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.info-cell {
  height: 48px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.cell-label {
  color: #667085;
  font-size: 13px;
  flex: 0 0 auto;
}

.cell-value {
  color: #1f2937;
  font-size: 14px;
  font-weight: 500;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell-value.is-primary {
  color: #1677ff;
}

.cell-value.is-success {
  color: #16a34a;
}

.cell-value.is-danger {
  color: #dc2626;
}

.cell-value.is-muted {
  color: #667085;
}

.desc-box {
  min-height: 50px;
  border: 1px solid #eef2f7;
  border-radius: 9px;
  background: #f8fafc;
  padding: 12px 16px;
  font-size: 14px;
  line-height: 1.5;
  color: #374151;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.detail-footer {
  margin-top: 22px;
  padding-top: 6px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-cancel,
.btn-edit {
  height: 40px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
}

.btn-cancel {
  width: 120px;
  border-color: #d7deea;
  color: #5c6b82;
}

.btn-edit {
  width: 140px;
}

@media (max-width: 1200px) {
  .detail-root {
    padding: 24px;
  }

  .summary-text h3 {
    max-width: 320px;
  }
}

@media (max-width: 900px) {
  .info-rows-3col .info-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .summary-bar {
    flex-direction: column;
    align-items: flex-start;
  }

  .summary-tags {
    justify-content: flex-start;
  }

  .info-rows-3col .info-row,
  .info-rows-2col .info-row {
    grid-template-columns: 1fr;
  }
}
</style>
