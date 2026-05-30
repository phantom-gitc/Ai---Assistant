import { Server } from "socket.io";
import cookie from "cookie";
import jwt from "jsonwebtoken";
import config from "../config/config.js";
import aiService from "../services/ai.service.js";
import Chat from "../models/chat.model.js";
import Message from "../models/message.model.js";

// Initialize Socket.IO server
async function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: config.CLIENT_URL,
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
    console.log("User connected:", socket.user.id, socket.id);

    socket.on("ai-message", async (messagePayload) => {
      try {
        const content = messagePayload?.content?.trim();
        const chatId = messagePayload?.chat;

        if (!content) {
          return socket.emit("ai-error", "Content is required");
        }

        if (!chatId) {
          return socket.emit("ai-error", "Chat is required");
        }

        const chat = await Chat.findOne({
          _id: chatId,
          user: socket.user.id,
        });

        if (!chat) {
          return socket.emit("ai-error", "Chat not found");
        }

        await Message.create({
          user: socket.user.id,
          chat: chatId,
          content,
          role: "user",
        });

        chat.lastActivity = new Date();
        await chat.save();

        const recentMessages = await Message.find({
          chat: chatId,
        })
          .sort({ createdAt: -1 })
          .limit(15);

        const chatHistory = recentMessages.reverse();
        const response = await aiService(chatHistory);

        await Message.create({
          user: socket.user.id,
          chat: chatId,
          content: response,
          role: "model",
        });

        socket.emit("ai-response", {
          response,
          chat: chatId,
        });
      } catch (error) {
        console.error("AI service error:", error);

        socket.emit("ai-error", {
          message: "Something went wrong while generating response",
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  return io;
}

export default initSocketServer;
