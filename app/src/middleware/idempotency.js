const crypto = require("crypto");
const { redisClient } = require("../db/redis");

const IDEMPOTENCY_TTL_SECONDS = 60 * 10;

function requestFingerprint(req) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify({
      method: req.method,
      path: req.originalUrl,
      body: req.body || {}
    }))
    .digest("hex");
}

function idempotencyMiddleware(req, res, next) {
  const key = String(req.get("Idempotency-Key") || req.body?.clientRequestId || "").trim();
  if (!key || !["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    return next();
  }

  const redisKey = `idempotency:${req.user?.id || req.user?.sub || "anonymous"}:${key}`;
  const fingerprint = requestFingerprint(req);

  Promise.resolve()
    .then(async () => {
      const existingText = await redisClient.get(redisKey);
      if (existingText) {
        const existing = JSON.parse(existingText);
        if (existing.fingerprint !== fingerprint) {
          return res.status(409).json({ ok: false, error: "Idempotency-Key was reused with a different request" });
        }
        if (existing.status === "completed") {
          return res.status(existing.statusCode || 200).json(existing.body || { ok: true });
        }
        return res.status(409).json({ ok: false, error: "同一操作正在处理中，请稍后刷新查看结果" });
      }

      const reserved = await redisClient.set(
        redisKey,
        JSON.stringify({ status: "processing", fingerprint }),
        { NX: true, EX: IDEMPOTENCY_TTL_SECONDS }
      );
      if (!reserved) {
        return res.status(409).json({ ok: false, error: "同一操作正在处理中，请稍后刷新查看结果" });
      }

      const originalJson = res.json.bind(res);
      res.json = (body) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redisClient.set(
            redisKey,
            JSON.stringify({
              status: "completed",
              fingerprint,
              statusCode: res.statusCode,
              body
            }),
            { EX: IDEMPOTENCY_TTL_SECONDS }
          ).catch((error) => {
            console.error("Failed to save idempotency response:", error.message);
          });
        }
        return originalJson(body);
      };

      return next();
    })
    .catch(next);
}

module.exports = { idempotencyMiddleware };
