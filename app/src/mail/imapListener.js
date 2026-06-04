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
let pendingScanTimer = null;
let pendingFastScanTimer = null;

let reconnectAttempt = 0;
let lastTooManyConnectionsAt = 0;
let shutdownHandlersRegistered = false;

let pendingScan = false;
let pendingScanReason = "";
let pendingFastScan = false;
let pendingFastScanReason = "";
let currentScanReason = "";
let latestExistsAt = 0;

const processedMessageSet = new Set();
const processedMessageQueue = [];
const PROCESSED_MESSAGE_CACHE_LIMIT = 1000;
const ignoredMessageSet = new Set();
const ignoredMessageQueue = [];
const IGNORED_MESSAGE_CACHE_LIMIT = 1000;

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

function getExistsDebounceSeconds() {
  const parsed = Number(config.mailExistsDebounceSeconds);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1;
  }
  return Math.min(Math.max(Math.floor(parsed), 1), 10);
}

function getFastScanMaxCandidates() {
  const parsed = Number(config.mailFastScanMaxCandidates);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 3;
  }
  return Math.min(Math.max(Math.floor(parsed), 1), 10);
}

function getScheduledScanMaxCandidates() {
  const parsed = Number(config.mailScanMaxCandidates);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 10;
  }
  return Math.min(Math.max(Math.floor(parsed), 1), 50);
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

function clearPendingScanTimer() {
  if (pendingScanTimer) {
    clearTimeout(pendingScanTimer);
    pendingScanTimer = null;
  }
}

function clearPendingFastScanTimer() {
  if (pendingFastScanTimer) {
    clearTimeout(pendingFastScanTimer);
    pendingFastScanTimer = null;
  }
}

function messageIdentity(uid, messageId, internalDate) {
  if (uid) {
    return `uid:${uid}`;
  }

  if (messageId) {
    return `message-id:${String(messageId).trim()}`;
  }

  if (uid || internalDate) {
    return `uid-date:${uid || "none"}:${internalDate || "none"}`;
  }

  return null;
}

function uidIdentity(uid) {
  if (!uid) {
    return null;
  }

  return `uid:${uid}`;
}

function rememberProcessedMessage(identity) {
  if (!identity || processedMessageSet.has(identity)) {
    return;
  }

  processedMessageSet.add(identity);
  processedMessageQueue.push(identity);

  while (processedMessageQueue.length > PROCESSED_MESSAGE_CACHE_LIMIT) {
    const oldest = processedMessageQueue.shift();
    if (oldest) {
      processedMessageSet.delete(oldest);
    }
  }
}

function hasProcessedMessage(identity) {
  return Boolean(identity && processedMessageSet.has(identity));
}

function rememberIgnoredMessage(identity) {
  if (!identity || ignoredMessageSet.has(identity)) {
    return;
  }

  ignoredMessageSet.add(identity);
  ignoredMessageQueue.push(identity);

  while (ignoredMessageQueue.length > IGNORED_MESSAGE_CACHE_LIMIT) {
    const oldest = ignoredMessageQueue.shift();
    if (oldest) {
      ignoredMessageSet.delete(oldest);
    }
  }
}

function hasIgnoredMessage(identity) {
  return Boolean(identity && ignoredMessageSet.has(identity));
}

function hasFastScanPending() {
  return Boolean(existsDebounceTimer || pendingFastScan || pendingFastScanTimer);
}

function scheduleScanSoon(reason, delayMs = 0) {
  if (isShuttingDown) {
    return;
  }

  clearPendingScanTimer();
  const normalizedReason = reason || "pending";

  pendingScanTimer = setTimeout(() => {
    pendingScanTimer = null;
    requestScheduledScan(normalizedReason).catch((error) => {
      console.error(`IMAP scheduled scan failed: ${formatImapError(error)}`);
    });
  }, Math.max(0, delayMs));

  console.log(`IMAP pending scan scheduled: reason=${normalizedReason} delay=${Math.max(0, delayMs) / 1000}s`);
}

