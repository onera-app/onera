//! Noise Protocol Implementation (NK Pattern Responder)
//!
//! Implements the Noise NK handshake pattern where:
//! - Server has a known static public key (published in attestation)
//! - Client sends ephemeral key, server responds with ephemeral
//! - Results in authenticated, encrypted channel

use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;

use anyhow::{anyhow, Result};
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use snow::{Builder, HandshakeState, TransportState};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{RwLock, Semaphore};
use tokio::time::timeout;
use tokio_tungstenite::{accept_async, tungstenite::Message};
use tracing::{debug, error, info, warn};
use zeroize::{Zeroize, ZeroizeOnDrop};

use crate::AppState;

/// Noise protocol pattern: NK (Known server key)
const NOISE_PATTERN: &str = "Noise_NK_25519_ChaChaPoly_SHA256";

/// Maximum message size (64KB should be plenty for chat messages)
const MAX_MESSAGE_SIZE: usize = 65536;

/// Maximum concurrent connections to prevent resource exhaustion
const MAX_CONCURRENT_CONNECTIONS: usize = 100;

/// Timeout for reading WebSocket messages (10 minutes)
const MESSAGE_READ_TIMEOUT: Duration = Duration::from_secs(600);

/// Noise server that manages the static keypair
#[derive(Zeroize, ZeroizeOnDrop)]
pub struct NoiseServer {
    /// Server's static private key
    private_key: [u8; 32],
    /// Server's static public key
    #[zeroize(skip)]
    public_key: [u8; 32],
}

impl NoiseServer {
    /// Create a new Noise server with a fresh keypair
    pub fn new() -> Result<Self> {
        let builder = Builder::new(NOISE_PATTERN.parse()?);
        let keypair = builder.generate_keypair()?;

        let mut private_key = [0u8; 32];
        let mut public_key = [0u8; 32];
        private_key.copy_from_slice(&keypair.private);
        public_key.copy_from_slice(&keypair.public);

        Ok(Self {
            private_key,
            public_key,
        })
    }

    /// Get the server's public key
    pub fn public_key(&self) -> [u8; 32] {
        self.public_key
    }

    /// Create a new responder handshake state
    pub fn create_responder(&self) -> Result<HandshakeState> {
        let builder = Builder::new(NOISE_PATTERN.parse()?);
        let state = builder
            .local_private_key(&self.private_key)
            .build_responder()?;
        Ok(state)
    }
}

/// Request from client (after decryption)
#[derive(Debug, Deserialize)]
pub struct InferenceRequest {
    pub model: Option<String>,
    pub messages: Vec<ChatMessage>,
    #[serde(default)]
    pub stream: bool,
    pub temperature: Option<f32>,
    pub max_tokens: Option<u32>,
}

/// Chat message format
#[derive(Debug, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

