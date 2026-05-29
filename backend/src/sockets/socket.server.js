import { Server } from "socket.io";
import cookie from "cookie";
import jwt from "jsonwebtoken";
import config from "../config/config.js";
import aiService from "../services/ai.service.js";
import Message from "../models/message.model.js";


// Initialize Socket.IO server 


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
      // Verify JWT token

      const decoded = jwt.verify(token, config.JWT_SECRET);

      socket.user = decoded;

      next();
    } catch (error) {
      return next(new Error("Unauthorized: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log("✅ User connected:", socket.user, socket.id);

    // Handle user message event


    socket.on("ai-message", async (messagePayload) => {
      try {
        console.log("📩 Incoming message:", messagePayload);

        // Validate
        if (!messagePayload?.content) {
          return socket.emit("ai-error", "Content is required");
        }

        // Save message to database
        await Message.create({
          user: socket.user._id,
          chat: messagePayload.chat,
          content: messagePayload.content,
          role: messagePayload.role,
        });

        // Get chat history for the current chat (limit 5 messages) 

        const recentMessages = await Message.find({
          chat: messagePayload.chat,})
          .sort({ createdAt: -1 })
          .limit(15);

        
        const chatHistory = recentMessages.reverse();
 
        const response = await aiService(chatHistory);

        console.log("🤖 AI response:", response);


        // Save response to database
        // @param {string} response - The AI response.
        // @throws {Error} - If the database operation fails.

        await Message.create({
          user: socket.user._id,
          chat: messagePayload.chat,
          content: response,
          role: "model",
        });


        // Send response back to client
        // @param {string} response - The AI response.

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

    // Handle socket disconnection
    // @param {string} socket.id - The ID of the socket that disconnected.

    socket.on("disconnect", () => {
      console.log("❌ User disconnected:", socket.id);
    });
  });

  return io;
}

export default initSocketServer;
