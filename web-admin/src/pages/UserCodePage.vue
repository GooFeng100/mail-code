<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue"
import { io } from "socket.io-client"
import { CircleCheckFilled, DocumentCopy, Download, Loading, RefreshRight, Search, SwitchButton } from "@element-plus/icons-vue"
import { ElMessage } from "element-plus"
import { getAdobeUserStatus } from "../api/adobeStatus"
import { getToken } from "../api/client"
import { listCodes } from "../api/codes"
import { buildSoftwareDownloadUrl, listPublicSoftwares } from "../api/softwares"
import adobeAvatar from "../assets/icons/icons8-adobe.png"
import downloadConfirmIcon from "../assets/icons/download.png"
import loginBg from "../assets/login-bg.png"
import { playNewCodeSound } from "../utils/soundFeedback"

const props = defineProps({
  user: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(["logout"])

const codeMessages = ref([])
const copiedCode = ref("")
const now = ref(Date.now())
const teamInfo = ref(null)
const teamStatusLoading = ref(false)
const teamStatusUnavailable = ref(false)
const softwareLoading = ref(false)
const softwareRefreshing = ref(false)
const softwareLoadError = ref("")
const softwareSearch = ref("")
const softwareCategories = ref([])
const allSoftwares = ref([])
const activeCategoryKey = ref("all")
const downloadingId = ref("")
const showDownloadConfirm = ref(false)
const pendingDownloadSoftware = ref(null)
let socket = null

const userAccount = computed(() => props.user?.accountEmail || props.user?.username || "Adobe普通用户")
const teamName = computed(() => teamInfo.value?.organization?.name || "")
const teamStatus = computed(() => teamInfo.value?.status || "")
const teamStatusText = computed(() => {
  if (teamStatusLoading.value) {
    return "团队查询中"
  }
  if (teamStatusUnavailable.value) {
    return "目前团队不可用，请及时联系管理员。"
  }
  return teamName.value ? `团队：${teamName.value}，状态：${teamStatus.value || "-"}` : ""
})

async function loadTeamStatus() {
  const email = userAccount.value
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    teamStatusUnavailable.value = true
    return
  }

  teamStatusLoading.value = true
  teamStatusUnavailable.value = false

  try {
    teamInfo.value = await getAdobeUserStatus(email)
  } catch {
    teamInfo.value = null
    teamStatusUnavailable.value = true
  } finally {
    teamStatusLoading.value = false
  }
}

function decodeTokenPayload(token) {
  if (!token) {
    return null
  }

  try {
    const payload = token.split(".")[1]
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/")
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    )
    return JSON.parse(window.atob(padded))
  } catch {
    return null
  }
}

const tokenExpiresAt = computed(() => {
  const payload = decodeTokenPayload(getToken())
  return payload && payload.exp ? payload.exp * 1000 : 0
})

const loginRemainingText = computed(() => {
  if (!tokenExpiresAt.value) {
    return "--:--"
  }

  const remainingMs = Math.max(0, tokenExpiresAt.value - now.value)
  const minutes = Math.floor(remainingMs / 60000)
  const seconds = Math.floor((remainingMs % 60000) / 1000)
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
})

const activeCodes = computed(() => (
  codeMessages.value
    .filter((item) => new Date(item.expiresAt).getTime() > now.value)
    .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
))

const softwareCategoryTabs = computed(() => ([
  { key: "all", name: "全部", sort: 0 },
  ...softwareCategories.value,
]))

const categorySoftwares = computed(() => {
  if (activeCategoryKey.value === "all") {
    return allSoftwares.value
  }
  return allSoftwares.value.filter((item) => item.categoryKey === activeCategoryKey.value)
})

const filteredSoftwares = computed(() => {
  const keyword = String(softwareSearch.value || "").trim().toLowerCase()
  if (!keyword) return categorySoftwares.value
  return categorySoftwares.value.filter((item) =>
    [item.name, item.appVersion, item.description, item.categoryName]
      .some((v) => String(v || "").toLowerCase().includes(keyword)),
  )
})

function formatTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "-"
  }
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

