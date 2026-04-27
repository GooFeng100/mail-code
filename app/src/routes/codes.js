const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { getCodes } = require("../services/codeService");

const router = express.Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const codes = await getCodes(req.codeOwnerKey);
    res.json({ ok: true, codes });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
