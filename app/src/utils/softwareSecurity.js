const net = require("net");

const BLOCKED_PROTOCOLS = new Set(["file:", "ftp:", "javascript:", "data:", "gopher:", "ws:", "wss:"]);
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

function isPrivateIPv4(host) {
  const parts = host.split(".").map((item) => Number(item));
  if (parts.length !== 4 || parts.some((item) => Number.isNaN(item) || item < 0 || item > 255)) {
    return false;
  }
  if (parts[0] === 10) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  return false;
}

function isBlockedIPv6(host) {
  const normalized = host.toLowerCase();
  if (normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("fe80:")) return true;
  return false;
}

function assertSafeHttpUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl || "").trim());
  } catch (error) {
    const urlError = new Error("invalid url");
    urlError.status = 400;
    throw urlError;
  }

  if (BLOCKED_PROTOCOLS.has(parsed.protocol) || !ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    const error = new Error("unsupported url protocol");
    error.status = 400;
    throw error;
  }

  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host)) {
    const error = new Error("localhost and loopback addresses are not allowed");
    error.status = 400;
    throw error;
  }

  const ipVersion = net.isIP(host);
  if (ipVersion === 4 && isPrivateIPv4(host)) {
    const error = new Error("private network ipv4 addresses are not allowed");
    error.status = 400;
    throw error;
  }
  if (ipVersion === 6 && isBlockedIPv6(host)) {
    const error = new Error("private network ipv6 addresses are not allowed");
    error.status = 400;
    throw error;
  }

  return parsed.toString();
}

module.exports = {
  assertSafeHttpUrl
};
