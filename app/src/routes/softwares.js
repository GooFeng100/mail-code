const express = require("express");
const path = require("path");
const { requireAuth } = require("../middleware/auth");
const {
  listPublicSoftwares,
  prepareSoftwareDownload,
  increaseSoftwareDownloadCount
} = require("../services/softwareService");
const { resolveSoftwarePath } = require("../utils/softwareStorage");

const router = express.Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const categories = await listPublicSoftwares();
    res.json({ ok: true, categories });
  } catch (error) {
    next(error);
  }
});

router.get("/assets/:fileName", async (req, res, next) => {
  try {
    const resolved = resolveSoftwarePath(req.params.fileName);
    const ext = path.extname(resolved.fileName).toLowerCase();
    const typeMap = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".gif": "image/gif",
      ".ico": "image/x-icon",
      ".svg": "image/svg+xml",
    };
    if (typeMap[ext]) {
      res.type(typeMap[ext]);
    }
    res.sendFile(resolved.absolutePath);
  } catch (error) {
    next(error);
  }
});

router.get("/:id/download", requireAuth, async (req, res, next) => {
  try {
    const result = await prepareSoftwareDownload(req.params.id);
    if (result.mode === "external") {
      await increaseSoftwareDownloadCount(result.softwareId);
      return res.redirect(302, result.redirectUrl);
    }

    res.download(result.absolutePath, result.downloadName, (downloadError) => {
      if (!downloadError) {
        increaseSoftwareDownloadCount(result.softwareId).catch(() => {});
      }
    });
    return undefined;
  } catch (error) {
    next(error);
    return undefined;
  }
});

module.exports = router;
