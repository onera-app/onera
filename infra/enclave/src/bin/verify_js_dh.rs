//! Verify JS DH computation is correct
//!
//! This test needs the ephemeral PRIVATE key from JS to verify
//!
//! Run with: cargo run --bin verify_js_dh

fn main() {
    // Values from JS client log
    let server_pub: [u8; 32] = hex::decode("dfa2f8af8d2b7a94fe8f02fafb1eb995442d52ffcc0bf4896be24d47e6fb7449")
        .unwrap().try_into().unwrap();
    let js_ephemeral_pub: [u8; 32] = hex::decode("68ecad3a83c9b92a66282987f675adb323de078a90674e67c620f2743ebab508")
        .unwrap().try_into().unwrap();
    let js_es: [u8; 32] = hex::decode("dbb7e856659d1c73261e2b6c3e27f1ddd1e5872b8cd5e18838a49ae8714be610")
        .unwrap().try_into().unwrap();

    println!("=== JS Client Values ===");
    println!("Server public key: {}", hex::encode(&server_pub));
    println!("JS ephemeral pub:  {}", hex::encode(&js_ephemeral_pub));
    println!("JS es (DH result): {}", hex::encode(&js_es));

    // To verify the DH, we need to know:
    // 1. Either the JS ephemeral private key, or
    // 2. The server private key
    //
    // X25519 DH is: es = ephemeral_priv * server_pub = server_priv * ephemeral_pub
    //
    // If we had the server private key, we could compute:
    // expected_es = server_priv * js_ephemeral_pub
    // And verify it matches js_es.

    println!("\n=== Verification ===");
    println!("To verify JS DH is correct, we need either:");
    println!("1. The JS ephemeral PRIVATE key (to compute es = e_priv * server_pub)");
    println!("2. The server PRIVATE key (to compute es = s_priv * e_pub)");

    // Check if ephemeral public key is on the curve
    // (Actually, X25519 doesn't require explicit curve checks - it handles low-order points)
    println!("\n=== Ephemeral Key Format Check ===");
    println!("JS ephemeral pub bytes:");
    for (i, chunk) in js_ephemeral_pub.chunks(8).enumerate() {
        println!("  [{:2}-{:2}]: {}", i*8, i*8+7, hex::encode(chunk));
    }

    // The ephemeral public key should be a valid X25519 point
    // One quick check: the high bit of the last byte should be clear (for canonical encoding)
    let high_bit = js_ephemeral_pub[31] & 0x80;
    println!("\nHigh bit of last byte: {} (should be 0 for canonical)", high_bit);

    // Check if es looks reasonable (non-zero, not all same bytes)
    let es_is_zero = js_es.iter().all(|&b| b == 0);
    let es_is_constant = js_es.iter().all(|&b| b == js_es[0]);
    println!("\nes is all zeros: {}", es_is_zero);
    println!("es is all same byte: {}", es_is_constant);

    if es_is_zero {
        println!("\n!!! WARNING: DH result is all zeros - this indicates a problem!");
        println!("Possible causes:");
        println!("1. Ephemeral key is a low-order point");
        println!("2. Server public key is wrong");
    }

    println!("\n=== Next Steps ===");
    println!("Please provide the JS ephemeral PRIVATE key from the browser console.");
    println!("It should be logged as '[Noise] ephemeral PRIVATE key: <hex>'");
}
