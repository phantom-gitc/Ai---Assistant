import { GoogleGenAI } from "@google/genai";
import config from "../config/config.js";
import { isImageMime, extractDocumentText } from "./document.service.js";

const ai = new GoogleGenAI({
  apiKey: config.GEMINI_API_KEY,
});

function formatResponseParts(parts) {
  if (!parts || !Array.isArray(parts)) {
    return "";
  }
  
  let textResponse = "";
  for (const part of parts) {
    if (part.text) {
      textResponse += part.text;
    } else if (part.executableCode) {
      const lang = part.executableCode.language ? part.executableCode.language.toLowerCase() : "python";
      textResponse += `\n\n\`\`\`${lang}\n${part.executableCode.code.trim()}\n\`\`\`\n\n`;
    } else if (part.codeExecutionResult) {
      textResponse += `\n\n\`\`\`\nOutput:\n${part.codeExecutionResult.output.trim()}\n\`\`\`\n\n`;
    }
  }
  return textResponse.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Builds the Gemini contents array from chat history.
 * The last user message optionally includes multimodal attachment parts.
 *
 * @param {Array}  chatHistory  - Array of message documents from MongoDB
 * @param {Object} attachment   - Optional { mimeType, data (base64), fileName }
 * @param {string} documentText - Optional pre-extracted text from a document file
 */
function buildContents(chatHistory, attachment, documentText) {
  const contents = chatHistory.map((item, index) => {
    const isLastUserMessage =
      index === chatHistory.length - 1 && item.role === "user";

    const parts = [];

    // If this is the last user message and we have a document, prepend its text as context
    if (isLastUserMessage && documentText) {
      parts.push({
        text: `[Attached Document Context]\n\n${documentText}\n\n[User Question]\n${item.content}`,
      });
    } else {
      parts.push({ text: item.content });
    }

    // If this is the last user message and we have an image, add it as inlineData
    if (isLastUserMessage && attachment && isImageMime(attachment.mimeType)) {
      parts.push({
        inlineData: {
          mimeType: attachment.mimeType,
          data: attachment.data, // base64 string from frontend
        },
      });
    }

    return {
      role: item.role === "assistant" ? "model" : item.role,
      parts,
    };
  });

  return contents;
}

async function generateAIResponse(chatHistory, options = {}) {
  if (!config.GEMINI_API_KEY) {
    throw new Error("Gemini API key is missing. Add GEMINI_API_KEY to backend/.env and restart the server.");
  }

  try {
    const apiConfig = {};

    if (options.useSearch) {
      apiConfig.tools = apiConfig.tools || [];
      apiConfig.tools.push({ googleSearch: {} });
    }

    if (options.useCodeExecution) {
      apiConfig.tools = apiConfig.tools || [];
      apiConfig.tools.push({ codeExecution: {} });
    }

    // Handle document text extraction if a non-image file is attached
    let documentText = null;
    const { attachment } = options;
    if (attachment && !isImageMime(attachment.mimeType)) {
      const fileBuffer = Buffer.from(attachment.data, "base64");
      documentText = await extractDocumentText(fileBuffer, attachment.mimeType);
    }

    const contents = buildContents(chatHistory, attachment, documentText);

    const response = await ai.models.generateContent({
      model: config.GEMINI_MODEL,
      contents,
      config: apiConfig,
    });

    const groundingMetadata = response.candidates?.[0]?.groundingMetadata || null;
    const parts = response.candidates?.[0]?.content?.parts || [];
    const text = formatResponseParts(parts) || response.text || "";

    return {
      text,
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

