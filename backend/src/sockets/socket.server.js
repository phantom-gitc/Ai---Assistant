import { Server } from "socket.io";
import cookie from "cookie";
import jwt from "jsonwebtoken";
import config from "../config/config.js";
import aiService from "../services/ai.service.js";

async function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:5173",
      credentials: true,
    },
  });

  // Authenticate socket connection
  io.use((socket, next) => {
    try {
      const cookies = cookie.parse(socket.handshake.headers.cookie || "");

      const token = cookies.token;

      if (!token) {
        return next(new Error("Unauthorized: No token provided"));
      }

      const decoded = jwt.verify(token, config.JWT_SECRET);

      socket.user = decoded;

      next();
    } catch (error) {
      return next(new Error("Unauthorized: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log("✅ User connected:", socket.user, socket.id);

    socket.on("ai-message", async (messagePayload) => {
      try {
        console.log("📩 Incoming message:", messagePayload);

        // Validate
        if (!messagePayload?.content) {
          return socket.emit("ai-error", "Content is required");
        }

        // AI call
        const response = await aiService(messagePayload.content);

        console.log("🤖 AI response:", response);

        // Send response back
        socket.emit("ai-response", {
          response,
          chat: messagePayload.chat,
        });
      } catch (error) {
        console.error("AI service error:", error);

        socket.emit("ai-error", {
          message: "Something went wrong while generating response",
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("❌ User disconnected:", socket.id);
    });
  });

  return io;
}

export default initSocketServer;