function expiryText(value) {
  const expiresAt = new Date(value).getTime()
  if (!Number.isFinite(expiresAt)) {
    return "--"
  }

  const remainingMs = Math.max(0, expiresAt - now.value)
  if (remainingMs <= 0) {
    return "已过期"
  }

  const minutes = Math.floor(remainingMs / 60000)
  const seconds = Math.floor((remainingMs % 60000) / 1000)
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

function upsertCode(code) {
  playNewCodeSound()
  codeMessages.value = [
    code,
    ...codeMessages.value.filter((item) => item.id !== code.id),
  ]
}

async function loadCodes() {
  const data = await listCodes()
  codeMessages.value = data.codes || []
}

function normalizePublicSoftwares(payload) {
  let groups = []
  if (Array.isArray(payload?.categories)) {
    groups = payload.categories
  } else if (Array.isArray(payload)) {
    groups = payload
  } else if (Array.isArray(payload?.items)) {
    groups = payload.items
  }

  const categories = []
  const softwares = []
  groups.forEach((group, index) => {
    const key = String(group.categoryKey || group.categoryId || `group-${index}`)
    const name = String(group.categoryName || group.name || "其他")
    const sort = Number(group.sort || index + 1)
    categories.push({ key, name, sort })
    const list = Array.isArray(group.softwares) ? group.softwares : []
    list.forEach((item) => {
      softwares.push({
        id: String(item.id || ""),
        name: String(item.name || "-"),
        appVersion: String(item.appVersion || item.softwareVersion || "-"),
        description: String(item.description || ""),
        categoryKey: key,
        categoryName: name,
        platform: String(item.platform || "Other"),
        iconPath: String(item.iconPath || ""),
        fileSize: Number(item.fileSize || 0),
        downloadCount: Number(item.downloadCount || 0),
        sourceType: String(item.sourceType || ""),
        externalUrl: String(item.externalUrl || ""),
        downloadUrl: String(item.downloadUrl || ""),
      })
    })
  })

  categories.sort((a, b) => Number(a.sort || 999) - Number(b.sort || 999))
  return { categories, softwares }
}

async function loadPublicSoftwares({ silent = false } = {}) {
  if (!silent) {
    softwareLoading.value = true
    softwareLoadError.value = ""
  } else {
    softwareRefreshing.value = true
  }
  try {
    const payload = await listPublicSoftwares()
    const { categories, softwares } = normalizePublicSoftwares(payload)
    softwareCategories.value = categories
    allSoftwares.value = softwares
    if (activeCategoryKey.value !== "all" && !categories.some((item) => item.key === activeCategoryKey.value)) {
      activeCategoryKey.value = "all"
    }
  } catch (error) {
    softwareLoadError.value = error?.message || "软件列表加载失败，请刷新重试"
  } finally {
    softwareLoading.value = false
    softwareRefreshing.value = false
  }
}

function connectSocket() {
  socket = io("/", {
    auth: {
      token: getToken(),
    },
  })

  socket.on("new_code", upsertCode)
  socket.on("connect_error", () => {})
}

const timer = window.setInterval(() => {
  now.value = Date.now()
}, 1000)

onMounted(async () => {
  loadTeamStatus()
  await Promise.all([loadCodes(), loadPublicSoftwares()])
  connectSocket()
})

onBeforeUnmount(() => {
  window.clearInterval(timer)
  if (socket) {
    socket.disconnect()
  }
})

async function copyCode(code) {
  await navigator.clipboard.writeText(code)
  copiedCode.value = code
  window.setTimeout(() => {
    if (copiedCode.value === code) {
      copiedCode.value = ""
    }
  }, 1200)
}

function softwareSizeText(value) {
  const size = Number(value || 0)
  if (!size) return "-"
  const mb = size / 1024 / 1024
  return `${mb.toFixed(1)} MB`
}

function downloadCountText(value) {
  const count = Number(value || 0)
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
  return count.toLocaleString("en-US")
}

function parseDownloadNameFromResponse(response, fallbackName = "download.bin") {
  const disposition = String(response.headers.get("content-disposition") || "")
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match && utf8Match[1]) {
    try {
      return decodeURIComponent(utf8Match[1])
    } catch {}
  }
  const plainMatch = disposition.match(/filename="?([^\";]+)"?/i)
  if (plainMatch && plainMatch[1]) {
    return plainMatch[1].trim()
  }
  return fallbackName
}

async function handleSoftwareDownload(item) {
  if (!item?.id || downloadingId.value) return
  downloadingId.value = item.id
  try {
    const isExternal = item.sourceType === "external_link"
    const href = isExternal
      ? String(item.externalUrl || item.downloadUrl || "").trim()
      : String(item.downloadUrl || buildSoftwareDownloadUrl(item.id)).trim()
    if (!href) {
      throw new Error("missing download url")
    }

    if (isExternal) {
      const a = document.createElement("a")
      a.href = href
      a.target = "_blank"
      a.rel = "noopener"
      document.body.appendChild(a)
      a.click()
      a.remove()
      return
    }

    const token = getToken()
    const response = await fetch(href, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "same-origin",
    })
    if (!response.ok) {
      throw new Error(`download failed: ${response.status}`)
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const fileName = parseDownloadNameFromResponse(response, `${item.name || "download"}.bin`)
    const a = document.createElement("a")
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  } catch {
    ElMessage.error("下载失败，请稍后重试")
  } finally {
    window.setTimeout(() => {
      downloadingId.value = ""
    }, 600)
  }
}

