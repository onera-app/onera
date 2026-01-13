/**
 * IndexedDB Storage for Encrypted Attachments
 * All file data is encrypted before storage using the master key
 */

import { openDB, type IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import {
  encryptJSON,
  decryptJSON,
  getMasterKey,
  isUnlocked,
} from '@onera/crypto';
import type { Attachment, AttachmentType, EncryptedAttachment } from '@onera/types';

const DB_NAME = 'onera-attachments';
const DB_VERSION = 1;
const STORE_NAME = 'attachments';

interface AttachmentDB {
  attachments: {
    key: string;
    value: EncryptedAttachment;
    indexes: { 'by-chat': string; 'by-created': number };
  };
}

let dbInstance: IDBPDatabase<AttachmentDB> | null = null;

/**
 * Initialize the IndexedDB database
 */
async function getDB(): Promise<IDBPDatabase<AttachmentDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<AttachmentDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      store.createIndex('by-chat', 'chatId');
      store.createIndex('by-created', 'createdAt');
    },
  });

  return dbInstance;
}

/**
 * Store file data with encryption
 */
export interface StoreAttachmentInput {
  chatId: string;
  type: AttachmentType;
  mimeType: string;
  fileName: string;
  fileSize: number;
  data: string; // Base64 encoded file data
  metadata?: {
    width?: number;
    height?: number;
    pageCount?: number;
    extractedText?: string;
  };
}

/**
 * Store an attachment with encryption
 */
export async function storeAttachment(
  input: StoreAttachmentInput
): Promise<Attachment> {
  if (!isUnlocked()) {
    throw new Error('E2EE not unlocked');
  }

  const db = await getDB();
  const masterKey = getMasterKey();

  const id = uuidv4();
  const now = Date.now();

  // Encrypt the file data
  const encrypted = encryptJSON({ data: input.data }, masterKey);

  const attachment: EncryptedAttachment = {
    id,
    chatId: input.chatId,
    type: input.type,
    mimeType: input.mimeType,
    fileName: input.fileName,
    fileSize: input.fileSize,
    metadata: input.metadata || {},
    createdAt: now,
    encryptedData: encrypted.ciphertext,
    iv: encrypted.nonce,
  };

  await db.put(STORE_NAME, attachment);

  // Return without encrypted data for use in UI
  const { encryptedData: _enc, iv: _iv, ...publicAttachment } = attachment;
  return publicAttachment;
}

/**
 * Get an attachment by ID and decrypt its data
 */
export async function getAttachment(
  id: string
): Promise<{ attachment: Attachment; data: string } | null> {
  if (!isUnlocked()) {
    throw new Error('E2EE not unlocked');
  }

  const db = await getDB();
  const stored = await db.get(STORE_NAME, id);

  if (!stored) return null;

  const masterKey = getMasterKey();

  // Decrypt the file data
  const decrypted = decryptJSON<{ data: string }>(
    { ciphertext: stored.encryptedData, nonce: stored.iv },
    masterKey
  );

  const { encryptedData: _enc, iv: _iv, ...attachment } = stored;
  return { attachment, data: decrypted.data };
}

/**
 * Get attachment metadata only (without decrypting data)
 */
export async function getAttachmentMetadata(
  id: string
): Promise<Attachment | null> {
  const db = await getDB();
  const stored = await db.get(STORE_NAME, id);

  if (!stored) return null;

  const { encryptedData: _enc, iv: _iv, ...attachment } = stored;
  return attachment;
}

/**
 * List all attachments for a chat (metadata only)
 */
export async function listAttachmentsByChat(
  chatId: string
): Promise<Attachment[]> {
  const db = await getDB();
  const stored = await db.getAllFromIndex(STORE_NAME, 'by-chat', chatId);

  return stored.map(({ encryptedData: _enc, iv: _iv, ...attachment }) => attachment);
}

/**
 * Delete an attachment by ID
 */
export async function deleteAttachment(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

/**
 * Delete all attachments for a chat
 */
export async function deleteAttachmentsByChat(chatId: string): Promise<void> {
  const db = await getDB();
  const attachments = await db.getAllFromIndex(STORE_NAME, 'by-chat', chatId);

  const tx = db.transaction(STORE_NAME, 'readwrite');
  await Promise.all([
    ...attachments.map((a) => tx.store.delete(a.id)),
    tx.done,
  ]);
}

/**
 * Clear all attachments (used on logout/lock if needed)
 */
export async function clearAllAttachments(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_NAME);
}

/**
 * Get total storage used by attachments
 */
export async function getStorageUsage(): Promise<{
  count: number;
  totalSize: number;
}> {
  const db = await getDB();
  const all = await db.getAll(STORE_NAME);

  return {
    count: all.length,
    totalSize: all.reduce((sum, a) => sum + a.fileSize, 0),
  };
}
