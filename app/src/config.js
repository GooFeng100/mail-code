require("dotenv").config();

function parseMailDomains() {
  const raw = process.env.MAIL_DOMAINS || process.env.MAIL_DOMAIN || "889100.xyz";
  const domains = raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set(domains));
}

const mailDomains = parseMailDomains();

const config = {
  port: Number(process.env.PORT || 3000),
  mongoUrl: process.env.MONGO_URL || "mongodb://127.0.0.1:27017/mailcode",
  redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  jwtSecret: process.env.JWT_SECRET || "change_this_to_a_long_random_string",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "10m",
  adminJwtExpiresIn: process.env.ADMIN_JWT_EXPIRES_IN || "1h",
  adobeJwtExpiresIn: process.env.ADOBE_JWT_EXPIRES_IN || process.env.JWT_EXPIRES_IN || "10m",
  codeTtlSeconds: Number(process.env.CODE_TTL_SECONDS || 600),
  defaultAdminUsername: process.env.DEFAULT_ADMIN_USERNAME || "admin",
  defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD || "admin123456",
  mailDomains,
  mailDomain: mailDomains[0],
  verificationCodeUrl: process.env.VERIFICATION_CODE_URL || "mail.889100.com",
  mail: {
    host: process.env.MAIL_HOST || "",
    port: Number(process.env.MAIL_PORT || 993),
    secure: String(process.env.MAIL_SECURE || "true") === "true",
    user: process.env.MAIL_USER || "",
    pass: process.env.MAIL_PASS || ""
  },
  mailListenerEnabled: process.env.MAIL_LISTENER_ENABLED !== "false",
  mailScanWindowMinutes: Number(process.env.MAIL_SCAN_WINDOW_MINUTES || 5),
  mailScanIntervalSeconds: Number(process.env.MAIL_SCAN_INTERVAL_SECONDS || 30)
};

module.exports = config;