/// Response to client (before encryption)
#[derive(Debug, Serialize)]
pub struct InferenceResponse {
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub finish_reason: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Run the WebSocket server for Noise protocol connections
pub async fn run_websocket_server(
    addr: SocketAddr,
    state: Arc<RwLock<AppState>>,
) -> Result<()> {
    let listener = TcpListener::bind(addr).await?;
    let connection_semaphore = Arc::new(Semaphore::new(MAX_CONCURRENT_CONNECTIONS));
    info!("Noise WebSocket server listening on {} (max {} concurrent connections)", addr, MAX_CONCURRENT_CONNECTIONS);

    loop {
        match listener.accept().await {
            Ok((stream, peer_addr)) => {
                let permit = match connection_semaphore.clone().try_acquire_owned() {
                    Ok(permit) => permit,
                    Err(_) => {
                        warn!("Connection limit reached, rejecting connection from {}", peer_addr);
                        continue;
                    }
                };

                info!("New connection from {}", peer_addr);
                let state = state.clone();
                tokio::spawn(async move {
                    let _permit = permit; // Hold permit until connection completes
                    if let Err(e) = handle_connection(stream, peer_addr, state).await {
                        error!("Connection error from {}: {}", peer_addr, e);
                    }
                });
            }
            Err(e) => {
                error!("Accept error: {}", e);
            }
        }
    }
}

/// Handle a single WebSocket connection
async fn handle_connection(
    stream: TcpStream,
    peer_addr: SocketAddr,
    state: Arc<RwLock<AppState>>,
) -> Result<()> {
    let ws_stream = accept_async(stream).await?;
    let (mut write, mut read) = ws_stream.split();

    // Create responder handshake state
    let mut handshake = {
        let state = state.read().await;
        state.noise_server.create_responder()?
    };

    // Buffer for handshake messages
    let mut buf = vec![0u8; MAX_MESSAGE_SIZE];

    // Receive client's ephemeral key (first handshake message)
    let client_msg = read
        .next()
        .await
        .ok_or_else(|| anyhow!("Connection closed during handshake"))??;

    let client_data = match client_msg {
        Message::Binary(data) => data,
        _ => return Err(anyhow!("Expected binary message for handshake")),
    };

    debug!("Received handshake message: {} bytes", client_data.len());

    // Process client's message and generate response
    handshake.read_message(&client_data, &mut buf)?;
    let len = handshake.write_message(&[], &mut buf)?;

    // Send server's ephemeral key
    write.send(Message::Binary(buf[..len].to_vec())).await?;
    debug!("Sent handshake response: {} bytes", len);

    // Complete handshake
    if !handshake.is_handshake_finished() {
        return Err(anyhow!("Handshake not complete"));
    }

    let mut transport = handshake.into_transport_mode()?;
    info!("Noise handshake complete with {}", peer_addr);

    // Main message loop
    handle_messages(&mut read, &mut write, &mut transport, state).await
}

/// Handle encrypted messages after handshake
async fn handle_messages(
    read: &mut futures_util::stream::SplitStream<
        tokio_tungstenite::WebSocketStream<TcpStream>,
    >,
    write: &mut futures_util::stream::SplitSink<
        tokio_tungstenite::WebSocketStream<TcpStream>,
        Message,
    >,
    transport: &mut TransportState,
    state: Arc<RwLock<AppState>>,
) -> Result<()> {
    let mut buf = vec![0u8; MAX_MESSAGE_SIZE];

    loop {
        // Apply timeout to message reads
        let msg = match timeout(MESSAGE_READ_TIMEOUT, read.next()).await {
            Ok(Some(msg)) => msg?,
            Ok(None) => break, // Stream ended
            Err(_) => {
                warn!("Connection timed out after {:?}", MESSAGE_READ_TIMEOUT);
                return Err(anyhow!("Connection timed out"));
            }
        };

        match msg {
            Message::Binary(ciphertext) => {
                // Decrypt incoming message
                let len = transport.read_message(&ciphertext, &mut buf)?;
                let plaintext = &buf[..len];

                // Parse request with sanitized error handling to prevent plaintext leakage
                let request: InferenceRequest = serde_json::from_slice(plaintext)
                    .map_err(|_| anyhow!("Failed to parse request: invalid JSON format"))?;
                debug!(
                    "Received inference request, stream={}",
                    request.stream
                );

                // Process inference
                let response = {
                    let state = state.read().await;
                    process_inference(&state.inference, request).await
                };

                // Serialize and encrypt response
                let response_json = serde_json::to_vec(&response)?;
                let len = transport.write_message(&response_json, &mut buf)?;

                // Send encrypted response
                write.send(Message::Binary(buf[..len].to_vec())).await?;
            }
            Message::Close(_) => {
                info!("Client requested close");
                break;
            }
            Message::Ping(data) => {
                write.send(Message::Pong(data)).await?;
            }
            _ => {
                warn!("Unexpected message type");
            }
        }
    }

    Ok(())
}

/// Process an inference request
async fn process_inference(
    client: &crate::inference::InferenceClient,
    request: InferenceRequest,
) -> InferenceResponse {
    match client.chat_completion(request).await {
        Ok(content) => InferenceResponse {
            content,
            finish_reason: Some("stop".to_string()),
            error: None,
        },
        Err(e) => {
            error!("Inference error: {}", e);
            InferenceResponse {
                content: String::new(),
                finish_reason: None,
                error: Some(e.to_string()),
            }
        }
    }
}
