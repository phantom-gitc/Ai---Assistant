import assert from "assert";

// Set mock environment variables before importing the config module
process.env.GROQ_API_KEY = "mock-groq-key";
process.env.OPENROUTER_API_KEY = "mock-openrouter-key";
process.env.GEMINI_API_KEY = "mock-gemini-key";

// Dynamically import dependencies
const { default: generateAIResponse } = await import("../src/services/ai.service.js");

const originalFetch = globalThis.fetch;

async function runTests() {
  console.log("=== Running Multi-Model Routing Smoke Tests ===");
  let passed = 0, failed = 0;

  // Mock global fetch to intercept Groq and OpenRouter requests
  globalThis.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    const model = body.model;
    
    if (url.includes("api.groq.com")) {
      return {
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              role: "assistant",
              content: `Hello from Groq using model: ${model}\n<antartifact identifier="groq-art" type="mermaid" title="Groq Diagram">\nflowchart TD\n  A --> B\n</antartifact>`
            }
          }]
        })
      };
    } else if (url.includes("openrouter.ai")) {
      return {
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              role: "assistant",
              content: `Hello from OpenRouter using model: ${model}\n\`\`\`html\n<h1>OpenRouter</h1>\n\`\`\``
            }
          }]
        })
      };
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    // 1. Test Groq Routing
    console.log("Testing Groq Routing...");
    const resGroq = await generateAIResponse(
      [{ role: "user", content: "Hello Groq" }],
      { model: "groq/llama-3.1-8b-instant" }
    );
    assert.ok(resGroq.text.includes("Hello from Groq using model: llama-3.1-8b-instant"));
    assert.strictEqual(resGroq.artifacts.length, 1);
    assert.strictEqual(resGroq.artifacts[0].id, "groq-art");
    assert.strictEqual(resGroq.artifacts[0].type, "mermaid");
    console.log("✅ Groq Routing Pass");
    passed++;
  } catch (error) {
    console.error("❌ Groq Routing Fail:", error);
    failed++;
  }

  try {
    // 2. Test OpenRouter Routing
    console.log("Testing OpenRouter Routing...");
    const resOR = await generateAIResponse(
      [{ role: "user", content: "Hello OR" }],
      { model: "openrouter/google/gemma-2-9b-it:free" }
    );
    assert.ok(resOR.text.includes("Hello from OpenRouter using model: google/gemma-2-9b-it:free"));
    assert.strictEqual(resOR.artifacts.length, 1);
    assert.strictEqual(resOR.artifacts[0].type, "html");
    console.log("✅ OpenRouter Routing Pass");
    passed++;
  } catch (error) {
    console.error("❌ OpenRouter Routing Fail:", error);
    failed++;
  }

  globalThis.fetch = originalFetch;

  console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
