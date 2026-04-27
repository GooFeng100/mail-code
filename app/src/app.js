const path = require("path");
const http = require("http");
const express = require("express");
const cors = require("cors");
const config = require("./config");
const { connectMongo } = require("./db/mongo");
const { connectRedis } = require("./db/redis");
const { ensureDefaultAdmin } = require("./services/bootstrapService");
const { ensureUserIndexes } = require("./services/indexService");
const { initSocket } = require("./socket/socket");
const { startImapListener } = require("./mail/imapListener");
const authRoutes = require("./routes/auth");
const meRoutes = require("./routes/me");
const codesRoutes = require("./routes/codes");
const adminRoutes = require("./routes/admin");

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "mail-code-app",
    mongo: "connected",
    redis: "connected",
    time: new Date().toISOString()
  });
});

app.get("/api/env-check", (req, res) => {
  res.json({
    ok: true,
    port: config.port,
    mailHostConfigured: Boolean(process.env.MAIL_HOST),
    mailUserConfigured: Boolean(process.env.MAIL_USER),
    mailDomainConfigured: Boolean(process.env.MAIL_DOMAIN),
    redisConfigured: Boolean(process.env.REDIS_URL),
    mongoConfigured: Boolean(process.env.MONGO_URL)
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/me", meRoutes);
app.use("/api/codes", codesRoutes);
app.use("/api/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).json({ ok: false, error: "not found" });
});

app.use((error, req, res, next) => {
  if (error && error.code === 11000) {
    if (error.keyPattern && error.keyPattern.assignmentRole) {
      return res.status(409).json({ ok: false, error: "该客户已有主要账号，请先将原主要账号改为备用账号或取消绑定" });
    }
    return res.status(409).json({ ok: false, error: "duplicate unique field already exists" });
  }

  const status = error.status || 500;
  const message = status >= 500 ? "internal server error" : error.message;
  if (status >= 500) {
    console.error(error);
  }
  return res.status(status).json({ ok: false, error: message });
});

async function start() {
  try {
    await connectMongo();
    await connectRedis();
    await ensureUserIndexes();
    await ensureDefaultAdmin();
    initSocket(server);
    startImapListener().catch((error) => {
      console.error("IMAP listener failed:", error.message);
    });

    server.listen(config.port, "0.0.0.0", () => {
      console.log(`mail-code-app running on port ${config.port}`);
    });
  } catch (error) {
    console.error("Failed to start app:", error.message);
    process.exit(1);
  }
}

start();
