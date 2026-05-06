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
      <wd-button type="primary" block custom-class="login-btn" @click="submit">登录</wd-button>
      <text class="tip">仅支持管理员账号登录。</text>
    </view>
    <wd-backtop :scroll-top="scrollTop" :top="80" :bottom="24" />
</view>
</template>

<script setup lang="ts">
import { usePageScrollTop } from '@/composables/usePageScrollTop'
import { ref } from 'vue'
import { login } from '@/api/auth'

const username = ref('')
const password = ref('')

const { scrollTop } = usePageScrollTop()

async function submit() {
  if (!username.value || !password.value) {
    uni.showToast({ title: '请输入账号和密码', icon: 'none' })
    return
  }

  try {
    await login(username.value, password.value)
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
</style>
