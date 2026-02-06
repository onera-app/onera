//! Router Module for Enclave Mesh
//!
//! Manages connections to model server enclaves and routes inference requests.
//! Uses Noise NK protocol as initiator (client) to connect to server enclaves.
//! Fetches public keys dynamically from attestation endpoints.

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use anyhow::{anyhow, Result};
use futures_util::{SinkExt, StreamExt};
use serde::Deserialize;
use snow::{Builder, TransportState};
use tokio::net::TcpStream;
use tokio::sync::RwLock;
use tokio::time::timeout;
use tokio_tungstenite::{connect_async, tungstenite::Message, MaybeTlsStream, WebSocketStream};
use tracing::{debug, info, warn};

use crate::noise::{InferenceRequest, InferenceResponse};

/// Noise protocol pattern (same as server)
const NOISE_PATTERN: &str = "Noise_NK_25519_ChaChaPoly_SHA256";

/// Maximum message size
const MAX_MESSAGE_SIZE: usize = 65536;

/// Connection timeout
const CONNECT_TIMEOUT: Duration = Duration::from_secs(10);

/// Request timeout
const REQUEST_TIMEOUT: Duration = Duration::from_secs(300);

/// Health check interval
const HEALTH_CHECK_INTERVAL: Duration = Duration::from_secs(30);

/// Ping timeout
const PING_TIMEOUT: Duration = Duration::from_secs(5);

/// Attestation fetch timeout
const ATTESTATION_TIMEOUT: Duration = Duration::from_secs(5);

/// Model server configuration
#[derive(Debug, Clone, Deserialize)]
pub struct ModelServerConfig {
    pub id: String,
    pub ws_endpoint: String,
    /// Optional attestation endpoint. If not provided, derived from ws_endpoint.
    pub attestation_endpoint: Option<String>,
    /// Optional static public key. If not provided, fetched from attestation endpoint.
    pub public_key: Option<String>,
    pub models: Vec<String>,
}

impl ModelServerConfig {
    /// Get the attestation endpoint, deriving from ws_endpoint if not specified
    pub fn get_attestation_endpoint(&self) -> String {
        if let Some(ref endpoint) = self.attestation_endpoint {
            return endpoint.clone();
        }

        // Derive from ws_endpoint: ws://host:8081 -> http://host:8080/attestation
        let ws = &self.ws_endpoint;
        let http = ws.replace("ws://", "http://").replace("wss://", "https://");

        // Replace port 8081 with 8080
        let http = if http.contains(":8081") {
            http.replace(":8081", ":8080")
        } else {
            http
        };

        format!("{}/attestation", http.trim_end_matches('/'))
    }
}

/// Attestation response from model server
#[derive(Debug, Deserialize)]
struct AttestationResponse {
    /// Base64-encoded public key
    public_key: String,
    #[allow(dead_code)]
    attestation_type: Option<String>,
}

/// Router configuration
#[derive(Debug, Clone, Deserialize)]
pub struct RouterConfig {
    pub servers: Vec<ModelServerConfig>,
}

impl RouterConfig {
    /// Load router config from file
    pub fn load(path: &str) -> Result<Self> {
        let content = std::fs::read_to_string(path)?;
        let config: RouterConfig = toml::from_str(&content)?;
        Ok(config)
    }

    /// Create config from environment or defaults
    pub fn from_env() -> Result<Self> {
        // Try loading from config file first
        if let Ok(path) = std::env::var("ROUTER_CONFIG") {
            return Self::load(&path);
        }

        // Fall back to environment variables for single server setup
        let server_endpoint = std::env::var("MODEL_SERVER_WS_ENDPOINT")
            .unwrap_or_else(|_| "ws://localhost:8081".to_string());

        // Public key is now optional - will be fetched from attestation
        let server_public_key = std::env::var("MODEL_SERVER_PUBLIC_KEY").ok();

        // Optional explicit attestation endpoint
        let attestation_endpoint = std::env::var("MODEL_SERVER_ATTESTATION_ENDPOINT").ok();

        Ok(RouterConfig {
            servers: vec![ModelServerConfig {
                id: "default".to_string(),
                ws_endpoint: server_endpoint,
                attestation_endpoint,
                public_key: server_public_key,
                models: vec!["*".to_string()],
            }],
        })
    }
}

