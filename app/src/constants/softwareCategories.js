const SOFTWARE_CATEGORIES = [
  { key: "office", name: "办公软件", sort: 1, color: "#3B82F6", icon: "office" },
  { key: "chat", name: "聊天软件", sort: 2, color: "#10B981", icon: "chat" },
  { key: "browser", name: "网页浏览", sort: 3, color: "#6366F1", icon: "browser" },
  { key: "remote", name: "远程工具", sort: 4, color: "#14B8A6", icon: "remote" },
  { key: "archive", name: "压缩工具", sort: 5, color: "#F59E0B", icon: "archive" },
  { key: "screenshot", name: "截图工具", sort: 6, color: "#0EA5E9", icon: "screenshot" },
  { key: "dev", name: "开发工具", sort: 7, color: "#8B5CF6", icon: "dev" },
  { key: "system", name: "系统工具", sort: 8, color: "#64748B", icon: "system" },
  { key: "security", name: "安全软件", sort: 9, color: "#22C55E", icon: "security" },
  { key: "education", name: "教育学习", sort: 10, color: "#06B6D4", icon: "education" },
  { key: "design", name: "设计图像", sort: 11, color: "#EC4899", icon: "design" },
  { key: "media", name: "影音播放", sort: 12, color: "#F97316", icon: "media" },
  { key: "input", name: "输入法", sort: 13, color: "#84CC16", icon: "input" },
  { key: "network", name: "网络工具", sort: 14, color: "#0EA5E9", icon: "network" },
  { key: "driver", name: "驱动工具", sort: 15, color: "#A855F7", icon: "driver" },
  { key: "other", name: "其他", sort: 16, color: "#94A3B8", icon: "other" },
];

const CATEGORY_BY_KEY = new Map(SOFTWARE_CATEGORIES.map((item) => [item.key, item]));

const LEGACY_NAME_TO_KEY = new Map([
  ["办公软件", "office"],
  ["聊天软件", "chat"],
  ["网页浏览", "browser"],
  ["远程工具", "remote"],
  ["压缩工具", "archive"],
  ["常用工具", "other"],
  ["截图工具", "screenshot"],
  ["开发工具", "dev"],
  ["系统工具", "system"],
  ["安全软件", "security"],
  ["教育学习", "education"],
  ["设计图像", "design"],
  ["影音播放", "media"],
  ["输入法", "input"],
  ["网络工具", "network"],
  ["驱动工具", "driver"],
  ["其他", "other"],
]);

function normalizeCategoryKey(value) {
  const key = String(value || "").trim().toLowerCase();
  return CATEGORY_BY_KEY.has(key) ? key : "";
}

function categoryFromKey(value) {
  const key = normalizeCategoryKey(value);
  return CATEGORY_BY_KEY.get(key || "other");
}

function resolveCategoryKeyByLegacyName(name) {
  const normalized = String(name || "").trim();
  return LEGACY_NAME_TO_KEY.get(normalized) || "other";
}

module.exports = {
  SOFTWARE_CATEGORIES,
  CATEGORY_BY_KEY,
  normalizeCategoryKey,
  categoryFromKey,
  resolveCategoryKeyByLegacyName,
};

