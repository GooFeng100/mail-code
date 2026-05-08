export async function getAdobeUserStatus(email) {
  const response = await fetch("/adobe-api/user-status", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok || data.found === false) {
    const error = new Error(data.error || data.message || "Adobe status lookup failed")
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}