/// Active connection to a model server
struct ServerConnection {
    ws: WebSocketStream<MaybeTlsStream<TcpStream>>,
    transport: TransportState,
}

/// Router manages connections to model server enclaves
pub struct Router {
    config: RouterConfig,
    connections: RwLock<HashMap<String, ServerConnection>>,
    model_to_server: RwLock<HashMap<String, String>>,
    /// Cache of fetched public keys (server_id -> hex-encoded key)
    public_key_cache: RwLock<HashMap<String, String>>,
}

impl Router {
    /// Create a new router with the given configuration
    pub fn new(config: RouterConfig) -> Self {
        // Build model -> server mapping
        let mut model_to_server = HashMap::new();
        for server in &config.servers {
            for model in &server.models {
                if model == "*" {
                    // Wildcard - this server accepts any model
                    // Don't add to map, handle in get_server_for_model
                } else {
                    model_to_server.insert(model.clone(), server.id.clone());
                }
            }
        }

        Router {
            config,
            connections: RwLock::new(HashMap::new()),
            model_to_server: RwLock::new(model_to_server),
            public_key_cache: RwLock::new(HashMap::new()),
        }
    }

    /// Get the server ID for a given model
    async fn get_server_for_model(&self, model_id: &str) -> Option<String> {
        // Check explicit mapping first
        if let Some(server_id) = self.model_to_server.read().await.get(model_id) {
            return Some(server_id.clone());
        }

        // Fall back to first server with wildcard
        for server in &self.config.servers {
            if server.models.contains(&"*".to_string()) {
                return Some(server.id.clone());
            }
        }

        // Fall back to first server
        self.config.servers.first().map(|s| s.id.clone())
    }

    /// Get server config by ID
    fn get_server_config(&self, server_id: &str) -> Option<&ModelServerConfig> {
        self.config.servers.iter().find(|s| s.id == server_id)
    }

    /// Fetch public key from attestation endpoint
    async fn fetch_public_key(&self, server_config: &ModelServerConfig) -> Result<Vec<u8>> {
        let attestation_url = server_config.get_attestation_endpoint();
        info!("Fetching public key from {}", attestation_url);

        let client = reqwest::Client::new();
        let response = timeout(ATTESTATION_TIMEOUT, client.get(&attestation_url).send())
            .await
            .map_err(|_| anyhow!("Attestation fetch timeout"))?
            .map_err(|e| anyhow!("Failed to fetch attestation: {}", e))?;

        if !response.status().is_success() {
            return Err(anyhow!("Attestation endpoint returned {}", response.status()));
        }

        let attestation: AttestationResponse = response.json().await
            .map_err(|e| anyhow!("Failed to parse attestation response: {}", e))?;

        // Decode base64 public key
        use base64::Engine;
        let public_key = base64::engine::general_purpose::STANDARD
            .decode(&attestation.public_key)
            .map_err(|e| anyhow!("Invalid base64 public key: {}", e))?;

        if public_key.len() != 32 {
            return Err(anyhow!("Public key must be 32 bytes, got {}", public_key.len()));
        }

        info!("Fetched public key: {}", hex::encode(&public_key));
        Ok(public_key)
    }

    /// Get public key for a server, using cache or fetching from attestation
    async fn get_public_key(&self, server_config: &ModelServerConfig) -> Result<Vec<u8>> {
        // Check if we have a static key in config
        if let Some(ref key_hex) = server_config.public_key {
            if !key_hex.is_empty() {
                let key = hex::decode(key_hex)
                    .map_err(|e| anyhow!("Invalid hex public key in config: {}", e))?;
                if key.len() == 32 {
                    return Ok(key);
                }
            }
        }

        // Check cache
        {
            let cache = self.public_key_cache.read().await;
            if let Some(key_hex) = cache.get(&server_config.id) {
                let key = hex::decode(key_hex)
                    .map_err(|e| anyhow!("Invalid cached public key: {}", e))?;
                return Ok(key);
            }
        }

        // Fetch from attestation endpoint
        let public_key = self.fetch_public_key(server_config).await?;

        // Cache it
        {
            let mut cache = self.public_key_cache.write().await;
            cache.insert(server_config.id.clone(), hex::encode(&public_key));
        }

        Ok(public_key)
    }

