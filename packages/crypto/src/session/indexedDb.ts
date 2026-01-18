/**
 * IndexedDB Wrapper for Secure Session Storage
 *
 * Uses IndexedDB instead of localStorage for session data because:
 * 1. IndexedDB can store CryptoKey objects directly
 * 2. Better isolation from XSS attacks (no string serialization)
 * 3. Supports structured cloning of complex objects
 */

const DB_NAME = 'onera_e2ee';
const DB_VERSION = 1;
const STORE_NAME = 'session';

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Open or get the IndexedDB database
 */
async function getDatabase(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      dbPromise = null;
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      dbInstance = request.result;

      // Handle database closing (e.g., browser clearing data)
      dbInstance.onclose = () => {
        dbInstance = null;
        dbPromise = null;
      };

      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store for session data
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });

  return dbPromise;
}

/**
 * Session data structure stored in IndexedDB
 */
export interface SecureSessionData {
  id: string;
  sessionKey: CryptoKey; // Non-extractable AES-GCM key
  encryptedMasterKey: ArrayBuffer;
  masterKeyIv: Uint8Array;
  encryptedPrivateKey: ArrayBuffer;
  privateKeyIv: Uint8Array;
  publicKey: Uint8Array;
  createdAt: number;
  expiresAt: number;
}

/**
 * Store session data in IndexedDB
 */
export async function storeSessionData(data: SecureSessionData): Promise<void> {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const request = store.put(data);

    request.onerror = () => {
      reject(new Error('Failed to store session data'));
    };

    request.onsuccess = () => {
      resolve();
    };
  });
}

/**
 * Retrieve session data from IndexedDB
 */
export async function getSessionData(id: string): Promise<SecureSessionData | null> {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    const request = store.get(id);

    request.onerror = () => {
      reject(new Error('Failed to retrieve session data'));
    };

    request.onsuccess = () => {
      resolve(request.result || null);
    };
  });
}

/**
 * Delete session data from IndexedDB
 */
export async function deleteSessionData(id: string): Promise<void> {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const request = store.delete(id);

    request.onerror = () => {
      reject(new Error('Failed to delete session data'));
    };

    request.onsuccess = () => {
      resolve();
    };
  });
}

/**
 * Clear all session data from IndexedDB
 */
export async function clearAllSessionData(): Promise<void> {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const request = store.clear();

    request.onerror = () => {
      reject(new Error('Failed to clear session data'));
    };

    request.onsuccess = () => {
      resolve();
    };
  });
}

/**
 * Check if session data exists
 */
export async function hasSessionData(id: string): Promise<boolean> {
  try {
    const data = await getSessionData(id);
    return data !== null;
  } catch {
    return false;
  }
}

/**
 * Close the database connection
 * Call this when the application is shutting down
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    dbPromise = null;
  }
}

/**
 * Delete the entire database
 * Use for complete cleanup (e.g., logout)
 */
export async function deleteDatabase(): Promise<void> {
  closeDatabase();

  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      resolve();
      return;
    }

    const request = indexedDB.deleteDatabase(DB_NAME);

    request.onerror = () => {
      reject(new Error('Failed to delete database'));
    };

    request.onsuccess = () => {
      resolve();
    };
  });
}
