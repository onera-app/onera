//! Test client to verify Noise handshake with the actual server
//!
//! Run with: cargo run --bin test_client

use futures_util::{SinkExt, StreamExt};
use snow::Builder;
use tokio_tungstenite::{connect_async, tungstenite::Message};

const NOISE_PATTERN: &str = "Noise_NK_25519_ChaChaPoly_SHA256";

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Fetch attestation to get server public key
    println!("Fetching attestation from https://private.onera.chat/attestation...");
    let client = reqwest::Client::new();
    let resp = client
        .get("https://private.onera.chat/attestation")
        .send()
        .await?;

    let attestation: serde_json::Value = resp.json().await?;
    let public_key_b64 = attestation["public_key"].as_str().unwrap();
    println!("Server public key (base64): {}", public_key_b64);

    // Decode base64 public key
    use base64::Engine;
    let server_pub: [u8; 32] = base64::engine::general_purpose::STANDARD
        .decode(public_key_b64)?
        .try_into()
        .map_err(|_| "Invalid key length")?;
    println!("Server public key (hex): {}", hex::encode(&server_pub));

    // Build snow initiator
    let mut initiator = Builder::new(NOISE_PATTERN.parse()?)
        .remote_public_key(&server_pub)
        .build_initiator()?;

    // Connect to WebSocket
    println!("\nConnecting to wss://private.onera.chat/ws...");
    let (mut ws_stream, _) = connect_async("wss://private.onera.chat/ws").await?;
    println!("WebSocket connected!");

    // Generate handshake message 1
    let mut msg1_buf = vec![0u8; 65535];
    let len1 = initiator.write_message(&[], &mut msg1_buf)?;
    let msg1 = &msg1_buf[..len1];

    println!("\n=== Message 1 ===");
    println!("Length: {} bytes", len1);
    println!("Hex: {}", hex::encode(msg1));
    println!("  Ephemeral: {}", hex::encode(&msg1[..32]));
    println!("  Auth tag:  {}", hex::encode(&msg1[32..]));

    // Send message 1
    ws_stream.send(Message::Binary(msg1.to_vec().into())).await?;
    println!("Sent message 1");

    // Receive message 2
    println!("\nWaiting for message 2...");
    match ws_stream.next().await {
        Some(Ok(Message::Binary(data))) => {
            println!("Received message 2: {} bytes", data.len());
            if data.len() >= 32 {
                println!("  Ephemeral: {}", hex::encode(&data[..32]));
                if data.len() > 32 {
                    println!("  Encrypted: {}", hex::encode(&data[32..]));
                }

                // Process message 2
                let mut buf = vec![0u8; 65535];
                match initiator.read_message(&data, &mut buf) {
                    Ok(len) => {
                        println!("\n✓ Handshake successful! Payload: {} bytes", len);

                        // Convert to transport mode
                        let _transport = initiator.into_transport_mode()?;
                        println!("Transport mode established!");
                    }
                    Err(e) => {
                        println!("\n✗ Failed to process message 2: {:?}", e);
                    }
                }
            } else {
                println!("Message 2 too short!");
            }
        }
        Some(Ok(msg)) => {
            println!("Received unexpected message type: {:?}", msg);
        }
        Some(Err(e)) => {
            println!("WebSocket error: {:?}", e);
        }
        None => {
            println!("Connection closed without response");
        }
    }

    Ok(())
}
