import { apiRequest } from "./client"

export async function getAdobeUserStatus(email) {
  return apiRequest("/api/codes/adobe-status", {
    method: "POST",
    body: { email },
  })
}
