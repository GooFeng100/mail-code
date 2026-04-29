const bcrypt = require("bcryptjs");
const config = require("../config");
const AdobeAccount = require("../models/AdobeAccount");
const AdobeRenewalRecord = require("../models/AdobeRenewalRecord");
const Customer = require("../models/Customer");
const CustomerRenewalRecord = require("../models/CustomerRenewalRecord");
const CustomerAssignment = require("../models/CustomerAssignment");
const ParameterOption = require("../models/ParameterOption");
const {
  addDays,
  getDynamicStatus,
  getRemainingDays,
  getRemainingText,
  toDate
} = require("../utils/date");
const {
  assertEnabledOption
} = require("./parameterService");

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}

function notFound(message) {
  const error = new Error(message);
  error.status = 404;
  throw error;
}

function publicDoc(doc) {
  return doc ? doc.toJSON() : null;
}

function normalizeAccountEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    badRequest("accountEmail must be a valid email");
  }
  return email;
}

function normalizeOptionalEmail(value, fieldName) {
  const email = String(value || "").trim().toLowerCase();
  if (!email) {
    return "";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    badRequest(`${fieldName} must be a valid email`);
  }
  return email;
}

function normalizeVerificationEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  const parts = email.split("@");
  if (parts.length !== 2) {
    badRequest(`verificationEmail must use one of: ${config.mailDomains.join(", ")}`);
  }

  const local = parts[0];
  const domain = parts[1];
  if (!/^[a-z0-9][a-z0-9_-]{0,31}$/.test(local)) {
    badRequest("verificationEmail local part only allows lowercase letters, numbers, underscore and hyphen");
  }
  if (!config.mailDomains.includes(domain)) {
    badRequest(`verificationEmail domain must be one of: ${config.mailDomains.join(", ")}`);
  }

  return {
    verificationEmail: `${local}@${domain}`,
    verificationEmailLocal: local,
    verificationEmailDomain: domain
  };
}

async function nextCode(Model, field, prefix) {
  const docs = await Model.find({ [field]: new RegExp(`^${prefix}\\d+$`) }).select(field);
  const used = new Set(docs.map((doc) => {
    const match = String(doc[field] || "").match(/\d+$/);
    return match ? Number(match[0]) : 0;
  }).filter((value) => value > 0));
  let next = 1;
  while (used.has(next)) {
    next += 1;
  }
  return `${prefix}${String(next).padStart(4, "0")}`;
}

function normalizeCode(value, prefix) {
  const code = String(value || "").trim().toUpperCase();
  if (!code) {
    return "";
  }
  if (!new RegExp(`^${prefix}\\d{4,}$`).test(code)) {
    badRequest(`${prefix} code must look like ${prefix}0001`);
  }
  return code;
}

function normalizeAssignmentRole(value) {
  return value === "primary" ? "primary" : "backup";
}

function assignmentRoleLabel(value) {
  return value === "primary" ? "主要账号" : "备用账号";
}

async function assertPrimaryAssignmentAvailable(customerId, excludeId = null) {
  const query = {
    customerId,
    assignmentRole: "primary",
    active: true
  };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const exists = await CustomerAssignment.exists(query);
  if (exists) {
    badRequest("该客户已有主要账号，请先将原主要账号改为备用账号或取消绑定");
  }
}

async function hashPassword(value) {
  const text = String(value || "");
  if (!text || text.length < 6) {
    badRequest("password must be at least 6 characters");
  }
  return bcrypt.hash(text, 10);
}

function decorateAdobeAccount(account) {
  const data = publicDoc(account);
  if (!data) {
    return null;
  }

  data.remainingDays = getRemainingDays(account.accountExpireAt);
  data.remainingText = getRemainingText(account.accountExpireAt);
  data.dynamicStatus = getDynamicStatus(account.accountExpireAt);
  return data;
}

function decorateCustomer(customer) {
  const data = publicDoc(customer);
  if (!data) {
    return null;
  }

  data.remainingDays = getRemainingDays(customer.afterSalesExpireAt);
  data.remainingText = getRemainingText(customer.afterSalesExpireAt);
  data.dynamicRenewalStatus = getDynamicStatus(customer.afterSalesExpireAt);
  return data;
}

function publicAdobeSession(account) {
  return {
    id: account._id.toString(),
    type: "adobe",
    role: "adobe",
    username: account.accountEmail,
    adobeAccountId: account._id.toString(),
    adobeCode: account.adobeCode,
    accountEmail: account.accountEmail,
    verificationEmail: account.verificationEmail,
    enabled: account.enabled
  };
}

