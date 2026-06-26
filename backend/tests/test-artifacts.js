import { extractArtifacts } from "../src/services/ai.service.js";

// Test data with tag-based and markdown-based code blocks
const testInput1 = `
Here is a web application artifact:
<antartifact identifier="web-app-1" type="html" title="Simple Counter">
<!DOCTYPE html>
<html>
<body>
  <h1>Counter</h1>
</body>
</html>
</antartifact>
`;

const testInput2 = `
Here is a React component markdown block:
\`\`\`jsx
import React from 'react';
export default function App() {
  return <div>Hello</div>;
}
\`\`\`
`;

function runTests() {
  console.log("=== Running Artifact Extraction Tests ===");

  const arts1 = extractArtifacts(testInput1);
  const t1 = arts1.length === 1 && arts1[0].type === "html" && arts1[0].id === "web-app-1";
  console.log(`Test 1 (Tag-based): ${t1 ? "✅ PASS" : "❌ FAIL"}`);

  const arts2 = extractArtifacts(testInput2);
  const t2 = arts2.length === 1 && arts2[0].type === "react";
  console.log(`Test 2 (Markdown fallback): ${t2 ? "✅ PASS" : "❌ FAIL"}`);

  if (t1 && t2) {
    console.log("All tests passed!");
    process.exit(0);
  } else {
    console.error("Some tests failed.");
    process.exit(1);
  }
}

runTests();
