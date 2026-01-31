//! Verify that snow derives the correct public key from a private key
//!
//! Run with: cargo run --bin verify_keypair

use snow::Builder;

const NOISE_PATTERN: &str = "Noise_NK_25519_ChaChaPoly_SHA256";

fn main() {
    let builder = Builder::new(NOISE_PATTERN.parse().unwrap());

    // Generate a keypair
    let keypair = builder.generate_keypair().unwrap();
    println!("Generated keypair:");
    println!("  Private: {}", hex::encode(&keypair.private));
    println!("  Public:  {}", hex::encode(&keypair.public));

    // Now create a responder with just the private key and see what public key it uses
    let mut responder = Builder::new(NOISE_PATTERN.parse().unwrap())
        .local_private_key(&keypair.private)
        .build_responder()
        .unwrap();

    // Create an initiator with the original public key
    let mut initiator = Builder::new(NOISE_PATTERN.parse().unwrap())
        .remote_public_key(&keypair.public)
        .build_initiator()
        .unwrap();

    // Test the handshake
    let mut msg1 = vec![0u8; 65535];
    let len1 = initiator.write_message(&[], &mut msg1).unwrap();
    println!("\nInitiator message 1: {} bytes", len1);
    println!("  Ephemeral: {}", hex::encode(&msg1[..32]));
    println!("  Auth tag:  {}", hex::encode(&msg1[32..len1]));

    let mut buf = vec![0u8; 65535];
    match responder.read_message(&msg1[..len1], &mut buf) {
        Ok(len) => {
            println!("\n✓ Responder accepted message 1! Payload: {} bytes", len);

            // Complete the handshake
            let len2 = responder.write_message(&[], &mut msg1).unwrap();
            println!("\nResponder message 2: {} bytes", len2);

            match initiator.read_message(&msg1[..len2], &mut buf) {
                Ok(_) => {
                    println!("✓ Initiator accepted message 2!");
                    println!("\n✓ Full handshake succeeded!");
                }
                Err(e) => println!("✗ Initiator rejected message 2: {:?}", e),
            }
        }
        Err(e) => {
            println!("\n✗ Responder rejected message 1: {:?}", e);
            println!("This would mean snow is deriving a different public key!");
        }
    }

    // Manually derive public key from private key using x25519
    let derived_pub = x25519_dalek::x25519(
        keypair.private.as_slice().try_into().unwrap(),
        [9u8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
         0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]  // X25519 base point
    );
    println!("\nManually derived public key: {}", hex::encode(&derived_pub));
    println!("Original public key:         {}", hex::encode(&keypair.public));
    println!("Match: {}", derived_pub == keypair.public.as_slice());
}
