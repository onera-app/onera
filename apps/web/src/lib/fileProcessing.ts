/**
 * File Processing Utilities
 * Client-side processing for images and documents
 */

import imageCompression from 'browser-image-compression';
import type { AttachmentType } from '@onera/types';

// Supported file types
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

export const SUPPORTED_DOCUMENT_TYPES = ['application/pdf'];

export const SUPPORTED_TEXT_TYPES = [
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'text/html',
  'text/css',
  'text/javascript',
  'application/javascript',
  'application/typescript',
];

// File size limits
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_TEXT_SIZE = 1 * 1024 * 1024; // 1MB

// Text extraction limits
export const MAX_EXTRACTED_TEXT_LENGTH = 50000; // 50k chars

export interface ProcessedFile {
  type: AttachmentType;
  data: string; // Base64 encoded
  mimeType: string;
  fileName: string;
  fileSize: number;
  metadata: {
    width?: number;
    height?: number;
    pageCount?: number;
    extractedText?: string;
  };
}

/**
 * Detect attachment type from MIME type
 * Uses strict allowlist - no prefix matching for security
 */
export function getAttachmentType(mimeType: string): AttachmentType | null {
  if (SUPPORTED_IMAGE_TYPES.includes(mimeType)) return 'image';
  if (SUPPORTED_DOCUMENT_TYPES.includes(mimeType)) return 'document';
  if (SUPPORTED_TEXT_TYPES.includes(mimeType)) return 'text';

  // No fallback - only explicitly allowed types
  return null;
}

/**
 * Validate file before processing
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  const type = getAttachmentType(file.type);

  if (!type) {
    return { valid: false, error: `Unsupported file type: ${file.type}` };
  }

  const maxSize =
    type === 'image'
      ? MAX_IMAGE_SIZE
      : type === 'document'
        ? MAX_DOCUMENT_SIZE
        : MAX_TEXT_SIZE;

  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024));
    return { valid: false, error: `File too large. Maximum size is ${maxMB}MB` };
  }

  return { valid: true };
}

/**
 * Compress an image file
 */
export async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 2048,
    useWebWorker: true,
    initialQuality: 0.8,
  };

  try {
    const compressed = await imageCompression(file, options);
    return compressed;
  } catch (error) {
    console.warn('Image compression failed, using original:', error);
    return file;
  }
}

/**
 * Get image dimensions
 */
export function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Convert file to base64 data URL
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Extract base64 part from data URL
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Convert file to data URL (with MIME type prefix)
 */
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// Track if PDF.js worker has been initialized
let pdfWorkerInitialized = false;

/**
 * Extract text from PDF using PDF.js
 */
export async function extractPdfText(file: File): Promise<{
  text: string;
  pageCount: number;
}> {
  // Dynamically import PDF.js to avoid loading it unless needed
  let pdfjsLib;
  try {
    pdfjsLib = await import('pdfjs-dist');
  } catch (error) {
    throw new Error('Failed to load PDF processing library');
  }

  // Set worker source only once - using CDN
  if (!pdfWorkerInitialized) {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      pdfWorkerInitialized = true;
    } catch (error) {
      console.warn('PDF.js worker initialization failed:', error);
      // Continue without worker - will be slower but functional
    }
  }

  let pdf;
  try {
    const arrayBuffer = await file.arrayBuffer();
    pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  } catch (error) {
    throw new Error('Failed to parse PDF file. The file may be corrupted or password-protected.');
  }

  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    try {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ');
      pages.push(`[Page ${i}]\n${pageText}`);
    } catch (error) {
      // Skip problematic pages but continue
      pages.push(`[Page ${i}]\n[Error reading page]`);
    }
  }

  let text = pages.join('\n\n');

  // Truncate if too long
  if (text.length > MAX_EXTRACTED_TEXT_LENGTH) {
    text = text.substring(0, MAX_EXTRACTED_TEXT_LENGTH) + '\n\n[Text truncated...]';
  }

  return { text, pageCount: pdf.numPages };
}

/**
 * Extract text from text-based files
 */
export async function extractTextFileContent(file: File): Promise<string> {
  let text = await file.text();

  // Truncate if too long
  if (text.length > MAX_EXTRACTED_TEXT_LENGTH) {
    text = text.substring(0, MAX_EXTRACTED_TEXT_LENGTH) + '\n\n[Content truncated...]';
  }

  return text;
}

/**
 * Process a file for storage
 */
export async function processFile(file: File): Promise<ProcessedFile> {
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const attachmentType = getAttachmentType(file.type)!;

  if (attachmentType === 'image') {
    // Compress and process image
    const compressed = await compressImage(file);
    const dimensions = await getImageDimensions(compressed);
    const data = await fileToBase64(compressed);

    return {
      type: 'image',
      data,
      mimeType: compressed.type,
      fileName: file.name,
      fileSize: compressed.size,
      metadata: {
        width: dimensions.width,
        height: dimensions.height,
      },
    };
  }

  if (attachmentType === 'document') {
    // Extract text from PDF
    const { text, pageCount } = await extractPdfText(file);
    const data = await fileToBase64(file);

    return {
      type: 'document',
      data,
      mimeType: file.type,
      fileName: file.name,
      fileSize: file.size,
      metadata: {
        pageCount,
        extractedText: text,
      },
    };
  }

  // Text file
  const extractedText = await extractTextFileContent(file);
  const data = await fileToBase64(file);

  return {
    type: 'text',
    data,
    mimeType: file.type,
    fileName: file.name,
    fileSize: file.size,
    metadata: {
      extractedText,
    },
  };
}

/**
 * Process image from clipboard
 */
export async function processClipboardImage(
  item: ClipboardItem
): Promise<ProcessedFile | null> {
  for (const type of SUPPORTED_IMAGE_TYPES) {
    if (item.types.includes(type)) {
      const blob = await item.getType(type);
      const file = new File([blob], `clipboard-${Date.now()}.${type.split('/')[1]}`, {
        type,
      });
      return processFile(file);
    }
  }
  return null;
}

/**
 * Process files from drag-and-drop or file input
 */
export async function processFiles(files: FileList | File[]): Promise<{
  processed: ProcessedFile[];
  errors: Array<{ fileName: string; error: string }>;
}> {
  const fileArray = Array.from(files);
  const processed: ProcessedFile[] = [];
  const errors: Array<{ fileName: string; error: string }> = [];

  for (const file of fileArray) {
    try {
      const result = await processFile(file);
      processed.push(result);
    } catch (error) {
      errors.push({
        fileName: file.name,
        error: error instanceof Error ? error.message : 'Processing failed',
      });
    }
  }

  return { processed, errors };
}