function daysBetween(start, end) {
  const startDate = toDate(start);
  const endDate = toDate(end);
  if (!startDate || !endDate) {
    return 0;
  }

  return Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 86400000));
}

async function planSnapshot(identifier, fallbackName = "") {
  const value = String(identifier || "").trim();
  const name = String(fallbackName || "").trim();
  const query = {
    category: "plan",
    $or: []
  };
  if (value) {
    if (/^[a-fA-F0-9]{24}$/.test(value)) {
      query.$or.push({ _id: value });
    }
    query.$or.push({ name: value });
  }
  if (name && name !== value) {
    query.$or.push({ name });
  }
  if (!query.$or.length) {
    return { id: "", name, days: 0 };
  }

  const option = await ParameterOption.findOne(query);
  if (!option) {
    return { id: "", name: name || value, days: 0 };
  }

  return {
    id: option._id.toString(),
    name: option.name,
    days: Number(option.days || 0)
  };
}

async function adobeInitialRenewalRecord(account) {
  const plan = await planSnapshot(account.initialAccountPlanId || account.accountPlanId, account.initialAccountPlan || account.accountPlan);
  const afterExpireAt = account.paidAt && plan.days ? addDays(account.paidAt, plan.days) : account.baseExpireAt;
  return {
    id: `initial-${account._id.toString()}`,
    initial: true,
    renewalDate: account.paidAt,
    planId: plan.id,
    planName: plan.name,
    planDays: plan.days || daysBetween(account.paidAt, account.baseExpireAt),
    beforeExpireAt: null,
    afterExpireAt,
    remark: "首次购买"
  };
}

async function customerInitialRenewalRecord(customer) {
  const plan = await planSnapshot(customer.initialPurchasedPlanId || customer.purchasedPlanId, customer.initialPurchasedPlan || customer.purchasedPlan);
  const afterExpireAt = customer.firstPaidAt && plan.days ? addDays(customer.firstPaidAt, plan.days) : customer.baseAfterSalesExpireAt;
  return {
    id: `initial-${customer._id.toString()}`,
    initial: true,
    renewalDate: customer.firstPaidAt,
    planId: plan.id,
    planName: plan.name,
    planDays: plan.days || daysBetween(customer.firstPaidAt, customer.baseAfterSalesExpireAt),
    beforeExpireAt: null,
    afterExpireAt,
    remark: "首次购买"
  };
}

async function withAdobeInitialRenewal(account, records) {
  return [
    await adobeInitialRenewalRecord(account),
    ...records.map(publicDoc)
  ];
}

async function withCustomerInitialRenewal(customer, records) {
  return [
    await customerInitialRenewalRecord(customer),
    ...records.map(publicDoc)
  ];
}

async function createAdobeAccount(data) {
  const adobeCode = normalizeCode(data.adobeCode, "A") || await nextCode(AdobeAccount, "adobeCode", "A");
  const verification = normalizeVerificationEmail(data.verificationEmail);
  const adobePassword = String(data.adobePassword || "");
  const plan = await assertEnabledOption("plan", data.accountPlan, "accountPlan");
  const paidAt = toDate(data.paidAt);
  const baseExpireAt = paidAt && plan.days ? addDays(paidAt, plan.days) : toDate(data.baseExpireAt);

  const account = await AdobeAccount.create({
    adobeCode,
    accountEmail: normalizeAccountEmail(data.accountEmail),
    accountEmailPassword: String(data.accountEmailPassword || ""),
    adobePassword,
    passwordHash: await hashPassword(adobePassword),
    ...verification,
    accountPlanId: plan._id.toString(),
    accountPlan: plan.name,
    initialAccountPlanId: plan._id.toString(),
    initialAccountPlan: plan.name,
    paidAt,
    baseExpireAt,
    accountExpireAt: baseExpireAt,
    enabled: data.enabled !== false,
    remark: String(data.remark || "")
  });

  return decorateAdobeAccount(account);
}