    /// Invalidate cached public key for a server (call on connection failure)
    async fn invalidate_public_key(&self, server_id: &str) {
        let mut cache = self.public_key_cache.write().await;
        cache.remove(server_id);
    }

    /// Connect to a model server enclave using Noise NK as initiator
    async fn connect_to_server(&self, server_id: &str) -> Result<()> {
        let server_config = self.get_server_config(server_id)
            .ok_or_else(|| anyhow!("Unknown server: {}", server_id))?
            .clone();

        info!("Connecting to model server {} at {}", server_id, server_config.ws_endpoint);

        // Get server's public key (from config, cache, or attestation)
        let server_public_key = self.get_public_key(&server_config).await?;

        // Connect with timeout
        let (ws_stream, _) = timeout(CONNECT_TIMEOUT, connect_async(&server_config.ws_endpoint))
            .await
            .map_err(|_| anyhow!("Connection timeout"))?
            .map_err(|e| anyhow!("WebSocket connection failed: {}", e))?;

        let (mut write, mut read) = ws_stream.split();

        // Create Noise initiator (client) with server's known public key
        let builder = Builder::new(NOISE_PATTERN.parse()?);
        let mut handshake = builder
            .remote_public_key(&server_public_key)
            .build_initiator()?;

        let mut buf = vec![0u8; MAX_MESSAGE_SIZE];

        // Send first handshake message (-> e, es)
        let len = handshake.write_message(&[], &mut buf)?;
        write.send(Message::Binary(buf[..len].to_vec())).await?;
        debug!("Sent handshake initiator message: {} bytes", len);

        // Receive response (<- e, ee)
        let msg = read.next().await
            .ok_or_else(|| anyhow!("Connection closed during handshake"))??;
        let data = match msg {
            Message::Binary(d) => d,
            _ => return Err(anyhow!("Expected binary message")),
        };
        handshake.read_message(&data, &mut buf)?;
        debug!("Received handshake response: {} bytes", data.len());

        // Complete handshake
        if !handshake.is_handshake_finished() {
            return Err(anyhow!("Handshake incomplete"));
        }

        let transport = handshake.into_transport_mode()?;
        info!("Noise handshake complete with server {}", server_id);

        // Reunite the split stream
        let ws = write.reunite(read)
            .map_err(|_| anyhow!("Failed to reunite WebSocket stream"))?;

        // Store connection
        let mut connections = self.connections.write().await;
        connections.insert(server_id.to_string(), ServerConnection { ws, transport });

        Ok(())
    }

    /// Ensure we have a connection to the server for the given model
    async fn ensure_connection(&self, model_id: &str) -> Result<String> {
        let server_id = self.get_server_for_model(model_id).await
            .ok_or_else(|| anyhow!("No server configured for model: {}", model_id))?;

        // Check if already connected
        {
            let connections = self.connections.read().await;
            if connections.contains_key(&server_id) {
                return Ok(server_id);
            }
        }

        // Connect (with retry on key mismatch)
        match self.connect_to_server(&server_id).await {
            Ok(()) => Ok(server_id),
            Err(e) => {
                // If connection failed, invalidate cached key and retry once
                warn!("Connection failed, invalidating cached key and retrying: {}", e);
                self.invalidate_public_key(&server_id).await;
                self.connect_to_server(&server_id).await?;
                Ok(server_id)
            }
        }
    }

