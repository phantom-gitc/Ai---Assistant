import { GoogleGenAI } from "@google/genai";
import config from "../config/config.js";

const ai = new GoogleGenAI({
  apiKey: config.GEMINI_API_KEY,
});

async function generateAIResponse(content) {
  try {
    const response =
      await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: content,
              },
            ],
          },
        ],
      });

    return response.text;
  } catch (error) {
    if (error.status === 429) {
      return "⚠️ Gemini API quota exceeded. Please retry after 1 minute.";
    }

    console.error(error);
    throw error;
  }
}

export default generateAIResponse;