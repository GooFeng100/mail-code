const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const SoftwareCategory = require("../models/SoftwareCategory");
const { Software } = require("../models/Software");
const config = require("../config");
const { assertSafeHttpUrl } = require("../utils/softwareSecurity");
const {
  assertAllowedExtension,
  assertFileSizeLimit,
  buildSafeStoredFilename,
  resolveSoftwarePath,
} = require("../utils/softwareStorage");
const { addVersionGuard, assertOptimisticMatch } = require("../utils/concurrency");
const {
  SOFTWARE_CATEGORIES,
  categoryFromKey,
  normalizeCategoryKey,
  resolveCategoryKeyByLegacyName,
} = require("../constants/softwareCategories");

const SOURCE_TYPE_LABEL = {
  local_upload: "本地上传",
  remote_import: "链接下载到服务器",
  external_link: "外链跳转下载",
};

const VALIDITY_LABEL = {
  local_file_ok: "本地文件正常",
  local_file_missing: "本地文件缺失",
  external_available: "外链正常",
  external_unavailable: "外链失效",
  unchecked: "未检测",
  checking: "检测中",
};

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}

const ICON_CONTENT_TYPE_EXTENSION = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
  "image/svg+xml": "svg",
};

function notFound(message) {
  const error = new Error(message);
  error.status = 404;
  throw error;
}

async function buildLegacyCategoryMap() {
  const categories = await SoftwareCategory.find().select("_id name");
  return new Map(categories.map((item) => [String(item._id), resolveCategoryKeyByLegacyName(item.name)]));
}

async function resolveCategoryKeyInput(payload = {}, legacyCategoryMap = null) {
  const fromKey = normalizeCategoryKey(payload.categoryKey);
  if (fromKey) return fromKey;

  const legacyCategoryId = String(payload.categoryId || "").trim();
  if (legacyCategoryId) {
    const map = legacyCategoryMap || (await buildLegacyCategoryMap());
    return map.get(legacyCategoryId) || "other";
  }
  badRequest("categoryKey is required");
}

function deriveCategoryMeta(categoryKey) {
  const category = categoryFromKey(categoryKey);
  return {
    categoryKey: category.key,
    categoryName: category.name,
    categoryColor: category.color,
    categoryIcon: category.icon,
    categorySort: category.sort,
  };
}

function normalizeCommonPayload(payload = {}) {
  const name = String(payload.name || "").trim();
  if (!name) badRequest("name is required");

  const sort = payload.sort === undefined ? 100 : Number(payload.sort);
  if (!Number.isFinite(sort) || !Number.isInteger(sort) || sort < 0) {
    badRequest("sort must be a non-negative integer");
  }
  const isPublishedRaw = payload.isPublished;
  const isPublished = isPublishedRaw === true || String(isPublishedRaw).toLowerCase() === "true";
  const appVersion = String(payload.appVersion ?? payload.version ?? "").trim();

  return {
    name,
    description: String(payload.description || "").trim(),
    appVersion,
    platform: String(payload.platform || "").trim(),
    sort,
    isPublished,
  };
}

function normalizeOptionalText(value, max = 500) {
  if (value === undefined || value === null) return "";
  const text = String(value).trim();
  if (text.length > max) badRequest(`text length must be ${max} characters or fewer`);
  return text;
}