function scheduleFastScanSoon(reason, delayMs = 0) {
  if (isShuttingDown) {
    return;
  }

  clearPendingFastScanTimer();
  const normalizedReason = reason || "exists";

  pendingFastScanTimer = setTimeout(() => {
    pendingFastScanTimer = null;
    requestFastScan(normalizedReason).catch((error) => {
      console.error(`IMAP fast scan failed: ${formatImapError(error)}`);
    });
  }, Math.max(0, delayMs));

  console.log(`IMAP pending fast scan scheduled: reason=${normalizedReason} delay=${Math.max(0, delayMs) / 1000}s`);
}

function markPendingScan(reason, message) {
  pendingScan = true;
  pendingScanReason = reason || "scheduled";
  clearPendingScanTimer();
  console.log(`IMAP scan pending: reason=${pendingScanReason}, ${message}`);
}

function markPendingFastScan(reason, message) {
  pendingFastScan = true;
  pendingFastScanReason = reason || "exists";
  clearPendingFastScanTimer();
  console.log(`IMAP fast scan pending: reason=${pendingFastScanReason}, ${message}`);
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
  const result = await redisClient.exists(processedKey(uid));
  return result === 0;
}

async function markUidProcessed(uid) {
  await redisClient.set(processedKey(uid), "1", {
    EX: Math.max(600, getScanWindowMinutes() * 120)
  });
}

async function fetchMessageMetadata(uid) {
  const client = imapClient;
  if (!isClientAvailable(client)) {
    throw new Error("Connection not available");
  }

  const message = await client.fetchOne(
    uid,
    {
      uid: true,
      internalDate: true,
      envelope: true,
      bodyStructure: true
    },
    { uid: true }
  );

  if (!message) {
    return null;
  }

  const internalDate = message.internalDate ? new Date(message.internalDate) : null;
  const messageId = message.envelope && message.envelope.messageId
    ? String(message.envelope.messageId).trim()
    : "";

  return {
    uid,
    internalDate,
    messageId,
    envelope: message.envelope || null
  };
}

async function processMessageByUid(uid) {
  const client = imapClient;
  if (!isClientAvailable(client)) {
    throw new Error("Connection not available");
  }

  const message = await client.fetchOne(
    uid,
    {
      uid: true,
      internalDate: true,
      envelope: true,
      source: true
    },
    { uid: true }
  );

  if (!message || !message.source) {
    console.log(`IMAP message skipped: uid=${uid} parse failed or empty source`);
    return { saved: false, status: "parse failed" };
  }

  const messageDate = new Date(message.internalDate || Date.now());
  if (messageDate.getTime() < scanWindowStart().getTime()) {
    rememberIgnoredMessage(uidIdentity(uid));
    console.log(`IMAP message skipped: uid=${uid} outside scan window`);
    return { saved: false, status: "outside scan window" };
  }

  const messageId = message.envelope && message.envelope.messageId
    ? String(message.envelope.messageId).trim()
    : "";
  const identity = messageIdentity(uid, messageId, messageDate.toISOString());

  if (hasProcessedMessage(identity)) {
    console.log(`IMAP message skipped: uid=${uid} message uid already processed`);
    return { saved: false, status: "message uid already processed" };
  }

  if (!(await shouldProcess(uid))) {
    rememberProcessedMessage(identity);
    console.log(`IMAP message skipped: uid=${uid} message uid already processed`);
    return { saved: false, status: "message uid already processed" };
  }

  let parsed;
  try {
    parsed = await simpleParser(message.source);
  } catch (error) {
    console.log(`IMAP message skipped: uid=${uid} parse failed`);
    throw error;
  }

  const mailData = parseMail(parsed);
  const recipient = mailData.emailAddress || "";
  console.log(`IMAP message processing: uid=${uid} from=${mailData.from || ""} to=${recipient} internalDate=${messageDate.toISOString()}`);

  if (!mailData.emailAddress) {
    await markUidProcessed(uid);
    rememberProcessedMessage(identity);
    console.log(`IMAP message skipped: uid=${uid} unsupported recipient/domain`);
    return { saved: false, status: "unsupported recipient/domain" };
  }

  if (!mailData.code) {
    await markUidProcessed(uid);
    rememberProcessedMessage(identity);
    console.log(`IMAP message skipped: uid=${uid} no code matched`);
    return { saved: false, status: "no code matched" };
  }

  const adobeAccount = await AdobeAccount.findOne({
    verificationEmail: mailData.emailAddress.toLowerCase(),
    enabled: true
  });

  if (!adobeAccount) {
    await markUidProcessed(uid);
    rememberProcessedMessage(identity);
    console.log(`IMAP message skipped: uid=${uid} unsupported recipient/domain`);
    return { saved: false, status: "unsupported recipient/domain" };
  }

  const saved = await saveCode({
    code: mailData.code,
    username: adobeAccount.accountEmail,
    emailAddress: adobeAccount.verificationEmail,
    from: mailData.from,
    subject: mailData.subject,
    receivedAt: parsed.date ? mailData.receivedAt : messageDate.toISOString()
  });

  await markUidProcessed(uid);
  rememberProcessedMessage(identity);
  console.log(`Mail code saved: ${saved.username} ${saved.emailAddress} ${saved.code} uid=${uid}`);
  return { saved: true, status: "saved" };
}

