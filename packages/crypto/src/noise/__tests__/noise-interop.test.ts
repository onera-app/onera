import { describe, test, expect, beforeAll } from 'bun:test';
import { initSodium, getSodium } from '../../sodium/init';
import { performNKHandshake, encryptMessage, decryptMessage, type CipherState } from '../handshake';

describe('Noise NK Handshake', () => {
  beforeAll(async () => {
    await initSodium();
  });

  test('generates valid ephemeral keypair', () => {
    const sodium = getSodium();
    const keypair = sodium.crypto_box_keypair();
    expect(keypair.publicKey.length).toBe(32);
    expect(keypair.privateKey.length).toBe(32);
    // Keys should not be all zeros
    expect(keypair.publicKey.some((b: number) => b !== 0)).toBe(true);
    expect(keypair.privateKey.some((b: number) => b !== 0)).toBe(true);
  });

  test('creates correct initiator handshake message format', async () => {
    const sodium = getSodium();

    // Generate a "server" keypair
    const serverKeypair = sodium.crypto_box_keypair();
    const serverPublicKeyBase64 = sodium.to_base64(
      serverKeypair.publicKey,
      sodium.base64_variants.ORIGINAL
    );

    let sentMessage: Uint8Array | null = null;

    // Perform handshake as initiator, capturing the first message
    // We expect this to fail on receive since there's no real server,
    // but we can capture the sent message
    try {
      await performNKHandshake(
        serverPublicKeyBase64,
        async (msg) => {
          sentMessage = msg;
        },
        async () => {
          // Simulate no server response
          throw new Error('Test: no server');
        }
      );
    } catch {
      // Expected to fail since there's no real server
    }

    expect(sentMessage).not.toBeNull();
    // NK message 1: 32 bytes ephemeral key + 16 bytes encrypted empty payload (auth tag)
    expect(sentMessage!.length).toBe(48);

    // First 32 bytes should be the ephemeral public key (non-zero)
    const ephemeralKey = sentMessage!.slice(0, 32);
    expect(ephemeralKey.some((b: number) => b !== 0)).toBe(true);
  });

  test('encrypts and decrypts a roundtrip message', async () => {
    // Simulate a complete handshake by creating matching cipher states
    // Both sides derive the same keys from the same handshake transcript
    const sodium = getSodium();

    // Create cipher state pairs as if handshake completed
    // Initiator sends with key1, receives with key2
    // We test encrypt -> decrypt roundtrip
    const key = sodium.crypto_aead_chacha20poly1305_ietf_keygen();

    const sendCipher: CipherState = { key: new Uint8Array(key), nonce: BigInt(0) };
    const recvCipher: CipherState = { key: new Uint8Array(key), nonce: BigInt(0) };

    const plaintext = new TextEncoder().encode('Hello, encrypted world!');
    const ciphertext = encryptMessage(sendCipher, plaintext);

    // Ciphertext should be longer than plaintext (includes auth tag)
    expect(ciphertext.length).toBe(plaintext.length + 16);

    // Decrypt should recover original plaintext
    const decrypted = decryptMessage(recvCipher, ciphertext);
    expect(new TextDecoder().decode(decrypted)).toBe('Hello, encrypted world!');
  });

  test('nonce increments after each operation', () => {
    const sodium = getSodium();
    const key = sodium.crypto_aead_chacha20poly1305_ietf_keygen();
    const cipher: CipherState = { key: new Uint8Array(key), nonce: BigInt(0) };

    const msg1 = new TextEncoder().encode('message 1');
    const msg2 = new TextEncoder().encode('message 2');

    encryptMessage(cipher, msg1);
    expect(cipher.nonce).toBe(BigInt(1));

    encryptMessage(cipher, msg2);
    expect(cipher.nonce).toBe(BigInt(2));
  });

  test('rejects messages with wrong key', () => {
    const sodium = getSodium();

    const key1 = sodium.crypto_aead_chacha20poly1305_ietf_keygen();
    const key2 = sodium.crypto_aead_chacha20poly1305_ietf_keygen();

    const sendCipher: CipherState = { key: new Uint8Array(key1), nonce: BigInt(0) };
    const recvCipher: CipherState = { key: new Uint8Array(key2), nonce: BigInt(0) };

    const plaintext = new TextEncoder().encode('secret data');
    const ciphertext = encryptMessage(sendCipher, plaintext);

    // Decrypting with wrong key should throw
    expect(() => decryptMessage(recvCipher, ciphertext)).toThrow();
  });

  test('rejects tampered ciphertext', () => {
    const sodium = getSodium();
    const key = sodium.crypto_aead_chacha20poly1305_ietf_keygen();

    const sendCipher: CipherState = { key: new Uint8Array(key), nonce: BigInt(0) };
    const recvCipher: CipherState = { key: new Uint8Array(key), nonce: BigInt(0) };

    const plaintext = new TextEncoder().encode('important data');
    const ciphertext = encryptMessage(sendCipher, plaintext);

    // Tamper with ciphertext
    const tampered = new Uint8Array(ciphertext);
    tampered[0] ^= 0xff;

    expect(() => decryptMessage(recvCipher, tampered)).toThrow();
  });

  test('rejects messages with wrong nonce (replay)', () => {
    const sodium = getSodium();
    const key = sodium.crypto_aead_chacha20poly1305_ietf_keygen();

    const sendCipher: CipherState = { key: new Uint8Array(key), nonce: BigInt(0) };
    const recvCipher: CipherState = { key: new Uint8Array(key), nonce: BigInt(0) };

    const plaintext = new TextEncoder().encode('message');
    const ciphertext = encryptMessage(sendCipher, plaintext);

    // First decrypt succeeds
    const decrypted = decryptMessage(recvCipher, ciphertext);
    expect(new TextDecoder().decode(decrypted)).toBe('message');

    // Second decrypt of same ciphertext should fail (nonce already advanced)
    expect(() => decryptMessage(recvCipher, ciphertext)).toThrow();
  });
});
