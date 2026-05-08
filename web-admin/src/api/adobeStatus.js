import { apiRequest } from "./client"

export async function getAdobeUserStatus(email) {
  return apiRequest("/api/adobe-status/user-status", {
    method: "POST",
    body: { email },
  })
}
