import { apiRequest } from "./client"

export function listCodes() {
  return apiRequest("/api/codes")
}
