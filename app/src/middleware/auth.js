const jwt = require("jsonwebtoken");
const config = require("../config");
const User = require("../models/User");
const AdobeAccount = require("../models/AdobeAccount");
const { publicUser } = require("../services/userService");
const { publicAdobeSession } = require("../services/accountManagementService");

function getToken(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) {
    return header.slice(7);
  }
  return null;
}

async function requireAuth(req, res, next) {
  try {
    const token = getToken(req);
    if (!token) {
      return res.status(401).json({ ok: false, error: "missing token" });
    }

    const payload = jwt.verify(token, config.jwtSecret);

    if (payload.type === "adobe" || payload.role === "adobe") {
      const adobeAccount = await AdobeAccount.findById(payload.adobeAccountId || payload.sub);
      if (!adobeAccount || !adobeAccount.enabled) {
        return res.status(401).json({ ok: false, error: "invalid token" });
      }

      req.authType = "adobe";
      req.adobeAccount = adobeAccount;
      req.user = publicAdobeSession(adobeAccount);
      req.userPublic = req.user;
      req.codeOwnerKey = adobeAccount.accountEmail;
      req.authPayload = payload;
      req.sessionExpiresAt = payload.exp ? new Date(payload.exp * 1000).toISOString() : null;
      return next();
    }

    const user = await User.findById(payload.sub);
    if (!user || !user.enabled) {
      return res.status(401).json({ ok: false, error: "invalid token" });
    }

    req.authType = user.role === "admin" ? "admin" : "user";
    req.user = user;
    req.userPublic = publicUser(user);
    req.codeOwnerKey = user.username;
    req.authPayload = payload;
    req.sessionExpiresAt = payload.exp ? new Date(payload.exp * 1000).toISOString() : null;
    return next();
  } catch (error) {
    return res.status(401).json({ ok: false, error: "invalid token" });
  }
}

function requireAdmin(req, res, next) {
  if (req.authType !== "admin" || !req.user || req.user.role !== "admin") {
    return res.status(403).json({ ok: false, error: "admin required" });
  }
  return next();
}

module.exports = { requireAuth, requireAdmin };
