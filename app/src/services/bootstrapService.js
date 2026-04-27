const User = require("../models/User");
const config = require("../config");
const { hashPassword, normalizeUsername } = require("./userService");

async function ensureDefaultAdmin() {
  const username = normalizeUsername(config.defaultAdminUsername);
  const existingConfiguredAdmin = await User.findOne({ username });
  const passwordHash = await hashPassword(config.defaultAdminPassword);

  if (existingConfiguredAdmin) {
    existingConfiguredAdmin.passwordHash = passwordHash;
    existingConfiguredAdmin.passwordText = config.defaultAdminPassword;
    existingConfiguredAdmin.role = "admin";
    existingConfiguredAdmin.enabled = true;
    await existingConfiguredAdmin.save();
    console.log(`Default admin synced: ${username}`);
    return;
  }

  await User.create({
    username,
    passwordHash,
    passwordText: config.defaultAdminPassword,
    emailAddress: `admin@${config.mailDomain}`.toLowerCase(),
    emailLocal: "admin",
    emailDomain: config.mailDomain,
    role: "admin",
    enabled: true
  });

  console.log(`Default admin created: ${username}`);
}

module.exports = { ensureDefaultAdmin };