async function updateAdobeAccount(id, data) {
  const update = {};

  if (data.adobeCode) {
    update.adobeCode = normalizeCode(data.adobeCode, "A");
  }
  if (data.accountEmail) {
    update.accountEmail = normalizeAccountEmail(data.accountEmail);
  }
  if (typeof data.accountEmailPassword === "string") {
    update.accountEmailPassword = data.accountEmailPassword;
  }
  if (data.adobePassword) {
    update.adobePassword = String(data.adobePassword);
    update.passwordHash = await hashPassword(update.adobePassword);
  }
  if (data.verificationEmail) {
    Object.assign(update, normalizeVerificationEmail(data.verificationEmail));
  }
  if (data.accountPlan) {
    const plan = await assertEnabledOption("plan", data.accountPlan, "accountPlan");
    update.accountPlanId = plan._id.toString();
    update.accountPlan = plan.name;
    update.initialAccountPlanId = plan._id.toString();
    update.initialAccountPlan = plan.name;
  }
  if (Object.prototype.hasOwnProperty.call(data, "paidAt")) {
    update.paidAt = toDate(data.paidAt);
  }
  if (Object.prototype.hasOwnProperty.call(data, "baseExpireAt")) {
    update.baseExpireAt = toDate(data.baseExpireAt);
  }
  if (typeof data.enabled === "boolean") {
    update.enabled = data.enabled;
  }
  if (typeof data.remark === "string") {
    update.remark = data.remark;
  }

  const account = await AdobeAccount.findByIdAndUpdate(id, update, { new: true, runValidators: true });
  if (!account) {
    notFound("Adobe account not found");
  }

  await CustomerAssignment.updateMany({ adobeAccountId: account._id }, {
    adobeCode: account.adobeCode,
    accountEmail: account.accountEmail
  });
  await AdobeRenewalRecord.updateMany({ adobeAccountId: account._id }, {
    adobeCode: account.adobeCode,
    accountEmail: account.accountEmail
  });
  await recalculateAdobeExpire(account._id);
  return decorateAdobeAccount(await AdobeAccount.findById(account._id));
}

async function listAdobeAccounts() {
  const initialAccounts = await AdobeAccount.find().select("_id");
  await Promise.all(initialAccounts.map((account) => recalculateAdobeExpire(account._id)));
  const accounts = await AdobeAccount.find().sort({ createdAt: -1 });
  const assignments = await CustomerAssignment.find({ active: true }).select("adobeAccountId customerId");
  const customers = await Customer.find({ _id: { $in: assignments.map((item) => item.customerId) } }).select("_id");
  const existingCustomerIds = new Set(customers.map((customer) => customer._id.toString()));
  const countMap = assignments.reduce((map, assignment) => {
    if (!existingCustomerIds.has(assignment.customerId.toString())) {
      return map;
    }
    const key = assignment.adobeAccountId.toString();
    map.set(key, (map.get(key) || 0) + 1);
    return map;
  }, new Map());
  return accounts.map((account) => ({
    ...decorateAdobeAccount(account),
    assignmentCount: countMap.get(account._id.toString()) || 0
  }));
}

async function getAdobeAccount(id) {
  await recalculateAdobeExpire(id);
  const account = await AdobeAccount.findById(id);
  if (!account) {
    notFound("Adobe account not found");
  }
  return decorateAdobeAccount(account);
}

async function deleteAdobeAccount(id) {
  const account = await AdobeAccount.findByIdAndDelete(id);
  if (!account) {
    notFound("Adobe account not found");
  }
  await AdobeRenewalRecord.deleteMany({ adobeAccountId: account._id });
  await CustomerAssignment.updateMany({ adobeAccountId: account._id }, { active: false });
}

async function recalculateAdobeExpire(id) {
  const account = await AdobeAccount.findById(id);
  if (!account) {
    notFound("Adobe account not found");
  }

  let expireAt = toDate(account.baseExpireAt);
  const initialPlan = await planSnapshot(account.initialAccountPlanId || account.accountPlanId, account.initialAccountPlan || account.accountPlan);
  if (initialPlan.id) {
    account.initialAccountPlanId = initialPlan.id;
    account.initialAccountPlan = initialPlan.name;
    if (account.paidAt) {
      account.baseExpireAt = addDays(account.paidAt, initialPlan.days);
      expireAt = account.baseExpireAt;
    }
  }
  let currentPlan = initialPlan;
  const records = await AdobeRenewalRecord.find({ adobeAccountId: account._id }).sort({ renewalDate: 1, createdAt: 1 });
  for (const record of records) {
    const recordPlan = await planSnapshot(record.planId, record.planName);
    if (recordPlan.id) {
      record.planId = recordPlan.id;
      record.planName = recordPlan.name;
      record.planDays = recordPlan.days;
    }
    record.beforeExpireAt = expireAt;
    expireAt = expireAt ? addDays(expireAt, record.planDays) : null;
    record.afterExpireAt = expireAt;
    currentPlan = recordPlan.id ? recordPlan : currentPlan;
    await record.save();
  }

  if (!account.initialAccountPlan) {
    account.initialAccountPlan = initialPlan.name;
  }
  account.accountPlanId = currentPlan.id || account.accountPlanId;
  account.accountPlan = currentPlan.name || account.accountPlan;
  account.accountExpireAt = expireAt;
  await account.save();
  return account;
}

