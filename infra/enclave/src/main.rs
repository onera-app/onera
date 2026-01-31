//! Onera Enclave Runtime
//!
//! Private inference enclave that:
//! - Establishes encrypted channels via Noise NK protocol
//! - Provides attestation quotes with bound public keys
//! - Forwards inference requests to local vLLM server

mod attestation;
mod inference;
mod noise;

use std::net::SocketAddr;
use std::sync::Arc;

use axum::{
    routing::get,
    Json,
    Router,
};
use serde::Serialize;
use tower_http::cors::{Any, CorsLayer};
use tokio::sync::RwLock;
use tracing::{info, Level};
use tracing_subscriber::EnvFilter;

use crate::attestation::AttestationService;
use crate::inference::InferenceClient;
use crate::noise::NoiseServer;

/// Shared application state
pub struct AppState {
    pub noise_server: NoiseServer,
    pub attestation: AttestationService,
    pub inference: InferenceClient,
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

    info!("Starting Onera Enclave Runtime");

    // Initialize Noise server (generates keypair)
    let noise_server = NoiseServer::new()?;
    let public_key = noise_server.public_key();
    info!("Noise server initialized with public key: {}", hex::encode(&public_key));

    // Initialize attestation service with the public key (async to detect Azure)
    let attestation = AttestationService::new(public_key).await;
    info!("Attestation service initialized");

    // Initialize inference client
    let vllm_url = std::env::var("VLLM_URL").unwrap_or_else(|_| "http://localhost:8000".to_string());
    let inference = InferenceClient::new(&vllm_url)?;
    info!("Inference client initialized, targeting: {}", vllm_url);

    // Create shared state
    let state = Arc::new(RwLock::new(AppState {
        noise_server,
        attestation,
        inference,
    }));

    // CORS layer for browser access
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Build HTTP router for attestation and models endpoints
    let http_app = Router::new()
        .route("/attestation", get(attestation::get_attestation))
        .route("/models", get(get_models))
        .route("/health", get(health_check))
        .layer(cors)
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

/// Models endpoint - returns available models from the underlying LLM server
async fn get_models(
    axum::extract::State(state): axum::extract::State<Arc<RwLock<AppState>>>,
) -> Json<Vec<ModelInfo>> {
    let state = state.read().await;

    // Try to get models from the underlying LLM server
    match state.inference.list_models().await {
        Ok(models) => {
            let model_infos: Vec<ModelInfo> = models
                .into_iter()
                .map(|id| {
                    // Parse model name for display
                    let display_name = id
                        .split('/')
                        .last()
                        .unwrap_or(&id)
                        .replace(".gguf", "")
                        .replace("-", " ")
                        .replace("_", " ");

                    ModelInfo {
                        id: id.clone(),
                        name: id.clone(),
                        display_name: format!("{} (Private)", display_name),
                        provider: "onera-private".to_string(),
                        context_length: 8192, // Default, could be queried
                    }
                })
                .collect();
            Json(model_infos)
        }
        Err(_) => {
            // Return empty list on error
            Json(vec![])
        }
    }
}
