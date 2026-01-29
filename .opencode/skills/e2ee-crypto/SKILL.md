---
name: e2ee-crypto
description: End-to-end encryption implementation with libsodium
---

## Key Hierarchy

```
Master Key (derived from passkey)
└── Chat Key (random, per-chat)
    ├── Encrypted in DB with user's public key
    └── Used to encrypt/decrypt messages
```

## Encryption Flow

### Generate Chat Key
```typescript
import sodium from 'libsodium-wrappers-sumo';

await sodium.ready;
const chatKey = sodium.crypto_secretbox_keygen();
```

### Encrypt Message
```typescript
function encryptMessage(plaintext: string, chatKey: Uint8Array): string {
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const ciphertext = sodium.crypto_secretbox_easy(
    sodium.from_string(plaintext),
    nonce,
    chatKey
  );
  // Prepend nonce to ciphertext
  const combined = new Uint8Array(nonce.length + ciphertext.length);
  combined.set(nonce);
  combined.set(ciphertext, nonce.length);
  return sodium.to_base64(combined);
}
```

### Decrypt Message
```typescript
function decryptMessage(encrypted: string, chatKey: Uint8Array): string {
  const data = sodium.from_base64(encrypted);
  const nonce = data.slice(0, sodium.crypto_secretbox_NONCEBYTES);
  const ciphertext = data.slice(sodium.crypto_secretbox_NONCEBYTES);
  const plaintext = sodium.crypto_secretbox_open_easy(ciphertext, nonce, chatKey);
  if (!plaintext) {
    throw new Error('Decryption failed');
  }
  return sodium.to_string(plaintext);
}
```

## Key Sharing

### Generate Key Pair
```typescript
const keyPair = sodium.crypto_box_keypair();
// keyPair.publicKey - share with others
// keyPair.privateKey - keep secret
```

### Encrypt Chat Key for User
```typescript
function encryptKeyForUser(chatKey: Uint8Array, userPublicKey: Uint8Array): string {
  const encrypted = sodium.crypto_box_seal(chatKey, userPublicKey);
  return sodium.to_base64(encrypted);
}
```

### Decrypt Chat Key
```typescript
function decryptChatKey(
  encryptedKey: string,
  publicKey: Uint8Array,
  privateKey: Uint8Array
): Uint8Array {
  const encrypted = sodium.from_base64(encryptedKey);
  const chatKey = sodium.crypto_box_seal_open(encrypted, publicKey, privateKey);
  if (!chatKey) {
    throw new Error('Failed to decrypt chat key');
  }
  return chatKey;
}
```

## Key Derivation from Passkey

```typescript
async function deriveKeyFromPasskey(
  credential: ArrayBuffer,
  salt: Uint8Array
): Promise<Uint8Array> {
  await sodium.ready;
  
  // Use Argon2id for key derivation
  return sodium.crypto_pwhash(
    32, // key length
    new Uint8Array(credential),
    salt,
    sodium.crypto_pwhash_OPSLIMIT_MODERATE,
    sodium.crypto_pwhash_MEMLIMIT_MODERATE,
    sodium.crypto_pwhash_ALG_ARGON2ID13
  );
}
```

## Security Rules

1. **NEVER** send plaintext to server
2. **NEVER** log decrypted content
3. **NEVER** store keys unencrypted
4. Keys **NEVER** leave client unencrypted
5. Use secure random for all nonces
6. Validate all crypto operations
7. Clear sensitive data from memory when done

## Error Handling

```typescript
try {
  const decrypted = decryptMessage(encrypted, chatKey);
} catch (error) {
  // Don't expose crypto errors to users
  console.error('Decryption failed:', error);
  throw new Error('Unable to read message');
}
```

## Mobile Considerations

### iOS
- Store keys in Keychain with `.whenUnlockedThisDeviceOnly`
- Use Secure Enclave for key generation when available

### Android
- Store keys in Android Keystore
- Use hardware-backed keys when available
- Require biometric for key access
