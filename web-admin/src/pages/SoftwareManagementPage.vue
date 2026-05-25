<script setup>
import { computed, nextTick, onMounted, ref, watch } from "vue"
import {
  CircleCheckFilled,
  CirclePlus,
  Delete,
  EditPen,
  Search,
  Upload,
  View,
  WarningFilled,
} from "@element-plus/icons-vue"
import { ElMessage, ElMessageBox } from "element-plus"
import {
  checkSoftwareValidity,
  createSoftwareByExternalLink,
  createSoftwareByLocalUpload,
  createSoftwareByRemoteImport,
  deleteSoftware,
  getSoftware,
  getSoftwareImportTask,
  listSoftwareCategories,
  listSoftwares,
  resolveRemoteSoftwareMeta,
  updateSoftware,
} from "../api/admin"
import { submitWithFeedback } from "../utils/databaseAction"
import { formatDate } from "../utils/format"
import SoftwareDetailDialog from "../components/SoftwareDetailDialog.vue"
import { SOFTWARE_CATEGORIES, getSoftwareCategoryMeta } from "../constants/softwareCategories"
import androidIcon from "../assets/icons/android.svg"
import macosIcon from "../assets/icons/macos.svg"
import windowsIcon from "../assets/icons/windows.svg"

const searchText = ref("")
const categoryFilter = ref("")
const sourceTypeFilter = ref("")
const validityFilter = ref("")
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const loading = ref(false)
const categories = ref([])
const softwares = ref([])
const showCreateDialog = ref(false)
const createTab = ref("common")
const createSubmitting = ref(false)
const localFileRef = ref(null)
const iconFileRef = ref(null)
const remoteImportStatus = ref("")
const resolvingRemoteMeta = ref(false)
const lastCreatedSoftwareId = ref("")
const showViewDialog = ref(false)
const showEditDialog = ref(false)
const currentSoftware = ref(null)
const editSubmitting = ref(false)
const editFormRef = ref(null)
const editIconPopoverVisible = ref(false)
const editForm = ref({
  id: "",
  name: "",
  categoryKey: "other",
  platform: "Windows",
  appVersion: "",
  description: "",
  sort: 100,
  isPublished: true,
  sourceType: "",
  sourceTypeLabel: "",
  validityStatus: "",
  validityStatusLabel: "",
  downloadCount: 0,
  iconPath: "",
  iconUrl: "",
  originalName: "",
  fileName: "",
  filePath: "",
  fileHash: "",
})

const createForm = ref({
  name: "",
  categoryKey: "other",
  platform: "Windows",
  appVersion: "",
  fileSizeText: "",
  description: "",
  sort: 100,
  isPublished: true,
  localFile: "",
  localIcon: "",
  iconUrl: "",
  sourceUrl: "",
  externalUrl: "",
})
const stats = computed(() => {
  const totalCount = total.value
  const publishedCount = softwares.value.filter((item) => item.isPublished).length
  const categoryCount = SOFTWARE_CATEGORIES.length
  const invalidCount = softwares.value.filter((item) => ["local_file_missing", "external_unavailable"].includes(item.validityStatus)).length
  return { totalCount, publishedCount, categoryCount, invalidCount }
})

const pageRangeText = computed(() => {
  if (total.value === 0) return "本页 0 条 / 共 0 条"
  const start = (currentPage.value - 1) * pageSize.value + 1
  const end = Math.min(start + softwares.value.length - 1, total.value)
  return `本页 ${start}-${end} 条 / 共 ${total.value} 条`
})

const currentSoftwareDetail = computed(() => {
  const software = currentSoftware.value || {}
  const validityStatus = String(software.validityStatus || "")
  const securityCheck = validityStatus === "local_file_ok" || validityStatus === "external_available"
    ? "已通过"
    : validityStatus === "local_file_missing" || validityStatus === "external_unavailable"
      ? "未通过"
      : validityStatus === "checking"
        ? "检测中"
        : "未检测"
  const storageLocation = software.sourceType === "external_link" ? "外部链接" : "云服务器 software-files"
  return {
    name: software.name || "-",
    subtitle: software.description || "",
    iconPath: software.iconPath || "",
    category: software.categoryName || getSoftwareCategoryMeta(software.categoryKey).name || software.category || "-",
    platform: software.platform || "-",
    appVersion: software.appVersion || software.softwareVersion || software.version || "-",
    fileSize: software.fileSize ? `${(software.fileSize / 1024 / 1024).toFixed(1)} MB` : software.fileSizeText || "-",
    downloadCount: Number(software.downloadCount || 0).toLocaleString("en-US"),
    sourceType: software.sourceTypeLabel || software.sourceType || "-",
    validity: software.validityStatusLabel || software.validityStatus || "-",
    publishStatus: software.isPublished ? "已上架" : "未上架",
    sort: software.sort ?? "-",
    createdAt: software.createdAt ? formatDate(software.createdAt) : "-",
    updatedAt: software.updatedAt ? formatDate(software.updatedAt) : "-",
    description: software.description || "",
    originalName: software.originalName || "-",
    fileName: software.fileName || "-",
    filePath: software.filePath || "-",
    fileHash: software.fileHash || "-",
    storageLocation,
    securityCheck,
  }
})

