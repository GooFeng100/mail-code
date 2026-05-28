import { apiRequest, setToken } from "./client"

export async function login(payload) {
  const data = await apiRequest("/api/auth/login", {
    method: "POST",
    body: payload,
  })
  setToken(data.token)
  return data
}

export function getMe() {
  return apiRequest("/api/me")
}

export function getAdminConfig() {
  return apiRequest("/api/admin/config")
}

export async function listAdobeAccounts(query = {}) {
  return apiRequest("/api/admin/adobe-accounts", { query })
}

export function createAdobeAccount(payload) {
  return apiRequest("/api/admin/adobe-accounts", {
    method: "POST",
    body: payload,
  })
}

export function getAdobeAccount(id) {
  return apiRequest(`/api/admin/adobe-accounts/${id}`)
}

export function getAdobeAccountDetail(id) {
  return apiRequest(`/api/admin/adobe-accounts/${id}/detail`)
}

export function updateAdobeAccount(id, payload) {
  return apiRequest(`/api/admin/adobe-accounts/${id}`, {
    method: "PUT",
    body: payload,
  })
}

export function deleteAdobeAccount(id) {
  return apiRequest(`/api/admin/adobe-accounts/${id}`, { method: "DELETE" })
}

export function createAdobeRenewal(id, payload) {
  return apiRequest(`/api/admin/adobe-accounts/${id}/renewals`, {
    method: "POST",
    body: payload,
  })
}

export function deleteAdobeRenewal(id, renewalId) {
  return apiRequest(`/api/admin/adobe-accounts/${id}/renewals/${renewalId}`, {
    method: "DELETE",
  })
}

export async function listCustomers(query = {}) {
  return apiRequest("/api/admin/customers", { query })
}

export function createCustomer(payload) {
  return apiRequest("/api/admin/customers", {
    method: "POST",
    body: payload,
  })
}

export function getCustomer(id) {
  return apiRequest(`/api/admin/customers/${id}`)
}

export function getCustomerDetail(id) {
  return apiRequest(`/api/admin/customers/${id}/detail`)
}

export function updateCustomer(id, payload) {
  return apiRequest(`/api/admin/customers/${id}`, {
    method: "PUT",
    body: payload,
  })
}

export function deleteCustomer(id) {
  return apiRequest(`/api/admin/customers/${id}`, { method: "DELETE" })
}

export function createCustomerRenewal(id, payload) {
  return apiRequest(`/api/admin/customers/${id}/renewals`, {
    method: "POST",
    body: payload,
  })
}

export function deleteCustomerRenewal(id, renewalId) {
  return apiRequest(`/api/admin/customers/${id}/renewals/${renewalId}`, {
    method: "DELETE",
  })
}

export async function listAssignments(query = {}) {
  return apiRequest("/api/admin/assignments", { query })
}

export function createAssignment(payload) {
  return apiRequest("/api/admin/assignments", {
    method: "POST",
    body: payload,
  })
}

export function updateAssignment(id, payload) {
  return apiRequest(`/api/admin/assignments/${id}`, {
    method: "PUT",
    body: payload,
  })
}

export function deleteAssignment(id) {
  return apiRequest(`/api/admin/assignments/${id}`, { method: "DELETE" })
}

export async function listParameters(query = {}) {
  return apiRequest("/api/admin/parameters", { query })
}

export function createParameter(payload) {
  return apiRequest("/api/admin/parameters", {
    method: "POST",
    body: payload,
  })
}

export function updateParameter(id, payload) {
  return apiRequest(`/api/admin/parameters/${id}`, {
    method: "PUT",
    body: payload,
  })
}

export function deleteParameter(id) {
  return apiRequest(`/api/admin/parameters/${id}`, { method: "DELETE" })
}

export async function listSoftwareCategories(query = {}) {
  return apiRequest("/api/admin/software-categories", { query })
}

export async function listSoftwares(query = {}) {
  return apiRequest("/api/admin/softwares", { query })
}

export function getSoftware(id) {
  return apiRequest(`/api/admin/softwares/${id}`)
}

export function updateSoftware(id, payload) {
  return apiRequest(`/api/admin/softwares/${id}`, {
    method: "PUT",
    body: payload,
  })
}

export function deleteSoftware(id) {
  return apiRequest(`/api/admin/softwares/${id}`, { method: "DELETE" })
}

export function setSoftwarePublish(id, payload) {
  return apiRequest(`/api/admin/softwares/${id}/publish`, {
    method: "PATCH",
    body: payload,
  })
}

export function setSoftwareCategory(id, payload) {
  return apiRequest(`/api/admin/softwares/${id}/category`, {
    method: "PATCH",
    body: payload,
  })
}

export function setSoftwareSort(id, payload) {
  return apiRequest(`/api/admin/softwares/${id}/sort`, {
    method: "PATCH",
    body: payload,
  })
}

export function checkSoftwareValidity(id) {
  return apiRequest(`/api/admin/softwares/${id}/check-validity`, {
    method: "POST",
  })
}

export function createSoftwareByLocalUpload(payload) {
  return apiRequest("/api/admin/softwares/upload-local", {
    method: "POST",
    body: payload,
  })
}

export function createSoftwareByRemoteImport(payload) {
  return apiRequest("/api/admin/softwares/import-to-server", {
    method: "POST",
    body: payload,
  })
}

export function resolveRemoteSoftwareMeta(payload) {
  return apiRequest("/api/admin/softwares/resolve-remote-meta", {
    method: "POST",
    body: payload,
  })
}

export function getSoftwareImportTask(taskId) {
  return apiRequest(`/api/admin/softwares/import-tasks/${taskId}`)
}

export function createSoftwareByExternalLink(payload) {
  return apiRequest("/api/admin/softwares/external-link", {
    method: "POST",
    body: payload,
  })
}

export function softwareDownloadTest(id) {
  return apiRequest(`/api/admin/softwares/${id}/download-test`)
}
