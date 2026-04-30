<script setup>
import { computed, onBeforeUnmount, ref } from "vue"
import { DocumentCopy, Loading, SwitchButton, UserFilled } from "@element-plus/icons-vue"
import { getToken } from "../api/client"
import loginBg from "../assets/login-bg.png"

const userInfo = {
  name: "Adobe 普通用户",
  account: "adobe-user@example.com",
  plan: "验证码接收权限",
  expiresAt: "2026-12-31",
}

const codeMessages = [
  {
    id: 1,
    code: "842931",
    from: "Adobe Account",
    to: "adobe-user@example.com",
    time: "14:26:08",
    expired: "5 分钟后",
  },
  {
    id: 2,
    code: "190624",
    from: "Adobe Security",
    to: "adobe-user@example.com",
    time: "14:18:42",
    expired: "已过期",
  },
  {
    id: 3,
    code: "537208",
    from: "Adobe ID",
    to: "adobe-user@example.com",
    time: "14:02:15",
    expired: "已过期",
  },
]

const copiedCode = ref("")
const now = ref(Date.now())

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

const timer = window.setInterval(() => {
  now.value = Date.now()
}, 1000)

onBeforeUnmount(() => {
  window.clearInterval(timer)
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
          <strong>Adobe账户：{{ userInfo.account }}</strong>
        </div>

        <div class="user-card-right">
          <span>登录有效期：{{ loginRemainingText }}</span>
          <button class="logout-button" type="button" aria-label="退出登录">
            <el-icon><SwitchButton /></el-icon>
          </button>
        </div>
      </div>
    </el-header>

    <el-main class="code-main">
      <section class="code-bubbles">
        <div v-if="!codeMessages.length" class="code-empty">
          <el-icon><Loading /></el-icon>
          <span>等待验证码接收</span>
        </div>

        <template v-else>
          <article
            v-for="message in codeMessages"
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
                  <dd>{{ message.from }}</dd>
                </div>
                <div>
                  <dt>To:</dt>
                  <dd>{{ message.to }}</dd>
                </div>
                <div>
                  <dt>Time:</dt>
                  <dd>{{ message.time }}</dd>
                </div>
                <div>
                  <dt>Expired:</dt>
                  <dd>{{ message.expired }}</dd>
                </div>
              </dl>
            </div>
          </article>
        </template>
      </section>
    </el-main>
  </el-container>
</template>
