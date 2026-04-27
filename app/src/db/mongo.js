const mongoose = require("mongoose");
const config = require("../config");

async function connectMongo() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(config.mongoUrl);
  console.log("MongoDB connected");
}

module.exports = { connectMongo };
