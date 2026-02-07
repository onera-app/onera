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

use crate::inference::StreamChunk;
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
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InferenceRequest {
    pub model: Option<String>,
    pub messages: Vec<ChatMessage>,
    #[serde(default)]
    pub stream: bool,
    pub temperature: Option<f32>,
    pub max_tokens: Option<u32>,
}

/// Chat message format
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

/// Response to client (before encryption)
#[derive(Debug, Clone, Serialize, Deserialize)]
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
        debug!(
            "Created Noise responder for {}, server pubkey: {}",
            peer_addr,
            hex::encode(state.noise_server.public_key())
        );
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

    debug!(
        "Received handshake message: {} bytes, hex: {}",
        client_data.len(),
        hex::encode(&client_data)
    );

    // Process client's message and generate response
    // Expected: 48 bytes (32-byte ephemeral key + 16-byte auth tag for empty payload)
    let _payload_len = match handshake.read_message(&client_data, &mut buf) {
        Ok(len) => {
            debug!("Handshake read_message success, payload: {} bytes", len);
            len
        }
        Err(e) => {
            error!("Handshake FAILED for {}: {:?}", peer_addr, e);
            error!(
                "  Expected: 48 bytes (32 ephemeral + 16 tag), received: {} bytes",
                client_data.len()
            );
            if client_data.len() >= 32 {
                error!("  Ephemeral key (first 32 bytes): {}", hex::encode(&client_data[..32]));
            }
            return Err(anyhow!("Noise handshake failed: {}", e));
        }
    };
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
                info!(
                    "Received inference request: model={:?}, messages={}, stream={}",
                    request.model, request.messages.len(), request.stream
                );

                // Process inference based on mode
                let state_guard = state.read().await;
                info!("Processing in {:?} mode", state_guard.mode);

                match state_guard.mode {
                    crate::OperatingMode::Server => {
                        // Server mode: forward to local vLLM
                        if let Some(ref inference) = state_guard.inference {
                            if request.stream {
                                // Streaming mode
                                drop(state_guard); // Release lock before async streaming
                                let inference = {
                                    let s = state.read().await;
                                    s.inference.as_ref().unwrap().clone()
                                };
                                match inference.chat_completion_stream(request).await {
                                    Ok(mut rx) => {
                                        while let Some(chunk) = rx.recv().await {
                                            let chunk_json = serde_json::to_vec(&chunk)?;
                                            let len = transport.write_message(&chunk_json, &mut buf)?;
                                            write.send(Message::Binary(buf[..len].to_vec())).await?;
                                            debug!("Sent stream chunk: {:?}", chunk);
                                        }
                                        // Send empty message to signal end of stream
                                        write.send(Message::Binary(vec![])).await?;
                                        debug!("Sent end-of-stream signal");
                                    }
                                    Err(e) => {
                                        error!("Streaming error: {}", e);
                                        let response = InferenceResponse {
                                            content: String::new(),
                                            finish_reason: None,
                                            error: Some(e.to_string()),
                                        };
                                        let response_json = serde_json::to_vec(&response)?;
                                        let len = transport.write_message(&response_json, &mut buf)?;
                                        write.send(Message::Binary(buf[..len].to_vec())).await?;
                                        // Send empty message to signal end of stream after error
                                        write.send(Message::Binary(vec![])).await?;
                                    }
                                }
                            } else {
                                // Non-streaming mode: send single response, no end-of-stream signal
                                let response = process_inference_local(inference, request).await;
                                info!("Inference response: content_len={}, error={:?}",
                                       response.content.len(), response.error);
                                let response_json = serde_json::to_vec(&response)?;
                                let len = transport.write_message(&response_json, &mut buf)?;
                                write.send(Message::Binary(buf[..len].to_vec())).await?;
                            }
                        } else {
                            let response = InferenceResponse {
                                content: String::new(),
                                finish_reason: None,
                                error: Some("Inference client not configured".to_string()),
                            };
                            let response_json = serde_json::to_vec(&response)?;
                            let len = transport.write_message(&response_json, &mut buf)?;
                            write.send(Message::Binary(buf[..len].to_vec())).await?;
                            // Send empty message to signal end of stream
                            write.send(Message::Binary(vec![])).await?;
                        }
                    }
                    crate::OperatingMode::Router => {
                        // Router mode: forward to model server enclave
                        info!("Router mode: forwarding to model server (stream={})", request.stream);
                        if let Some(ref router) = state_guard.router {
                            let router = router.clone();
                            drop(state_guard); // Release lock before async call

                            if request.stream {
                                // Streaming mode: relay chunks from model server
                                match router.forward_request_streaming(request).await {
                                    Ok(mut rx) => {
                                        while let Some(chunk_result) = rx.recv().await {
                                            match chunk_result {
                                                Ok(chunk) => {
                                                    let chunk_json = serde_json::to_vec(&chunk)?;
                                                    let len = transport.write_message(&chunk_json, &mut buf)?;
                                                    write.send(Message::Binary(buf[..len].to_vec())).await?;
                                                }
                                                Err(e) => {
                                                    error!("Streaming error from model server: {}", e);
                                                    let err_response = InferenceResponse {
                                                        content: String::new(),
                                                        finish_reason: None,
                                                        error: Some(e.to_string()),
                                                    };
                                                    let err_json = serde_json::to_vec(&err_response)?;
                                                    let len = transport.write_message(&err_json, &mut buf)?;
                                                    write.send(Message::Binary(buf[..len].to_vec())).await?;
                                                    break;
                                                }
                                            }
                                        }
                                        // Send empty message to signal end of stream
                                        write.send(Message::Binary(vec![])).await?;
                                        debug!("Sent end-of-stream signal (streaming)");
                                    }
                                    Err(e) => {
                                        error!("Failed to start streaming: {}", e);
                                        let response = InferenceResponse {
                                            content: String::new(),
                                            finish_reason: None,
                                            error: Some(e.to_string()),
                                        };
                                        let response_json = serde_json::to_vec(&response)?;
                                        let len = transport.write_message(&response_json, &mut buf)?;
                                        write.send(Message::Binary(buf[..len].to_vec())).await?;
                                        write.send(Message::Binary(vec![])).await?;
                                    }
                                }
                            } else {
                                // Non-streaming mode
                                let response = process_inference_routed(&router, request).await;
                                info!("Inference response: content_len={}, error={:?}",
                                       response.content.len(), response.error);
                                let response_json = serde_json::to_vec(&response)?;
                                let len = transport.write_message(&response_json, &mut buf)?;
                                write.send(Message::Binary(buf[..len].to_vec())).await?;
                                // Send empty message to signal end of stream
                                write.send(Message::Binary(vec![])).await?;
                                debug!("Sent end-of-stream signal");
                            }
                        } else {
                            let response = InferenceResponse {
                                content: String::new(),
                                finish_reason: None,
                                error: Some("Router not configured".to_string()),
                            };
                            let response_json = serde_json::to_vec(&response)?;
                            let len = transport.write_message(&response_json, &mut buf)?;
                            write.send(Message::Binary(buf[..len].to_vec())).await?;
                            write.send(Message::Binary(vec![])).await?;
                        }
                    }
                }
                debug!("Response sent successfully");
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

/// Process inference request locally (server mode)
async fn process_inference_local(
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
            error!("Local inference error: {}", e);
            InferenceResponse {
                content: String::new(),
                finish_reason: None,
                error: Some(e.to_string()),
            }
        }
    }
}

/// Process inference request via router (router mode)
async fn process_inference_routed(
    router: &crate::router::Router,
    request: InferenceRequest,
) -> InferenceResponse {
    match router.forward_request(request).await {
        Ok(response) => response,
        Err(e) => {
            error!("Routed inference error: {}", e);
            InferenceResponse {
                content: String::new(),
                finish_reason: None,
                error: Some(e.to_string()),
            }
        }
    }
}
