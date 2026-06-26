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

// Extract artifacts (HTML, SVG, React, Mermaid) from text
export function extractArtifacts(text) {
  if (!text) return [];
  const artifacts = [];
  const tagRegex = /<antartifact([\s\S]*?)>([\s\S]*?)<\/antartifact>/g;
  let match;
  while ((match = tagRegex.exec(text)) !== null) {
    const attrString = match[1];
    const content = match[2].trim();
    const idMatch = attrString.match(/identifier=["']([^"']+)["']/);
    const typeMatch = attrString.match(/type=["']([^"']+)["']/);
    const titleMatch = attrString.match(/title=["']([^"']+)["']/);
    artifacts.push({
      id: idMatch ? idMatch[1] : `art-${Math.random().toString(36).substr(2, 9)}`,
      type: typeMatch ? typeMatch[1] : 'text',
      title: titleMatch ? titleMatch[1] : 'Artifact',
      content
    });
  }
  // Fallback to markdown code blocks if no tag-based artifacts were found
  if (artifacts.length === 0) {
    const codeBlockRegex = /```(html|svg|mermaid|jsx|tsx|css|javascript|js)\n([\s\S]*?)```/g;
    while ((match = codeBlockRegex.exec(text)) !== null) {
      const type = match[1];
      const content = match[2].trim();
      let displayType = type;
      if (type === 'jsx' || type === 'tsx' || type === 'javascript' || type === 'js') {
        displayType = 'react';
      }
      artifacts.push({
        id: `art-${Math.random().toString(36).substr(2, 9)}`,
        type: displayType,
        title: `Generated ${displayType.toUpperCase()}`,
        content
      });
    }
  }
  return artifacts;
}

// Convert chat history to OpenAI message format
function convertToOpenAIMessages(chatHistory, systemInstruction) {
  const messages = [];
  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }
  for (const item of chatHistory) {
    const role = item.role === "assistant" || item.role === "model" ? "assistant" : "user";
    messages.push({ role, content: item.content });
  }
  return messages;
}

// Call the Groq Chat Completions API
async function callGroqAPI(chatHistory, model, systemInstruction) {
  if (!config.GROQ_API_KEY) {
    throw new Error("Groq API key is missing. Add GROQ_API_KEY to backend/.env and restart.");
  }
  const actualModel = model.replace(/^groq\//, "");
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: actualModel,
      messages: convertToOpenAIMessages(chatHistory, systemInstruction),
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${errText}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// Call the OpenRouter Chat Completions API
async function callOpenRouterAPI(chatHistory, model, systemInstruction) {
  if (!config.OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key is missing. Add OPENROUTER_API_KEY to backend/.env.");
  }
  const actualModel = model.replace(/^openrouter\//, "");
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: actualModel,
      messages: convertToOpenAIMessages(chatHistory, systemInstruction),
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errText}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function generateAIResponse(chatHistory, options = {}) {
  const model = options.model || config.GEMINI_MODEL;

  const systemInstruction = `You are a helpful assistant.
When writing self-contained code (HTML/CSS/JS, SVG, React components, or Mermaid diagrams), you MUST wrap the code inside a Claude-style artifact XML tag:
<antartifact identifier="unique-id" type="html|svg|mermaid|react" title="Title of Artifact">
... code content ...
</antartifact>

Rules for types:
- Use 'html' for self-contained HTML/CSS/JS web applications.
- Use 'svg' for raw SVG XML.
- Use 'mermaid' for flowcharts or diagrams.
- Use 'react' for React JSX components.`;

  try {
    let text = "";
    let groundingMetadata = null;

    if (model.startsWith("groq/")) {
      text = await callGroqAPI(chatHistory, model, systemInstruction);
    } else if (model.startsWith("openrouter/")) {
      text = await callOpenRouterAPI(chatHistory, model, systemInstruction);
    } else {
      // Fallback to Gemini
      if (!config.GEMINI_API_KEY) {
        throw new Error("Gemini API key is missing. Add GEMINI_API_KEY to backend/.env and restart the server.");
      }

      const apiConfig = {
        systemInstruction,
      };

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
        model: model.startsWith("gemini/") ? model.replace(/^gemini\//, "") : model,
        contents,
        config: apiConfig,
      });

      groundingMetadata = response.candidates?.[0]?.groundingMetadata || null;
      const parts = response.candidates?.[0]?.content?.parts || [];
      text = formatResponseParts(parts) || response.text || "";
    }

    const artifacts = extractArtifacts(text);

    return {
      text,
      groundingMetadata,
      artifacts,
    };
  } catch (error) {
    console.error("AI Generation API error:", {
      model,
      message: error?.message,
    });

    throw new Error(
      error?.message ||
      "Something went wrong while generating AI response."
    );
  }
}

export default generateAIResponse;

