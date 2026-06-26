# Multi-Model Support - Backend Implementation Plan

Introduce backend changes to support routing user prompts to different free LLM providers (Google Gemini, Groq, and OpenRouter) based on the user's selection, parsing and storing the model configuration in MongoDB, and returning the responding model details to the client.

## Proposed Changes

### 1. Configuration
* **File:** [config.js](file:///d:/MERN-PROJECT/Full%20Stack%20AI%20-%20Assistant/backend/src/config/config.js)
* **Change:** Add `GROQ_API_KEY` and `OPENROUTER_API_KEY` to the config object.

### 2. Database Model
* **File:** [message.model.js](file:///d:/MERN-PROJECT/Full%20Stack%20AI%20-%20Assistant/backend/src/models/message.model.js)
* **Change:** Add `model` field (String, optional) to track the generating model.

### 3. AI Service
* **File:** [ai.service.js](file:///d:/MERN-PROJECT/Full%20Stack%20AI%20-%20Assistant/backend/src/services/ai.service.js)
* **Change:**
  * Implement `callGroqAPI` and `callOpenRouterAPI` using built-in `fetch`.
  * Route calls based on prefix (`groq/`, `openrouter/`, or default to Gemini).
  * Convert chat history to OpenAI messages format.
  * Apply `extractArtifacts` parsing to all provider outputs.

### 4. Sockets Server
* **File:** [socket.server.js](file:///d:/MERN-PROJECT/Full%20Stack%20AI%20-%20Assistant/backend/src/sockets/socket.server.js)
* **Change:**
  * Extract `model` from message payload and save it in user/model Messages.
  * Pass `model` to `aiService` and emit it in `ai-response`.