async function syncAdobePlanChange(previousName, nextName, nextDays, nextId = "") {
  const planChanged = previousName && nextName && previousName !== nextName;
  const initialQuery = {
    $or: [
      { initialAccountPlanId: nextId },
      { accountPlanId: nextId },
      { initialAccountPlan: previousName },
      { initialAccountPlan: { $in: [null, ""] }, accountPlan: previousName }
    ]
  };
  const accounts = await AdobeAccount.find(initialQuery);
  const accountIds = new Set(accounts.map((account) => account._id.toString()));

  for (const account of accounts) {
    account.initialAccountPlanId = nextId;
    account.initialAccountPlan = nextName;
    if (!account.accountPlan || account.accountPlan === previousName) {
      account.accountPlanId = nextId;
      account.accountPlan = nextName;
    }
    if (account.paidAt) {
      account.baseExpireAt = addDays(account.paidAt, nextDays);
    }
    await account.save();
  }

  const renewalRecords = await AdobeRenewalRecord.find({
    $or: [
      { planId: nextId },
      { planName: previousName }
    ]
  });
  for (const record of renewalRecords) {
    record.planId = nextId;
    record.planName = nextName;
    record.planDays = nextDays;
    accountIds.add(record.adobeAccountId.toString());
    await record.save();
  }

  if (planChanged) {
    await AdobeAccount.updateMany({ accountPlan: previousName }, { accountPlan: nextName, accountPlanId: nextId });
  }

  for (const accountId of accountIds) {
    await recalculateAdobeExpire(accountId);
  }
}

async function findRenewalPlan(planName) {
  return assertEnabledOption("plan", planName, "planName");
}

async function listAdobeRenewals(id) {
  const account = await AdobeAccount.findById(id);
  if (!account) {
    notFound("Adobe account not found");
  }

  await recalculateAdobeExpire(account._id);
  const refreshed = await AdobeAccount.findById(account._id);
  const records = await AdobeRenewalRecord.find({ adobeAccountId: id }).sort({ renewalDate: -1, createdAt: -1 });
  return withAdobeInitialRenewal(refreshed, records);
}

async function createAdobeRenewal(id, data) {
  const account = await AdobeAccount.findById(id);
  if (!account) {
    notFound("Adobe account not found");
  }

  const plan = await findRenewalPlan(data.planName);
  const refreshed = await recalculateAdobeExpire(account._id);
  const beforeExpireAt = toDate(refreshed.accountExpireAt);
  await AdobeRenewalRecord.create({
    adobeAccountId: account._id,
    adobeCode: account.adobeCode,
    accountEmail: account.accountEmail,
    renewalDate: toDate(data.renewalDate) || new Date(),
    planId: plan._id.toString(),
    planName: plan.name,
    planDays: plan.days,
    beforeExpireAt,
    afterExpireAt: beforeExpireAt ? addDays(beforeExpireAt, plan.days) : null,
    remark: String(data.remark || "")
  });

  await recalculateAdobeExpire(account._id);
  return listAdobeRenewals(account._id);
}

async function deleteAdobeRenewal(id, renewalId) {
  const deleted = await AdobeRenewalRecord.findOneAndDelete({ _id: renewalId, adobeAccountId: id });
  if (!deleted) {
    notFound("Adobe renewal record not found");
  }
  await recalculateAdobeExpire(id);
  return listAdobeRenewals(id);
}

async function createCustomer(data) {
  const customerCode = normalizeCode(data.customerCode, "C") || await nextCode(Customer, "customerCode", "C");
  const plan = await assertEnabledOption("plan", data.purchasedPlan, "purchasedPlan");
  const firstPaidAt = toDate(data.firstPaidAt);
  const baseAfterSalesExpireAt = firstPaidAt && plan.days ? addDays(firstPaidAt, plan.days) : toDate(data.baseAfterSalesExpireAt);
  const customerNickname = String(data.customerNickname || "").trim();
  if (!customerNickname) {
    badRequest("customerNickname is required");
  }

  const customer = await Customer.create({
    customerCode,
    customerNickname,
    customerContact: String(data.customerContact || ""),
    customerContactEmail: normalizeOptionalEmail(data.customerContactEmail, "customerContactEmail"),
    purchasedPlanId: plan._id.toString(),
    purchasedPlan: plan.name,
    initialPurchasedPlanId: plan._id.toString(),
    initialPurchasedPlan: plan.name,
    firstPaidAt,
    baseAfterSalesExpireAt,
    afterSalesExpireAt: baseAfterSalesExpireAt,
    remark: String(data.remark || "")
  });

  return decorateCustomer(customer);
}

