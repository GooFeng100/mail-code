const express = require("express");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, (req, res) => {
  res.json({
    ok: true,
    user: req.userPublic,
    sessionExpiresAt: req.sessionExpiresAt
  });
});

module.exports = router;