    /// Forward an inference request to the appropriate model server
    pub async fn forward_request(&self, request: InferenceRequest) -> Result<InferenceResponse> {
        let model_id = request.model.as_deref().unwrap_or("default");
        info!("forward_request: model={}, messages={}", model_id, request.messages.len());

        let server_id = self.ensure_connection(model_id).await?;
        info!("forward_request: server_id={}", server_id);

        let mut connections = self.connections.write().await;
        let conn = connections.get_mut(&server_id)
            .ok_or_else(|| anyhow!("Connection not found"))?;

        info!("forward_request: got connection, serializing request");

        // Serialize and encrypt request
        let request_json = serde_json::to_vec(&request)?;
        let mut buf = vec![0u8; MAX_MESSAGE_SIZE];
        let len = conn.transport.write_message(&request_json, &mut buf)?;

        // Send encrypted request
        conn.ws.send(Message::Binary(buf[..len].to_vec())).await?;
        info!("forward_request: sent encrypted request to {}: {} bytes", server_id, len);

        // Receive encrypted response with timeout
        let msg = timeout(REQUEST_TIMEOUT, conn.ws.next())
            .await
            .map_err(|_| anyhow!("Request timeout"))?
            .ok_or_else(|| anyhow!("Connection closed"))??;

        let ciphertext = match msg {
            Message::Binary(d) => d,
            Message::Close(_) => {
                // Connection closed, remove it
                connections.remove(&server_id);
                return Err(anyhow!("Server closed connection"));
            }
            _ => return Err(anyhow!("Unexpected message type")),
        };

        // Decrypt response
        let len = conn.transport.read_message(&ciphertext, &mut buf)?;
        let response: InferenceResponse = serde_json::from_slice(&buf[..len])?;

        debug!("Received response from {}: {} bytes content", server_id, response.content.len());
        Ok(response)
    }

    /// Run periodic health checks on all connected servers.
    /// Removes dead connections so they get re-established on next request.
    pub async fn run_health_checks(self: Arc<Self>) {
        let mut interval = tokio::time::interval(HEALTH_CHECK_INTERVAL);
        loop {
            interval.tick().await;

            let server_ids: Vec<String> = {
                let connections = self.connections.read().await;
                connections.keys().cloned().collect()
            };

            if server_ids.is_empty() {
                continue;
            }

            for server_id in server_ids {
                let mut connections = self.connections.write().await;
                if let Some(conn) = connections.get_mut(&server_id) {
                    let ping_result = timeout(
                        PING_TIMEOUT,
                        conn.ws.send(Message::Ping(vec![]))
                    ).await;

                    match ping_result {
                        Ok(Ok(())) => {
                            debug!("Health check OK: {}", server_id);
                        }
                        _ => {
                            warn!("Health check FAILED for {}, removing connection", server_id);
                            if let Some(mut dead) = connections.remove(&server_id) {
                                let _ = dead.ws.close(None).await;
                            }
                            // Invalidate cached public key so it's re-fetched on reconnect
                            drop(connections);
                            self.invalidate_public_key(&server_id).await;
                        }
                    }
                }
            }
        }
    }

    /// Close all connections
    pub async fn close_all(&self) {
        let mut connections = self.connections.write().await;
        for (id, mut conn) in connections.drain() {
            if let Err(e) = conn.ws.close(None).await {
                warn!("Error closing connection to {}: {}", id, e);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_parsing() {
        let toml = r#"
[[servers]]
id = "gpu-1"
ws_endpoint = "ws://gpu1.internal:8081"
models = ["llama-70b", "qwen-72b"]

[[servers]]
id = "cpu-1"
ws_endpoint = "ws://cpu1.internal:8081"
public_key = "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210"
models = ["*"]
"#;

        let config: RouterConfig = toml::from_str(toml).unwrap();
        assert_eq!(config.servers.len(), 2);
        assert_eq!(config.servers[0].id, "gpu-1");
        assert_eq!(config.servers[0].public_key, None); // No static key
        assert_eq!(config.servers[1].models, vec!["*"]);
        assert!(config.servers[1].public_key.is_some()); // Has static key
    }

    #[test]
    fn test_attestation_endpoint_derivation() {
        let config = ModelServerConfig {
            id: "test".to_string(),
            ws_endpoint: "ws://10.0.0.1:8081".to_string(),
            attestation_endpoint: None,
            public_key: None,
            models: vec!["*".to_string()],
        };
        assert_eq!(config.get_attestation_endpoint(), "http://10.0.0.1:8080/attestation");

        let config_with_explicit = ModelServerConfig {
            id: "test".to_string(),
            ws_endpoint: "ws://10.0.0.1:8081".to_string(),
            attestation_endpoint: Some("http://custom:9000/attest".to_string()),
            public_key: None,
            models: vec!["*".to_string()],
        };
        assert_eq!(config_with_explicit.get_attestation_endpoint(), "http://custom:9000/attest");
    }
}
