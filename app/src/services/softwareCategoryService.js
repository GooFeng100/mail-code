const SoftwareCategory = require("../models/SoftwareCategory");
const { Software } = require("../models/Software");
const { SOFTWARE_CATEGORIES, resolveCategoryKeyByLegacyName } = require("../constants/softwareCategories");

function unsupported() {
  const error = new Error("software categories are fixed enum and cannot be modified");
  error.status = 405;
  throw error;
}

function normalizePageQuery(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const requestedPageSize = Number.parseInt(query.pageSize, 10) || 15;
  const pageSize = [10, 15, 20, 50].includes(requestedPageSize) ? requestedPageSize : 15;
  const keyword = String(query.keyword || "").trim().toLowerCase();
  return { page, pageSize, keyword };
}

function paginate(items, page, pageSize) {
  const total = items.length;
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total, page, pageSize };
}

async function buildLegacyCategoryMap() {
  const categories = await SoftwareCategory.find().select("_id name");
  return new Map(categories.map((item) => [String(item._id), resolveCategoryKeyByLegacyName(item.name)]));
}

async function listSoftwareCategories(query = {}) {
  const options = normalizePageQuery(query);
  const legacyMap = await buildLegacyCategoryMap();
  const docs = await Software.find().select("categoryKey categoryId");

  const countMap = new Map(SOFTWARE_CATEGORIES.map((item) => [item.key, 0]));
  for (const doc of docs) {
    const raw = doc.toObject({ transform: false });
    let key = String(raw.categoryKey || "").trim().toLowerCase();
    if (!key) {
      key = legacyMap.get(String(raw.categoryId || "")) || "other";
    }
    if (!countMap.has(key)) key = "other";
    countMap.set(key, Number(countMap.get(key) || 0) + 1);
  }

  const base = SOFTWARE_CATEGORIES.map((item) => ({
    id: item.key,
    key: item.key,
    categoryKey: item.key,
    name: item.name,
    sort: item.sort,
    color: item.color,
    icon: item.icon,
    isEnabled: true,
    softwareCount: Number(countMap.get(item.key) || 0),
  }));

  const filtered = options.keyword
    ? base.filter((item) => [item.key, item.name].some((v) => String(v || "").toLowerCase().includes(options.keyword)))
    : base;

  return paginate(filtered, options.page, options.pageSize);
}

async function createSoftwareCategory() { unsupported(); }
async function updateSoftwareCategory() { unsupported(); }
async function updateSoftwareCategorySort() { unsupported(); }
async function updateSoftwareCategoryEnabled() { unsupported(); }
async function deleteSoftwareCategory() { unsupported(); }

module.exports = {
  listSoftwareCategories,
  createSoftwareCategory,
  updateSoftwareCategory,
  updateSoftwareCategorySort,
  updateSoftwareCategoryEnabled,
  deleteSoftwareCategory,
};

