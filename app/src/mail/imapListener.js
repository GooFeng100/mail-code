const { ImapFlow } = require("imapflow");
const { simpleParser } = require("mailparser");
const config = require("../config");
const { redisClient } = require("../db/redis");
const AdobeAccount = require("../models/AdobeAccount");
const { saveCode } = require("../services/codeService");
const { parseMail } = require("./parser");

let imapClient = null;

let isConnecting = false;
let isReconnecting = false;
let isScanning = false;
let isShuttingDown = false;

let reconnectTimer = null;
let scheduledScanTimer = null;
let existsDebounceTimer = null;

let reconnectAttempt = 0;
let lastTooManyConnectionsAt = 0;
let shutdownHandlersRegistered = false;

function formatImapError(error) {
  if (!error) {
    return "unknown error";
  }

  const details = [
    error.message,
    error.response,
    error.code,
    error.responseStatus ? `status=${error.responseStatus}` : "",
    error.authenticationFailed ? "authenticationFailed=true" : ""
  ].filter(Boolean);

  return details.length ? details.join(" | ") : String(error);
}

function isMailConfigured() {
  return Boolean(config.mail.host && config.mail.user && config.mail.pass);
}

function buildImapProxy() {
  if (!config.mail.proxyEnabled) {
    return null;
  }

  if (!config.mail.proxyUrl) {
    throw new Error("MAIL_PROXY_ENABLED is true, but MAIL_PROXY_URL is empty");
  }

  return config.mail.proxyUrl;
}

function processedKey(uid) {
  return `mail:processed:${config.mail.user}:${uid}`;
}

function getScanWindowMinutes() {
  const parsed = Number(config.mailScanWindowMinutes);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 5;
  }
  return Math.floor(parsed);
}

function getScanIntervalSeconds() {
  const parsed = Number(config.mailScanIntervalSeconds);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 30;
  }
  return Math.max(15, Math.floor(parsed));
}

function scanWindowStart() {
  return new Date(Date.now() - getScanWindowMinutes() * 60 * 1000);
}

function searchSinceDate(windowStart) {
  const date = new Date(windowStart);
  date.setHours(0, 0, 0, 0);
  return date;
}

function isTooManyConnectionsError(error) {
  const message = String(
    (error && (error.message || error.response || error.serverResponse)) || error || ""
  ).toLowerCase();
  return message.includes("too many simultaneous connections");
}

function isClientAvailable(client = imapClient) {
  if (!client) {
    return false;
  }

  const states = [
    client.usable,
    client.authenticated,
    client.socket && !client.socket.destroyed
  ];

  return states.some(Boolean);
}

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function clearScheduledScanTimer() {
  if (scheduledScanTimer) {
    clearInterval(scheduledScanTimer);
    scheduledScanTimer = null;
  }
}

function clearExistsDebounceTimer() {
  if (existsDebounceTimer) {
    clearTimeout(existsDebounceTimer);
    existsDebounceTimer = null;
  }
}

async function safeCloseClient(client, context) {
  if (!client) {
    return;
  }

  try {
    if (typeof client.logout === "function") {
      await client.logout();
      console.log(`${context}: logout success`);
      return;
    }
  } catch (error) {
    console.error(`${context}: logout failed: ${formatImapError(error)}`);
  }

  try {
    if (typeof client.close === "function") {
      client.close();
    }
  } catch (error) {
    console.error(`${context}: close failed: ${formatImapError(error)}`);
  }

  try {
    if (client.socket && typeof client.socket.destroy === "function") {
      client.socket.destroy();
    }
  } catch (error) {
    console.error(`${context}: destroy failed: ${formatImapError(error)}`);
  }
}

async function invalidateClient(client, reason, error) {
  const isCurrentClient = client && client === imapClient;

  if (isCurrentClient) {
    imapClient = null;
  }

  await safeCloseClient(client, reason);

  if (!isShuttingDown) {
    scheduleReconnect(reason, error);
  }
}

async function shouldProcess(uid) {
  const result = await redisClient.set(processedKey(uid), "1", {
    NX: true,
    EX: Math.max(600, getScanWindowMinutes() * 120)
  });

  return result === "OK";
}

