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
        const title = messagePayload?.title?.trim();
        const useSearch = messagePayload?.useSearch || false;
        let chatId = messagePayload?.chat;

        if (!content) {
          return socket.emit("ai-error", "Content is required");
        }

        let chat;

        if (chatId) {
          chat = await Chat.findOne({
            _id: chatId,
            user: socket.user.id,
          });
        } else if (title) {
          chat = await Chat.findOne({
            title,
            user: socket.user.id,
          });

          if (!chat) {
            chat = await Chat.create({
              title,
              user: socket.user.id,
            });
          }

          chatId = chat._id;
        } else {
          return socket.emit("ai-error", "Chat or title is required");
        }

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
        const aiResponse = await aiService(chatHistory, { useSearch });

        await Message.create({
          user: socket.user.id,
          chat: chatId,
          content: aiResponse.text,
          role: "model",
          groundingMetadata: aiResponse.groundingMetadata,
        });

        socket.emit("ai-response", {
          response: aiResponse.text,
          groundingMetadata: aiResponse.groundingMetadata,
          chat: chatId,
          title: chat.title,
        });
      } catch (error) {
        console.error("AI service error:", error);

        socket.emit("ai-error", {
          message: error?.message || "Something went wrong while generating response",
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
