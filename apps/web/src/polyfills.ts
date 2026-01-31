/**
 * Polyfills that must be loaded before the application
 */

// Import buffer and set up global with isBuffer
import { Buffer } from 'buffer';

// Ensure Buffer is globally available with all methods
const BufferWithIsBuffer = Buffer as typeof Buffer & {
  isBuffer: (obj: unknown) => obj is Buffer;
};

// Add isBuffer if it doesn't exist
if (typeof BufferWithIsBuffer.isBuffer !== 'function') {
  BufferWithIsBuffer.isBuffer = (obj: unknown): obj is Buffer => {
    return obj != null && (obj as { _isBuffer?: boolean })._isBuffer === true;
  };
}

// Set global Buffer
(globalThis as unknown as { Buffer: typeof Buffer }).Buffer = BufferWithIsBuffer;

// Export for potential use
export { BufferWithIsBuffer as Buffer };
