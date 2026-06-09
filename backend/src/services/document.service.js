import { createRequire } from "module";
import mammoth from "mammoth";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

/**
 * SUPPORTED FILE TYPES AND HOW THEY ARE HANDLED:
 *
 * - image/*  → Sent as base64 inlineData directly to the Gemini API (native multimodal)
 * - application/pdf  → Text is extracted using pdf-parse, prepended as context
 * - application/vnd.openxmlformats-officedocument.wordprocessingml.document (DOCX) → Text extracted via mammoth
 * - text/*  → Decoded from base64 and prepended as plain text context
 */

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

/**
 * Determines whether a given mimeType is a natively supported image for Gemini.
 */
export function isImageMime(mimeType) {
  return IMAGE_MIME_TYPES.has(mimeType?.toLowerCase());
}

/**
 * Extracts plain text from a document Buffer based on its MIME type.
 * Supports: PDF, DOCX, plain text.
 *
 * @param {Buffer} fileBuffer - The raw file buffer (decoded from base64)
 * @param {string} mimeType   - The MIME type of the file
 * @returns {Promise<string>} - Extracted plain text
 */
export async function extractDocumentText(fileBuffer, mimeType) {
  const mime = mimeType?.toLowerCase();

  if (mime === "application/pdf") {
    const parser = new PDFParse();
    const data = await parser.pdf(fileBuffer);
    return data.text?.trim() || "";
  }

  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mime === "application/msword"
  ) {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return result.value?.trim() || "";
  }

  if (mime?.startsWith("text/")) {
    return fileBuffer.toString("utf-8").trim();
  }

  throw new Error(`Unsupported document type for text extraction: ${mimeType}`);
}