function buildCandidateList(rawCandidates) {
  return Array.isArray(rawCandidates) ? rawCandidates : [];
}

function filterCandidateUids(candidates) {
  const filtered = [];

  for (const uid of buildCandidateList(candidates)) {
    const identity = uidIdentity(uid);
    if (hasProcessedMessage(identity) || hasIgnoredMessage(identity)) {
      continue;
    }
    filtered.push(uid);
  }

  return filtered;
}

async function searchCandidateUids(client, windowStart) {
  const rawCandidates = await client.search({ since: searchSinceDate(windowStart) }, { uid: true });
  return buildCandidateList(rawCandidates);
}

async function selectFastScanCandidates(client, candidates, maxCandidates) {
  const sortedCandidates = [...filterCandidateUids(candidates)].sort((a, b) => b - a);
  const selected = [];
  let unprocessed = 0;

  for (const uid of sortedCandidates) {
    if (selected.length >= maxCandidates) {
      break;
    }

    const metadata = await fetchMessageMetadata(uid);
    if (!metadata) {
      continue;
    }

    const internalDate = metadata.internalDate ? metadata.internalDate.toISOString() : "";
    const identity = messageIdentity(metadata.uid, metadata.messageId, internalDate);

    if (hasProcessedMessage(identity) || hasIgnoredMessage(uidIdentity(metadata.uid))) {
      continue;
    }

    const seen = await redisClient.exists(processedKey(uid));
    if (seen) {
      rememberProcessedMessage(identity);
      continue;
    }

    unprocessed += 1;
    selected.push({
      uid: metadata.uid,
      internalDate: metadata.internalDate
    });
  }

  return { selected, unprocessed };
}

