<template>
  <view class="login-page">
    <view class="hero">
      <text class="hero-title">移动后台管理</text>
      <text class="hero-subtitle">账号 · 用户 · 关系 · 到期提醒</text>
    </view>

    <view class="login-card card">
      <text class="card-title">管理员登录</text>
      <view class="field">
        <text class="label">账号</text>
        <input v-model="username" placeholder="请输入账号" class="input" />
      </view>
      <view class="field">
        <text class="label">密码</text>
        <input v-model="password" placeholder="请输入密码" password class="input" />
      </view>
      <view class="remember-row" @click="toggleRemember">
        <view class="remember-box" :class="{ checked: rememberMe }">
          <text v-if="rememberMe" class="remember-tick">✓</text>
        </view>
        <text class="remember-text">记住用户名密码</text>
      </view>
      <wd-button type="primary" block custom-class="login-btn" @click="submit">登录</wd-button>
      <text class="tip">仅支持管理员账号登录。</text>
    </view>
    <wd-backtop :scroll-top="scrollTop" :top="80" :bottom="24" />
    <text class="version-text">版本 {{ appVersion }}</text>
  </view>
</template>

<script setup lang="ts">
import { usePageScrollTop } from '@/composables/usePageScrollTop'
import manifest from '@/manifest.json'
import { onMounted, ref } from 'vue'
import { login } from '@/api/auth'

const REMEMBER_KEY = 'login:remember'
const CREDENTIALS_KEY = 'login:credentials'

const username = ref('')
const password = ref('')
const rememberMe = ref(false)
const appVersion = ref(`v${String((manifest as any)?.versionName || '1.0.0')}`)

const { scrollTop } = usePageScrollTop()

onMounted(() => {
  restoreRememberedCredentials()
  loadRuntimeVersion()
})

function toggleRemember() {
  rememberMe.value = !rememberMe.value
}

function restoreRememberedCredentials() {
  const remembered = !!uni.getStorageSync(REMEMBER_KEY)
  rememberMe.value = remembered
  if (!remembered) return

  const credentials = uni.getStorageSync(CREDENTIALS_KEY) as { username?: string; password?: string }
  username.value = String(credentials?.username || '')
  password.value = String(credentials?.password || '')
}

function persistRememberedCredentials() {
  if (rememberMe.value) {
    uni.setStorageSync(REMEMBER_KEY, true)
    uni.setStorageSync(CREDENTIALS_KEY, {
      username: username.value,
      password: password.value
    })
    return
  }

  uni.removeStorageSync(REMEMBER_KEY)
  uni.removeStorageSync(CREDENTIALS_KEY)
}

function loadRuntimeVersion() {
  // #ifdef APP-PLUS
  const plusApi = (globalThis as any).plus
  if (!plusApi?.runtime) return
  plusApi.runtime.getProperty(plusApi.runtime.appid, (widgetInfo: any) => {
    const runtimeVersion = String(widgetInfo?.version || '').trim()
    if (runtimeVersion) {
      appVersion.value = `v${runtimeVersion}`
    }
  })
  // #endif
}

async function submit() {
  if (!username.value || !password.value) {
    uni.showToast({ title: '请输入账号和密码', icon: 'none' })
    return
  }

  try {
    await login(username.value, password.value)
    persistRememberedCredentials()
    uni.redirectTo({ url: '/pages/overview/index' })
  } catch (error: any) {
    uni.showToast({ title: error?.message || '登录失败', icon: 'none' })
  }
}
</script>

<style scoped lang="scss">
.login-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #1677ff 0%, #1677ff 35%, #f5f7fb 35%, #f5f7fb 100%);
  padding: calc(100rpx + env(safe-area-inset-top)) 36rpx 36rpx;
}

.hero {
  color: #fff;
  margin-bottom: 72rpx;
}

.hero-title {
  display: block;
  font-size: 52rpx;
  font-weight: 800;
  margin-bottom: 18rpx;
}

.hero-subtitle {
  display: block;
  font-size: 28rpx;
  opacity: 0.86;
}

.login-card {
  padding: 42rpx 32rpx;
}

.card-title {
  display: block;
  font-size: 36rpx;
  font-weight: 800;
  margin-bottom: 32rpx;
}

.field {
  margin-bottom: 26rpx;
}

.remember-row {
  margin: -4rpx 0 14rpx;
  display: inline-flex;
  align-items: center;
  gap: 14rpx;
}

.remember-box {
  width: 32rpx;
  height: 32rpx;
  border-radius: 8rpx;
  border: 2rpx solid #bfd0ef;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remember-box.checked {
  border-color: var(--primary);
  background: var(--primary);
}

.remember-tick {
  color: #ffffff;
  font-size: 22rpx;
  line-height: 1;
  font-weight: 700;
}

.remember-text {
  font-size: 24rpx;
  color: #667085;
}

.label {
  display: block;
  font-size: 26rpx;
  color: #667085;
  margin-bottom: 12rpx;
}

.input {
  height: 88rpx;
  border-radius: 18rpx;
  padding: 0 24rpx;
  background: #f5f7fb;
  font-size: 28rpx;
}

.login-btn {
  height: 88rpx !important;
  border-radius: 20rpx !important;
  margin-top: 16rpx !important;
}

.tip {
  display: block;
  margin-top: 24rpx;
  font-size: 24rpx;
  color: #8a93a3;
  line-height: 1.6;
}

.version-text {
  position: fixed;
  left: 26rpx;
  bottom: calc(20rpx + env(safe-area-inset-bottom));
  z-index: 9;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.88);
}
</style>
