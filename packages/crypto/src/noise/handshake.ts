/**
 * Noise Protocol NK Handshake Implementation (Browser-Compatible)
 *
 * Uses libsodium-wrappers for all crypto operations (works in browser).
 *
 * NK Pattern:
 *   <- s (pre-message: client knows server's static key)
 *   -> e, es (client sends ephemeral, performs DH)
 *   <- e, ee (server sends ephemeral, performs DH)
 */

import { getSodium } from '../sodium/init';
import { fromBase64 } from '../sodium/utils';

// Noise protocol constants
const DHLEN = 32;     // X25519 key length
const HASHLEN = 32;   // SHA-256 output (to match server)
const KEYLEN = 32;    // ChaCha20-Poly1305 key length
const NONCELEN = 12;  // ChaCha20-Poly1305 nonce length
// const TAGLEN = 16; // Poly1305 tag length (included in libsodium output)

// Protocol name for NK pattern with our cipher suite
// MUST match server: Noise_NK_25519_ChaChaPoly_SHA256
const PROTOCOL_NAME = 'Noise_NK_25519_ChaChaPoly_SHA256';

/**
 * Cipher state for transport encryption after handshake
 */
export interface CipherState {
  key: Uint8Array;
  nonce: bigint;
}

export interface HandshakeResult {
  sendCipher: CipherState;
  recvCipher: CipherState;
}

/**
 * Internal symmetric state used during handshake
 */
interface SymmetricState {
  h: Uint8Array;  // Handshake hash
  ck: Uint8Array; // Chaining key
  hasKey: boolean;
  k: Uint8Array;  // Cipher key (if hasKey)
  n: bigint;      // Nonce counter
}

/**
 * SHA-256 hash wrapper
 */
function sha256(data: Uint8Array): Uint8Array {
  const sodium = getSodium();
  return sodium.crypto_hash_sha256(data);
}

/**
 * HMAC-SHA256 implementation
 */
function hmacSha256(key: Uint8Array, data: Uint8Array): Uint8Array {
  const BLOCKLEN = 64; // SHA-256 block size

  // Pad key to block size
  let keyBlock = new Uint8Array(BLOCKLEN);
  if (key.length > BLOCKLEN) {
    keyBlock.set(sha256(key));
  } else {
    keyBlock.set(key);
  }

  // Inner and outer padding
  const ipad = new Uint8Array(BLOCKLEN);
  const opad = new Uint8Array(BLOCKLEN);
  for (let i = 0; i < BLOCKLEN; i++) {
    ipad[i] = keyBlock[i] ^ 0x36;
    opad[i] = keyBlock[i] ^ 0x5c;
  }

  // Inner hash: H(ipad || data)
  const innerInput = new Uint8Array(BLOCKLEN + data.length);
  innerInput.set(ipad);
  innerInput.set(data, BLOCKLEN);
  const innerHash = sha256(innerInput);

  // Outer hash: H(opad || innerHash)
  const outerInput = new Uint8Array(BLOCKLEN + HASHLEN);
  outerInput.set(opad);
  outerInput.set(innerHash, BLOCKLEN);

  return sha256(outerInput);
}

/**
 * HKDF using HMAC-SHA256
 */
function hkdf(chainingKey: Uint8Array, inputKeyMaterial: Uint8Array, numOutputs: 2 | 3): Uint8Array[] {
  const tempKey = hmacSha256(chainingKey, inputKeyMaterial);

  const output1 = hmacSha256(tempKey, new Uint8Array([0x01]));
  const output2 = hmacSha256(tempKey, new Uint8Array([...output1, 0x02]));

  if (numOutputs === 2) {
    return [output1.slice(0, HASHLEN), output2.slice(0, HASHLEN)];
  }

  const output3 = hmacSha256(tempKey, new Uint8Array([...output2, 0x03]));
  return [output1.slice(0, HASHLEN), output2.slice(0, HASHLEN), output3.slice(0, HASHLEN)];
}

/**
 * Initialize symmetric state with protocol name
 */
function initializeSymmetric(protocolName: string): SymmetricState {
  const nameBytes = new TextEncoder().encode(protocolName);

  let h: Uint8Array;
  if (nameBytes.length <= HASHLEN) {
    h = new Uint8Array(HASHLEN);
    h.set(nameBytes);
  } else {
    h = sha256(nameBytes);
  }

  return {
    h: h,
    ck: new Uint8Array(h), // Copy h to ck
    hasKey: false,
    k: new Uint8Array(KEYLEN),
    n: BigInt(0),
  };
}

/**
 * Mix hash with data
 */
function mixHash(state: SymmetricState, data: Uint8Array): void {
  const input = new Uint8Array(state.h.length + data.length);
  input.set(state.h);
  input.set(data, state.h.length);
  state.h = sha256(input);
}

/**
 * Mix key material into chaining key
 */
function mixKey(state: SymmetricState, inputKeyMaterial: Uint8Array): void {
  const [ck, tempK] = hkdf(state.ck, inputKeyMaterial, 2);
  state.ck = ck;
  state.k = tempK.slice(0, KEYLEN);
  state.n = BigInt(0);
  state.hasKey = true;
}

/**
 * Encrypt with associated data (the hash)
 */
function encryptAndHash(state: SymmetricState, plaintext: Uint8Array): Uint8Array {
  const sodium = getSodium();

  if (!state.hasKey) {
    mixHash(state, plaintext);
    return plaintext;
  }

  // Create nonce from counter
  const nonce = new Uint8Array(NONCELEN);
  const nonceView = new DataView(nonce.buffer);
  nonceView.setBigUint64(4, state.n, true); // Little-endian, offset 4

  // Encrypt with ChaCha20-Poly1305
  const ciphertext = sodium.crypto_aead_chacha20poly1305_ietf_encrypt(
    plaintext,
    state.h, // AD
    null,    // nsec (unused)
    nonce,
    state.k
  );

  mixHash(state, ciphertext);
  state.n += BigInt(1);

  return ciphertext;
}

