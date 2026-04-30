<script setup>
import {
  Connection,
  DataAnalysis,
  Setting,
  SwitchButton,
  User,
} from "@element-plus/icons-vue"
import AdobeAccountsPage from "./pages/AdobeAccountsPage.vue"
import LoginPage from "./pages/LoginPage.vue"
import UserCodePage from "./pages/UserCodePage.vue"

const currentView = "admin"

const menuItems = [
  { key: "adobe", label: "Adobe账户", icon: DataAnalysis },
  { key: "customers", label: "客户管理", icon: User },
  { key: "assignments", label: "绑定关系", icon: Connection },
  { key: "parameters", label: "参数设置", icon: Setting },
]
</script>

<template>
  <LoginPage v-if="currentView === 'login'" />

  <UserCodePage v-else-if="currentView === 'user'" />

  <el-container v-else-if="currentView === 'admin'" class="admin-shell">
    <el-aside class="admin-sidebar" width="260px">
      <div class="brand admin-brand">
        <span class="brand-mark">
          <el-icon><DataAnalysis /></el-icon>
        </span>
        <div>
          <strong>Adobe 业务管理</strong>
          <small>管理控制台</small>
        </div>
      </div>

      <el-menu default-active="adobe" class="admin-menu">
        <el-menu-item v-for="item in menuItems" :key="item.key" :index="item.key">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </el-menu-item>
      </el-menu>

      <div class="admin-sidebar-footer">
        <div class="admin-profile-card">
          <el-avatar :size="34">
            <el-icon><User /></el-icon>
          </el-avatar>
          <div>
            <strong>Admin 管理员</strong>
            <span>当前管理员：admin</span>
          </div>
        </div>

        <el-button class="admin-logout-button" :icon="SwitchButton">退出登录</el-button>
      </div>
    </el-aside>

    <AdobeAccountsPage />
  </el-container>
</template>
