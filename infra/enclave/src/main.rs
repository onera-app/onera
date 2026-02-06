//! Onera Enclave Runtime
//!
//! Private inference enclave that can run in two modes:
//! - Server mode: Forwards requests to local vLLM/llama.cpp server
//! - Router mode: Routes requests to model server enclaves
//!
//! Both modes:
//! - Establish encrypted channels via Noise NK protocol
//! - Provide attestation quotes with bound public keys

mod attestation;
mod inference;
mod noise;
mod router;

use std::net::SocketAddr;
use std::sync::Arc;

use axum::{
    routing::get,
    Json,
    Router,
};
use serde::Serialize;
// CORS is handled by Caddy reverse proxy - don't add here to avoid duplicate headers
use tokio::sync::RwLock;
use tracing::{info, warn, Level};
use tracing_subscriber::EnvFilter;

use crate::attestation::AttestationService;
use crate::inference::InferenceClient;
use crate::noise::NoiseServer;
use crate::router::{Router as EnclaveRouter, RouterConfig};

/// Operating mode
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum OperatingMode {
    /// Server mode: forward to local vLLM
    Server,
    /// Router mode: route to model server enclaves
    Router,
}

/// Shared application state
pub struct AppState {
    pub noise_server: NoiseServer,
    pub attestation: AttestationService,
    pub mode: OperatingMode,
    /// Inference client (server mode only)
    pub inference: Option<InferenceClient>,
    /// Router (router mode only)
    pub router: Option<Arc<EnclaveRouter>>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::builder()
                .with_default_directive(Level::INFO.into())
                .from_env_lossy(),
        )
        .init();

    // Determine operating mode
    let router_mode = std::env::var("ROUTER_MODE")
        .map(|v| v == "true" || v == "1")
        .unwrap_or(false);

    let mode = if router_mode {
        OperatingMode::Router
    } else {
        OperatingMode::Server
    };

    info!("Starting Onera Enclave Runtime in {:?} mode", mode);

    // Initialize Noise server (generates keypair)
    let noise_server = NoiseServer::new()?;
    let public_key = noise_server.public_key();
    info!("Noise server initialized with public key: {}", hex::encode(&public_key));

    // Initialize attestation service with the public key (async to detect Azure)
    let attestation = AttestationService::new(public_key).await;
    info!("Attestation service initialized");

    // Initialize based on mode
    let (inference, router) = match mode {
        OperatingMode::Server => {
            let vllm_url = std::env::var("VLLM_URL")
                .unwrap_or_else(|_| "http://localhost:8000".to_string());
            let inference = InferenceClient::new(&vllm_url)?;
            info!("Inference client initialized, targeting: {}", vllm_url);
            (Some(inference), None)
        }
        OperatingMode::Router => {
            let config = RouterConfig::from_env()?;
            info!("Router config loaded with {} server(s)", config.servers.len());
            for server in &config.servers {
                info!("  - {} at {} (models: {:?})", server.id, server.ws_endpoint, server.models);
            }
            let router = Arc::new(EnclaveRouter::new(config));

            // Start health check background task
            let router_for_health = Arc::clone(&router);
            tokio::spawn(async move {
                router_for_health.run_health_checks().await;
            });

            (None, Some(router))
        }
    };

    // Create shared state
    let state = Arc::new(RwLock::new(AppState {
        noise_server,
        attestation,
        mode,
        inference,
        router,
    }));

    // Build HTTP router for attestation and models endpoints
    // Note: CORS is handled by Caddy reverse proxy
    let http_app = Router::new()
        .route("/attestation", get(attestation::get_attestation))
        .route("/models", get(get_models))
        .route("/health", get(health_check))
        .with_state(state.clone());

    // Get bind addresses from env or use defaults
    let http_addr: SocketAddr = std::env::var("HTTP_ADDR")
        .unwrap_or_else(|_| "0.0.0.0:8080".to_string())
        .parse()?;
    let ws_addr: SocketAddr = std::env::var("WS_ADDR")
        .unwrap_or_else(|_| "0.0.0.0:8081".to_string())
        .parse()?;

    info!("Starting HTTP server on {}", http_addr);
    info!("Starting WebSocket server on {}", ws_addr);

    // Spawn HTTP server
    let http_handle = tokio::spawn(async move {
        let listener = tokio::net::TcpListener::bind(http_addr).await?;
        axum::serve(listener, http_app).await?;
        Ok::<(), anyhow::Error>(())
    });

    // Run WebSocket server for Noise protocol
    let ws_handle = tokio::spawn(noise::run_websocket_server(ws_addr, state));

    // Wait for both servers
    tokio::select! {
        result = http_handle => {
            match result {
                Err(e) => return Err(anyhow::anyhow!("HTTP server task panicked: {}", e)),
                Ok(Err(e)) => return Err(e.context("HTTP server failed")),
                Ok(Ok(())) => {}
            }
        }
        result = ws_handle => {
            match result {
                Err(e) => return Err(anyhow::anyhow!("WebSocket server task panicked: {}", e)),
                Ok(Err(e)) => return Err(e.context("WebSocket server failed")),
                Ok(Ok(())) => {}
            }
        }
    }

    Ok(())
}

