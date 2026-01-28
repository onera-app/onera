/**
 * Noise Protocol Module
 *
 * Provides Noise Protocol NK handshake and encrypted transport
 * for secure communication with TEE endpoints.
 *
 * The NK (Known Key) pattern is used because:
 * - The client knows the server's public key from attestation
 * - The server authenticates to the client
 * - The client remains anonymous (no static key required)
 *
 * Usage:
 * ```typescript
 * import { NoiseWebSocketSession } from '@onera/crypto/noise';
 *
 * // Connect to TEE with key from attestation
 * const session = await NoiseWebSocketSession.connect(
 *   'wss://enclave.example.com/ws',
 *   attestationQuote.public_key
 * );
 *
 * // Send encrypted request and receive response
 * const response = await session.sendAndReceive(
 *   new TextEncoder().encode(JSON.stringify({ prompt: 'Hello' }))
 * );
 *
 * // Or stream responses
 * for await (const chunk of session.sendAndStream(request)) {
 *   console.log(new TextDecoder().decode(chunk));
 * }
 *
 * session.close();
 * ```
 */

export {
  performNKHandshake,
  encryptMessage,
  decryptMessage,
  type CipherState,
  type HandshakeResult,
} from './handshake';

export { NoiseWebSocketSession } from './session';
