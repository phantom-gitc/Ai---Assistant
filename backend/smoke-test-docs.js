import { createRequire } from "module";
import mammoth from "mammoth";
import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

async function testDocumentParser() {
  console.log("=== DOCUMENT PARSER SMOKE TEST ===\n");
  let passed = 0, failed = 0;

  // 1. Plain text decoding (base64 → utf-8)
  const textContent = "Hello! This is a plain text test document.";
  const textBuffer = Buffer.from(Buffer.from(textContent).toString("base64"), "base64");
  const decodedText = textBuffer.toString("utf-8").trim();
  const t1 = decodedText === textContent;
  console.log(`1. Plain Text (text/plain): ${t1 ? "✅ PASS" : "❌ FAIL"}`);
  t1 ? passed++ : failed++;

  // 2. PDFParse class is constructable
  const t2 = typeof PDFParse === "function";
  console.log(`2. PDFParse class loaded (pdf-parse v2): ${t2 ? "✅ PASS" : "❌ FAIL"}`);
  t2 ? passed++ : failed++;

  // 3. PDFParse instance has .pdf() method
  const instance = new PDFParse();
  const t3 = typeof instance.pdf === "function";
  console.log(`3. PDFParse instance has .pdf() method: ${t3 ? "✅ PASS" : "❌ FAIL"}`);
  t3 ? passed++ : failed++;

  // 4. mammoth.extractRawText is callable
  const t4 = typeof mammoth.extractRawText === "function";
  console.log(`4. mammoth.extractRawText loaded: ${t4 ? "✅ PASS" : "❌ FAIL"}`);
  t4 ? passed++ : failed++;

  console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
}

testDocumentParser();