function openDownloadConfirm(item) {
  if (!item?.id || downloadingId.value) return
  pendingDownloadSoftware.value = item
  showDownloadConfirm.value = true
}

function closeDownloadConfirm() {
  if (downloadingId.value) return
  showDownloadConfirm.value = false
  pendingDownloadSoftware.value = null
}

async function confirmSoftwareDownload() {
  const item = pendingDownloadSoftware.value
  if (!item?.id) return
  await handleSoftwareDownload(item)
  closeDownloadConfirm()
}

function resetSoftwareSearch() {
  softwareSearch.value = ""
}
</script>

<template>
  <el-container class="user-code-shell">
    <img :src="loginBg" alt="" class="login-bg" />
    <div class="login-shade"></div>

    <el-header class="user-code-header" height="96px">
      <div class="user-card">
        <div class="user-card-left">
          <el-avatar :size="42" class="user-avatar">
            <img :src="adobeAvatar" alt="Adobe" />
          </el-avatar>
          <div class="user-identity">
            <strong>Adobe账户：{{ userAccount }}</strong>
            <span
              v-if="teamStatusText"
              :class="[
                'user-team-status',
                {
                  'is-active': teamStatus === 'active',
                  'is-unavailable': teamStatusUnavailable,
                },
              ]"
            >
              {{ teamStatusText }}
            </span>
          </div>
        </div>

        <div class="user-card-right">
          <span>登录剩余有效期：{{ loginRemainingText }}</span>
          <button class="logout-button" type="button" aria-label="退出登录" @click="emit('logout')">
            <el-icon><SwitchButton /></el-icon>
          </button>
        </div>
      </div>
    </el-header>

    <el-main class="code-main">
      <section class="code-bubbles">
        <div v-if="!activeCodes.length" class="code-empty">
          <el-icon><Loading /></el-icon>
          <span>等待验证码接收。</span>
        </div>

        <template v-else>
          <article
            v-for="message in activeCodes"
            :key="message.id"
            class="code-bubble"
          >
            <div class="code-value-panel">
              <span>验证码</span>
              <strong>{{ message.code }}</strong>
              <el-button class="code-copy-button" type="primary" round @click="copyCode(message.code)">
                <el-icon><DocumentCopy /></el-icon>
                {{ copiedCode === message.code ? "Copied" : "Copy" }}
              </el-button>
            </div>

            <div class="code-info-panel">
              <dl>
                <div>
                  <dt>From:</dt>
                  <dd>{{ message.from || "-" }}</dd>
                </div>
                <div>
                  <dt>To:</dt>
                  <dd>{{ message.emailAddress || "-" }}</dd>
                </div>
                <div>
                  <dt>Time:</dt>
                  <dd>{{ formatTime(message.receivedAt) }}</dd>
                </div>
                <div>
                  <dt>Expired:</dt>
                  <dd>{{ expiryText(message.expiresAt) }}</dd>
                </div>
              </dl>
            </div>
          </article>
        </template>
      </section>

      <section class="user-software-panel">
        <div class="user-software-head">
          <div class="user-software-title-wrap">
            <h2>常用软件下载</h2>
            <p>仅展示可下载的软件资源</p>
          </div>
          <div class="user-software-search">
            <el-input v-model="softwareSearch" clearable :prefix-icon="Search" placeholder="搜索软件名称" />
          </div>
        </div>

        <div class="user-software-tabs">
          <button
            v-for="category in softwareCategoryTabs"
            :key="category.key"
            type="button"
            class="user-software-tab"
            :class="{ 'is-active': activeCategoryKey === category.key }"
            @click="activeCategoryKey = category.key"
          >
            {{ category.name }}
          </button>
        </div>

        <div v-if="softwareLoading" class="user-software-state">
          <el-icon class="is-spin"><Loading /></el-icon>
          <span>软件下载列表加载中...</span>
        </div>
        <div v-else-if="softwareLoadError" class="user-software-state is-error">
          <span>{{ softwareLoadError }}</span>
        </div>
        <div v-else-if="!allSoftwares.length" class="user-software-state">
          <span>暂无可下载软件，请稍后再试或联系管理员。</span>
        </div>
        <div v-else-if="!filteredSoftwares.length" class="user-software-state">
          <span>未找到匹配的软件。</span>
          <el-button text @click="resetSoftwareSearch">清空搜索</el-button>
        </div>
        <div v-else class="user-software-grid">
          <article v-for="item in filteredSoftwares" :key="item.id" class="user-software-card">
            <div class="user-software-icon">
              <img v-if="item.iconPath" :src="item.iconPath" alt="icon" />
              <span v-else>{{ String(item.name || "-").slice(0, 1).toUpperCase() }}</span>
            </div>
            <div class="user-software-content">
              <strong class="user-software-name" :title="item.name">{{ item.name }}</strong>
              <em class="user-software-version">版本：{{ item.appVersion || "-" }}</em>
              <p :title="item.description || '暂无描述'">{{ item.description || "暂无描述" }}</p>
              <div class="user-software-tags">
                <span>{{ item.categoryName || "其他" }}</span>
                <span>{{ item.platform || "Other" }}</span>
              </div>
            </div>
            <div class="user-software-side">
              <div class="user-software-meta">
                <span>{{ softwareSizeText(item.fileSize) }}</span>
                <small><el-icon><Download /></el-icon>{{ downloadCountText(item.downloadCount) }}</small>
              </div>
              <el-button
                type="primary"
                class="user-software-download"
                :loading="downloadingId === item.id"
                @click="openDownloadConfirm(item)"
              >
                下载
              </el-button>
            </div>
          </article>
        </div>

        <div class="user-software-footer">
          <div class="user-software-safe">
            <el-icon><CircleCheckFilled /></el-icon>
            <span>所有软件均经过安全检测，请放心下载使用。</span>
          </div>
          <el-button text class="user-software-refresh" :loading="softwareRefreshing" @click="loadPublicSoftwares({ silent: true })">
            <el-icon><RefreshRight /></el-icon>
            刷新列表
          </el-button>
        </div>
      </section>
    </el-main>

    <el-dialog
      v-model="showDownloadConfirm"
      class="user-download-confirm-dialog"
      width="min(680px, calc(100vw - 32px))"
      :show-close="false"
      :close-on-click-modal="false"
      :close-on-press-escape="!downloadingId"
      append-to-body
      destroy-on-close
      align-center
    >
      <template #header>
        <div class="user-download-confirm-head">
          <div class="user-download-confirm-title">
            <img :src="downloadConfirmIcon" alt="" />
            <div>
              <h3>软件下载确认</h3>
              <p>请确认您要下载的软件信息</p>
            </div>
          </div>
        </div>
      </template>

      <div v-if="pendingDownloadSoftware" class="user-download-confirm-body">
        <section class="user-download-software-card">
          <div class="user-download-software-basic">
            <div class="user-software-icon user-download-software-icon">
              <img v-if="pendingDownloadSoftware.iconPath" :src="pendingDownloadSoftware.iconPath" alt="icon" />
              <span v-else>{{ String(pendingDownloadSoftware.name || "-").slice(0, 1).toUpperCase() }}</span>
            </div>
            <div class="user-download-software-meta">
              <strong>{{ pendingDownloadSoftware.name || "-" }}</strong>
              <p>{{ pendingDownloadSoftware.description || "暂无描述" }}</p>
            </div>
          </div>

          <dl class="user-download-software-fields">
            <div><dt>版本</dt><dd>{{ pendingDownloadSoftware.appVersion || "-" }}</dd></div>
            <div><dt>平台</dt><dd>{{ pendingDownloadSoftware.platform || "Other" }}</dd></div>
            <div><dt>文件大小</dt><dd>{{ softwareSizeText(pendingDownloadSoftware.fileSize) }}</dd></div>
            <div><dt>分类</dt><dd>{{ pendingDownloadSoftware.categoryName || "其他" }}</dd></div>
            <div><dt>下载次数</dt><dd>{{ downloadCountText(pendingDownloadSoftware.downloadCount) }}</dd></div>
            <div><dt>安全状态</dt><dd class="is-safe"><el-icon><CircleCheckFilled /></el-icon>安全检测通过</dd></div>
          </dl>
        </section>

        <div class="user-download-confirm-tip">下载后请按系统安全提示进行安装，来源为平台官方分发。</div>
      </div>

      <template #footer>
        <div class="user-download-confirm-footer">
          <el-button :disabled="Boolean(downloadingId)" @click="closeDownloadConfirm">取消</el-button>
          <el-button type="primary" :loading="downloadingId === pendingDownloadSoftware?.id" @click="confirmSoftwareDownload">立即下载</el-button>
        </div>
      </template>
    </el-dialog>
  </el-container>
</template>




