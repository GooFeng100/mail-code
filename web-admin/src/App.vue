<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue"
import {
  DataAnalysis,
  SwitchButton,
} from "@element-plus/icons-vue"
import { clearToken, getToken, getTokenExpiresAt, SESSION_EXPIRED_EVENT } from "./api/client"
import { getMe } from "./api/admin"
import adobeMenuIcon from "./assets/icons/adobecloud.png"
import bindingMenuIcon from "./assets/icons/icons8-link-96.png"
import configMenuIcon from "./assets/icons/config.png"
import customerMenuIcon from "./assets/icons/icons8-customer-2019-96.png"
import managerIcon from "./assets/icons/manager.png"
import systemLogo from "./assets/icons/icons8-microsoft-business-central-96.png"
import AdobeAccountDetailPage from "./pages/AdobeAccountDetailPage.vue"
import AdobeAccountsPage from "./pages/AdobeAccountsPage.vue"
import AssignmentManagementPage from "./pages/AssignmentManagementPage.vue"
import CustomerDetailPage from "./pages/CustomerDetailPage.vue"
import CustomerManagementPage from "./pages/CustomerManagementPage.vue"
import LoginPage from "./pages/LoginPage.vue"
import ParameterSettingsPage from "./pages/ParameterSettingsPage.vue"
import UserCodePage from "./pages/UserCodePage.vue"

const currentView = ref("login")
const currentUser = ref(null)
const sessionLoading = ref(true)
const activeAdminModule = ref("adobe")
const selectedAdobeAccount = ref(null)
const selectedCustomer = ref(null)
let sessionExpireTimer = null

const adminName = computed(() => currentUser.value?.username || "admin")

const menuItems = [
  { key: "adobe", label: "Adobe账户", icon: adobeMenuIcon },
  { key: "customers", label: "客户管理", icon: customerMenuIcon },
  { key: "assignments", label: "绑定关系", icon: bindingMenuIcon },
  { key: "parameters", label: "参数设置", icon: configMenuIcon },
]

function applySession(user) {
  currentUser.value = user
  const role = user?.role || user?.type
  currentView.value = role === "admin" ? "admin" : "user"
  scheduleSessionExpiry()
}

function clearSessionExpireTimer() {
  if (sessionExpireTimer) {
    window.clearTimeout(sessionExpireTimer)
    sessionExpireTimer = null
  }
}

function resetSessionState() {
  currentUser.value = null
  selectedAdobeAccount.value = null
  selectedCustomer.value = null
  activeAdminModule.value = "adobe"
  currentView.value = "login"
}

function handleSessionExpired() {
  clearSessionExpireTimer()
  clearToken()
  resetSessionState()
}

function scheduleSessionExpiry() {
  clearSessionExpireTimer()

  const expiresAt = getTokenExpiresAt()
  if (!expiresAt) {
    return
  }

  const remainingMs = expiresAt - Date.now()
  if (remainingMs <= 0) {
    handleSessionExpired()
    return
  }

  sessionExpireTimer = window.setTimeout(handleSessionExpired, remainingMs + 250)
}

async function restoreSession() {
  if (!getToken()) {
    sessionLoading.value = false
    return
  }

  try {
    const data = await getMe()
    applySession(data.user)
  } catch {
    clearToken()
    currentView.value = "login"
    currentUser.value = null
  } finally {
    sessionLoading.value = false
  }
}

function handleLoginSuccess(data) {
  applySession(data.user)
}

function handleLogout() {
  clearSessionExpireTimer()
  clearToken()
  resetSessionState()
}

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

onMounted(() => {
  window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
  restoreSession()
})

onBeforeUnmount(() => {
  window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
  clearSessionExpireTimer()
})
</script>

<template>
  <div v-if="sessionLoading" class="app-loading">
    <el-icon class="is-loading"><DataAnalysis /></el-icon>
  </div>

  <LoginPage v-else-if="currentView === 'login'" @login-success="handleLoginSuccess" />

  <UserCodePage v-else-if="currentView === 'user'" :user="currentUser" @logout="handleLogout" />

  <el-container v-else-if="currentView === 'admin'" class="admin-shell">
    <el-aside class="admin-sidebar" width="260px">
      <div class="brand admin-brand">
        <span class="brand-mark">
          <img :src="systemLogo" alt="" />
        </span>
        <div>
          <strong>Adobe 业务管理</strong>
          <small>管理控制台</small>
        </div>
      </div>

      <el-menu
        :default-active="activeAdminModule === 'adobeDetail' ? 'adobe' : activeAdminModule === 'customerDetail' ? 'customers' : activeAdminModule"
        class="admin-menu"
        @select="handleAdminSelect"
      >
        <el-menu-item v-for="item in menuItems" :key="item.key" :index="item.key">
          <img class="admin-menu-icon" :src="item.icon" alt="" />
          <span>{{ item.label }}</span>
        </el-menu-item>
      </el-menu>

      <div class="admin-sidebar-footer">
        <div class="admin-profile-card">
          <el-avatar :size="34" :src="managerIcon" />
          <div>
            <strong>Admin 管理员</strong>
            <span>当前管理员：{{ adminName }}</span>
          </div>
        </div>

        <el-button class="admin-logout-button" :icon="SwitchButton" @click="handleLogout">退出登录</el-button>
      </div>
    </el-aside>

    <AdobeAccountsPage v-if="activeAdminModule === 'adobe'" @view-detail="showAdobeDetail" />
    <AdobeAccountDetailPage
      v-else-if="activeAdminModule === 'adobeDetail'"
      :account="selectedAdobeAccount"
      @back="backToAdobeList"
      @view-customer="showCustomerDetail"
    />
    <CustomerManagementPage v-else-if="activeAdminModule === 'customers'" @view-detail="showCustomerDetail" />
    <CustomerDetailPage
      v-else-if="activeAdminModule === 'customerDetail'"
      :customer="selectedCustomer"
      @back="backToCustomerList"
      @view-account="showAdobeDetail"
    />
    <AssignmentManagementPage
      v-else-if="activeAdminModule === 'assignments'"
      @view-account="showAdobeDetail"
      @view-customer="showCustomerDetail"
    />
    <ParameterSettingsPage v-else-if="activeAdminModule === 'parameters'" />
    <AdobeAccountsPage v-else />
  </el-container>
</template>
