require("dotenv").config();
const path = require("path");

function parseList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeDomain(value) {
  return String(value || "").trim().toLowerCase();
}

function parsePositiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
}

function parseMailDomainConfig() {
  if (process.env.MAIL_DOMAIN_CONFIG) {
    try {
      const parsed = JSON.parse(process.env.MAIL_DOMAIN_CONFIG);
      if (Array.isArray(parsed)) {
        const configs = parsed
          .map((item) => ({
            domain: normalizeDomain(item && item.domain),
            verificationCodeUrl: String(item && item.verificationCodeUrl || "").trim()
          }))
          .filter((item) => item.domain);

        if (configs.length) {
          return configs;
        }
      }
    } catch (error) {
      console.warn("MAIL_DOMAIN_CONFIG must be a JSON array. Falling back to MAIL_DOMAINS.");
    }
  }

  const domains = parseList(process.env.MAIL_DOMAINS || process.env.MAIL_DOMAIN || "889100.xyz")
    .map(normalizeDomain)
    .filter(Boolean);
  const urls = parseList(process.env.VERIFICATION_CODE_URLS || process.env.VERIFICATION_CODE_URL);

  return domains.map((domain, index) => ({
    domain,
    verificationCodeUrl: urls[index] || (domains.length === 1 ? urls[0] || "" : "")
  }));
}

const mailDomainConfigs = Array.from(
  new Map(parseMailDomainConfig().map((item) => [item.domain, item])).values()
);
const mailDomains = mailDomainConfigs.map((item) => item.domain);
const verificationCodeUrls = Object.fromEntries(
  mailDomainConfigs.map((item) => [item.domain, item.verificationCodeUrl || ""])
);

const config = {
  port: Number(process.env.PORT || 3000),
  mongoUrl: process.env.MONGO_URL || "mongodb://127.0.0.1:27017/mailcode",
  redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  jwtSecret: process.env.JWT_SECRET || "change_this_to_a_long_random_string",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "10m",
  adminJwtExpiresIn: process.env.ADMIN_JWT_EXPIRES_IN || "1h",
  adobeJwtExpiresIn: process.env.ADOBE_JWT_EXPIRES_IN || process.env.JWT_EXPIRES_IN || "10m",
  codeTtlSeconds: Number(process.env.CODE_TTL_SECONDS || 300),
  defaultAdminUsername: process.env.DEFAULT_ADMIN_USERNAME || "admin",
  defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD || "admin123456",
  mailDomainConfigs,
  mailDomains,
  mailDomain: mailDomains[0],
  verificationCodeUrls,
  verificationCodeUrl: (mailDomainConfigs[0] && mailDomainConfigs[0].verificationCodeUrl) || "",
  mail: {
    host: process.env.MAIL_HOST || "",
    port: Number(process.env.MAIL_PORT || 993),
    secure: String(process.env.MAIL_SECURE || "true") === "true",
    user: process.env.MAIL_USER || "",
    pass: process.env.MAIL_PASS || "",
    proxyEnabled: parseBoolean(process.env.MAIL_PROXY_ENABLED, false),
    proxyUrl: String(process.env.MAIL_PROXY_URL || "").trim()
  },
  mailListenerEnabled: process.env.MAIL_LISTENER_ENABLED !== "false",
  mailScanWindowMinutes: Number(process.env.MAIL_SCAN_WINDOW_MINUTES || 5),
  mailScanIntervalSeconds: Number(process.env.MAIL_SCAN_INTERVAL_SECONDS || 30),
  mailExistsDebounceSeconds: clamp(Number(process.env.MAIL_EXISTS_DEBOUNCE_SECONDS || 2), 1, 10),
  softwareFileRoot: path.resolve(process.env.SOFTWARE_FILE_ROOT || path.join(process.cwd(), "software-files")),
  softwareMaxUploadMb: parsePositiveInt(process.env.SOFTWARE_MAX_UPLOAD_MB, 500),
  softwareImportMaxMb: parsePositiveInt(process.env.SOFTWARE_IMPORT_MAX_MB, 1024),
  softwareImportTimeoutSeconds: parsePositiveInt(process.env.SOFTWARE_IMPORT_TIMEOUT_SECONDS, 300),
  softwareAllowedExtensions: parseList(
    process.env.SOFTWARE_ALLOWED_EXTENSIONS || "exe,msi,zip,7z,rar,apk,dmg,pkg,iso,pdf"
  ).map((item) => item.toLowerCase())
};

module.exports = config;
