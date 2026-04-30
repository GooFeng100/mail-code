export function displayValue(value) {
  return value === undefined || value === null || value === "" ? "-" : value
}

export function formatDate(value) {
  if (!value) {
    return "-"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return date.toLocaleDateString()
}

export function remainingDays(value) {
  if (!value) {
    return NaN
  }

  const expiresAt = new Date(value)
  if (Number.isNaN(expiresAt.getTime())) {
    return NaN
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  expiresAt.setHours(0, 0, 0, 0)
  return Math.ceil((expiresAt.getTime() - today.getTime()) / 86400000)
}

export function accountStatus(account) {
  const days = remainingDays(account.accountExpireAt)
  if (Number.isFinite(days) && days <= 0) {
    return { text: "\u5df2\u5230\u671f", kind: "danger" }
  }
  if (Number.isFinite(days) && days <= 30) {
    return { text: "\u5373\u5c06\u5230\u671f", kind: "warning" }
  }
  return { text: "\u6b63\u5e38", kind: "success" }
}
