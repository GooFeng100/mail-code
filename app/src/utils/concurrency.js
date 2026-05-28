const mongoose = require("mongoose");

function conflict(message) {
  const error = new Error(message);
  error.status = 409;
  throw error;
}

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}

function versionValue(data = {}) {
  const hasRevision = Object.prototype.hasOwnProperty.call(data, "revision");
  const hasVersion = Object.prototype.hasOwnProperty.call(data, "version");
  if (!hasRevision && !hasVersion) {
    return null;
  }

  const version = Number(hasRevision ? data.revision : data.version);
  if (!Number.isInteger(version) || version < 0) {
    badRequest("revision/version must be a non-negative integer");
  }
  return version;
}

function addVersionGuard(filter, data = {}) {
  const version = versionValue(data);
  if (version === null) {
    return filter;
  }
  return {
    ...filter,
    __v: version
  };
}

function assertOptimisticMatch(doc, message = "数据已被其他操作修改，请刷新后重试") {
  if (!doc) {
    conflict(message);
  }
  return doc;
}

function isTransactionUnsupported(error) {
  const text = [error && error.message, error && error.codeName].filter(Boolean).join(" ");
  return /Transaction numbers are only allowed|replica set member|not supported/i.test(text);
}

async function withOptionalTransaction(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    try {
      await session.withTransaction(async () => {
        result = await work(session);
      });
      return result;
    } catch (error) {
      if (!isTransactionUnsupported(error)) {
        throw error;
      }
      console.warn("MongoDB transactions are unavailable; running operation without transaction:", error.message);
      return work(null);
    }
  } finally {
    await session.endSession();
  }
}

module.exports = {
  addVersionGuard,
  assertOptimisticMatch,
  withOptionalTransaction
};
