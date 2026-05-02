const DAY_MS = 24 * 60 * 60 * 1000
const UTC8_OFFSET_MS = 8 * 60 * 60 * 1000

function toDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function utc8Parts(value = new Date()) {
  const date = toDate(value) || new Date()
  const shifted = new Date(date.getTime() + UTC8_OFFSET_MS)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  }
}

function utc8DayNumber(value = new Date()) {
  const date = toDate(value) || new Date()
  return Math.floor((date.getTime() + UTC8_OFFSET_MS) / DAY_MS)
}

function formatParts(parts) {
  const month = String(parts.month + 1).padStart(2, "0")
  const day = String(parts.day).padStart(2, "0")
  return `${parts.year}-${month}-${day}`
}

export function todayUtc8() {
  return formatParts(utc8Parts())
}

export function dateInputValueUtc8(value) {
  const date = toDate(value)
  return date ? formatParts(utc8Parts(date)) : ""
}

export function addDaysUtc8(dateText, days) {
  if (!dateText) return ""
  const [year, month, day] = String(dateText).split("-").map(Number)
  const base = Date.UTC(year, month - 1, day) - UTC8_OFFSET_MS
  if (!Number.isFinite(base)) return ""
  const next = new Date(base + Number(days || 0) * DAY_MS)
  return formatParts(utc8Parts(next))
}

export function remainingDaysFromDateUtc8(dateText) {
  if (!dateText) return null
  const [year, month, day] = String(dateText).split("-").map(Number)
  const expire = Date.UTC(year, month - 1, day) - UTC8_OFFSET_MS
  if (!Number.isFinite(expire)) return null
  return Math.floor((expire + UTC8_OFFSET_MS) / DAY_MS) - utc8DayNumber()
}
