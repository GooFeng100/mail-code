<script setup>
import { reactive, ref } from "vue"
import { ElNotification } from "element-plus"
import "element-plus/theme-chalk/el-notification.css"
import { Lock, User } from "@element-plus/icons-vue"
import loginBg from "../assets/login-bg.png"
import loginMark from "../assets/icons/loginmark.png"
import errorSound from "../assets/sounds/error.wav"

const form = reactive({
  username: "",
  password: "",
})

const loginLoading = ref(false)

function playErrorSound() {
  const audio = new Audio(errorSound)
  audio.play().catch(() => {})
}

async function handleLogin() {
  loginLoading.value = true
  window.setTimeout(() => {
    loginLoading.value = false
    playErrorSound()
    ElNotification({
      title: "登录失败",
      message: "账户/密码错误，请重新输入或联系管理员。",
      position: "top-right",
      type: "error",
    })
    form.username = ""
    form.password = ""
  }, 800)
}
</script>

<template>
  <main class="login-page">
    <img :src="loginBg" alt="" class="login-bg" />
    <div class="login-shade"></div>

    <el-form class="login-panel" :model="form" @submit.prevent="handleLogin">
      <div class="login-title">
        <img :src="loginMark" alt="登录" />
        <span>验证码接收助手</span>
      </div>

      <div class="login-fields">
        <label class="login-field" :class="{ 'is-filled': form.username }">
          <span class="login-field-label">Adobe账号</span>
          <el-input
            v-model="form.username"
            clearable
            :suffix-icon="User"
            autocomplete="username"
          />
        </label>

        <label class="login-field" :class="{ 'is-filled': form.password }">
          <span class="login-field-label">Adobe密码</span>
          <el-input
            v-model="form.password"
            type="password"
            show-password
            :suffix-icon="Lock"
            autocomplete="current-password"
          />
        </label>
      </div>

      <el-button
        class="login-submit"
        native-type="submit"
        :loading="loginLoading"
      >
        登录
      </el-button>
    </el-form>
  </main>
</template>
