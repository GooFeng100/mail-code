<script setup>
import { ref } from "vue"
import {
  Connection,
  DataAnalysis,
  Setting,
  SwitchButton,
  User,
} from "@element-plus/icons-vue"
import AdobeAccountDetailPage from "./pages/AdobeAccountDetailPage.vue"
import AdobeAccountsPage from "./pages/AdobeAccountsPage.vue"
import AssignmentManagementPage from "./pages/AssignmentManagementPage.vue"
import CustomerDetailPage from "./pages/CustomerDetailPage.vue"
import CustomerManagementPage from "./pages/CustomerManagementPage.vue"
import LoginPage from "./pages/LoginPage.vue"
import ParameterSettingsPage from "./pages/ParameterSettingsPage.vue"
import UserCodePage from "./pages/UserCodePage.vue"

const currentView = "admin"
const activeAdminModule = ref("adobe")
const selectedAdobeAccount = ref(null)
const selectedCustomer = ref(null)

const menuItems = [
  { key: "adobe", label: "Adobe账户", icon: DataAnalysis },
  { key: "customers", label: "客户管理", icon: User },
  { key: "assignments", label: "绑定关系", icon: Connection },
  { key: "parameters", label: "参数设置", icon: Setting },
]

function handleAdminSelect(module) {
  activeAdminModule.value = module
  if (module !== "adobeDetail") {
    selectedAdobeAccount.value = null
  }
  if (module !== "customerDetail") {
    selectedCustomer.value = null
  }
}

function showAdobeDetail(account) {
  selectedAdobeAccount.value = account
  activeAdminModule.value = "adobeDetail"
}

function backToAdobeList() {
  selectedAdobeAccount.value = null
  activeAdminModule.value = "adobe"
}

function showCustomerDetail(customer) {
  selectedCustomer.value = customer
  activeAdminModule.value = "customerDetail"
}

function backToCustomerList() {
  selectedCustomer.value = null
  activeAdminModule.value = "customers"
}
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

      <el-menu :default-active="activeAdminModule === 'adobeDetail' ? 'adobe' : activeAdminModule === 'customerDetail' ? 'customers' : activeAdminModule" class="admin-menu" @select="handleAdminSelect">
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

    <AdobeAccountsPage v-if="activeAdminModule === 'adobe'" @view-detail="showAdobeDetail" />
    <AdobeAccountDetailPage
      v-else-if="activeAdminModule === 'adobeDetail'"
      :account="selectedAdobeAccount"
      @back="backToAdobeList"
    />
    <CustomerManagementPage v-else-if="activeAdminModule === 'customers'" @view-detail="showCustomerDetail" />
    <CustomerDetailPage
      v-else-if="activeAdminModule === 'customerDetail'"
      :customer="selectedCustomer"
      @back="backToCustomerList"
    />
    <AssignmentManagementPage v-else-if="activeAdminModule === 'assignments'" />
    <ParameterSettingsPage v-else-if="activeAdminModule === 'parameters'" />
    <AdobeAccountsPage v-else />
  </el-container>
</template>
