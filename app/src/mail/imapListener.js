const { ImapFlow } = require("imapflow");
const { simpleParser } = require("mailparser");
const config = require("../config");
const { redisClient } = require("../db/redis");
const AdobeAccount = require("../models/AdobeAccount");
const { saveCode } = require("../services/codeService");
const { parseMail } = require("./parser");

let client = null;
let reconnectTimer = null;
let scanTimer = null;
let scanInProgress = false;

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

function processedKey(uid) {
  return `mail:processed:${config.mail.user}:${uid}`;
}

function scanWindowStart() {
  return new Date(Date.now() - config.mailScanWindowMinutes * 60 * 1000);
}

function searchSinceDate(windowStart) {
  const date = new Date(windowStart);
  date.setHours(0, 0, 0, 0);
  return date;
}

async function shouldProcess(uid) {
  const result = await redisClient.set(processedKey(uid), "1", {
    NX: true,
    EX: Math.max(600, config.mailScanWindowMinutes * 120)
  });

  return result === "OK";
}

async function handleMessage(uid) {
  const message = await client.fetchOne(uid, { uid: true, internalDate: true, source: true }, { uid: true });
  if (!message || !message.source) {
    return;
  }

  const messageDate = new Date(message.internalDate || Date.now());
  if (messageDate.getTime() < scanWindowStart().getTime()) {
    return;
  }

  if (!(await shouldProcess(uid))) {
    return;
  }

  const parsed = await simpleParser(message.source);
  const mailData = parseMail(parsed);

  if (!mailData.emailAddress) {
    console.log(`Mail skipped: no configured domain recipient found; subject="${mailData.subject}" from="${mailData.from}"`);
    return;
  }

  if (!mailData.code) {
    console.log(`Mail skipped: no verification code for ${mailData.emailAddress}; subject="${mailData.subject}"`);
    return;
  }

  const adobeAccount = await AdobeAccount.findOne({
    verificationEmail: mailData.emailAddress.toLowerCase(),
    enabled: true
  });

  if (!adobeAccount) {
    console.log(`Mail skipped: no enabled Adobe account mapped to ${mailData.emailAddress}`);
    return;
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
}

async function processRecent() {
  if (scanInProgress) {
    return;
  }

  scanInProgress = true;
  const windowStart = scanWindowStart();
  let lock = null;
  try {
    lock = await client.getMailboxLock("INBOX");
    const candidates = await client.search({ since: searchSinceDate(windowStart) }, { uid: true });
    let checked = 0;

    for (const uid of candidates) {
      try {
        await handleMessage(uid);
        checked += 1;
      } catch (error) {
        console.error(`Mail processing failed for UID ${uid}:`, error.message);
      }
    }

    console.log(`IMAP scan complete: checked ${checked} candidate messages in last ${config.mailScanWindowMinutes} minutes`);
  } finally {
    scanInProgress = false;
    if (lock) {
      lock.release();
    }
  }
}

function scheduleReconnect() {
  if (reconnectTimer) {
    return;
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    startImapListener().catch((error) => {
      console.error("IMAP reconnect failed:", formatImapError(error));
      scheduleReconnect();
    });
  }, 15000);
}

async function startImapListener() {
  if (!config.mailListenerEnabled) {
    console.log("IMAP listener disabled");
    return;
  }

  if (!isMailConfigured()) {
    console.log("IMAP listener not started: mail config is incomplete");
    return;
  }

  client = new ImapFlow({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.secure,
    auth: {
      user: config.mail.user,
      pass: config.mail.pass
    },
    logger: false
  });

  client.on("error", (error) => {
    console.error("IMAP error:", formatImapError(error));
  });

  client.on("close", () => {
    console.error("IMAP connection closed");
    if (scanTimer) {
      clearInterval(scanTimer);
      scanTimer = null;
    }
    scheduleReconnect();
  });

  await client.connect();
  await client.mailboxOpen("INBOX");
  console.log(`IMAP listener connected: ${config.mail.user}`);

  await processRecent();

  scanTimer = setInterval(() => {
    processRecent().catch((error) => {
      console.error("IMAP scheduled scan failed:", error.message);
    });
  }, config.mailScanIntervalSeconds * 1000);

  client.on("exists", async () => {
    try {
      await processRecent();
    } catch (error) {
      console.error("IMAP exists handling failed:", error.message);
    }
  });
}

module.exports = {
  startImapListener,
  processRecent
};