async function updateCustomer(id, data) {
  const update = {};

  if (data.customerCode) {
    update.customerCode = normalizeCode(data.customerCode, "C");
  }
  if (typeof data.customerNickname === "string") {
    update.customerNickname = data.customerNickname.trim();
    if (!update.customerNickname) {
      badRequest("customerNickname is required");
    }
  }
  if (typeof data.customerContact === "string") {
    update.customerContact = data.customerContact;
  }
  if (typeof data.customerContactEmail === "string") {
    update.customerContactEmail = normalizeOptionalEmail(data.customerContactEmail, "customerContactEmail");
  }
  if (data.purchasedPlan) {
    const plan = await assertEnabledOption("plan", data.purchasedPlan, "purchasedPlan");
    update.purchasedPlanId = plan._id.toString();
    update.purchasedPlan = plan.name;
    update.initialPurchasedPlanId = plan._id.toString();
    update.initialPurchasedPlan = plan.name;
  }
  if (Object.prototype.hasOwnProperty.call(data, "firstPaidAt")) {
    update.firstPaidAt = toDate(data.firstPaidAt);
  }
  if (Object.prototype.hasOwnProperty.call(data, "baseAfterSalesExpireAt")) {
    update.baseAfterSalesExpireAt = toDate(data.baseAfterSalesExpireAt);
  }
  if (typeof data.remark === "string") {
    update.remark = data.remark;
  }

  const customer = await Customer.findByIdAndUpdate(id, update, { new: true, runValidators: true });
  if (!customer) {
    notFound("Customer not found");
  }

  await CustomerAssignment.updateMany({ customerId: customer._id }, {
    customerCode: customer.customerCode,
    customerNickname: customer.customerNickname
  });
  await CustomerRenewalRecord.updateMany({ customerId: customer._id }, {
    customerCode: customer.customerCode,
    customerNickname: customer.customerNickname
  });
  await recalculateCustomerExpire(customer._id);
  return decorateCustomer(await Customer.findById(customer._id));
}

async function listCustomers() {
  const initialCustomers = await Customer.find().select("_id");
  await Promise.all(initialCustomers.map((customer) => recalculateCustomerExpire(customer._id)));
  const customers = await Customer.find().sort({ createdAt: -1 });
  const counts = await CustomerAssignment.aggregate([
    { $match: { active: true } },
    { $group: { _id: "$customerId", count: { $sum: 1 } } }
  ]);
  const countMap = new Map(counts.map((item) => [String(item._id), item.count]));
  return customers.map((customer) => ({
    ...decorateCustomer(customer),
    assignmentCount: countMap.get(String(customer._id)) || 0
  }));
}

async function getCustomer(id) {
  await recalculateCustomerExpire(id);
  const customer = await Customer.findById(id);
  if (!customer) {
    notFound("Customer not found");
  }
  return decorateCustomer(customer);
}

async function deleteCustomer(id) {
  const customer = await Customer.findByIdAndDelete(id);
  if (!customer) {
    notFound("Customer not found");
  }
  await CustomerRenewalRecord.deleteMany({ customerId: customer._id });
  await CustomerAssignment.updateMany({ customerId: customer._id }, { active: false });
}

