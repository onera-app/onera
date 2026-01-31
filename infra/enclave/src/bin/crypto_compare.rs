//! Compare Noise crypto values between Rust/snow and what JS should compute
//!
//! Run with: cargo run --bin crypto_compare

use sha2::{Sha256, Digest};
use hmac::{Hmac, Mac};

type HmacSha256 = Hmac<Sha256>;

fn hkdf(ck: &[u8], input_key_material: &[u8]) -> ([u8; 32], [u8; 32]) {
    let temp_key = {
        let mut mac = HmacSha256::new_from_slice(ck).unwrap();
        mac.update(input_key_material);
        mac.finalize().into_bytes()
    };

    let output1 = {
        let mut mac = HmacSha256::new_from_slice(&temp_key).unwrap();
        mac.update(&[0x01]);
        mac.finalize().into_bytes()
    };

    let output2 = {
        let mut mac = HmacSha256::new_from_slice(&temp_key).unwrap();
        mac.update(&output1);
        mac.update(&[0x02]);
        mac.finalize().into_bytes()
    };

    (output1.into(), output2.into())
}

fn main() {
    println!("=== Verifying JS Client Values ===");
    println!("Using EXACT values from browser console log:\n");

    // Values from the JS client log
    let server_pub: [u8; 32] = hex::decode("dfa2f8af8d2b7a94fe8f02fafb1eb995442d52ffcc0bf4896be24d47e6fb7449")
        .unwrap().try_into().unwrap();
    let ephemeral_pub: [u8; 32] = hex::decode("68ecad3a83c9b92a66282987f675adb323de078a90674e67c620f2743ebab508")
        .unwrap().try_into().unwrap();
    let js_es: [u8; 32] = hex::decode("dbb7e856659d1c73261e2b6c3e27f1ddd1e5872b8cd5e18838a49ae8714be610")
        .unwrap().try_into().unwrap();
    let js_ck: &str = "c04dfaea725354c74e5c91735a5d28ce13a5c54e48ec991796ff2c87c1708414";
    let js_k: &str = "c98b7ab37c7521fb4d6dbc707489b33ef7ece29fc6a0b12dddfa33cc88ffd9f9";
    let js_h_after_s: &str = "0a1f68688b0fd52b117f8c1776eff0973f0a23a7f4e0efa565cb97f9d879d0c0";

    // Compute expected values
    let protocol_name = b"Noise_NK_25519_ChaChaPoly_SHA256";

    // Initial state
    let h: [u8; 32] = *protocol_name;
    let ck: [u8; 32] = *protocol_name;

    // MixHash(server_pub)
    let h_after_s = {
        let mut hasher = Sha256::new();
        hasher.update(&h);
        hasher.update(&server_pub);
        let result: [u8; 32] = hasher.finalize().into();
        result
    };

    println!("1. h after MixHash(server_pub):");
    println!("   Expected (Rust): {}", hex::encode(&h_after_s));
    println!("   JS computed:     {}", js_h_after_s);
    println!("   Match: {}", hex::encode(&h_after_s) == js_h_after_s);

    // MixHash(ephemeral_pub)
    let h_after_e = {
        let mut hasher = Sha256::new();
        hasher.update(&h_after_s);
        hasher.update(&ephemeral_pub);
        let result: [u8; 32] = hasher.finalize().into();
        result
    };

    println!("\n2. h after MixHash(ephemeral_pub):");
    println!("   Expected (Rust): {}", hex::encode(&h_after_e));
    println!("   (This is the AD for AEAD encryption)");

    // MixKey with the JS DH result
    // Note: ck for MixKey is the INITIAL ck (protocol_name), NOT the one after MixHash
    let (new_ck, new_k) = hkdf(&ck, &js_es);

    println!("\n3. After MixKey(es) with JS DH result:");
    println!("   ck Expected (Rust): {}", hex::encode(&new_ck));
    println!("   ck JS computed:     {}", js_ck);
    println!("   ck Match: {}", hex::encode(&new_ck) == js_ck);

    println!("\n   k Expected (Rust):  {}", hex::encode(&new_k));
    println!("   k JS computed:      {}", js_k);
    println!("   k Match: {}", hex::encode(&new_k) == js_k);

    // Verify the auth tag
    println!("\n4. Computing auth tag with ChaCha20-Poly1305:");
    println!("   AD (h after e): {}", hex::encode(&h_after_e));
    println!("   Key: {}", hex::encode(&new_k));
    println!("   Nonce: 000000000000000000000000 (12 zeros for n=0)");
    println!("   Plaintext: (empty)");

    // Compute auth tag using chacha20poly1305
    use chacha20poly1305::{ChaCha20Poly1305, KeyInit, AeadInPlace};
    use chacha20poly1305::aead::generic_array::GenericArray;

    let cipher = ChaCha20Poly1305::new(GenericArray::from_slice(&new_k));
    let nonce = GenericArray::from_slice(&[0u8; 12]);
    let mut buffer = Vec::new();
    cipher.encrypt_in_place(nonce, &h_after_e, &mut buffer).unwrap();

    println!("   Expected auth tag: {}", hex::encode(&buffer));

    let js_tag = "e4ddd2b9f3b8581799895b0420e8cf97";
    println!("   JS auth tag:       {}", js_tag);
    println!("   Match: {}", hex::encode(&buffer) == js_tag);

    if hex::encode(&buffer) != js_tag {
        println!("\n!!! AUTH TAG MISMATCH !!!");
        println!("The JS client is computing a different auth tag than expected.");
        println!("This could mean:");
        println!("1. Different h value used as AD");
        println!("2. Different k value used for encryption");
        println!("3. Different nonce format");
    }
}