async function handleMessage(uid) {
  const client = imapClient;
  if (!isClientAvailable(client)) {
    throw new Error("Connection not available");
  }

  const message = await client.fetchOne(uid, { uid: true, internalDate: true, source: true }, { uid: true });
  if (!message || !message.source) {
    return false;
  }

  const messageDate = new Date(message.internalDate || Date.now());
  if (messageDate.getTime() < scanWindowStart().getTime()) {
    return false;
  }

  if (!(await shouldProcess(uid))) {
    return false;
  }

  const parsed = await simpleParser(message.source);
  const mailData = parseMail(parsed);

  if (!mailData.emailAddress) {
    console.log(`Mail skipped: no configured domain recipient found; subject="${mailData.subject}" from="${mailData.from}"`);
    return true;
  }

  if (!mailData.code) {
    console.log(`Mail skipped: no verification code for ${mailData.emailAddress}; subject="${mailData.subject}"`);
    return true;
  }

  const adobeAccount = await AdobeAccount.findOne({
    verificationEmail: mailData.emailAddress.toLowerCase(),
    enabled: true
  });

  if (!adobeAccount) {
    console.log(`Mail skipped: no enabled Adobe account mapped to ${mailData.emailAddress}`);
    return true;
  }

  const saved = await saveCode({
    code: mailData.code,
    username: adobeAccount.accountEmail,
    emailAddress: adobeAccount.verificationEmail,
    from: mailData.from,
    subject: mailData.subject,
    receivedAt: parsed.date ? mailData.receivedAt : messageDate.toISOString()
  });

  console.log(`Mail code saved: ${saved.username} ${saved.emailAddress} ${saved.code}`);
  return true;
}

async function processRecent(trigger = "scheduled") {
  if (isShuttingDown) {
    console.log(`IMAP scan skipped: shutting down (${trigger})`);
    return;
  }

  if (isScanning) {
    console.log(`IMAP ${trigger} scan skipped: scan already running`);
    return;
  }

  if (isConnecting) {
    console.log(`IMAP ${trigger} scan skipped: connecting`);
    return;
  }

  if (isReconnecting) {
    console.log(`IMAP ${trigger} scan skipped: reconnecting`);
    return;
  }

  const client = imapClient;
  if (!isClientAvailable(client)) {
    console.log(`IMAP ${trigger} scan skipped: client not available`);
    scheduleReconnect(`${trigger}-scan-client-unavailable`);
    return;
  }

  isScanning = true;
  const windowMinutes = getScanWindowMinutes();
  const windowStart = scanWindowStart();
  let lock = null;

  console.log(`IMAP scan start: window=${windowMinutes} minutes`);

  try {
    lock = await client.getMailboxLock("INBOX");

    let rawCandidates;
    try {
      rawCandidates = await client.search({ since: searchSinceDate(windowStart) }, { uid: true });
    } catch (error) {
      if (isTooManyConnectionsError(error) || /timeout|connection not available/i.test(formatImapError(error))) {
        await invalidateClient(client, "IMAP scan search failed", error);
      }
      throw error;
    }

    const candidates = Array.isArray(rawCandidates) ? rawCandidates : [];
    let checked = 0;

    for (const uid of candidates) {
      try {
        const processed = await handleMessage(uid);
        if (processed) {
          checked += 1;
        }
      } catch (error) {
        console.error(`Mail processing failed for UID ${uid}: ${formatImapError(error)}`);
      }
    }

    console.log(`IMAP scan complete: checked ${checked} candidate messages in last ${windowMinutes} minutes`);
  } finally {
    isScanning = false;
    if (lock) {
      lock.release();
    }
  }
}

function scheduleReconnect(reason, error) {
  if (isShuttingDown) {
    console.log(`IMAP reconnect skipped: shutting down (${reason})`);
    return;
  }

  if (reconnectTimer) {
    console.log("IMAP reconnect skipped: reconnect timer already scheduled");
    return;
  }

  if (isConnecting) {
    console.log("IMAP reconnect skipped: already connecting");
    return;
  }

  if (isReconnecting) {
    console.log("IMAP reconnect skipped: already reconnecting");
    return;
  }

  if (isClientAvailable()) {
    console.log("IMAP reconnect skipped: client already available");
    return;
  }

  const tooManyConnections = isTooManyConnectionsError(error);
  let delaySeconds;

  if (tooManyConnections) {
    delaySeconds = 600;
    lastTooManyConnectionsAt = Date.now();
    console.log(`IMAP reconnect delayed: Gmail too many simultaneous connections, wait ${delaySeconds}s`);
  } else {
    reconnectAttempt += 1;
    delaySeconds = Math.min(300, 15 * (2 ** (reconnectAttempt - 1)));
  }

  console.log(`IMAP reconnect scheduled: reason=${reason}, delay=${delaySeconds}s${error ? `, error=${formatImapError(error)}` : ""}`);

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    startImapListener({ trigger: "reconnect" }).catch((reconnectError) => {
      console.error("IMAP reconnect failed:", formatImapError(reconnectError));
      scheduleReconnect("reconnect-failed", reconnectError);
    });
  }, delaySeconds * 1000);
}

