//! Test to verify Noise handshake values match between JS and Rust
//!
//! Run with: cargo run --bin noise_test

use sha2::{Sha256, Digest};
use snow::Builder;

const NOISE_PATTERN: &str = "Noise_NK_25519_ChaChaPoly_SHA256";

fn main() {
    // Server public key from attestation (what the client is using)
    let server_pub: [u8; 32] = hex::decode("dfa2f8af8d2b7a94fe8f02fafb1eb995442d52ffcc0bf4896be24d47e6fb7449")
        .unwrap()
        .try_into()
        .unwrap();

    println!("=== Expected Values (computed manually) ===");

    // Initial h = protocol name (exactly 32 bytes)
    let protocol_name = b"Noise_NK_25519_ChaChaPoly_SHA256";
    println!("Protocol name: {}", std::str::from_utf8(protocol_name).unwrap());
    println!("Initial h: {}", hex::encode(protocol_name));

    // h after MixHash(server_pub)
    let mut hasher = Sha256::new();
    hasher.update(protocol_name);
    hasher.update(&server_pub);
    let h_after_mixhash_s: [u8; 32] = hasher.finalize().into();
    println!("h after MixHash(server_pub): {}", hex::encode(&h_after_mixhash_s));

    // Client's ephemeral public key from the log
    let client_ephemeral: [u8; 32] = hex::decode("68ecad3a83c9b92a66282987f675adb323de078a90674e67c620f2743ebab508")
        .unwrap()
        .try_into()
        .unwrap();

    // h after MixHash(e)
    let mut hasher = Sha256::new();
    hasher.update(&h_after_mixhash_s);
    hasher.update(&client_ephemeral);
    let h_after_mixhash_e: [u8; 32] = hasher.finalize().into();
    println!("h after MixHash(ephemeral): {}", hex::encode(&h_after_mixhash_e));

    println!("\n=== Client's Values (from browser console) ===");
    println!("Initial h: 4e6f6973655f4e4b5f32353531395f436861436861506f6c795f534841323536");
    println!("h after MixHash(server_pub): 0a1f68688b0fd52b117f8c1776eff0973f0a23a7f4e0efa565cb97f9d879d0c0");

    println!("\n=== Comparison ===");
    let client_h_after_s = "0a1f68688b0fd52b117f8c1776eff0973f0a23a7f4e0efa565cb97f9d879d0c0";
    if hex::encode(&h_after_mixhash_s) == client_h_after_s {
        println!("✓ h after MixHash(server_pub) MATCHES!");
    } else {
        println!("✗ h after MixHash(server_pub) MISMATCH!");
        println!("  Expected: {}", hex::encode(&h_after_mixhash_s));
        println!("  Client:   {}", client_h_after_s);
    }

    println!("\n=== Testing with Snow ===");

    // Build a snow responder with a test private key
    // We need to find or generate a private key that corresponds to the public key
    // For now, let's just verify snow's handshake setup

    let builder = Builder::new(NOISE_PATTERN.parse().unwrap());
    let keypair = builder.generate_keypair().unwrap();

    println!("Snow generated test keypair:");
    println!("  Private: {}", hex::encode(&keypair.private));
    println!("  Public:  {}", hex::encode(&keypair.public));

    // Test message from client
    let client_msg = hex::decode("68ecad3a83c9b92a66282987f675adb323de078a90674e67c620f2743ebab508e4ddd2b9f3b8581799895b0420e8cf97").unwrap();

    println!("\nClient message: {} bytes", client_msg.len());
    println!("  Ephemeral: {}", hex::encode(&client_msg[..32]));
    println!("  Auth tag:  {}", hex::encode(&client_msg[32..]));

    // Try to process with snow responder using the test keypair
    // This will fail because the keypair doesn't match, but shows snow works
    let mut responder = Builder::new(NOISE_PATTERN.parse().unwrap())
        .local_private_key(&keypair.private)
        .build_responder()
        .unwrap();

    let mut buf = vec![0u8; 65535];
    match responder.read_message(&client_msg, &mut buf) {
        Ok(len) => println!("\nSnow responder accepted message! Payload: {} bytes", len),
        Err(e) => println!("\nSnow responder rejected (expected - wrong key): {:?}", e),
    }

    println!("\n=== Key Question ===");
    println!("Does the server's actual private key correspond to public key:");
    println!("  {}", hex::encode(&server_pub));
    println!("\nCheck the server startup logs for:");
    println!("  'Noise server initialized with public key: <hex>'");
    println!("If that hex doesn't match the above, there's a key mismatch.");
}
