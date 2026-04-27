const { createClient } = require("redis");
const config = require("../config");

const redisClient = createClient({
  url: config.redisUrl
});

redisClient.on("error", (error) => {
  console.error("Redis error:", error.message);
});

async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log("Redis connected");
  }
}

module.exports = { redisClient, connectRedis };