/**
 * Decrypt with associated data (the hash)
 */
function decryptAndHash(state: SymmetricState, ciphertext: Uint8Array): Uint8Array {
  const sodium = getSodium();

  if (!state.hasKey) {
    mixHash(state, ciphertext);
    return ciphertext;
  }

  // Create nonce from counter
  const nonce = new Uint8Array(NONCELEN);
  const nonceView = new DataView(nonce.buffer);
  nonceView.setBigUint64(4, state.n, true);

  // Decrypt with ChaCha20-Poly1305
  const plaintext = sodium.crypto_aead_chacha20poly1305_ietf_decrypt(
    null,       // nsec (unused)
    ciphertext,
    state.h,    // AD
    nonce,
    state.k
  );

  if (!plaintext) {
    throw new Error('Decryption failed - authentication error');
  }

  mixHash(state, ciphertext);
  state.n += BigInt(1);

  return plaintext;
}

/**
 * Split symmetric state into two cipher states for transport
 */
function split(state: SymmetricState): [CipherState, CipherState] {
  const [tempK1, tempK2] = hkdf(state.ck, new Uint8Array(0), 2);

  return [
    { key: tempK1.slice(0, KEYLEN), nonce: BigInt(0) },
    { key: tempK2.slice(0, KEYLEN), nonce: BigInt(0) },
  ];
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
  const sodium = getSodium();
  const rs = fromBase64(serverPublicKey); // Remote static public key

  // Initialize symmetric state
  const ss = initializeSymmetric(PROTOCOL_NAME);

  // Pre-message pattern: <- s
  // Mix server's static public key into handshake hash
  mixHash(ss, rs);

  // Generate ephemeral keypair
  const ephemeralKeypair = sodium.crypto_box_keypair();
  const e = ephemeralKeypair.publicKey;
  const ePrivate = ephemeralKeypair.privateKey;

  // Message 1: -> e, es
  // Send ephemeral public key
  mixHash(ss, e);

  // Perform DH: es = DH(e, rs)
  const es = sodium.crypto_scalarmult(ePrivate, rs);
  mixKey(ss, es);

  // Encrypt empty payload (NK has no payload in first message)
  const payload1 = encryptAndHash(ss, new Uint8Array(0));

  // Build message 1: e || encrypted_payload
  const message1 = new Uint8Array(DHLEN + payload1.length);
  message1.set(e);
  message1.set(payload1, DHLEN);

  console.log('[Noise] Sending message1:', message1.length, 'bytes');
  await sendHandshakeMessage(message1);

  // Message 2: <- e, ee
  const message2 = await receiveHandshakeMessage();
  console.log('[Noise] Received message2:', message2.length, 'bytes');
  if (message2.length > 0) {
    console.log('[Noise] message2 first 32 bytes (hex):', Array.from(message2.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join(''));
  }

  if (message2.length < DHLEN) {
    throw new Error(`Invalid handshake message 2: too short (got ${message2.length} bytes, need ${DHLEN})`);
  }

  // Extract server's ephemeral public key
  const re = message2.slice(0, DHLEN);
  mixHash(ss, re);

  // Perform DH: ee = DH(e, re)
  const ee = sodium.crypto_scalarmult(ePrivate, re);
  mixKey(ss, ee);

  // Decrypt payload (may be empty)
  const encryptedPayload2 = message2.slice(DHLEN);
  if (encryptedPayload2.length > 0) {
    decryptAndHash(ss, encryptedPayload2);
  }

  // Split into transport cipher states
  // Initiator sends with first key, receives with second
  const [c1, c2] = split(ss);

  // Clear sensitive data
  sodium.memzero(ePrivate);
  sodium.memzero(es);
  sodium.memzero(ee);

  return {
    sendCipher: c1,
    recvCipher: c2,
  };
}

/**
 * Encrypt a message using the transport cipher state.
 * The nonce is automatically incremented after each encryption.
 *
 * @param cipher - Cipher state from handshake
 * @param plaintext - Data to encrypt
 * @returns Encrypted data with authentication tag
 */
export function encryptMessage(cipher: CipherState, plaintext: Uint8Array): Uint8Array {
  const sodium = getSodium();

  // Create nonce from counter
  const nonce = new Uint8Array(NONCELEN);
  const nonceView = new DataView(nonce.buffer);
  nonceView.setBigUint64(4, cipher.nonce, true);

  // Encrypt with ChaCha20-Poly1305 (no AD for transport)
  const ciphertext = sodium.crypto_aead_chacha20poly1305_ietf_encrypt(
    plaintext,
    null,  // No AD
    null,  // nsec (unused)
    nonce,
    cipher.key
  );

  cipher.nonce += BigInt(1);

  return ciphertext;
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
export function decryptMessage(cipher: CipherState, ciphertext: Uint8Array): Uint8Array {
  const sodium = getSodium();

  // Create nonce from counter
  const nonce = new Uint8Array(NONCELEN);
  const nonceView = new DataView(nonce.buffer);
  nonceView.setBigUint64(4, cipher.nonce, true);

  // Decrypt with ChaCha20-Poly1305 (no AD for transport)
  const plaintext = sodium.crypto_aead_chacha20poly1305_ietf_decrypt(
    null,       // nsec (unused)
    ciphertext,
    null,       // No AD
    nonce,
    cipher.key
  );

  if (!plaintext) {
    throw new Error('Decryption failed - authentication error');
  }

  cipher.nonce += BigInt(1);

  return plaintext;
}