function getIconAssetUrl(fileName) {
  const safeName = String(fileName || "").trim();
  if (/^https?:\/\//i.test(safeName)) return safeName;
  return safeName ? `/api/softwares/assets/${encodeURIComponent(safeName)}` : "";
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function inferPlatformFromName(fileName = "") {
  const lower = String(fileName || "").toLowerCase();
  if (lower.endsWith(".exe") || lower.endsWith(".msi")) return "Windows";
  if (lower.endsWith(".dmg") || lower.endsWith(".pkg")) return "Mac";
  if (lower.endsWith(".apk")) return "Android";
  return "Other";
}

function inferVersionFromName(fileName = "") {
  const match = String(fileName || "").match(/(\d+\.\d+(?:\.\d+){0,2})/);
  return match ? match[1] : "";
}

function cleanSoftwareName(fileName = "") {
  const base = String(fileName || "").replace(/\.[a-z0-9]+$/i, "");
  const noTailHash = base.replace(/[_-][a-f0-9]{6,}$/i, "");
  return noTailHash.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

async function safeRemoveFileByName(fileName) {
  if (!fileName) return;
  if (/^https?:\/\//i.test(String(fileName || "").trim())) return;
  try {
    const resolved = resolveSoftwarePath(fileName);
    await fs.rm(resolved.absolutePath, { force: true });
  } catch {}
}

async function localFileExists(fileName) {
  if (!fileName) return false;
  try {
    const resolved = resolveSoftwarePath(fileName);
    const stat = await fs.stat(resolved.absolutePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

function resolveIconFileNameFromResponse(finalUrl, response) {
  const contentDisposition = String(response.headers.get("content-disposition") || "");
  const dispositionNameMatch = contentDisposition.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i);
  const fromDisposition = dispositionNameMatch ? decodeURIComponent(dispositionNameMatch[1].replace(/"/g, "").trim()) : "";
  const fromPath = decodeURIComponent(path.basename(new URL(finalUrl).pathname || ""));
  const mimeType = String(response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const base = (fromDisposition || fromPath || "icon").trim();
  const extension = path.extname(base).replace(/^\./, "").toLowerCase() || ICON_CONTENT_TYPE_EXTENSION[mimeType] || "png";
  return `${path.basename(base, path.extname(base)) || "icon"}.${extension}`;
}

async function storeIconBuffer(buffer, originalName) {
  const iconName = buildSafeStoredFilename("icon", originalName);
  const iconResolved = resolveSoftwarePath(iconName);
  await fs.writeFile(iconResolved.absolutePath, buffer);
  return iconResolved.fileName;
}

async function resolveIconPath({ iconFile = null, iconUrl = "" } = {}) {
  if (iconFile && iconFile.buffer && iconFile.originalname) {
    return storeIconBuffer(iconFile.buffer, iconFile.originalname);
  }
  const remoteUrl = String(iconUrl || "").trim();
  if (!remoteUrl) return "";

  return assertSafeHttpUrl(remoteUrl);
}

function normalizePageQuery(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const requestedPageSize = Number.parseInt(query.pageSize, 10) || 15;
  const pageSize = [10, 15, 20, 50].includes(requestedPageSize) ? requestedPageSize : 15;
  return {
    page,
    pageSize,
    keyword: String(query.keyword || "").trim().toLowerCase(),
    sourceType: String(query.sourceType || "").trim(),
    validityStatus: String(query.validityStatus || "").trim(),
    isPublished: String(query.isPublished || "").trim().toLowerCase(),
    categoryKey: normalizeCategoryKey(query.categoryKey || query.categoryId),
  };
}

function paginate(items, page, pageSize) {
  const total = items.length;
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total, page, pageSize };
}

async function resolveSoftwareCategoryKey(raw, legacyCategoryMap = null) {
  const fromKey = normalizeCategoryKey(raw.categoryKey);
  if (fromKey) return fromKey;
  const legacyId = String(raw.categoryId || "");
  if (!legacyId) return "other";
  const map = legacyCategoryMap || (await buildLegacyCategoryMap());
  return map.get(legacyId) || "other";
}

async function decorateSoftware(softwareDoc, legacyCategoryMap = null) {
  const raw = softwareDoc.toObject({ transform: false, versionKey: true });
  const item = softwareDoc.toJSON();
  const localFile = item.sourceType === "local_upload" || item.sourceType === "remote_import";
  const fileExists = localFile ? await localFileExists(item.filePath) : false;
  const legacyVersion = typeof raw.version === "string" ? raw.version.trim() : "";
  const appVersion = String(item.appVersion || legacyVersion || "").trim();
  const categoryKey = await resolveSoftwareCategoryKey(raw, legacyCategoryMap);
  const category = deriveCategoryMeta(categoryKey);

  return {
    ...item,
    iconPath: getIconAssetUrl(item.iconPath),
    appVersion,
    categoryKey: category.categoryKey,
    categoryName: category.categoryName,
    categoryColor: category.categoryColor,
    categoryIcon: category.categoryIcon,
    categorySort: category.categorySort,
    sourceTypeLabel: SOURCE_TYPE_LABEL[item.sourceType] || item.sourceType,
    validityStatusLabel: VALIDITY_LABEL[item.validityStatus] || item.validityStatus,
    fileExists,
    linkStatus: item.sourceType === "external_link" ? item.validityStatus : "",
  };
}

async function createSoftwareFromLocalUpload({ body = {}, file = null, iconFile = null }) {
  const categoryKey = await resolveCategoryKeyInput(body);
  const common = normalizeCommonPayload(body);
  if (!file) badRequest("software file is required");

  assertAllowedExtension(file.originalname);
  assertFileSizeLimit(file.size, config.softwareMaxUploadMb);

  const storedFileName = buildSafeStoredFilename("local", file.originalname);
  const { absolutePath, fileName } = resolveSoftwarePath(storedFileName);
  await fs.writeFile(absolutePath, file.buffer);

  const iconPath = await resolveIconPath({ iconFile, iconUrl: body.iconUrl });

  const software = await Software.create({
    ...common,
    categoryKey,
    iconPath,
    sourceType: "local_upload",
    sourceUrl: "",
    externalUrl: "",
    originalName: String(file.originalname || "").trim(),
    fileName,
    filePath: fileName,
    fileSize: Number(file.size || 0),
    mimeType: String(file.mimetype || "").trim(),
    fileHash: sha256(file.buffer),
    validityStatus: "local_file_ok",
    validityCheckedAt: new Date(),
    lastError: "",
  });
  return decorateSoftware(software);
}

async function fetchWithSafeRedirects(rawUrl, { maxRedirects = 3, signal } = {}) {
  let currentUrl = assertSafeHttpUrl(rawUrl);
  for (let i = 0; i <= maxRedirects; i += 1) {
    const response = await fetch(currentUrl, { redirect: "manual", signal });
    if (response.status >= 300 && response.status < 400) {
      const nextLocation = response.headers.get("location");
      if (!nextLocation) badRequest("remote source redirect has no location");
      currentUrl = assertSafeHttpUrl(new URL(nextLocation, currentUrl).toString());
      continue;
    }
    return { response, finalUrl: currentUrl };
  }
  badRequest("too many redirects");
}

async function resolveRemoteSoftwareMeta({ sourceUrl = "" } = {}) {
  const url = assertSafeHttpUrl(sourceUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.min(config.softwareImportTimeoutSeconds, 30) * 1000);
  try {
    const { response, finalUrl } = await fetchWithSafeRedirects(url, { signal: controller.signal });
    if (!response.ok) badRequest(`remote source returned status ${response.status}`);

    const contentDisposition = String(response.headers.get("content-disposition") || "");
    const dispositionNameMatch = contentDisposition.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i);
    const fromDisposition = dispositionNameMatch ? decodeURIComponent(dispositionNameMatch[1].replace(/"/g, "").trim()) : "";
    const fromPath = decodeURIComponent(path.basename(new URL(finalUrl).pathname || ""));
    const originalName = (fromDisposition || fromPath || "download.bin").trim();
    assertAllowedExtension(originalName);
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > 0) assertFileSizeLimit(contentLength, config.softwareImportMaxMb);

    const suggestedName = cleanSoftwareName(originalName);
    const suggestedPlatform = inferPlatformFromName(originalName);
    const suggestedVersion = inferVersionFromName(originalName);
    const confidence = {
      name: suggestedName ? "medium" : "low",
      platform: suggestedPlatform === "Other" ? "low" : "high",
      version: suggestedVersion ? "medium" : "low",
      size: contentLength > 0 ? "high" : "low",
    };
    return {
      sourceUrl: url,
      finalUrl,
      originalName,
      suggestedName,
      suggestedPlatform,
      suggestedVersion,
      suggestedFileSize: contentLength > 0 ? contentLength : null,
      confidence,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function createSoftwareFromRemoteImport({ body = {}, iconFile = null, onStatus = null }) {
  const setStatus = (status, message = "") => {
    if (typeof onStatus === "function") onStatus(status, message);
  };
  const categoryKey = await resolveCategoryKeyInput(body);
  const common = normalizeCommonPayload(body);
  const sourceUrl = assertSafeHttpUrl(body.sourceUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.softwareImportTimeoutSeconds * 1000);

  let tmpAbsolutePath = "";
  try {
    setStatus("downloading");
    const { response, finalUrl } = await fetchWithSafeRedirects(sourceUrl, { signal: controller.signal });
    if (!response.ok) badRequest(`remote source returned status ${response.status}`);

    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > 0) assertFileSizeLimit(contentLength, config.softwareImportMaxMb);

    const inferredName = decodeURIComponent(path.basename(new URL(finalUrl).pathname || "")) || "download.bin";
    assertAllowedExtension(inferredName);

    const arr = await response.arrayBuffer();
    const buffer = Buffer.from(arr);
    assertFileSizeLimit(buffer.length, config.softwareImportMaxMb);

    setStatus("processing");
    const tmpName = buildSafeStoredFilename("tmp", inferredName);
    tmpAbsolutePath = path.join(config.softwareFileRoot, "tmp", tmpName);
    await fs.writeFile(tmpAbsolutePath, buffer);

    const finalName = buildSafeStoredFilename("import", inferredName);
    const finalResolved = resolveSoftwarePath(finalName);
    await fs.rename(tmpAbsolutePath, finalResolved.absolutePath);
    tmpAbsolutePath = "";

    const iconPath = await resolveIconPath({ iconFile, iconUrl: body.iconUrl });

    const software = await Software.create({
      ...common,
      categoryKey,
      iconPath,
      sourceType: "remote_import",
      sourceUrl,
      externalUrl: "",
      originalName: inferredName,
      fileName: finalResolved.fileName,
      filePath: finalResolved.fileName,
      fileSize: buffer.length,
      mimeType: String(response.headers.get("content-type") || "").trim(),
      fileHash: sha256(buffer),
      validityStatus: "local_file_ok",
      validityCheckedAt: new Date(),
      lastError: "",
    });
    return decorateSoftware(software);
  } finally {
    clearTimeout(timeout);
    if (tmpAbsolutePath) await fs.rm(tmpAbsolutePath, { force: true }).catch(() => {});
  }
}

async function createSoftwareFromExternalLink({ body = {}, iconFile = null }) {
  const categoryKey = await resolveCategoryKeyInput(body);
  const common = normalizeCommonPayload(body);
  const externalUrl = assertSafeHttpUrl(body.externalUrl);
  const sourceUrl = body.sourceUrl ? assertSafeHttpUrl(body.sourceUrl) : "";

  const iconPath = await resolveIconPath({ iconFile, iconUrl: body.iconUrl });

  const software = await Software.create({
    ...common,
    categoryKey,
    iconPath,
    sourceType: "external_link",
    sourceUrl,
    externalUrl,
    originalName: "",
    fileName: "",
    filePath: "",
    fileSize: 0,
    mimeType: "",
    fileHash: "",
    validityStatus: "unchecked",
    validityCheckedAt: null,
    lastError: "",
  });
  return decorateSoftware(software);
}

async function listSoftwares(query = {}) {
  const options = normalizePageQuery(query);
  const docs = await Software.find().sort({ sort: 1, updatedAt: -1, createdAt: -1 });
  const legacyCategoryMap = await buildLegacyCategoryMap();
  const all = await Promise.all(docs.map((doc) => decorateSoftware(doc, legacyCategoryMap)));

  const filtered = all.filter((item) => {
    if (options.sourceType && item.sourceType !== options.sourceType) return false;
    if (options.validityStatus && item.validityStatus !== options.validityStatus) return false;
    if (options.categoryKey && item.categoryKey !== options.categoryKey) return false;
    if (options.isPublished === "true" && item.isPublished !== true) return false;
    if (options.isPublished === "false" && item.isPublished !== false) return false;
    if (options.keyword) {
      const fields = [item.name, item.description, item.appVersion, item.platform, item.originalName];
      if (!fields.some((v) => String(v || "").toLowerCase().includes(options.keyword))) return false;
    }
    return true;
  });

  return paginate(filtered, options.page, options.pageSize);
}

async function getSoftware(id) {
  const software = await Software.findById(id);
  if (!software) notFound("software not found");
  return decorateSoftware(software, await buildLegacyCategoryMap());
}

async function updateSoftware(id, payload = {}) {
  const existing = await Software.findById(id);
  if (!existing) notFound("software not found");

  const update = {};
  if (payload.name !== undefined) update.name = normalizeOptionalText(payload.name, 100);
  if (payload.description !== undefined) update.description = normalizeOptionalText(payload.description, 2000);
  if (payload.appVersion !== undefined || payload.version !== undefined) {
    update.appVersion = normalizeOptionalText(payload.appVersion ?? payload.version, 100);
  }
  if (payload.platform !== undefined) update.platform = normalizeOptionalText(payload.platform, 100);
  if (payload.sort !== undefined) {
    const sort = Number(payload.sort);
    if (!Number.isInteger(sort) || sort < 0) badRequest("sort must be a non-negative integer");
    update.sort = sort;
  }
  if (payload.isPublished !== undefined) update.isPublished = Boolean(payload.isPublished);
  if (payload.categoryKey !== undefined || payload.categoryId !== undefined) {
    update.categoryKey = await resolveCategoryKeyInput(payload, await buildLegacyCategoryMap());
  }
  if (payload.iconUrl !== undefined && String(payload.iconUrl || "").trim()) {
    update.iconPath = await resolveIconPath({ iconUrl: payload.iconUrl });
  }
  if (existing.sourceType === "external_link") {
    if (payload.externalUrl !== undefined) update.externalUrl = assertSafeHttpUrl(payload.externalUrl);
    if (payload.sourceUrl !== undefined) update.sourceUrl = payload.sourceUrl ? assertSafeHttpUrl(payload.sourceUrl) : "";
  }

  if (Object.keys(update).length === 0) return getSoftware(id);

  const updated = await Software.findOneAndUpdate(
    addVersionGuard({ _id: id }, payload),
    { $set: update, $inc: { __v: 1 } },
    { new: true, runValidators: true }
  );
  if (!updated && payload.revision === undefined && payload.version === undefined) notFound("software not found");
  assertOptimisticMatch(updated);
  if (update.iconPath && existing.iconPath && existing.iconPath !== update.iconPath) {
    await safeRemoveFileByName(existing.iconPath);
  }
  return getSoftware(id);
}

async function deleteSoftware(id) {
  const existing = await Software.findById(id);
  if (!existing) notFound("software not found");
  await Software.findByIdAndDelete(id);
  if (existing.filePath) await safeRemoveFileByName(existing.filePath);
  if (existing.iconPath) await safeRemoveFileByName(existing.iconPath);
}

async function setSoftwarePublished(id, payload = {}) {
  if (typeof payload.isPublished !== "boolean") badRequest("isPublished must be boolean");
  const updated = await Software.findOneAndUpdate(
    addVersionGuard({ _id: id }, payload),
    { $set: { isPublished: payload.isPublished }, $inc: { __v: 1 } },
    { new: true, runValidators: true }
  );
  if (!updated && payload.revision === undefined && payload.version === undefined) notFound("software not found");
  assertOptimisticMatch(updated);
  return getSoftware(id);
}

async function setSoftwareCategory(id, payload = {}) {
  const categoryKey = await resolveCategoryKeyInput(payload, await buildLegacyCategoryMap());
  const updated = await Software.findOneAndUpdate(
    addVersionGuard({ _id: id }, payload),
    { $set: { categoryKey }, $inc: { __v: 1 } },
    { new: true, runValidators: true }
  );
  if (!updated && payload.revision === undefined && payload.version === undefined) notFound("software not found");
  assertOptimisticMatch(updated);
  return getSoftware(id);
}

async function setSoftwareSort(id, payload = {}) {
  const sort = Number(payload.sort);
  if (!Number.isInteger(sort) || sort < 0) badRequest("sort must be a non-negative integer");
  const updated = await Software.findOneAndUpdate(
    addVersionGuard({ _id: id }, payload),
    { $set: { sort }, $inc: { __v: 1 } },
    { new: true, runValidators: true }
  );
  if (!updated && payload.revision === undefined && payload.version === undefined) notFound("software not found");
  assertOptimisticMatch(updated);
  return getSoftware(id);
}

async function checkSoftwareValidity(id) {
  const software = await Software.findById(id);
  if (!software) notFound("software not found");

  if (software.sourceType === "external_link") {
    const currentUrl = assertSafeHttpUrl(software.externalUrl);
    try {
      const { response } = await fetchWithSafeRedirects(currentUrl, { maxRedirects: 3 });
      const ok = response.status >= 200 && response.status < 400;
      software.validityStatus = ok ? "external_available" : "external_unavailable";
      software.lastError = ok ? "" : `status ${response.status}`;
    } catch (error) {
      software.validityStatus = "external_unavailable";
      software.lastError = String(error.message || error);
    }
    software.validityCheckedAt = new Date();
    await software.save();
    return getSoftware(id);
  }

  const exists = await localFileExists(software.filePath);
  software.validityStatus = exists ? "local_file_ok" : "local_file_missing";
  software.lastError = exists ? "" : "local file missing";
  software.validityCheckedAt = new Date();
  await software.save();
  return getSoftware(id);
}

async function softwareDownloadTest(id) {
  const software = await Software.findById(id);
  if (!software) notFound("software not found");
  const checked = await checkSoftwareValidity(id);
  if (software.sourceType === "external_link") {
    return { id: checked.id, sourceType: checked.sourceType, status: checked.validityStatus, ok: checked.validityStatus === "external_available", redirectUrl: checked.externalUrl || "" };
  }
  return { id: checked.id, sourceType: checked.sourceType, status: checked.validityStatus, ok: checked.validityStatus === "local_file_ok", filePath: checked.filePath || "" };
}

function isSoftwarePubliclyValid(item) {
  if (item.sourceType === "external_link") return item.validityStatus === "external_available";
  return item.validityStatus === "local_file_ok";
}

async function listPublicSoftwares() {
  const docs = await Software.find({ isPublished: true }).sort({ sort: 1, updatedAt: -1, createdAt: -1 });
  const legacyCategoryMap = await buildLegacyCategoryMap();
  const items = await Promise.all(docs.map((doc) => decorateSoftware(doc, legacyCategoryMap)));

  const grouped = SOFTWARE_CATEGORIES.map((category) => ({
    categoryKey: category.key,
    categoryId: category.key,
    categoryName: category.name,
    color: category.color,
    icon: category.icon,
    sort: category.sort,
    softwares: [],
  }));
  const groupMap = new Map(grouped.map((item) => [item.categoryKey, item]));

  for (const item of items) {
    if (!isSoftwarePubliclyValid(item)) continue;
    if (item.sourceType !== "external_link") {
      const exists = await localFileExists(item.filePath);
      if (!exists) continue;
    }
    const group = groupMap.get(item.categoryKey || "other");
    if (!group) continue;
    group.softwares.push({
      id: item.id,
      name: item.name,
      description: item.description,
      appVersion: item.appVersion || "",
      version: item.appVersion || "",
      platform: item.platform,
      iconPath: item.iconPath,
      fileSize: item.fileSize,
      updatedAt: item.updatedAt,
      categoryKey: item.categoryKey,
      categoryName: item.categoryName,
      sourceType: item.sourceType,
      externalUrl: item.sourceType === "external_link" ? item.externalUrl || "" : "",
      downloadUrl: item.sourceType === "external_link"
        ? (item.externalUrl || "")
        : `/api/softwares/${item.id}/download`,
    });
  }
  return grouped.filter((item) => item.softwares.length > 0);
}

async function prepareSoftwareDownload(id) {
  const software = await Software.findById(id);
  if (!software) notFound("software not found");
  if (!software.isPublished) {
    const error = new Error("software is not published");
    error.status = 403;
    throw error;
  }

  const checked = await checkSoftwareValidity(id);
  if (checked.sourceType === "external_link") {
    if (checked.validityStatus !== "external_available") {
      const error = new Error("external link unavailable");
      error.status = 409;
      throw error;
    }
    return { mode: "external", redirectUrl: checked.externalUrl, softwareId: checked.id };
  }

  if (checked.validityStatus !== "local_file_ok") {
    const error = new Error("local file missing");
    error.status = 409;
    throw error;
  }
  const resolved = resolveSoftwarePath(checked.filePath);
  const downloadName = checked.originalName || checked.name || resolved.fileName;
  return { mode: "local", absolutePath: resolved.absolutePath, downloadName, softwareId: checked.id };
}

async function increaseSoftwareDownloadCount(id) {
  await Software.updateOne({ _id: id }, { $inc: { downloadCount: 1 } });
}

module.exports = {
  createSoftwareFromLocalUpload,
  createSoftwareFromRemoteImport,
  createSoftwareFromExternalLink,
  resolveRemoteSoftwareMeta,
  listSoftwares,
  getSoftware,
  updateSoftware,
  deleteSoftware,
  setSoftwarePublished,
  setSoftwareCategory,
  setSoftwareSort,
  checkSoftwareValidity,
  softwareDownloadTest,
  listPublicSoftwares,
  prepareSoftwareDownload,
  increaseSoftwareDownloadCount,
};