async function recalculateCustomerExpire(id) {
  const customer = await Customer.findById(id);
  if (!customer) {
    notFound("Customer not found");
  }

  let expireAt = toDate(customer.baseAfterSalesExpireAt);
  const initialPlan = await planSnapshot(customer.initialPurchasedPlanId || customer.purchasedPlanId, customer.initialPurchasedPlan || customer.purchasedPlan);
  if (initialPlan.id) {
    customer.initialPurchasedPlanId = initialPlan.id;
    customer.initialPurchasedPlan = initialPlan.name;
    if (customer.firstPaidAt) {
      customer.baseAfterSalesExpireAt = addDays(customer.firstPaidAt, initialPlan.days);
      expireAt = customer.baseAfterSalesExpireAt;
    }
  }
  let currentPlan = initialPlan;
  const records = await CustomerRenewalRecord.find({ customerId: customer._id }).sort({ renewalDate: 1, createdAt: 1 });
  for (const record of records) {
    const recordPlan = await planSnapshot(record.planId, record.planName);
    if (recordPlan.id) {
      record.planId = recordPlan.id;
      record.planName = recordPlan.name;
      record.planDays = recordPlan.days;
    }
    record.beforeExpireAt = expireAt;
    expireAt = expireAt ? addDays(expireAt, record.planDays) : null;
    record.afterExpireAt = expireAt;
    currentPlan = recordPlan.id ? recordPlan : currentPlan;
    await record.save();
  }

  if (!customer.initialPurchasedPlan) {
    customer.initialPurchasedPlan = initialPlan.name;
  }
  customer.purchasedPlanId = currentPlan.id || customer.purchasedPlanId;
  customer.purchasedPlan = currentPlan.name || customer.purchasedPlan;
  customer.afterSalesExpireAt = expireAt;
  await customer.save();
  return customer;
}

async function syncCustomerPlanChange(previousName, nextName, nextDays, nextId = "") {
  const planChanged = previousName && nextName && previousName !== nextName;
  const initialQuery = {
    $or: [
      { initialPurchasedPlanId: nextId },
      { purchasedPlanId: nextId },
      { initialPurchasedPlan: previousName },
      { initialPurchasedPlan: { $in: [null, ""] }, purchasedPlan: previousName }
    ]
  };
  const customers = await Customer.find(initialQuery);
  const customerIds = new Set(customers.map((customer) => customer._id.toString()));

  for (const customer of customers) {
    customer.initialPurchasedPlanId = nextId;
    customer.initialPurchasedPlan = nextName;
    if (!customer.purchasedPlan || customer.purchasedPlan === previousName) {
      customer.purchasedPlanId = nextId;
      customer.purchasedPlan = nextName;
    }
    if (customer.firstPaidAt) {
      customer.baseAfterSalesExpireAt = addDays(customer.firstPaidAt, nextDays);
    }
    await customer.save();
  }

  const renewalRecords = await CustomerRenewalRecord.find({
    $or: [
      { planId: nextId },
      { planName: previousName }
    ]
  });
  for (const record of renewalRecords) {
    record.planId = nextId;
    record.planName = nextName;
    record.planDays = nextDays;
    customerIds.add(record.customerId.toString());
    await record.save();
  }

  if (planChanged) {
    await Customer.updateMany({ purchasedPlan: previousName }, { purchasedPlan: nextName, purchasedPlanId: nextId });
  }

  for (const customerId of customerIds) {
    await recalculateCustomerExpire(customerId);
  }
}

async function syncPlanParameterChange(previousOption, nextOption) {
  if (!previousOption || previousOption.category !== "plan" || !nextOption || nextOption.category !== "plan") {
    return;
  }

  const previousName = String(previousOption.name || "").trim();
  const nextName = String(nextOption.name || "").trim();
  if (!previousName || !nextName) {
    return;
  }

  const nextDays = Number(nextOption.days || 0);
  const nextId = String(nextOption.id || "").trim();
  await syncAdobePlanChange(previousName, nextName, nextDays, nextId);
  await syncCustomerPlanChange(previousName, nextName, nextDays, nextId);
}

async function listCustomerRenewals(id) {
  const customer = await Customer.findById(id);
  if (!customer) {
    notFound("Customer not found");
  }

  await recalculateCustomerExpire(customer._id);
  const refreshed = await Customer.findById(customer._id);
  const records = await CustomerRenewalRecord.find({ customerId: id }).sort({ renewalDate: -1, createdAt: -1 });
  return withCustomerInitialRenewal(refreshed, records);
}

async function createCustomerRenewal(id, data) {
  const customer = await Customer.findById(id);
  if (!customer) {
    notFound("Customer not found");
  }

  const plan = await findRenewalPlan(data.planName);
  const refreshed = await recalculateCustomerExpire(customer._id);
  const beforeExpireAt = toDate(refreshed.afterSalesExpireAt);
  await CustomerRenewalRecord.create({
    customerId: customer._id,
    customerCode: customer.customerCode,
    customerNickname: customer.customerNickname,
    renewalDate: toDate(data.renewalDate) || new Date(),
    planId: plan._id.toString(),
    planName: plan.name,
    planDays: plan.days,
    beforeExpireAt,
    afterExpireAt: beforeExpireAt ? addDays(beforeExpireAt, plan.days) : null,
    remark: String(data.remark || "")
  });

  await recalculateCustomerExpire(customer._id);
  return listCustomerRenewals(customer._id);
}

