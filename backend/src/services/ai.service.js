import { GoogleGenAI } from "@google/genai";
import config from "../config/config.js";

const ai = new GoogleGenAI({
  apiKey: config.GEMINI_API_KEY,
});

async function generateAIResponse(chatHistory, options = {}) {
  if (!config.GEMINI_API_KEY) {
    throw new Error("Gemini API key is missing. Add GEMINI_API_KEY to backend/.env and restart the server.");
  }

  try {
    const apiConfig = {};

    if (options.useSearch) {
      apiConfig.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
      model: config.GEMINI_MODEL,

      contents: chatHistory.map((item) => ({
        role: item.role === "assistant" ? "model" : item.role,

        parts: [
          {
            text: item.content,
          },
        ],
      })),
      config: apiConfig,
    });

    const groundingMetadata = response.candidates?.[0]?.groundingMetadata || null;

    return {
      text: response.text,
      groundingMetadata,
    };
  } catch (error) {
    console.error("Gemini API error:", {
      status: error?.status,
      model: config.GEMINI_MODEL,
      message: error?.message,
    });

    throw new Error(
      error?.message ||
      "Something went wrong while generating AI response."
    );
  }
}

export default generateAIResponse;
