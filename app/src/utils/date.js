const DAY_MS = 24 * 60 * 60 * 1000;
const UTC8_OFFSET_MS = 8 * 60 * 60 * 1000;

function toDate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function utc8DayNumber(value = new Date()) {
  const date = toDate(value) || new Date();
  return Math.floor((date.getTime() + UTC8_OFFSET_MS) / DAY_MS);
}

function utc8DateParts(value = new Date()) {
  const date = toDate(value) || new Date();
  const shifted = new Date(date.getTime() + UTC8_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate()
  };
}

function fromUtc8DateParts(year, month, day) {
  return new Date(Date.UTC(year, month, day) - UTC8_OFFSET_MS);
}

function addDays(date, days) {
  const parts = utc8DateParts(date);
  return fromUtc8DateParts(parts.year, parts.month, parts.day + Number(days || 0));
}

function getRemainingDays(expireAt) {
  const expire = toDate(expireAt);
  if (!expire) {
    return null;
  }

  return utc8DayNumber(expire) - utc8DayNumber();
}

function getRemainingText(expireAt) {
  const expire = toDate(expireAt);
  if (!expire) {
    return "未设置";
  }

  const days = getRemainingDays(expire);
  if (days <= 0) {
    return "0 天";
  }

  return `${days} 天`;
}

function getDynamicStatus(expireAt) {
  const expire = toDate(expireAt);
  if (!expire) {
    return "未设置";
  }

  return getRemainingDays(expire) < 0 ? "已到期" : "正常";
}

function toDateOnly(value) {
  const date = toDate(value);
  if (!date) {
    return "";
  }

  const parts = utc8DateParts(date);
  const year = parts.year;
  const month = String(parts.month + 1).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

module.exports = {
  addDays,
  getRemainingDays,
  getRemainingText,
  getDynamicStatus,
  toDate,
  toDateOnly
};
