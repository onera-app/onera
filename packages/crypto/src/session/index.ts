/**
 * Secure Session Module
 *
 * Provides XSS-resistant session key management using:
 * - Web Crypto API for non-extractable keys
 * - IndexedDB for CryptoKey storage (not string serialization)
 *
 * The session key cannot be exported or read by JavaScript,
 * protecting against XSS attacks that try to steal session data.
 */

export {
  createSecureSession,
  restoreSecureSession,
  extendSecureSession,
  hasValidSecureSession,
  clearSecureSession,
  clearAllSecureSessions,
  getSecureSessionInfo,
  verifySessionKeyNonExtractable,
} from './secureSession';

export {
  storeSessionData,
  getSessionData,
  deleteSessionData,
  clearAllSessionData,
  hasSessionData,
  closeDatabase,
  deleteDatabase,
  type SecureSessionData,
} from './indexedDb';
