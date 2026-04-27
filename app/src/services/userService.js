const bcrypt = require("bcryptjs");
const User = require("../models/User");
const config = require("../config");

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function normalizeEmailLocal(emailLocal) {
  const local = String(emailLocal || "").trim().toLowerCase();

  if (!/^[a-z0-9][a-z0-9_-]{0,31}$/.test(local)) {
    const error = new Error("emailLocal can only contain lowercase letters, numbers, underscore and hyphen");
    error.status = 400;
    throw error;
  }

  return local;
}

function normalizeEmailDomain(emailDomain) {
  const domain = String(emailDomain || config.mailDomain).trim().toLowerCase();

  if (!config.mailDomains.includes(domain)) {
    const error = new Error(`emailDomain must be one of: ${config.mailDomains.join(", ")}`);
    error.status = 400;
    throw error;
  }

  return domain;
}

function normalizeEmail(data) {
  let domain = normalizeEmailDomain(data && data.emailDomain);
  let local = data && data.emailLocal;

  if (!local && data && data.emailAddress) {
    const email = String(data.emailAddress || "").trim().toLowerCase();
    const parts = email.split("@");

    if (parts.length !== 2) {
      const error = new Error(`emailAddress must use one of: ${config.mailDomains.join(", ")}`);
      error.status = 400;
      throw error;
    }

    local = parts[0];
    domain = normalizeEmailDomain(parts[1]);
  }

  const emailLocal = normalizeEmailLocal(local);

  return {
    emailAddress: `${emailLocal}@${domain}`,
    emailLocal,
    emailDomain: domain
  };
}

function publicUser(user) {
  if (!user) {
    return null;
  }

  const data = user.toJSON();
  data.passwordConfigured = Boolean(user.passwordHash);
  return data;
}

async function hashPassword(password) {
  const passwordText = String(password || "");

  if (!passwordText || passwordText.length < 6) {
    const error = new Error("password must be at least 6 characters");
    error.status = 400;
    throw error;
  }

  return bcrypt.hash(passwordText, 10);
}

async function createUser(data) {
  const username = normalizeUsername(data.username);
  if (!username) {
    const error = new Error("username is required");
    error.status = 400;
    throw error;
  }

  const email = normalizeEmail(data);
  const passwordText = String(data.password || "");
  const user = await User.create({
    username,
    passwordHash: await hashPassword(passwordText),
    passwordText,
    emailAddress: email.emailAddress,
    emailLocal: email.emailLocal,
    emailDomain: email.emailDomain,
    role: data.role === "admin" ? "admin" : "user",
    enabled: data.enabled !== false
  });

  return publicUser(user);
}

async function updateUser(id, data) {
  const update = {};

  if (data.password) {
    const passwordText = String(data.password);
    update.passwordHash = await hashPassword(passwordText);
    update.passwordText = passwordText;
  }

  if (data.emailLocal || data.emailAddress) {
    Object.assign(update, normalizeEmail(data));
  }

  if (typeof data.enabled === "boolean") {
    update.enabled = data.enabled;
  }

  if (data.role) {
    update.role = data.role === "admin" ? "admin" : "user";
  }

  const user = await User.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true
  });

  if (!user) {
    const error = new Error("user not found");
    error.status = 404;
    throw error;
  }

  return publicUser(user);
}

async function deleteUser(id) {
  const user = await User.findByIdAndDelete(id);
  if (!user) {
    const error = new Error("user not found");
    error.status = 404;
    throw error;
  }
}

async function listUsers() {
  const users = await User.find().sort({ createdAt: -1 });
  return users.map(publicUser);
}

module.exports = {
  normalizeUsername,
  normalizeEmail,
  normalizeEmailLocal,
  normalizeEmailDomain,
  publicUser,
  createUser,
  updateUser,
  deleteUser,
  listUsers,
  hashPassword
};
