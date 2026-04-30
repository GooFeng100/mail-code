import { apiRequest } from "./client"

export async function listAdobeAccounts() {
  const data = await apiRequest("/api/admin/adobe-accounts")
  return data.adobeAccounts || []
}
