const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../config");
const User = require("../models/User");
const AdobeAccount = require("../models/AdobeAccount");
const { normalizeUsername, publicUser } = require("../services/userService");
const { publicAdobeSession } = require("../services/accountManagementService");

const router = express.Router();

function signToken(payload, expiresIn) {
  const token = jwt.sign(payload, config.jwtSecret, { expiresIn });
  const decoded = jwt.decode(token);
  return {
    token,
    sessionExpiresAt: decoded && decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null
  };
}

router.post("/login", async (req, res, next) => {
  try {
    const username = normalizeUsername(req.body.username);
    const password = String(req.body.password || "");

    const admin = await User.findOne({
      role: "admin",
      $or: [
        { username },
        { emailAddress: username }
      ]
    });

    if (admin && admin.enabled && await bcrypt.compare(password, admin.passwordHash)) {
      const signed = signToken(
        {
          type: "admin",
          sub: admin._id.toString(),
          username: admin.username,
          role: "admin"
        },
        config.adminJwtExpiresIn
      );

      return res.json({
        ok: true,
        token: signed.token,
        user: publicUser(admin),
        sessionExpiresAt: signed.sessionExpiresAt
      });
    }

    const adobeAccount = await AdobeAccount.findOne({ accountEmail: username });
    if (!adobeAccount || !adobeAccount.enabled) {
      return res.status(401).json({ ok: false, error: "invalid username or password" });
    }

    const matched = await bcrypt.compare(password, adobeAccount.passwordHash);
    if (!matched) {
      return res.status(401).json({ ok: false, error: "invalid username or password" });
    }

    const signed = signToken(
      {
        type: "adobe",
        sub: adobeAccount._id.toString(),
        adobeAccountId: adobeAccount._id.toString(),
        adobeCode: adobeAccount.adobeCode,
        accountEmail: adobeAccount.accountEmail,
        role: "adobe"
      },
      config.adobeJwtExpiresIn
    );

    return res.json({
      ok: true,
      token: signed.token,
      user: publicAdobeSession(adobeAccount),
      sessionExpiresAt: signed.sessionExpiresAt
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