function scheduleExistsScan() {
  if (isShuttingDown) {
    return;
  }

  clearExistsDebounceTimer();
  existsDebounceTimer = setTimeout(() => {
    existsDebounceTimer = null;

    if (isScanning) {
      console.log("IMAP exists scan skipped: scan already running");
      return;
    }

    processRecent("exists").catch((error) => {
      console.error("IMAP exists handling failed:", formatImapError(error));
    });
  }, 3000);

  console.log("IMAP exists event received, scan scheduled in 3s");
}

function attachClientListeners(client) {
  client.on("error", async (error) => {
    console.error("IMAP error:", formatImapError(error));

    if (isTooManyConnectionsError(error) || /timeout|etimedout|connect_timeout/i.test(formatImapError(error))) {
      await invalidateClient(client, "IMAP error", error);
    }
  });

  client.on("close", async () => {
    console.error("IMAP connection closed");
    clearScheduledScanTimer();
    clearExistsDebounceTimer();
    await invalidateClient(client, "IMAP connection closed");
  });

  client.on("exists", () => {
    scheduleExistsScan();
  });
}

function startScheduledScanLoop() {
  clearScheduledScanTimer();
  const intervalSeconds = getScanIntervalSeconds();

  scheduledScanTimer = setInterval(() => {
    processRecent("scheduled").catch((error) => {
      console.error("IMAP scheduled scan failed:", formatImapError(error));
    });
  }, intervalSeconds * 1000);
}

async function connectImapClient(proxy) {
  const clientOptions = {
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.secure,
    auth: {
      user: config.mail.user,
      pass: config.mail.pass
    },
    logger: false
  };

  if (proxy) {
    clientOptions.proxy = proxy;
  }

  const client = new ImapFlow(clientOptions);
  attachClientListeners(client);
  await client.connect();
  await client.mailboxOpen("INBOX");
  return client;
}

function registerShutdownHandlers() {
  if (shutdownHandlersRegistered) {
    return;
  }

  shutdownHandlersRegistered = true;

  const shutdown = async (signal) => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    console.log("IMAP shutdown: closing connection");

    clearReconnectTimer();
    clearScheduledScanTimer();
    clearExistsDebounceTimer();

    const client = imapClient;
    imapClient = null;
    await safeCloseClient(client, "IMAP shutdown");

    console.log("IMAP shutdown complete");
    process.exit(0);
  };

  process.once("SIGTERM", () => {
    shutdown("SIGTERM").catch((error) => {
      console.error(`IMAP shutdown failed for SIGTERM: ${formatImapError(error)}`);
      process.exit(1);
    });
  });

  process.once("SIGINT", () => {
    shutdown("SIGINT").catch((error) => {
      console.error(`IMAP shutdown failed for SIGINT: ${formatImapError(error)}`);
      process.exit(1);
    });
  });
}

async function startImapListener(options = {}) {
  const trigger = options.trigger || "startup";

  registerShutdownHandlers();

  if (!config.mailListenerEnabled) {
    console.log("IMAP listener disabled");
    return;
  }

  if (!isMailConfigured()) {
    console.log("IMAP listener not started: mail config is incomplete");
    return;
  }

  if (isShuttingDown) {
    console.log("IMAP reconnect skipped: shutting down");
    return;
  }

  if (isConnecting) {
    console.log("IMAP reconnect skipped: already connecting");
    return;
  }

  if (isReconnecting) {
    console.log("IMAP reconnect skipped: already reconnecting");
    return;
  }

  if (isClientAvailable()) {
    console.log("IMAP reconnect skipped: client already available");
    return;
  }

  let proxy;
  try {
    proxy = buildImapProxy();
  } catch (error) {
    console.error(`IMAP listener not started: ${error.message}`);
    return;
  }

  isConnecting = trigger !== "reconnect";
  isReconnecting = trigger === "reconnect";
  console.log(`IMAP listener connecting: ${config.mail.user}${proxy ? " (proxy enabled)" : ""}`);

  let connectedClient = null;

  try {
    connectedClient = await connectImapClient(proxy);

    imapClient = connectedClient;
    reconnectAttempt = 0;
    clearReconnectTimer();
    startScheduledScanLoop();

    console.log(`IMAP listener connected: ${config.mail.user}${proxy ? " (proxy enabled)" : ""}`);

    await processRecent("startup");
  } catch (error) {
    await safeCloseClient(connectedClient, "IMAP listener connect cleanup");
    imapClient = null;
    console.error(`IMAP ${trigger === "reconnect" ? "reconnect" : "listener"} failed: ${formatImapError(error)}`);
    scheduleReconnect(trigger === "reconnect" ? "reconnect-failed" : "connect-failed", error);
    throw error;
  } finally {
    isConnecting = false;
    isReconnecting = false;
  }
}

module.exports = {
  startImapListener,
  processRecent
};
