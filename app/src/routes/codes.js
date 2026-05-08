const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { getCodes } = require("../services/codeService");
const { handleAdobeUserStatus } = require("../services/adobeStatusService");

const router = express.Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const codes = await getCodes(req.codeOwnerKey);
    res.json({ ok: true, codes });
  } catch (error) {
    next(error);
  }
});

router.post("/adobe-status", requireAuth, handleAdobeUserStatus);

module.exports = router;
