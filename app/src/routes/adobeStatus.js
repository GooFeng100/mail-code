const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { handleAdobeUserStatus } = require("../services/adobeStatusService");

const router = express.Router();

router.post("/user-status", requireAuth, handleAdobeUserStatus);

module.exports = router;
