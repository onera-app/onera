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
    Router,
};
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

    // Initialize attestation service with the public key
    let attestation = AttestationService::new(public_key);
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

    // Build HTTP router for attestation endpoint
    let http_app = Router::new()
        .route("/attestation", get(attestation::get_attestation))
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
