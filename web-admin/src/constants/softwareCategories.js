export const SOFTWARE_CATEGORIES = [
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
]

export const SOFTWARE_CATEGORY_MAP = new Map(SOFTWARE_CATEGORIES.map((item) => [item.key, item]))

export function getSoftwareCategoryMeta(categoryKey) {
  const key = String(categoryKey || "").trim().toLowerCase()
  return SOFTWARE_CATEGORY_MAP.get(key) || SOFTWARE_CATEGORY_MAP.get("other")
}