const createSubmitText = computed(() => {
  if (!createSubmitting.value) return "保存软件"
  if (createTab.value !== "remote") return "保存中..."
  if (remoteImportStatus.value.includes("排队")) return "排队中..."
  if (remoteImportStatus.value.includes("下载中")) return "下载中..."
  if (remoteImportStatus.value.includes("处理中")) return "处理中..."
  return "保存中..."
})

const editSubmitText = computed(() => (editSubmitting.value ? "保存中" : "保存修改"))
const editRules = {
  name: [{ required: true, message: "请输入软件名称", trigger: "blur" }],
  categoryKey: [{ required: true, message: "请选择分类", trigger: "change" }],
  platform: [{ required: true, message: "请选择支持平台", trigger: "change" }],
  isPublished: [{ required: true, message: "请选择上架状态", trigger: "change" }],
  appVersion: [{ max: 50, message: "软件版本不能超过 50 个字符", trigger: "blur" }],
  description: [{ max: 300, message: "软件描述不能超过 300 个字符", trigger: "blur" }],
  iconUrl: [
    {
      validator: (_rule, value, callback) => {
        if (!value || !String(value).trim()) {
          callback()
          return
        }
        if (!isValidHttpUrl(value)) {
          callback(new Error("图标链接必须是有效的 http/https 地址"))
          return
        }
        callback()
      },
      trigger: "blur",
    },
  ],
  sort: [
    {
      validator: (_rule, value, callback) => {
        const n = Number(value)
        if (!Number.isInteger(n) || n < 0) {
          callback(new Error("排序必须为非负整数"))
          return
        }
        callback()
      },
      trigger: "blur",
    },
  ],
}

const editStorageLocation = computed(() => {
  const sourceType = String(editForm.value.sourceType || "")
  if (sourceType === "external_link") return "外部链接"
  if (sourceType === "local_upload" || sourceType === "remote_import") return "云服务器 software-files"
  return "-"
})

const editSecurityCheck = computed(() => {
  const validityStatus = String(editForm.value.validityStatus || "")
  if (validityStatus === "local_file_ok" || validityStatus === "external_available") return "已通过"
  if (validityStatus === "local_file_missing" || validityStatus === "external_unavailable") return "未通过"
  if (validityStatus === "checking") return "检测中"
  return "未检测"
})

