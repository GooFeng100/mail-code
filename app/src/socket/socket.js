const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const config = require("../config");
const User = require("../models/User");
const AdobeAccount = require("../models/AdobeAccount");

let io = null;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*"
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      if (!token) {
        return next(new Error("missing token"));
      }

      const payload = jwt.verify(token, config.jwtSecret);

      if (payload.type === "adobe" || payload.role === "adobe") {
        const adobeAccount = await AdobeAccount.findById(payload.adobeAccountId || payload.sub);
        if (!adobeAccount || !adobeAccount.enabled) {
          return next(new Error("invalid token"));
        }

        socket.user = {
          id: adobeAccount._id.toString(),
          username: adobeAccount.accountEmail,
          role: "adobe"
        };
        return next();
      }

      const user = await User.findById(payload.sub);
      if (!user || !user.enabled) {
        return next(new Error("invalid token"));
      }

      socket.user = {
        id: user._id.toString(),
        username: user.username,
        role: user.role
      };
      return next();
    } catch (error) {
      return next(new Error("invalid token"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(socket.user.username);
  });

  return io;
}

function emitCodeToUser(username, codeData) {
  if (io) {
    io.to(username).emit("new_code", codeData);
  }
}

module.exports = {
  initSocket,
  emitCodeToUser
};
