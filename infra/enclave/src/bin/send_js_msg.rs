//! Send the exact JS message to the server to verify it works
//!
//! Run with: cargo run --bin send_js_msg

use futures_util::{SinkExt, StreamExt};
use tokio_tungstenite::{connect_async, tungstenite::Message};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // The exact message bytes from the JS client log
    let js_message = hex::decode(
        "68ecad3a83c9b92a66282987f675adb323de078a90674e67c620f2743ebab508e4ddd2b9f3b8581799895b0420e8cf97"
    )?;

    println!("JS message to send: {} bytes", js_message.len());
    println!("  Ephemeral: {}", hex::encode(&js_message[..32]));
    println!("  Auth tag:  {}", hex::encode(&js_message[32..]));

    // Connect to WebSocket
    println!("\nConnecting to wss://private.onera.chat/ws...");
    let (mut ws_stream, _) = connect_async("wss://private.onera.chat/ws").await?;
    println!("WebSocket connected!");

    // Send the exact JS message
    ws_stream.send(Message::Binary(js_message.into())).await?;
    println!("Sent JS message");

    // Receive response
    println!("\nWaiting for response...");
    match ws_stream.next().await {
        Some(Ok(Message::Binary(data))) => {
            println!("Received response: {} bytes", data.len());
            if data.len() >= 32 {
                println!("  First 32 bytes: {}", hex::encode(&data[..32]));
                println!("\n✓ Server accepted the JS message!");
            } else {
                println!("Response too short");
            }
        }
        Some(Ok(msg)) => {
            println!("Received unexpected message type: {:?}", msg);
        }
        Some(Err(e)) => {
            println!("WebSocket error: {:?}", e);
        }
        None => {
            println!("\n✗ Connection closed without response");
            println!("Server rejected the message (decrypt error)");
        }
    }

    Ok(())
}
