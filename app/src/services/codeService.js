const crypto = require("crypto");
const config = require("../config");
const { redisClient } = require("../db/redis");
const { emitCodeToUser } = require("../socket/socket");

function codeListKey(username) {
  return `codes:${username}`;
}

function codeDataKey(id) {
  return `code:${id}`;
}

function normalizeCode(value) {
  const text = String(value || "");
  const match = text.match(/\b\d{4,8}\b/);
  return match ? match[0] : text;
}

async function cleanupExpired(username) {
  await redisClient.zRemRangeByScore(codeListKey(username), 0, Date.now());
}

async function saveCode(codeData) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.codeTtlSeconds * 1000);
  const id = codeData.id || crypto.randomUUID();

  const data = {
    id,
    code: normalizeCode(codeData.code),
    username: codeData.username,
    emailAddress: codeData.emailAddress,
    from: codeData.from || "",
    subject: codeData.subject || "",
    receivedAt: codeData.receivedAt || now.toISOString(),
    savedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString()
  };

  await redisClient.set(codeDataKey(id), JSON.stringify(data), {
    EX: config.codeTtlSeconds
  });
  await redisClient.zAdd(codeListKey(data.username), {
    score: expiresAt.getTime(),
    value: id
  });
  await redisClient.expire(codeListKey(data.username), config.codeTtlSeconds);
  await cleanupExpired(data.username);

  emitCodeToUser(data.username, data);
  return data;
}

async function getCodes(username) {
  await cleanupExpired(username);
  const ids = await redisClient.zRangeByScore(codeListKey(username), Date.now(), "+inf");

  if (!ids.length) {
    return [];
  }

  const values = await redisClient.mGet(ids.map(codeDataKey));
  const codes = values
    .filter(Boolean)
    .map((value) => JSON.parse(value))
    .sort((a, b) => {
      const receivedDiff = new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
      if (receivedDiff !== 0) {
        return receivedDiff;
      }
      return new Date(b.savedAt || 0).getTime() - new Date(a.savedAt || 0).getTime();
    });

  return codes;
}

module.exports = {
  saveCode,
  getCodes,
  normalizeCode
};