async function deleteCustomerRenewal(id, renewalId) {
  const deleted = await CustomerRenewalRecord.findOneAndDelete({ _id: renewalId, customerId: id });
  if (!deleted) {
    notFound("Customer renewal record not found");
  }
  await recalculateCustomerExpire(id);
  return listCustomerRenewals(id);
}

async function listAssignments() {
  const assignments = await CustomerAssignment.find().sort({ active: -1, assignedAt: -1, createdAt: -1 });
  const [customers, adobeAccounts] = await Promise.all([
    Customer.find({ _id: { $in: assignments.map((item) => item.customerId) } }).select("_id"),
    AdobeAccount.find({ _id: { $in: assignments.map((item) => item.adobeAccountId) } }).select("_id")
  ]);
  const customerIds = new Set(customers.map((item) => item._id.toString()));
  const adobeAccountIds = new Set(adobeAccounts.map((item) => item._id.toString()));

  return assignments.map((assignment) => {
    const data = publicDoc(assignment);
    data.customerExists = customerIds.has(String(assignment.customerId));
    data.adobeAccountExists = adobeAccountIds.has(String(assignment.adobeAccountId));
    data.canRestore = data.customerExists && data.adobeAccountExists;
    return data;
  });
}

async function createAssignment(data) {
  const assignmentRole = normalizeAssignmentRole(data.assignmentRole);
  const customer = await Customer.findById(data.customerId);
  if (!customer) {
    notFound("Customer not found");
  }

  const adobeAccount = await AdobeAccount.findById(data.adobeAccountId);
  if (!adobeAccount) {
    notFound("Adobe account not found");
  }

  if (assignmentRole === "primary") {
    await assertPrimaryAssignmentAvailable(customer._id);
  }

  const exists = await CustomerAssignment.findOne({
    customerId: customer._id,
    adobeAccountId: adobeAccount._id
  }).sort({ active: -1, updatedAt: -1, createdAt: -1 });
  if (exists) {
    if (exists.active) {
      badRequest("该客户与 Adobe账户已有绑定关系");
    }

    exists.customerCode = customer.customerCode;
    exists.customerNickname = customer.customerNickname;
    exists.adobeCode = adobeAccount.adobeCode;
    exists.accountEmail = adobeAccount.accountEmail;
    exists.assignedAt = toDate(data.assignedAt) || exists.assignedAt || new Date();
    exists.assignmentRole = assignmentRole;
    exists.active = true;
    if (typeof data.remark === "string") {
      exists.remark = data.remark;
    }
    await exists.save();
    return publicDoc(exists);
  }

  const assignment = await CustomerAssignment.create({
    customerId: customer._id,
    customerCode: customer.customerCode,
    customerNickname: customer.customerNickname,
    adobeAccountId: adobeAccount._id,
    adobeCode: adobeAccount.adobeCode,
    accountEmail: adobeAccount.accountEmail,
    assignedAt: toDate(data.assignedAt) || new Date(),
    assignmentRole,
    active: data.active !== false,
    remark: String(data.remark || "")
  });

  return publicDoc(assignment);
}

async function updateAssignment(id, data) {
  const assignment = await CustomerAssignment.findById(id);
  if (!assignment) {
    notFound("Assignment not found");
  }

  const nextRole = Object.prototype.hasOwnProperty.call(data, "assignmentRole")
    ? normalizeAssignmentRole(data.assignmentRole)
    : assignment.assignmentRole || "backup";

  if (typeof data.active === "boolean") {
    if (data.active) {
      const [customer, adobeAccount] = await Promise.all([
        Customer.findById(assignment.customerId),
        AdobeAccount.findById(assignment.adobeAccountId)
      ]);
      if (!customer || !adobeAccount) {
        assignment.active = false;
        await assignment.save();
        badRequest("客户或 Adobe账户已删除，不能恢复绑定");
      }

      const exists = await CustomerAssignment.findOne({
        _id: { $ne: assignment._id },
        customerId: assignment.customerId,
        adobeAccountId: assignment.adobeAccountId,
        active: true
      });
      if (exists) {
        badRequest("Active assignment already exists");
      }
      if (nextRole === "primary") {
        await assertPrimaryAssignmentAvailable(assignment.customerId, assignment._id);
      }

      assignment.customerCode = customer.customerCode;
      assignment.customerNickname = customer.customerNickname;
      assignment.adobeCode = adobeAccount.adobeCode;
      assignment.accountEmail = adobeAccount.accountEmail;
    }
    assignment.active = data.active;
  }
  if (Object.prototype.hasOwnProperty.call(data, "assignmentRole")) {
    if (nextRole === "primary" && assignment.active) {
      await assertPrimaryAssignmentAvailable(assignment.customerId, assignment._id);
    }
    assignment.assignmentRole = nextRole;
  } else if (!assignment.assignmentRole) {
    assignment.assignmentRole = "backup";
  }
  if (Object.prototype.hasOwnProperty.call(data, "assignedAt")) {
    assignment.assignedAt = toDate(data.assignedAt) || assignment.assignedAt;
  }
  if (typeof data.remark === "string") {
    assignment.remark = data.remark;
  }

  await assignment.save();
  return publicDoc(assignment);
}

