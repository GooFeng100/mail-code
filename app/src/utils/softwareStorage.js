const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const config = require("../config");

function normalizeExtension(extension) {
  return String(extension || "").trim().toLowerCase().replace(/^\./, "");
}

function getFileExtension(filename) {
  const ext = path.extname(String(filename || "")).toLowerCase();
  return normalizeExtension(ext);
}

function assertAllowedExtension(filename) {
  const extension = getFileExtension(filename);
  if (!extension || !config.softwareAllowedExtensions.includes(extension)) {
    const error = new Error("unsupported file extension");
    error.status = 400;
    throw error;
  }
}

function assertFileSizeLimit(sizeInBytes, maxSizeMb) {
  const maxBytes = Number(maxSizeMb) * 1024 * 1024;
  if (!Number.isFinite(sizeInBytes) || sizeInBytes <= 0 || sizeInBytes > maxBytes) {
    const error = new Error(`file size exceeds ${maxSizeMb}MB limit`);
    error.status = 400;
    throw error;
  }
}

function buildSafeStoredFilename(prefix, originalName) {
  const extension = getFileExtension(originalName);
  const safePrefix = String(prefix || "file").replace(/[^a-z0-9_-]/gi, "").toLowerCase() || "file";
  const random = crypto.randomBytes(8).toString("hex");
  return extension ? `${safePrefix}-${random}.${extension}` : `${safePrefix}-${random}`;
}

function resolveSoftwarePath(fileName) {
  const normalizedName = path.basename(String(fileName || "").trim());
  if (!normalizedName) {
    const error = new Error("invalid file path");
    error.status = 400;
    throw error;
  }

  const absoluteRoot = path.resolve(config.softwareFileRoot);
  const absolutePath = path.resolve(absoluteRoot, normalizedName);
  if (absolutePath !== path.join(absoluteRoot, normalizedName)) {
    const error = new Error("invalid file path");
    error.status = 400;
    throw error;
  }

  return {
    fileName: normalizedName,
    absoluteRoot,
    absolutePath
  };
}

async function ensureSoftwareDirectories() {
  const tmpDir = path.join(config.softwareFileRoot, "tmp");
  await fs.mkdir(config.softwareFileRoot, { recursive: true });
  await fs.mkdir(tmpDir, { recursive: true });
  return { rootDir: config.softwareFileRoot, tmpDir };
}

module.exports = {
  assertAllowedExtension,
  assertFileSizeLimit,
  buildSafeStoredFilename,
  resolveSoftwarePath,
  ensureSoftwareDirectories
};
