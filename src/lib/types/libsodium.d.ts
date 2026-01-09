declare module 'libsodium-wrappers-sumo' {
	interface Sodium {
		ready: Promise<void>;
		to_base64(data: Uint8Array, variant: number): string;
		from_base64(base64: string, variant: number): Uint8Array;
		to_hex(data: Uint8Array): string;
		from_hex(hex: string): Uint8Array;
		memcmp(a: Uint8Array, b: Uint8Array): boolean;
		memzero(data: Uint8Array): void;
		randombytes_buf(length: number): Uint8Array;
		crypto_secretbox_easy(plaintext: Uint8Array, nonce: Uint8Array, key: Uint8Array): Uint8Array;
		crypto_secretbox_open_easy(ciphertext: Uint8Array, nonce: Uint8Array, key: Uint8Array): Uint8Array | null;
		crypto_secretbox_keygen(): Uint8Array;
		crypto_box_keypair(): { publicKey: Uint8Array; privateKey: Uint8Array };
		crypto_box_seal(plaintext: Uint8Array, publicKey: Uint8Array): Uint8Array;
		crypto_box_seal_open(ciphertext: Uint8Array, publicKey: Uint8Array, privateKey: Uint8Array): Uint8Array | null;
		crypto_pwhash(
			keyLength: number,
			password: string,
			salt: Uint8Array,
			opsLimit: number,
			memLimit: number,
			algorithm: number
		): Uint8Array;
		crypto_hash_sha256(data: Uint8Array): Uint8Array;
		base64_variants: {
			ORIGINAL: number;
			URLSAFE: number;
		};
	}

	const sodium: Sodium;
	export default sodium;
}
