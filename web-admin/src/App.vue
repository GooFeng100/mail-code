<script setup>
import { DataAnalysis, Link, Setting, User } from "@element-plus/icons-vue"
import AdobeAccountsPage from "./pages/AdobeAccountsPage.vue"
import LoginPage from "./pages/LoginPage.vue"
import UserCodePage from "./pages/UserCodePage.vue"

const currentView = "user"

const menuItems = [
  { key: "adobe", label: "Adobe账户", icon: DataAnalysis },
  { key: "customers", label: "客户管理", icon: User },
  { key: "assignments", label: "绑定关系", icon: Link },
  { key: "parameters", label: "参数设置", icon: Setting },
]
</script>

<template>
  <LoginPage v-if="currentView === 'login'" />

  <UserCodePage v-else-if="currentView === 'user'" />

  <el-container v-else-if="currentView === 'admin'" class="admin-shell">
    <el-aside class="admin-sidebar" width="248px">
      <div class="brand">
        <span class="brand-mark">A</span>
        <div>
          <strong>Adobe 业务管理</strong>
          <small>Vue Admin Preview</small>
        </div>
      </div>

      <el-menu default-active="adobe" class="admin-menu">
        <el-menu-item v-for="item in menuItems" :key="item.key" :index="item.key">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <AdobeAccountsPage />
    </el-container>
  </el-container>
</template>
