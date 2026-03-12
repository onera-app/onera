/**
 * Custom AttachmentAdapter for assistant-ui that wraps the existing
 * file processing pipeline (fileProcessing.ts).
 *
 * Handles images (compress + base64), PDFs (text extraction), and text files.
 * All processing happens client-side — no data leaves the browser.
 */

import type { AttachmentAdapter, PendingAttachment, CompleteAttachment } from "@assistant-ui/react";
import {
  processFile,
  validateFile,
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_DOCUMENT_TYPES,
  SUPPORTED_TEXT_TYPES,
  type ProcessedFile,
} from "@/lib/fileProcessing";

const ACCEPT = [
  ...SUPPORTED_IMAGE_TYPES,
  ...SUPPORTED_DOCUMENT_TYPES,
  ...SUPPORTED_TEXT_TYPES,
].join(",");

/**
 * Convert a ProcessedFile to assistant-ui content parts.
 */
function processedFileToContentParts(
  processed: ProcessedFile,
): CompleteAttachment["content"] {
  switch (processed.type) {
    case "image":
      return [
        {
          type: "image" as const,
          image: `data:${processed.mimeType};base64,${processed.data}`,
        },
      ];

    case "document": {
      // PDFs: include extracted text for the model context
      const parts: CompleteAttachment["content"] = [];
      if (processed.metadata.extractedText) {
        parts.push({
          type: "text" as const,
          text: `[Document: ${processed.fileName}${processed.metadata.pageCount ? ` (${processed.metadata.pageCount} pages)` : ""}]\n${processed.metadata.extractedText}`,
        });
      }
      return parts;
    }

    case "text":
      return [
        {
          type: "text" as const,
          text: processed.metadata.extractedText
            ? `[File: ${processed.fileName}]\n${processed.metadata.extractedText}`
            : `[File: ${processed.fileName}]`,
        },
      ];

    default:
      return [];
  }
}

export class OneraAttachmentAdapter implements AttachmentAdapter {
  accept = ACCEPT;

  async add({ file }: { file: File }): Promise<PendingAttachment> {
    const validation = validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error || "Unsupported file type");
    }

    return {
      id: crypto.randomUUID(),
      type: file.type.startsWith("image/") ? "image" : "document",
      name: file.name,
      contentType: file.type,
      file,
      status: { type: "running", reason: "uploading", progress: 0 },
    };
  }

  async send(attachment: PendingAttachment): Promise<CompleteAttachment> {
    const processed = await processFile(attachment.file);

    return {
      id: attachment.id,
      type: attachment.type,
      name: attachment.name,
      contentType: attachment.contentType,
      content: processedFileToContentParts(processed),
      status: { type: "complete" },
    };
  }

  async remove(): Promise<void> {
    // No cleanup needed — all processing is in-memory
  }
}
