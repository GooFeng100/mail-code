const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { proxyAdobeUserStatus } = require("./codes");

const router = express.Router();

router.post("/user-status", requireAuth, proxyAdobeUserStatus);

module.exports = router;