async function processScanBatch(options) {
  const {
    mode,
    reason,
    maxCandidates,
    preferLatest
  } = options;

  if (isShuttingDown) {
    console.log(`IMAP ${mode} scan skipped: shutting down (${reason})`);
    return;
  }

  if (isScanning) {
    console.log(`IMAP ${mode} scan skipped: scan already running`);
    return;
  }

  if (isConnecting) {
    console.log(`IMAP ${mode} scan skipped: connecting`);
    return;
  }

  if (isReconnecting) {
    console.log(`IMAP ${mode} scan skipped: reconnecting`);
    return;
  }

  const client = imapClient;
  if (!isClientAvailable(client)) {
    console.log(`IMAP ${mode} scan skipped: client not available`);
    scheduleReconnect(`${mode}-scan-client-unavailable`);
    return;
  }

  isScanning = true;
  currentScanReason = reason;
  const windowMinutes = getScanWindowMinutes();
  const windowStart = scanWindowStart();
  const startedAt = Date.now();
  let lock = null;
  let interrupted = false;

  try {
    lock = await client.getMailboxLock("INBOX");

    if (mode === "fast") {
      console.log(`IMAP fast scan start: reason=${reason} window=${windowMinutes}m max=${maxCandidates}`);
    } else {
      console.log(`IMAP scan start: reason=${reason} window=${windowMinutes} minutes max=${maxCandidates}`);
    }

    const searchStartedAt = Date.now();
    let candidates;
    try {
      candidates = await searchCandidateUids(client, windowStart);
    } catch (error) {
      if (isTooManyConnectionsError(error) || /timeout|connection not available/i.test(formatImapError(error))) {
        await invalidateClient(client, "IMAP scan search failed", error);
      }
      throw error;
    }

    const rawCount = candidates.length;
    let selectedUids = [];
    let unprocessed = 0;

    if (mode === "fast") {
      const fastSelection = await selectFastScanCandidates(client, candidates, maxCandidates);
      unprocessed = fastSelection.unprocessed;
      selectedUids = fastSelection.selected.map((item) => item.uid);
      const searchDuration = ((Date.now() - searchStartedAt) / 1000).toFixed(1);
      console.log(`IMAP fast search done: raw=${rawCount} unprocessed=${unprocessed} selected=${selectedUids.length} duration=${searchDuration}s`);
    } else {
      const filteredCandidates = filterCandidateUids(candidates);
      const sorted = preferLatest ? [...filteredCandidates].sort((a, b) => b - a) : filteredCandidates;
      selectedUids = sorted.slice(0, maxCandidates);

      if (pendingFastScan) {
        interrupted = true;
        console.log("IMAP scheduled scan interrupted before fetch: fast scan pending");
        selectedUids = [];
      }
    }

    if (!selectedUids.length) {
      const durationSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
      if (mode === "fast") {
        console.log(`IMAP fast scan complete: reason=${reason} raw=${rawCount} selected=0 fetched=0 saved=0 duration=${durationSeconds}s`);
      } else {
        console.log(`IMAP scan complete: reason=${reason} checked=0 saved=0 duration=${durationSeconds}s window=${windowMinutes} minutes`);
      }
      return;
    }

    let fetched = 0;
    let saved = 0;

    for (const uid of selectedUids) {
      if (mode === "scheduled" && pendingFastScan) {
        interrupted = true;
        console.log("IMAP scheduled scan interrupted: fast scan pending");
        break;
      }

      fetched += 1;
      try {
        const result = await processMessageByUid(uid);
        if (result.saved) {
          saved += 1;
        }
      } catch (error) {
        console.error(`Mail processing failed for UID ${uid}: ${formatImapError(error)}`);
      }
    }

    const durationSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);

    if (mode === "fast") {
      console.log(`IMAP fast scan complete: reason=${reason} raw=${rawCount} selected=${selectedUids.length} fetched=${fetched} saved=${saved} duration=${durationSeconds}s`);
    } else {
      console.log(`IMAP scan complete: reason=${reason} checked=${fetched} saved=${saved} interrupted=${interrupted} duration=${durationSeconds}s window=${windowMinutes} minutes`);
    }
  } finally {
    isScanning = false;
    currentScanReason = "";
    if (lock) {
      lock.release();
    }

    if (pendingFastScan && !isShuttingDown) {
      const reasonForFastScan = pendingFastScanReason || "exists";
      pendingFastScan = false;
      pendingFastScanReason = "";
      scheduleFastScanSoon(reasonForFastScan, 1000);
    } else if (pendingScan && !isShuttingDown) {
      const pendingReason = pendingScanReason || "scheduled";
      pendingScan = false;
      pendingScanReason = "";
      scheduleScanSoon(pendingReason, 1000);
    }
  }
}