async function cancelAssignment(id) {
  return updateAssignment(id, { active: false });
}

async function deleteAssignment(id) {
  const assignment = await CustomerAssignment.findByIdAndDelete(id);
  if (!assignment) {
    notFound("Assignment not found");
  }
  return publicDoc(assignment);
}

async function getAdobeDetail(id) {
  await recalculateAdobeExpire(id);
  const account = await AdobeAccount.findById(id);
  if (!account) {
    notFound("Adobe account not found");
  }

  const assignments = await CustomerAssignment.find({ adobeAccountId: account._id, active: true });
  const customerIds = assignments.map((item) => item.customerId);
  await Promise.all(customerIds.map((customerId) => recalculateCustomerExpire(customerId)));
  const customers = await Customer.find({ _id: { $in: customerIds } });
  const renewalRecords = await AdobeRenewalRecord.find({ adobeAccountId: account._id }).sort({ renewalDate: -1, createdAt: -1 });

  return {
    adobeAccount: decorateAdobeAccount(account),
    remainingDays: getRemainingDays(account.accountExpireAt),
    remainingText: getRemainingText(account.accountExpireAt),
    customers: customers.map(decorateCustomer),
    renewalRecords: await withAdobeInitialRenewal(account, renewalRecords)
  };
}

async function getCustomerDetail(id) {
  await recalculateCustomerExpire(id);
  const customer = await Customer.findById(id);
  if (!customer) {
    notFound("Customer not found");
  }

  const assignments = await CustomerAssignment.find({ customerId: customer._id, active: true })
    .sort({ assignmentRole: -1, assignedAt: 1, createdAt: 1 });
  const adobeAccountIds = assignments.map((item) => item.adobeAccountId);
  await Promise.all(adobeAccountIds.map((accountId) => recalculateAdobeExpire(accountId)));
  const adobeAccounts = await AdobeAccount.find({ _id: { $in: adobeAccountIds } });
  const renewalRecords = await CustomerRenewalRecord.find({ customerId: customer._id }).sort({ renewalDate: -1, createdAt: -1 });
  const accountMap = new Map(adobeAccounts.map((account) => [String(account._id), account]));

  return {
    customer: decorateCustomer(customer),
    remainingDays: getRemainingDays(customer.afterSalesExpireAt),
    remainingText: getRemainingText(customer.afterSalesExpireAt),
    adobeAccounts: assignments
      .map((assignment) => {
        const account = accountMap.get(String(assignment.adobeAccountId));
        if (!account) {
          return null;
        }
        return {
          ...decorateAdobeAccount(account),
          assignmentId: assignment._id.toString(),
          assignmentRole: assignment.assignmentRole || "backup",
          assignmentRoleLabel: assignmentRoleLabel(assignment.assignmentRole),
          assignedAt: assignment.assignedAt
        };
      })
      .filter(Boolean),
    renewalRecords: await withCustomerInitialRenewal(customer, renewalRecords)
  };
}

module.exports = {
  publicAdobeSession,
  createAdobeAccount,
  updateAdobeAccount,
  listAdobeAccounts,
  getAdobeAccount,
  deleteAdobeAccount,
  getAdobeDetail,
  listAdobeRenewals,
  createAdobeRenewal,
  deleteAdobeRenewal,
  createCustomer,
  updateCustomer,
  listCustomers,
  getCustomer,
  deleteCustomer,
  getCustomerDetail,
  syncPlanParameterChange,
  listCustomerRenewals,
  createCustomerRenewal,
  deleteCustomerRenewal,
  listAssignments,
  createAssignment,
  updateAssignment,
  cancelAssignment,
  deleteAssignment,
  decorateAdobeAccount,
  decorateCustomer
};
