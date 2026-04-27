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

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function addDays(date, days) {
  const base = toDate(date) || new Date();
  const next = new Date(base.getTime());
  next.setDate(next.getDate() + Number(days || 0));
  return next;
}

function getRemainingDays(expireAt) {
  const expire = toDate(expireAt);
  if (!expire) {
    return null;
  }

  const end = new Date(expire.getTime());
  end.setHours(0, 0, 0, 0);
  const diff = end.getTime() - startOfToday().getTime();
  return Math.ceil(diff / 86400000);
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

  return expire.getTime() <= startOfToday().getTime() ? "已到期" : "正常";
}

function toDateOnly(value) {
  const date = toDate(value);
  if (!date) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

module.exports = {
  addDays,
  getRemainingDays,
  getRemainingText,
  getDynamicStatus,
  toDate,
  toDateOnly
};