/// Health check endpoint
async fn health_check() -> &'static str {
    "OK"
}

/// Model info returned by /models endpoint
#[derive(Serialize)]
struct ModelInfo {
    id: String,
    name: String,
    #[serde(rename = "displayName")]
    display_name: String,
    provider: String,
    #[serde(rename = "contextLength")]
    context_length: u32,
}

/// Format model ID to human-readable display name
fn format_model_display_name(id: &str) -> String {
    // Extract model name from path (e.g., "meta-llama/Llama-3.3-70B-Instruct" -> "Llama-3.3-70B-Instruct")
    let name = id.split('/').last().unwrap_or(id);

    // Remove file extension
    let name = name.trim_end_matches(".gguf");

    // Remove quantization suffixes (q4_k_m, q5_k_s, Q4_K_M, etc.)
    let name = remove_quantization_suffix(name);

    // Split into parts and process
    let parts: Vec<&str> = name.split(|c| c == '-' || c == '_').collect();

    let formatted_parts: Vec<String> = parts.iter().filter_map(|part| {
        let part = (*part).trim();
        if part.is_empty() {
            return None;
        }

        // Handle model names with versions (qwen2.5 -> Qwen 2.5, llama3.1 -> Llama 3.1)
        if let Some(pos) = part.find(|c: char| c.is_ascii_digit()) {
            let (name_part, version_part) = part.split_at(pos);
            if !name_part.is_empty() {
                return Some(format!("{} {}", title_case(name_part), version_part));
            }
        }

        // Handle size indicators (7b -> 7B, 70b -> 70B)
        let lower = part.to_lowercase();
        if lower.ends_with('b') {
            let num_part = &lower[..lower.len()-1];
            if !num_part.is_empty() && num_part.chars().all(|c| c.is_ascii_digit() || c == '.') {
                return Some(format!("{}B", num_part));
            }
        }

        // Title case other words
        Some(title_case(part))
    }).collect();

    format!("{} (Private)", formatted_parts.join(" "))
}

/// Remove quantization suffixes like q4_k_m, Q5_K_S, etc.
fn remove_quantization_suffix(name: &str) -> &str {
    // Common quantization patterns at the end
    let suffixes = [
        "-q4-k-m", "-q4_k_m", "-Q4_K_M", "_q4_k_m", "_Q4_K_M",
        "-q5-k-m", "-q5_k_m", "-Q5_K_M", "_q5_k_m", "_Q5_K_M",
        "-q5-k-s", "-q5_k_s", "-Q5_K_S", "_q5_k_s", "_Q5_K_S",
        "-q4-k-s", "-q4_k_s", "-Q4_K_S", "_q4_k_s", "_Q4_K_S",
        "-q6-k", "-q6_k", "-Q6_K", "_q6_k", "_Q6_K",
        "-q8-0", "-q8_0", "-Q8_0", "_q8_0", "_Q8_0",
        "-fp16", "-FP16", "_fp16", "_FP16",
    ];

    for suffix in suffixes {
        if let Some(stripped) = name.strip_suffix(suffix) {
            return stripped;
        }
    }
    name
}

/// Convert string to title case
fn title_case(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        None => String::new(),
        Some(first) => first.to_uppercase().collect::<String>() + &chars.as_str().to_lowercase(),
    }
}

/// Models endpoint - returns available models from underlying LLM server or model servers
async fn get_models(
    axum::extract::State(state): axum::extract::State<Arc<RwLock<AppState>>>,
) -> Json<Vec<ModelInfo>> {
    let state = state.read().await;

    match state.mode {
        OperatingMode::Server => {
            // Server mode: get models from local vLLM
            if let Some(ref inference) = state.inference {
                match inference.list_models().await {
                    Ok(models) => {
                        let model_infos: Vec<ModelInfo> = models
                            .into_iter()
                            .map(|id| {
                                ModelInfo {
                                    display_name: format_model_display_name(&id),
                                    id: id.clone(),
                                    name: id,
                                    provider: "onera-private".to_string(),
                                    context_length: 8192,
                                }
                            })
                            .collect();
                        return Json(model_infos);
                    }
                    Err(e) => {
                        warn!("Failed to fetch models from vLLM: {}", e);
                    }
                }
            }
            Json(vec![])
        }
        OperatingMode::Router => {
            // Router mode: aggregate models from all configured servers
            // For now, return empty - models will be fetched from server_models table
            // TODO: Optionally query model servers for their available models
            Json(vec![])
        }
    }
}