async function processRecent(reason = "scheduled") {
  return processScanBatch({
    mode: "scheduled",
    reason,
    maxCandidates: getScheduledScanMaxCandidates(),
    preferLatest: true
  });
}

async function fastScanRecentMessages(reason = "exists") {
  return processScanBatch({
    mode: "fast",
    reason,
    maxCandidates: getFastScanMaxCandidates(),
    preferLatest: true
  });
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

async function requestScheduledScan(reason = "scheduled", delayMs = 0) {
  if (isShuttingDown) {
    return;
  }

  if (delayMs > 0) {
    scheduleScanSoon(reason, delayMs);
    return;
  }

  if (hasFastScanPending()) {
    console.log("IMAP scheduled scan skipped: fast scan pending");
    return;
  }

  if (isScanning) {
    markPendingScan(reason, "current scan already running");
    return;
  }

  if (isConnecting || isReconnecting || !isClientAvailable()) {
    markPendingScan(reason, "client not available");
    scheduleReconnect("scheduled scan requested but client not available");
    return;
  }

  await processRecent(reason);
}

async function requestFastScan(reason = "exists") {
  if (isShuttingDown) {
    return;
  }

  if (isScanning) {
    markPendingFastScan(reason, "current scan already running");
    return;
  }

  if (isConnecting || isReconnecting || !isClientAvailable()) {
    markPendingFastScan(reason, "client not available");
    scheduleReconnect("fast scan requested but client not available");
    return;
  }

  await fastScanRecentMessages(reason);
}

function scheduleExistsScan() {
  if (isShuttingDown) {
    return;
  }

  latestExistsAt = Date.now();

  if (isScanning && ["exists", "fast", "pending-fast"].includes(currentScanReason)) {
    console.log("IMAP fast scan already running, duplicate exists ignored");
    return;
  }

  clearExistsDebounceTimer();
  const delaySeconds = getExistsDebounceSeconds();
  console.log(`IMAP exists event received: scanning=${isScanning} pending=${pendingFastScan} debounce=${delaySeconds}s`);

  if (isScanning) {
    markPendingFastScan("exists", "current scan already running");
  }

  existsDebounceTimer = setTimeout(() => {
    existsDebounceTimer = null;
    requestFastScan("exists").catch((error) => {
      console.error("IMAP exists handling failed:", formatImapError(error));
    });
  }, delaySeconds * 1000);
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
    clearPendingScanTimer();
    clearPendingFastScanTimer();
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
    requestScheduledScan("scheduled").catch((error) => {
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

  const shutdown = async () => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    console.log("IMAP shutdown: closing connection");

    clearReconnectTimer();
    clearScheduledScanTimer();
    clearExistsDebounceTimer();
    clearPendingScanTimer();
    clearPendingFastScanTimer();

    const client = imapClient;
    imapClient = null;
    await safeCloseClient(client, "IMAP shutdown");

    console.log("IMAP shutdown complete");
    process.exit(0);
  };

  process.once("SIGTERM", () => {
    shutdown().catch((error) => {
      console.error(`IMAP shutdown failed for SIGTERM: ${formatImapError(error)}`);
      process.exit(1);
    });
  });

  process.once("SIGINT", () => {
    shutdown().catch((error) => {
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

    if (pendingFastScan) {
      const pendingReasonAfterConnect = pendingFastScanReason || "connected-pending";
      pendingFastScan = false;
      pendingFastScanReason = "";
      console.log(`IMAP pending fast scan after connected: reason=${pendingReasonAfterConnect}`);
      scheduleFastScanSoon(pendingReasonAfterConnect, 1000);
    } else if (pendingScan) {
      const pendingReasonAfterConnect = pendingScanReason || "connected-pending";
      pendingScan = false;
      pendingScanReason = "";
      console.log(`IMAP pending scan after connected: reason=${pendingReasonAfterConnect}`);
      scheduleScanSoon(pendingReasonAfterConnect, 1000);
    } else {
      await requestScheduledScan("startup");
    }
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
  processRecent,
  fastScanRecentMessages
};
