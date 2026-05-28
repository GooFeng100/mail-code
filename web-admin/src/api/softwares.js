import { apiRequest } from "./client"

export function listPublicSoftwares() {
  return apiRequest("/api/softwares")
}

export function buildSoftwareDownloadUrl(id) {
  return `/api/softwares/${id}/download`
}

