const ParameterOption = require("../models/ParameterOption");

const CATEGORIES = {
  plan: "账户计划"
};

const DEFAULT_PARAMETER_OPTIONS = [
  { category: "plan", name: "全家桶月付", days: 30, sortOrder: 1 },
  { category: "plan", name: "全家桶年付", days: 365, sortOrder: 2 },
  { category: "plan", name: "摄影计划月付", days: 30, sortOrder: 3 },
  { category: "plan", name: "摄影计划年付", days: 365, sortOrder: 4 }
];

const REMOVED_CATEGORIES = ["adobeAccountStatus", "customerStatus"];

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}

function publicOption(option) {
  return option ? option.toJSON() : null;
}

function normalizeCategory(category) {
  const value = String(category || "").trim();
  if (!Object.prototype.hasOwnProperty.call(CATEGORIES, value)) {
    badRequest(`category must be one of: ${Object.keys(CATEGORIES).join(", ")}`);
  }
  return value;
}

function normalizeName(name) {
  const value = String(name || "").trim();
  if (!value) {
    badRequest("name is required");
  }
  return value;
}

function normalizeSortOrder(sortOrder) {
  const value = Number(sortOrder);
  if (!Number.isInteger(value) || value <= 0) {
    badRequest("排序必须是大于 0 的整数");
  }
  return value;
}

async function assertUniqueName(category, name, excludeId) {
  const query = { category, name };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const existing = await ParameterOption.findOne(query);
  if (existing) {
    badRequest("同一参数类型下名称已存在");
  }
}

async function shiftSortOrders(category, sortOrder, excludeId) {
  const query = {
    category,
    sortOrder: { $gte: sortOrder }
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  await ParameterOption.updateMany(query, { $inc: { sortOrder: 1 } });
}

async function ensureDefaultParameterOptions() {
  await ParameterOption.deleteMany({ category: { $in: REMOVED_CATEGORIES } });

  for (const option of DEFAULT_PARAMETER_OPTIONS) {
    await ParameterOption.updateOne(
      { category: option.category, name: option.name },
      {
        $setOnInsert: {
          ...option,
          enabled: true,
          remark: ""
        }
      },
      { upsert: true }
    );
  }
}

async function listParameterOptions() {
  const options = await ParameterOption.find({ category: { $in: Object.keys(CATEGORIES) } }).sort({ category: 1, sortOrder: 1, createdAt: 1 });
  return options.map(publicOption);
}

async function enabledOptions(category) {
  return ParameterOption.find({ category, enabled: true }).sort({ sortOrder: 1, createdAt: 1 });
}

async function getOptionConfig() {
  const plans = await enabledOptions("plan");

  const planItems = plans.map((item) => ({
    name: item.name,
    days: Number(item.days || 0)
  }));

  return {
    plans: planItems,
    renewalPlans: planItems.map((item) => ({
      name: item.name,
      plan: item.name,
      days: item.days
    })),
    parameterCategories: CATEGORIES
  };
}

async function findEnabledOption(category, name) {
  return ParameterOption.findOne({
    category,
    name: normalizeName(name),
    enabled: true
  });
}

async function assertEnabledOption(category, name, fieldName) {
  const option = await findEnabledOption(category, name);
  if (!option) {
    const values = (await enabledOptions(category)).map((item) => item.name);
    badRequest(`${fieldName} must be one of: ${values.join(", ")}`);
  }
  return option;
}

async function createParameterOption(data) {
  const category = normalizeCategory(data.category);
  const name = normalizeName(data.name);
  const sortOrder = normalizeSortOrder(data.sortOrder);

  await assertUniqueName(category, name);
  await shiftSortOrders(category, sortOrder);

  const option = await ParameterOption.create({
    category,
    name,
    days: category === "plan" ? Number(data.days || 0) : 0,
    enabled: data.enabled !== false,
    sortOrder,
    remark: String(data.remark || "")
  });
  return publicOption(option);
}

async function updateParameterOption(id, data) {
  const option = await ParameterOption.findById(id);
  if (!option) {
    const error = new Error("parameter option not found");
    error.status = 404;
    throw error;
  }
  const previousOption = publicOption(option);

  const nextCategory = data.category ? normalizeCategory(data.category) : option.category;
  const nextName = typeof data.name === "string" ? normalizeName(data.name) : option.name;
  const hasSortOrder = Object.prototype.hasOwnProperty.call(data, "sortOrder");
  const nextSortOrder = normalizeSortOrder(hasSortOrder ? data.sortOrder : option.sortOrder);
  const moved = nextCategory !== option.category || Number(nextSortOrder) !== Number(option.sortOrder || 0);

  await assertUniqueName(nextCategory, nextName, option._id);
  if (moved) {
    await shiftSortOrders(nextCategory, nextSortOrder, option._id);
  }

  option.category = nextCategory;
  option.name = nextName;
  if (Object.prototype.hasOwnProperty.call(data, "days")) {
    option.days = option.category === "plan" ? Number(data.days || 0) : 0;
  } else if (option.category !== "plan") {
    option.days = 0;
  }
  if (typeof data.enabled === "boolean") {
    option.enabled = data.enabled;
  }
  option.sortOrder = nextSortOrder;
  if (typeof data.remark === "string") {
    option.remark = data.remark;
  }

  await option.save();
  return {
    previousOption,
    parameter: publicOption(option)
  };
}

async function deleteParameterOption(id) {
  const option = await ParameterOption.findByIdAndDelete(id);
  if (!option) {
    const error = new Error("parameter option not found");
    error.status = 404;
    throw error;
  }
}

module.exports = {
  CATEGORIES,
  ensureDefaultParameterOptions,
  listParameterOptions,
  getOptionConfig,
  assertEnabledOption,
  createParameterOption,
  updateParameterOption,
  deleteParameterOption
};
