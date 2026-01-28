//! Attestation Service
//!
//! Provides attestation quotes with the server's public key bound.
//! Phase 1: Mock attestation (returns synthetic quote)
//! Phase 2: Real SEV-SNP attestation via /dev/sev-guest

use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::info;

use crate::AppState;

/// SEV-SNP attestation report size (minimum)
const SEV_SNP_REPORT_SIZE: usize = 1184;

/// Attestation service that manages quote generation
pub struct AttestationService {
    /// Server's static public key (to bind in quote)
    public_key: [u8; 32],
    /// SHA-256 hash of public key (for report_data field)
    public_key_hash: [u8; 32],
}

impl AttestationService {
    /// Create a new attestation service with the given public key
    pub fn new(public_key: [u8; 32]) -> Self {
        let mut hasher = Sha256::new();
        hasher.update(&public_key);
        let hash = hasher.finalize();

        let mut public_key_hash = [0u8; 32];
        public_key_hash.copy_from_slice(&hash);

        Self {
            public_key,
            public_key_hash,
        }
    }

    /// Generate a mock attestation quote
    /// In Phase 2, this will call /dev/sev-guest for real attestation
    pub fn generate_quote(&self, nonce: Option<&[u8]>) -> AttestationQuote {
        // Create report_data: first 32 bytes = public key hash, next 32 = nonce hash
        let mut report_data = [0u8; 64];
        report_data[..32].copy_from_slice(&self.public_key_hash);

        if let Some(nonce) = nonce {
            let mut hasher = Sha256::new();
            hasher.update(nonce);
            let nonce_hash = hasher.finalize();
            report_data[32..].copy_from_slice(&nonce_hash);
        }

        // Generate mock quote (in production, this comes from /dev/sev-guest)
        let quote = self.generate_mock_quote(&report_data);

        AttestationQuote {
            quote: base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &quote),
            public_key: hex::encode(self.public_key),
            public_key_hash: hex::encode(self.public_key_hash),
            report_data: hex::encode(report_data),
            attestation_type: "mock-sev-snp".to_string(),
        }
    }

    /// Generate a mock SEV-SNP quote
    /// Structure mimics real SEV-SNP report format
    fn generate_mock_quote(&self, report_data: &[u8; 64]) -> Vec<u8> {
        let mut quote = vec![0u8; SEV_SNP_REPORT_SIZE];

        // Mock header (version, guest SVN, policy)
        quote[0..4].copy_from_slice(&[0x02, 0x00, 0x00, 0x00]); // Version 2
        quote[4..8].copy_from_slice(&[0x00, 0x00, 0x00, 0x00]); // Guest SVN

        // Policy (offset 8, 8 bytes) - mock secure policy
        quote[8..16].copy_from_slice(&[0x30, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00]);

        // Family ID (offset 16, 16 bytes)
        quote[16..32].copy_from_slice(b"onera-mock-fam\x00\x00");

        // Image ID (offset 32, 16 bytes)
        quote[32..48].copy_from_slice(b"onera-mock-img\x00\x00");

        // VMPL (offset 48, 4 bytes)
        quote[48..52].copy_from_slice(&[0x00, 0x00, 0x00, 0x00]);

        // Signature algorithm (offset 52, 4 bytes) - ECDSA P-384
        quote[52..56].copy_from_slice(&[0x01, 0x00, 0x00, 0x00]);

        // Platform version (offset 56, 8 bytes)
        quote[56..64].copy_from_slice(&[0x03, 0x00, 0x31, 0x00, 0x14, 0x00, 0x00, 0x00]);

        // Platform info (offset 64, 8 bytes)
        quote[64..72].copy_from_slice(&[0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

        // Report data (offset 80, 64 bytes) - contains public key hash + nonce hash
        quote[80..144].copy_from_slice(report_data);

        // Measurement (offset 144, 48 bytes) - mock launch measurement
        let measurement = Sha256::digest(b"onera-enclave-mock-measurement");
        quote[144..176].copy_from_slice(&measurement);

        // Host data (offset 192, 32 bytes)
        quote[192..224].copy_from_slice(&[0u8; 32]);

        // ID key digest (offset 224, 48 bytes)
        quote[224..272].copy_from_slice(&[0u8; 48]);

        // Author key digest (offset 272, 48 bytes)
        quote[272..320].copy_from_slice(&[0u8; 48]);

        // Report ID (offset 320, 32 bytes)
        let report_id = Sha256::digest(b"mock-report-id");
        quote[320..352].copy_from_slice(&report_id);

        // Report ID MA (offset 352, 32 bytes)
        quote[352..384].copy_from_slice(&[0u8; 32]);

        // Reported TCB (offset 384, 8 bytes)
        quote[384..392].copy_from_slice(&[0x03, 0x00, 0x31, 0x00, 0x14, 0x00, 0x00, 0x00]);

        // Chip ID (offset 400, 64 bytes) - mock chip ID
        quote[400..464].copy_from_slice(&[0x4Du8; 64]); // 'M' for mock

        // Committed SVN (offset 464, 8 bytes)
        quote[464..472].copy_from_slice(&[0x00; 8]);

        // Current build/minor/major (offset 472, 3 bytes)
        quote[472..475].copy_from_slice(&[0x0A, 0x00, 0x01]);

        // Committed build/minor/major (offset 480, 3 bytes)
        quote[480..483].copy_from_slice(&[0x0A, 0x00, 0x01]);

        // Launch TCB (offset 488, 8 bytes)
        quote[488..496].copy_from_slice(&[0x03, 0x00, 0x31, 0x00, 0x14, 0x00, 0x00, 0x00]);

        // Signature (offset 672, 512 bytes) - mock signature
        // In real attestation, this is ECDSA-P384 signature
        let sig_placeholder = Sha256::digest(b"mock-signature");
        quote[672..704].copy_from_slice(&sig_placeholder);

        quote
    }
}

/// Attestation quote response
#[derive(Debug, Serialize, Deserialize)]
pub struct AttestationQuote {
    /// Base64-encoded attestation quote
    pub quote: String,
    /// Hex-encoded server public key
    pub public_key: String,
    /// Hex-encoded SHA-256 hash of public key
    pub public_key_hash: String,
    /// Hex-encoded report_data field from quote
    pub report_data: String,
    /// Type of attestation (mock-sev-snp or sev-snp)
    pub attestation_type: String,
}

/// Request for attestation (optional nonce)
#[allow(dead_code)]
#[derive(Debug, Deserialize)]
pub struct AttestationRequest {
    /// Optional nonce to include in quote
    pub nonce: Option<String>,
}

/// HTTP handler for GET /attestation
pub async fn get_attestation(
    State(state): State<Arc<RwLock<AppState>>>,
) -> Response {
    let state = state.read().await;
    let quote = state.attestation.generate_quote(None);
    info!("Generated attestation quote");
    Json(quote).into_response()
}

/// HTTP handler for POST /attestation (with nonce)
#[allow(dead_code)]
pub async fn post_attestation(
    State(state): State<Arc<RwLock<AppState>>>,
    Json(request): Json<AttestationRequest>,
) -> Response {
    let state = state.read().await;

    let nonce_bytes = request.nonce.as_ref().map(|n| n.as_bytes());
    let quote = state.attestation.generate_quote(nonce_bytes);

    info!("Generated attestation quote with nonce");
    Json(quote).into_response()
}

/// Error response
#[allow(dead_code)]
#[derive(Debug, Serialize)]
pub struct AttestationError {
    pub error: String,
}

impl IntoResponse for AttestationError {
    fn into_response(self) -> Response {
        (StatusCode::INTERNAL_SERVER_ERROR, Json(self)).into_response()
    }
}
