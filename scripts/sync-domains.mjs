import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const domainsFile = path.join(rootDir, "deploy", "domains.env");

function parseEnvFile(text) {
  const map = new Map();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    map.set(key, value);
  }
  return map;
}

function ensureRequired(map, key) {
  const value = String(map.get(key) || "").trim();
  if (!value) {
    throw new Error(`Missing required key in deploy/domains.env: ${key}`);
  }
  return value;
}

function writeText(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function buildUniAppEnv(mobileDomain, webDomain) {
  const origin = `https://${mobileDomain}`;
  return [
    `VITE_API_BASE_URL=${origin}`,
    `VITE_MOBILE_ORIGIN=${origin}`,
    `VITE_WEB_ORIGIN=https://${webDomain}`,
    `VITE_APP_UPDATE_MANIFEST_URL=${origin}/app-updates/version.json`,
    "",
  ].join("\n");
}

function buildWebAdminEnv(webDomain) {
  return [
    `VITE_WEB_ORIGIN=https://${webDomain}`,
    "",
  ].join("\n");
}

function buildAppEnvExample(currentText, mailDomain, webDomain, fallbackDomain) {
  const domains = Array.from(new Set([mailDomain, fallbackDomain].map((item) => String(item || "").trim()).filter(Boolean)));
  const configs = domains.map((domain) => ({ domain, verificationCodeUrl: webDomain }));
  const nextConfig = `MAIL_DOMAIN_CONFIG=${JSON.stringify(configs)}`;
  if (!currentText.includes("MAIL_DOMAIN_CONFIG=")) {
    return `${currentText.trimEnd()}\n${nextConfig}\n`;
  }
  return currentText.replace(/^MAIL_DOMAIN_CONFIG=.*$/m, nextConfig);
}

function main() {
  if (!fs.existsSync(domainsFile)) {
    throw new Error(
      "Missing deploy/domains.env. Copy deploy/domains.env.example to deploy/domains.env first."
    );
  }

  const envMap = parseEnvFile(fs.readFileSync(domainsFile, "utf8"));
  const webDomain = ensureRequired(envMap, "WEB_DOMAIN");
  const mobileDomain = ensureRequired(envMap, "MOBILE_DOMAIN");
  const mailDomain = ensureRequired(envMap, "MAIL_DOMAIN");
  const fallbackDomain = String(envMap.get("MAIL_FALLBACK_DOMAIN") || "889400.xyz").trim();

  const uniEnvPath = path.join(rootDir, "uniapp", ".env.production");
  const webAdminEnvPath = path.join(rootDir, "web-admin", ".env.production");
  const appEnvExamplePath = path.join(rootDir, "app", ".env.example");

  writeText(uniEnvPath, buildUniAppEnv(mobileDomain, webDomain));
  writeText(webAdminEnvPath, buildWebAdminEnv(webDomain));

  const appEnvExampleText = fs.readFileSync(appEnvExamplePath, "utf8");
  const webOrigin = `https://${webDomain}`;
  writeText(
    appEnvExamplePath,
    buildAppEnvExample(appEnvExampleText, mailDomain, webOrigin, fallbackDomain)
  );

  console.log("Domain sync done.");
  console.log(`- uniapp/.env.production <= ${mobileDomain}`);
  console.log(`- web-admin/.env.production <= ${webDomain}`);
  console.log(`- app/.env.example MAIL_DOMAIN_CONFIG <= ${mailDomain}, ${webDomain}`);
}

main();
