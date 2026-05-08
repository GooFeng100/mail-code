const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { getCodes } = require("../services/codeService");

const router = express.Router();

async function proxyAdobeUserStatus(req, res, next) {
  try {
    const email = String(req.body && req.body.email ? req.body.email : "").trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, error: "invalid email" });
    }

    const upstream = await fetch("https://reseller.ado-besoft.com/api/user-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });
    const data = await upstream.json().catch(() => ({}));

    return res.status(upstream.status).json(data);
  } catch (error) {
    error.status = 502;
    error.message = "Adobe status request failed";
    return next(error);
  }
}

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const codes = await getCodes(req.codeOwnerKey);
    res.json({ ok: true, codes });
  } catch (error) {
    next(error);
  }
});

router.post("/adobe-status", requireAuth, proxyAdobeUserStatus);

module.exports = router;
module.exports.proxyAdobeUserStatus = proxyAdobeUserStatus;
