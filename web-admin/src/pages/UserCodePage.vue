<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue"
import { io } from "socket.io-client"
import { DocumentCopy, Loading, SwitchButton, UserFilled } from "@element-plus/icons-vue"
import { getToken } from "../api/client"
import { listCodes } from "../api/codes"
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
let socket = null

const userAccount = computed(() => props.user?.accountEmail || props.user?.username || "Adobe普通用户")

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
  await loadCodes()
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
</script>

<template>
  <el-container class="user-code-shell">
    <img :src="loginBg" alt="" class="login-bg" />
    <div class="login-shade"></div>

    <el-header class="user-code-header" height="96px">
      <div class="user-card">
        <div class="user-card-left">
          <el-avatar :size="42" class="user-avatar">
            <el-icon><UserFilled /></el-icon>
          </el-avatar>
          <strong>Adobe账户：{{ userAccount }}</strong>
        </div>

        <div class="user-card-right">
          <span>登录有效期：{{ loginRemainingText }}</span>
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
    </el-main>
  </el-container>
</template>
