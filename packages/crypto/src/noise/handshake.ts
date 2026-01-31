/**
 * Noise Protocol NK Handshake Implementation
 *
 * Uses the NK (Known Key) pattern where:
 * - Client knows server's static public key (from attestation)
 * - Server authenticates to client
 * - Client is anonymous to server
 *
 * NK Pattern:
 *   <- s (pre-message: client knows server's static key)
 *   -> e, es (client sends ephemeral, performs DH)
 *   <- e, ee (server sends ephemeral, performs DH)
 */

// @ts-expect-error - noise-protocol is a CommonJS module without types
import Noise from 'noise-protocol';
// @ts-expect-error - noise-protocol/cipher-state is a CommonJS submodule without types
import createCipherState from 'noise-protocol/cipher-state';
// @ts-expect-error - noise-protocol/cipher is a CommonJS submodule without types
import createCipher from 'noise-protocol/cipher';
// Use buffer package explicitly for browser compatibility
import { Buffer } from 'buffer';

import { fromBase64 } from '../sodium/utils';

// Initialize cipher state module with cipher primitives
const cipher = createCipher();
const cipherState = createCipherState({ cipher });

const MACLEN = 16; // Authentication tag length

/**
 * Cipher state for transport encryption after handshake
 */
export interface CipherState {
  state: Uint8Array;
}

export interface HandshakeResult {
  sendCipher: CipherState;
  recvCipher: CipherState;
}

/**
 * Performs Noise NK handshake as initiator (client).
 * NK pattern: Client knows server's static public key (from attestation).
 *
 * @param serverPublicKey - Base64-encoded X25519 public key from attestation
 * @param sendHandshakeMessage - Callback to send handshake message to server
 * @param receiveHandshakeMessage - Callback to receive handshake message from server
 * @returns Cipher states for encrypted transport
 */
export async function performNKHandshake(
  serverPublicKey: string,
  sendHandshakeMessage: (message: Uint8Array) => Promise<void>,
  receiveHandshakeMessage: () => Promise<Uint8Array>
): Promise<HandshakeResult> {
  const serverPubKeyBytes = fromBase64(serverPublicKey);

  // Initialize handshake state for NK pattern as initiator
  // Parameters: pattern, initiator, prologue, staticKeypair, ephemeralKeypair, remoteStaticKey, remoteEphemeralKey
  const handshakeState = Noise.initialize(
    'NK',
    true, // initiator
    Buffer.alloc(0), // prologue (empty)
    null, // no local static keypair needed for NK initiator
    null, // ephemeral keypair will be generated
    serverPubKeyBytes, // remote static public key (known from attestation)
    null // no remote ephemeral key yet
  );

  try {
    // NK pattern message 1: -> e, es
    // Client generates ephemeral key, sends it, performs DH with server's static
    const message1Buffer = Buffer.alloc(64); // Enough for ephemeral public key + MAC
    Noise.writeMessage(handshakeState, Buffer.alloc(0), message1Buffer);
    const message1Len = Noise.writeMessage.bytes;
    await sendHandshakeMessage(new Uint8Array(message1Buffer.subarray(0, message1Len)));

    // NK pattern message 2: <- e, ee
    // Server sends ephemeral key, both sides compute shared secret
    const response = await receiveHandshakeMessage();
    const payloadBuffer = Buffer.alloc(response.length);
    const split = Noise.readMessage(handshakeState, Buffer.from(response), payloadBuffer);

    if (!split) {
      throw new Error('Handshake did not complete - expected split');
    }

    // split.tx is our send cipher, split.rx is our receive cipher
    return {
      sendCipher: { state: new Uint8Array(split.tx) },
      recvCipher: { state: new Uint8Array(split.rx) },
    };
  } finally {
    // Always destroy handshake state to prevent memory leaks
    Noise.destroy(handshakeState);
  }
}

/**
 * Encrypt a message using the transport cipher state.
 * The nonce is automatically incremented after each encryption.
 *
 * @param cipher - Cipher state from handshake
 * @param plaintext - Data to encrypt
 * @returns Encrypted data with authentication tag
 */
export function encryptMessage(cipherObj: CipherState, plaintext: Uint8Array): Uint8Array {
  const ciphertext = Buffer.alloc(plaintext.length + MACLEN);
  cipherState.encryptWithAd(
    cipherObj.state,
    ciphertext,
    Buffer.alloc(0), // no associated data
    Buffer.from(plaintext)
  );
  return new Uint8Array(ciphertext.subarray(0, cipherState.encryptWithAd.bytesWritten));
}

/**
 * Decrypt a message using the transport cipher state.
 * The nonce is automatically incremented after each decryption.
 *
 * @param cipher - Cipher state from handshake
 * @param ciphertext - Encrypted data with authentication tag
 * @returns Decrypted plaintext
 * @throws If authentication fails
 */
export function decryptMessage(cipherObj: CipherState, ciphertext: Uint8Array): Uint8Array {
  const plaintext = Buffer.alloc(ciphertext.length - MACLEN);
  cipherState.decryptWithAd(
    cipherObj.state,
    plaintext,
    Buffer.alloc(0), // no associated data
    Buffer.from(ciphertext)
  );
  return new Uint8Array(plaintext.subarray(0, cipherState.decryptWithAd.bytesWritten));
}