function isValidHttpUrl(value) {
  try {
    const url = new URL(String(value || "").trim())
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    softwares.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handleSizeChange(size) {
  pageSize.value = size
  currentPage.value = 1
  loadSoftwares()
}

function sourceTypeTagType(value) {
  if (value === "external_link") return "warning"
  if (value === "remote_import") return "success"
  return "primary"
}

function validityTagType(value) {
  if (value === "external_unavailable" || value === "local_file_missing") return "danger"
  if (value === "unchecked" || value === "checking") return "warning"
  return "success"
}

function statusTagType(value) {
  return value ? "success" : "info"
}

function softwareInitial(name) {
  const text = String(name || "").trim()
  return text ? text.slice(0, 1).toUpperCase() : "S"
}

function platformInitial(platform) {
  const value = String(platform || "").trim().toLowerCase()
  if (value.includes("windows")) return "W"
  if (value.includes("mac")) return "M"
  if (value.includes("android")) return "A"
  if (value.includes("ios")) return "i"
  return "O"
}

function platformIcon(platform) {
  const value = String(platform || "").trim().toLowerCase()
  if (value.includes("windows")) return windowsIcon
  if (value.includes("mac")) return macosIcon
  if (value.includes("android")) return androidIcon
  return windowsIcon
}

function triggerCheck(row) {
  submitWithFeedback({
    setLoading: () => {},
    action: () => checkSoftwareValidity(row.id),
    successMessage: "有效性检测已完成。",
    errorMessage: "有效性检测失败。",
    onSuccess: loadSoftwares,
  })
}

async function openViewDialog(row) {
  currentSoftware.value = null
  try {
    const data = await getSoftware(row.id)
    currentSoftware.value = data.software
    showViewDialog.value = true
  } catch (error) {
    ElMessage.error(error?.message || "获取软件详情失败")
    showViewDialog.value = false
  }
}

function closeViewDialog() {
  showViewDialog.value = false
}

function handleViewEdit() {
  closeViewDialog()
  if (currentSoftware.value) {
    openEditDialog(currentSoftware.value)
  }
}

async function openEditDialog(row) {
  editIconPopoverVisible.value = false
  try {
    const data = await getSoftware(row.id)
    const s = data.software || {}
    editForm.value = {
      id: s.id,
      name: s.name || "",
      categoryKey: s.categoryKey || "other",
      platform: s.platform || "Windows",
      appVersion: s.appVersion || s.softwareVersion || s.version || "",
      description: s.description || "",
      sort: Number(s.sort ?? 100),
      isPublished: s.isPublished === true,
      sourceType: s.sourceType || "",
      sourceTypeLabel: s.sourceTypeLabel || s.sourceType || "",
      validityStatus: s.validityStatus || "",
      validityStatusLabel: s.validityStatusLabel || s.validityStatus || "",
      downloadCount: Number(s.downloadCount || 0),
      iconPath: s.iconPath || "",
      iconUrl: "",
      originalName: s.originalName || "",
      fileName: s.fileName || "",
      filePath: s.filePath || "",
      fileHash: s.fileHash || "",
    }
    showEditDialog.value = true
  } catch (error) {
    ElMessage.error(error?.message || "获取编辑数据失败")
  }
}

function closeEditDialog() {
  if (editSubmitting.value) return
  editIconPopoverVisible.value = false
  showEditDialog.value = false
}

function handleEditDialogBeforeClose(done) {
  if (editSubmitting.value) return
  done()
}

async function handleEditSubmit() {
  if (editFormRef.value?.validate) {
    try {
      await editFormRef.value.validate()
    } catch {
      return
    }
  }

  submitWithFeedback({
    setLoading: (value) => {
      editSubmitting.value = value
    },
    action: async () => {
      const form = editForm.value
      if (!form.name.trim()) throw new Error("请输入软件名称")
      if (!form.categoryKey) throw new Error("请选择分类")
      if (!String(form.platform || "").trim()) throw new Error("请选择支持平台")
      if (form.isPublished !== true && form.isPublished !== false) throw new Error("请选择上架状态")
      if (form.appVersion && String(form.appVersion).trim().length > 50) throw new Error("软件版本不能超过 50 个字符")
      if (form.description && String(form.description).trim().length > 300) throw new Error("软件描述不能超过 300 个字符")
      if (form.iconUrl && !isValidHttpUrl(form.iconUrl)) throw new Error("图标链接必须是有效的 http/https 地址")
      if (!Number.isInteger(Number(form.sort)) || Number(form.sort) < 0) throw new Error("排序必须为非负整数")
      const payload = {
        name: form.name.trim(),
        categoryKey: form.categoryKey,
        platform: form.platform || "Windows",
        appVersion: form.appVersion || "",
        description: form.description || "",
        sort: Number(form.sort ?? 100),
        isPublished: Boolean(form.isPublished),
      }
      if (form.iconUrl && String(form.iconUrl).trim()) {
        payload.iconUrl = String(form.iconUrl).trim()
      }
      await updateSoftware(form.id, payload)
    },
    successMessage: "软件编辑成功。",
    errorMessage: "软件编辑失败。",
    onSuccess: async () => {
      showEditDialog.value = false
      showViewDialog.value = false
      await loadSoftwares()
    },
  })
}

async function confirmDelete(row) {
  await ElMessageBox.confirm(`确认删除软件「${row.name}」吗？`, "删除确认", {
    type: "warning",
    confirmButtonText: "确认删除",
    cancelButtonText: "取消",
  })
  submitWithFeedback({
    setLoading: () => {},
    action: () => deleteSoftware(row.id),
    successMessage: "软件删除成功。",
    errorMessage: "软件删除失败。",
    onSuccess: loadSoftwares,
  })
}

watch([searchText, categoryFilter, sourceTypeFilter, validityFilter], () => {
  currentPage.value = 1
  loadSoftwares()
})

onMounted(async () => {
  await Promise.all([loadCategories(), loadSoftwares()])
})

function openCreateDialog() {
  showCreateDialog.value = true
  createTab.value = "local"
}

function onPickFile(event, target) {
  const [file] = event.target.files || []
  if (target === "package") {
    localFileRef.value = file || null
    createForm.value.localFile = file ? file.name : ""
  } else {
    iconFileRef.value = file || null
    createForm.value.localIcon = file ? file.name : ""
  }
}

function resetCreateForm() {
  createForm.value = {
    name: "",
    categoryKey: "other",
    platform: "Windows",
    appVersion: "",
    fileSizeText: "",
    description: "",
    sort: 100,
    isPublished: true,
    localFile: "",
    localIcon: "",
    iconUrl: "",
    sourceUrl: "",
    externalUrl: "",
  }
  localFileRef.value = null
  iconFileRef.value = null
  remoteImportStatus.value = ""
}

async function submitCreateSoftware() {
  const form = createForm.value
  if (!form.name.trim()) throw new Error("请输入软件名称")
  if (!form.categoryKey) throw new Error("请选择分类")
  if (createTab.value === "local" && !localFileRef.value) throw new Error("请选择软件安装包")
  if (createTab.value === "remote" && !form.sourceUrl.trim()) throw new Error("请输入下载链接 URL")
  if (createTab.value === "remote" && !isValidHttpUrl(form.sourceUrl)) throw new Error("下载链接 URL 格式不正确，仅支持 http/https")
  if (createTab.value === "external" && !form.externalUrl.trim()) throw new Error("请输入外链 URL")
  if (createTab.value === "external" && !isValidHttpUrl(form.externalUrl)) throw new Error("外链 URL 格式不正确，仅支持 http/https")

  const payload = new FormData()
  payload.append("name", form.name.trim())
  payload.append("categoryKey", form.categoryKey)
  payload.append("platform", form.platform || "Windows")
  payload.append("appVersion", form.appVersion || "")
  payload.append("description", form.description || "")
  payload.append("sort", String(form.sort ?? 100))
  payload.append("isPublished", String(Boolean(form.isPublished)))
  if (iconFileRef.value) payload.append("icon", iconFileRef.value)
  if (form.iconUrl && String(form.iconUrl).trim()) payload.append("iconUrl", String(form.iconUrl).trim())

  if (createTab.value === "local") {
    payload.append("file", localFileRef.value)
    const { software } = await createSoftwareByLocalUpload(payload)
    return software?.id || ""
  } else if (createTab.value === "remote") {
    payload.append("sourceUrl", form.sourceUrl.trim())
    const { task } = await createSoftwareByRemoteImport(payload)
    const finishedTask = await waitImportTaskFinished(task?.taskId)
    return finishedTask?.softwareId || ""
  } else {
    payload.append("externalUrl", form.externalUrl.trim())
    const { software } = await createSoftwareByExternalLink(payload)
    return software?.id || ""
  }
}

async function waitImportTaskFinished(taskId) {
  if (!taskId) {
    throw new Error("导入任务创建失败，请重试")
  }
  const maxAttempts = 180
  for (let i = 0; i < maxAttempts; i += 1) {
    const { task } = await getSoftwareImportTask(taskId)
    if (task.status === "queued") remoteImportStatus.value = "排队中，等待开始下载..."
    if (task.status === "downloading") remoteImportStatus.value = "下载中，请稍候..."
    if (task.status === "processing") remoteImportStatus.value = "处理中，正在落盘与校验..."
    if (task.status === "success") {
      remoteImportStatus.value = "下载完成"
      return task
    }
    if (task.status === "failed") {
      remoteImportStatus.value = "下载失败"
      throw new Error(task.errorMessage || "链接下载失败")
    }
    await new Promise((resolve) => window.setTimeout(resolve, 1000))
  }
  remoteImportStatus.value = "下载超时"
  throw new Error("下载处理超时，请稍后在列表查看结果")
}

function handleResolveRemoteMeta(mode = "remote") {
  const sourceUrl = String(mode === "external" ? createForm.value.externalUrl : createForm.value.sourceUrl || "").trim()
  if (!sourceUrl) {
    remoteImportStatus.value = mode === "external" ? "请先输入外链 URL" : "请先输入下载链接 URL"
    return
  }
  if (!isValidHttpUrl(sourceUrl)) {
    remoteImportStatus.value = mode === "external" ? "外链 URL 格式不正确，仅支持 http/https" : "下载链接 URL 格式不正确，仅支持 http/https"
    return
  }
  submitWithFeedback({
    setLoading: (value) => {
      resolvingRemoteMeta.value = value
    },
    action: async () => {
      const { result } = await resolveRemoteSoftwareMeta({ sourceUrl })
      if (result.suggestedName) {
        createForm.value.name = result.suggestedName
      }
      if (result.suggestedVersion) {
        createForm.value.appVersion = result.suggestedVersion
      }
      if (result.suggestedPlatform) {
        createForm.value.platform = result.suggestedPlatform
      }
      if (result.suggestedFileSize) {
        createForm.value.fileSizeText = `${(result.suggestedFileSize / 1024 / 1024).toFixed(1)} MB`
      }
      const sizeText = result.suggestedFileSize ? `，大小约 ${(result.suggestedFileSize / 1024 / 1024).toFixed(1)} MB` : ""
      remoteImportStatus.value = `解析完成：${result.originalName || result.suggestedName || "已识别"}${sizeText}`
      return { message: "链接解析完成，已自动预填可识别字段。" }
    },
    successMessage: "链接解析完成。",
    errorMessage: "链接解析失败。",
  })
}

function handleCreateSubmit() {
  submitWithFeedback({
    setLoading: (value) => {
      createSubmitting.value = value
    },
    action: async () => {
      try {
        await submitCreateSoftware()
      } catch (error) {
        await handleCreateErrorFocus(error)
        throw error
      }
    },
    successMessage: "软件新增成功。",
    errorMessage: "软件新增失败。",
    onSuccess: async (result) => {
      lastCreatedSoftwareId.value = String(result || "")
      showCreateDialog.value = false
      resetCreateForm()
      currentPage.value = 1
      await loadSoftwares()
      if (lastCreatedSoftwareId.value) {
        window.setTimeout(() => {
          lastCreatedSoftwareId.value = ""
        }, 6000)
      }
    },
  })
}

function softwareTableRowClassName({ row }) {
  return lastCreatedSoftwareId.value && String(row.id) === lastCreatedSoftwareId.value ? "software-row-new" : ""
}
</script>

<template>
  <el-main class="main-panel admin-dashboard">
    <el-header class="admin-main-header" height="124px">
      <el-row class="admin-stat-row">
        <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
          <el-card class="metric-card" shadow="never">
            <div class="metric-icon"><el-icon><Upload /></el-icon></div>
            <div><span>软件总数</span><strong>{{ stats.totalCount }}</strong><small>所有软件资源总数</small></div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
          <el-card class="metric-card" shadow="never">
            <div class="metric-icon success"><el-icon><CircleCheckFilled /></el-icon></div>
            <div><span>已上架</span><strong class="success-text">{{ stats.publishedCount }}</strong><small>已上架可下载</small></div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
          <el-card class="metric-card" shadow="never">
            <div class="metric-icon"><el-icon><CirclePlus /></el-icon></div>
            <div><span>分类数</span><strong>{{ stats.categoryCount }}</strong><small>启用分类总数</small></div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
          <el-card class="metric-card" shadow="never">
            <div class="metric-icon danger"><el-icon><WarningFilled /></el-icon></div>
            <div><span>异常项</span><strong class="danger-text">{{ stats.invalidCount }}</strong><small>文件缺失或外链失效</small></div>
          </el-card>
        </el-col>
      </el-row>
    </el-header>

    <section class="admin-main-content">
      <section class="account-title-section">
        <div class="account-table-title">
          <h1>常用软件管理</h1>
          <p>管理企业常用软件资源，支持多种来源方式，方便员工下载使用。</p>
        </div>
      </section>

      <section class="account-filter-section">
        <div class="account-toolbar software-toolbar">
          <el-input v-model="searchText" clearable class="account-search" :prefix-icon="Search" placeholder="搜索软件名称 / 版本 / 描述" />
          <el-select v-model="categoryFilter" clearable placeholder="全部分类">
            <el-option v-for="item in categories" :key="item.categoryKey" :label="item.name" :value="item.categoryKey" />
          </el-select>
          <el-select v-model="sourceTypeFilter" clearable placeholder="全部来源">
            <el-option label="本地上传" value="local_upload" />
            <el-option label="链接下载到服务器" value="remote_import" />
            <el-option label="外链跳转下载" value="external_link" />
          </el-select>
          <el-select v-model="validityFilter" clearable placeholder="全部有效性">
            <el-option label="本地文件正常" value="local_file_ok" />
            <el-option label="本地文件缺失" value="local_file_missing" />
            <el-option label="外链正常" value="external_available" />
            <el-option label="外链失效" value="external_unavailable" />
            <el-option label="未检测" value="unchecked" />
          </el-select>
          <el-button class="add-account-button" type="primary" :icon="Upload" @click="openCreateDialog">新增软件</el-button>
        </div>
      </section>

      <section class="account-list-section">
        <el-table v-loading="loading" class="account-table software-table" :data="softwares" height="100%" stripe row-key="id" :row-class-name="softwareTableRowClassName">
          <el-table-column label="软件名称" min-width="210">
            <template #default="{ row }">
              <div class="software-name-cell">
                <span class="software-name-icon">
                  <img v-if="row.iconPath" class="software-name-icon-img" :src="row.iconPath" alt="软件图标" />
                  <template v-else>{{ softwareInitial(row.name) }}</template>
                </span>
                <span class="software-name-text">{{ row.name }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="categoryName" label="分类" min-width="92" show-overflow-tooltip />
          <el-table-column label="平台" min-width="110">
            <template #default="{ row }">
              <div class="software-platform-cell">
                <span class="software-platform-icon">
                  <img class="software-platform-icon-img" :src="platformIcon(row.platform)" alt="" />
                </span>
                <span class="software-platform-text">{{ row.platform || "Other" }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="版本" min-width="140" show-overflow-tooltip>
            <template #default="{ row }">{{ row.appVersion || row.version || "-" }}</template>
          </el-table-column>
          <el-table-column label="来源方式" min-width="116"><template #default="{ row }"><el-tag :type="sourceTypeTagType(row.sourceType)" effect="light" round>{{ row.sourceTypeLabel }}</el-tag></template></el-table-column>
          <el-table-column label="文件大小" min-width="86" align="right"><template #default="{ row }">{{ row.fileSize ? `${(row.fileSize / 1024 / 1024).toFixed(1)} MB` : "-" }}</template></el-table-column>
          <el-table-column prop="downloadCount" label="下载次数" min-width="88" align="center" />
          <el-table-column label="有效性" min-width="112"><template #default="{ row }"><el-tag :type="validityTagType(row.validityStatus)" effect="light" round>{{ row.validityStatusLabel }}</el-tag></template></el-table-column>
          <el-table-column label="状态" min-width="78"><template #default="{ row }"><el-tag :type="statusTagType(row.isPublished)" effect="light" round>{{ row.isPublished ? "已上架" : "未上架" }}</el-tag></template></el-table-column>
          <el-table-column label="更新时间" min-width="108"><template #default="{ row }">{{ formatDate(row.updatedAt) }}</template></el-table-column>
          <el-table-column label="操作" fixed="right" width="360">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button size="small" :icon="View" round @click="openViewDialog(row)">查看</el-button>
                <el-button size="small" :icon="EditPen" round @click="openEditDialog(row)">编辑</el-button>
                <el-button size="small" :icon="Delete" round type="danger" plain @click="confirmDelete(row)">删除</el-button>
                <el-button size="small" :icon="Search" round @click="triggerCheck(row)">检测</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <div class="account-table-footer">
        <strong>{{ pageRangeText }}</strong>
        <el-pagination background layout="sizes, prev, pager, next" :current-page="currentPage" :page-size="pageSize" :page-sizes="[10, 20, 50]" :total="total" @current-change="currentPage = $event; loadSoftwares()" @size-change="handleSizeChange" />
      </div>
    </section>

    <el-dialog
      v-model="showCreateDialog"
      class="account-form-dialog"
      width="860px"
      align-center
      append-to-body
      :show-close="false"
      :close-on-click-modal="false"
    >
      <template #header>
        <h2 class="account-form-title">新增软件</h2>
      </template>

      <div class="software-create-layout">
        <el-tabs v-model="createTab" class="software-create-tabs">
        <el-tab-pane label="本地上传" name="local">
          <el-form class="account-form-grid" label-position="top">
            <el-form-item label="软件安装包" required class="account-form-remark">
              <el-input v-model="createForm.localFile" readonly placeholder="选择本地文件">
                <template #append>
                  <label class="software-file-trigger">选择文件<input class="software-file-input" type="file" @change="onPickFile($event, 'package')" /></label>
                </template>
              </el-input>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="链接下载到服务器" name="remote">
          <el-form class="account-form-grid" label-position="top">
            <el-form-item label="下载链接 URL" required class="account-form-remark">
              <el-input v-model="createForm.sourceUrl" placeholder="https://example.com/software.exe">
                <template #append>
                  <el-button :loading="resolvingRemoteMeta" @click="handleResolveRemoteMeta">解析链接信息</el-button>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item v-if="remoteImportStatus" class="account-form-remark software-import-status">
              <el-alert :title="remoteImportStatus" type="info" :closable="false" show-icon />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="外链跳转下载" name="external">
          <el-form class="account-form-grid" label-position="top">
            <el-form-item label="外链 URL" required class="account-form-remark">
              <el-input v-model="createForm.externalUrl" placeholder="https://example.com/download">
                <template #append>
                  <el-button :loading="resolvingRemoteMeta" @click="handleResolveRemoteMeta('external')">解析链接信息</el-button>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item v-if="remoteImportStatus" class="account-form-remark software-import-status">
              <el-alert :title="remoteImportStatus" type="info" :closable="false" show-icon />
            </el-form-item>
          </el-form>
        </el-tab-pane>
        </el-tabs>

        <div class="software-common-panel">
          <h3>通用信息</h3>
          <el-form class="account-form-grid" :model="createForm" label-position="top">
            <el-form-item label="软件名称" required>
              <el-input v-model="createForm.name" placeholder="请输入软件名称" />
            </el-form-item>
            <el-form-item label="软件图标">
              <el-input v-model="createForm.localIcon" readonly placeholder="选择图标文件">
                <template #append>
                  <label class="software-file-trigger">选择文件<input class="software-file-input" type="file" accept="image/*" @change="onPickFile($event, 'icon')" /></label>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item label="图标链接">
              <el-input v-model="createForm.iconUrl" placeholder="https://example.com/icon.png" />
            </el-form-item>
            <el-form-item label="分类" required>
              <el-select v-model="createForm.categoryKey" placeholder="请选择分类">
                <el-option v-for="item in categories" :key="item.categoryKey" :label="item.name" :value="item.categoryKey" />
              </el-select>
            </el-form-item>
            <el-form-item label="平台">
              <el-select v-model="createForm.platform">
                <el-option label="Windows" value="Windows" />
                <el-option label="Mac" value="Mac" />
                <el-option label="Android" value="Android" />
                <el-option label="Other" value="Other" />
              </el-select>
            </el-form-item>
            <el-form-item label="版本">
              <el-input v-model="createForm.appVersion" placeholder="例如 1.0.0" />
            </el-form-item>
            <el-form-item label="文件大小">
              <el-input v-model="createForm.fileSizeText" placeholder="自动解析或手动填写，例如 23.4 MB" />
            </el-form-item>
            <el-form-item label="排序">
              <el-input-number v-model="createForm.sort" :min="0" />
            </el-form-item>
            <el-form-item label="上架状态" class="account-form-switch">
              <el-switch v-model="createForm.isPublished" />
            </el-form-item>
            <el-form-item label="描述" class="account-form-remark">
              <el-input v-model="createForm.description" type="textarea" :rows="4" resize="vertical" />
            </el-form-item>
          </el-form>
        </div>
      </div>

      <template #footer>
        <div class="account-form-footer">
          <el-button class="account-form-cancel" round @click="showCreateDialog = false">取消</el-button>
          <el-button class="account-form-submit" type="primary" round :loading="createSubmitting" @click="handleCreateSubmit">{{ createSubmitText }}</el-button>
        </div>
      </template>
    </el-dialog>

    <SoftwareDetailDialog
      v-model="showViewDialog"
      :detail="currentSoftwareDetail"
      @close="closeViewDialog"
      @edit="handleViewEdit"
    />

    <el-dialog
      v-model="showEditDialog"
      class="software-edit-dialog"
      width="1080px"
      top="6vh"
      append-to-body
      :show-close="false"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :before-close="handleEditDialogBeforeClose"
    >
      <div class="software-edit-root">
        <header class="software-edit-header">
          <h2>编辑软件</h2>
          <p>修改软件的基本信息</p>
        </header>

        <section class="software-edit-summary">
          <div class="software-edit-summary-left">
            <div class="software-edit-summary-icon-wrap">
              <div class="software-edit-summary-icon">
                <img v-if="editForm.iconPath" :src="editForm.iconPath" alt="软件图标" />
                <span v-else>{{ softwareInitial(editForm.name) }}</span>
              </div>
              <el-popover
                v-model:visible="editIconPopoverVisible"
                placement="bottom-start"
                trigger="click"
                :width="320"
                popper-class="software-edit-icon-popper"
              >
                <template #reference>
                  <button type="button" class="software-edit-icon-edit-trigger">修改</button>
                </template>
                <el-form-item class="software-edit-icon-url-field" label="图标链接" prop="iconUrl">
                  <el-input v-model="editForm.iconUrl" placeholder="https://example.com/icon.png" />
                </el-form-item>
                <p class="software-edit-icon-tip">保存修改后会抓取新的网络图标并同步更新列表。</p>
              </el-popover>
            </div>
            <strong :title="editForm.name">{{ editForm.name || "-" }}</strong>
          </div>
          <div class="software-edit-summary-tags">
            <el-tag round effect="light" :type="sourceTypeTagType(editForm.sourceType)">{{ editForm.sourceTypeLabel || "-" }}</el-tag>
            <el-tag round effect="light" :type="validityTagType(editForm.validityStatus)">{{ editForm.validityStatusLabel || "-" }}</el-tag>
            <el-tag round effect="light" :type="statusTagType(editForm.isPublished)">{{ editForm.isPublished ? "已上架" : "未上架" }}</el-tag>
          </div>
        </section>

        <section class="software-edit-section">
          <div class="software-edit-title"><i></i><span>基本信息</span></div>
          <el-form ref="editFormRef" class="software-edit-form-grid" :model="editForm" :rules="editRules" label-position="top" :disabled="editSubmitting">
            <el-form-item label="软件名称" prop="name" required><el-input v-model="editForm.name" maxlength="100" placeholder="请输入软件名称" /></el-form-item>
            <el-form-item label="所属分类" prop="categoryKey" required>
              <el-select v-model="editForm.categoryKey" placeholder="请选择分类">
                <el-option v-for="item in categories" :key="item.categoryKey" :label="item.name" :value="item.categoryKey" />
              </el-select>
            </el-form-item>
            <el-form-item label="支持平台" prop="platform" required>
              <el-select v-model="editForm.platform" placeholder="请选择平台">
                <el-option label="Windows" value="Windows" />
                <el-option label="Mac" value="Mac" />
                <el-option label="Android" value="Android" />
                <el-option label="Other" value="Other" />
              </el-select>
            </el-form-item>
            <el-form-item label="软件版本" prop="appVersion"><el-input v-model="editForm.appVersion" maxlength="50" placeholder="例如 1.0.0" /></el-form-item>
            <el-form-item label="排序" prop="sort"><el-input-number v-model="editForm.sort" :min="0" controls-position="right" /></el-form-item>
            <el-form-item label="上架状态" prop="isPublished" required>
              <el-select v-model="editForm.isPublished">
                <el-option :value="true" label="已上架" />
                <el-option :value="false" label="未上架" />
              </el-select>
            </el-form-item>
            <el-form-item label="来源方式"><el-input :model-value="editForm.sourceTypeLabel || '-'" disabled /></el-form-item>
            <el-form-item label="有效性"><el-input :model-value="editForm.validityStatusLabel || '-'" disabled /></el-form-item>
            <el-form-item label="下载次数"><el-input :model-value="String(editForm.downloadCount ?? 0)" disabled /></el-form-item>
            <el-form-item label="软件描述" prop="description" class="software-edit-form-span-3">
              <el-input v-model="editForm.description" type="textarea" :rows="2" maxlength="300" show-word-limit resize="none" placeholder="请输入软件描述（最多300字）" />
            </el-form-item>
          </el-form>
        </section>

        <section class="software-edit-section">
          <div class="software-edit-title"><i></i><span>文件信息（只读）</span></div>
          <div class="software-edit-file-grid">
            <div class="software-edit-file-row">
              <div class="software-edit-file-cell"><span>原始文件名：</span><strong :title="editForm.originalName || '-'">{{ editForm.originalName || "-" }}</strong></div>
              <div class="software-edit-file-cell"><span>服务器文件名：</span><strong :title="editForm.fileName || '-'">{{ editForm.fileName || "-" }}</strong></div>
            </div>
            <div class="software-edit-file-row">
              <div class="software-edit-file-cell"><span>文件路径：</span><strong :title="editForm.filePath || '-'">{{ editForm.filePath || "-" }}</strong></div>
              <div class="software-edit-file-cell"><span>文件哈希：</span><strong :title="editForm.fileHash || '-'">{{ editForm.fileHash || "-" }}</strong></div>
            </div>
            <div class="software-edit-file-row">
              <div class="software-edit-file-cell"><span>存储位置：</span><strong :title="editStorageLocation">{{ editStorageLocation }}</strong></div>
              <div class="software-edit-file-cell"><span>安全检测：</span><strong :class="{ 'is-pass': editSecurityCheck === '已通过', 'is-fail': editSecurityCheck === '未通过' }">{{ editSecurityCheck }}</strong></div>
            </div>
          </div>
        </section>
      </div>
      <template #footer>
        <div class="software-edit-footer">
          <el-button class="software-edit-cancel" round :disabled="editSubmitting" @click="closeEditDialog">取消</el-button>
          <el-button class="software-edit-submit" type="primary" round :loading="editSubmitting" @click="handleEditSubmit">{{ editSubmitText }}</el-button>
        </div>
      </template>
    </el-dialog>
  </el-main>
</template>







