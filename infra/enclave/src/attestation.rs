//! Attestation Service
//!
//! Provides attestation quotes with the server's public key bound.
//! Supports:
//! - Azure IMDS attestation (for Azure Confidential VMs)
//! - Mock attestation (for local development)

use axum::{
    extract::State,
    response::{IntoResponse, Response},
    Json,
};
use base64::Engine;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tracing::{info, warn};

use crate::AppState;

/// Azure IMDS endpoint for attestation
const AZURE_IMDS_ATTESTATION_URL: &str =
    "http://169.254.169.254/metadata/attested/document";

/// SEV-SNP attestation report size (minimum)
const SEV_SNP_REPORT_SIZE: usize = 1184;

/// Attestation service that manages quote generation
pub struct AttestationService {
    /// Server's static public key (to bind in quote)
    public_key: [u8; 32],
    /// SHA-256 hash of public key (for report_data field)
    public_key_hash: [u8; 32],
    /// HTTP client for Azure IMDS calls
    http_client: Client,
    /// Whether running on Azure (detected at startup)
    is_azure: bool,
}

impl AttestationService {
    /// Create a new attestation service with the given public key
    pub async fn new(public_key: [u8; 32]) -> Self {
        let mut hasher = Sha256::new();
        hasher.update(&public_key);
        let hash = hasher.finalize();

        let mut public_key_hash = [0u8; 32];
        public_key_hash.copy_from_slice(&hash);

        let http_client = Client::builder()
            .timeout(Duration::from_secs(10))
            .build()
            .expect("Failed to create HTTP client");

        // Detect if running on Azure by checking IMDS availability
        let is_azure = Self::check_azure_imds(&http_client).await;
        if is_azure {
            info!("Running on Azure - will use IMDS attestation");
        } else {
            info!("Not on Azure - will use mock attestation");
        }

        Self {
            public_key,
            public_key_hash,
            http_client,
            is_azure,
        }
    }

    /// Check if Azure IMDS is available
    async fn check_azure_imds(client: &Client) -> bool {
        let result = client
            .get("http://169.254.169.254/metadata/instance?api-version=2021-02-01")
            .header("Metadata", "true")
            .timeout(Duration::from_secs(2))
            .send()
            .await;

        matches!(result, Ok(resp) if resp.status().is_success())
    }

    /// Generate attestation quote
    pub async fn generate_quote(&self, nonce: Option<&[u8]>) -> AttestationQuote {
        if self.is_azure {
            match self.get_azure_attestation(nonce).await {
                Ok(quote) => return quote,
                Err(e) => {
                    warn!("Azure attestation failed, falling back to mock: {}", e);
                }
            }
        }

        // Fall back to mock attestation
        self.generate_mock_quote(nonce)
    }

    /// Get attestation from Azure IMDS
    async fn get_azure_attestation(&self, _nonce: Option<&[u8]>) -> Result<AttestationQuote, String> {
        // Azure IMDS generates its own timestamp-based nonce
        // We include the public key hash in the report_data for binding
        let url = format!(
            "{}?api-version=2021-02-01",
            AZURE_IMDS_ATTESTATION_URL
        );

        let response = self
            .http_client
            .get(&url)
            .header("Metadata", "true")
            .send()
            .await
            .map_err(|e| format!("IMDS request failed: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("IMDS returned status: {}", response.status()));
        }

        let imds_response: AzureImdsResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse IMDS response: {}", e))?;

        Ok(AttestationQuote {
            quote: imds_response.signature,
            public_key: base64::engine::general_purpose::STANDARD.encode(&self.public_key),
            public_key_hash: hex::encode(&self.public_key_hash),
            report_data: hex::encode(&self.public_key_hash), // Bind public key to attestation
            attestation_type: "azure-imds".to_string(),
            azure_encoding: Some(imds_response.encoding),
        })
    }

    /// Generate a mock attestation quote for local development
    fn generate_mock_quote(&self, nonce: Option<&[u8]>) -> AttestationQuote {
        // Create report_data: first 32 bytes = public key hash, next 32 = nonce hash
        let mut report_data = [0u8; 64];
        report_data[..32].copy_from_slice(&self.public_key_hash);

        if let Some(nonce) = nonce {
            let mut hasher = Sha256::new();
            hasher.update(nonce);
            let nonce_hash = hasher.finalize();
            report_data[32..].copy_from_slice(&nonce_hash);
        }

        let quote = self.generate_mock_sev_snp_quote(&report_data);

        AttestationQuote {
            quote: base64::engine::general_purpose::STANDARD.encode(&quote),
            public_key: base64::engine::general_purpose::STANDARD.encode(&self.public_key),
            public_key_hash: hex::encode(&self.public_key_hash),
            report_data: hex::encode(report_data),
            attestation_type: "mock-sev-snp".to_string(),
            azure_encoding: None,
        }
    }

    /// Generate a mock SEV-SNP quote structure
    fn generate_mock_sev_snp_quote(&self, report_data: &[u8; 64]) -> Vec<u8> {
        let mut quote = vec![0u8; SEV_SNP_REPORT_SIZE];

        // Mock header (version, guest SVN, policy)
        quote[0..4].copy_from_slice(&[0x02, 0x00, 0x00, 0x00]); // Version 2
        quote[4..8].copy_from_slice(&[0x00, 0x00, 0x00, 0x00]); // Guest SVN

        // Policy (offset 8, 8 bytes)
        quote[8..16].copy_from_slice(&[0x30, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00]);

        // Family ID (offset 16, 16 bytes)
        quote[16..32].copy_from_slice(b"onera-mock-fam\x00\x00");

        // Image ID (offset 32, 16 bytes)
        quote[32..48].copy_from_slice(b"onera-mock-img\x00\x00");

        // VMPL (offset 48, 4 bytes)
        quote[48..52].copy_from_slice(&[0x00, 0x00, 0x00, 0x00]);

        // Signature algorithm (offset 52, 4 bytes)
        quote[52..56].copy_from_slice(&[0x01, 0x00, 0x00, 0x00]);

        // Platform version (offset 56, 8 bytes)
        quote[56..64].copy_from_slice(&[0x03, 0x00, 0x31, 0x00, 0x14, 0x00, 0x00, 0x00]);

        // Platform info (offset 64, 8 bytes)
        quote[64..72].copy_from_slice(&[0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

        // Report data (offset 80, 64 bytes)
        quote[80..144].copy_from_slice(report_data);

        // Measurement (offset 144, 48 bytes)
        let measurement = Sha256::digest(b"onera-enclave-mock-measurement");
        quote[144..176].copy_from_slice(&measurement);

        // Fill remaining with deterministic mock data
        let mock_sig = Sha256::digest(b"mock-signature");
        quote[672..704].copy_from_slice(&mock_sig);

        quote
    }
}

/// Azure IMDS attestation response
#[derive(Debug, Deserialize)]
struct AzureImdsResponse {
    encoding: String,
    signature: String,
}

/// Attestation quote response
#[derive(Debug, Serialize, Deserialize)]
pub struct AttestationQuote {
    /// Base64-encoded attestation quote (PKCS7 for Azure, SEV-SNP for mock)
    pub quote: String,
    /// Base64-encoded server public key
    pub public_key: String,
    /// Hex-encoded SHA-256 hash of public key
    pub public_key_hash: String,
    /// Hex-encoded report_data/nonce field
    pub report_data: String,
    /// Type of attestation (azure-imds, mock-sev-snp, sev-snp)
    pub attestation_type: String,
    /// Azure-specific: encoding type (pkcs7)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub azure_encoding: Option<String>,
}

/// HTTP handler for GET /attestation
pub async fn get_attestation(State(state): State<Arc<RwLock<AppState>>>) -> Response {
    let state = state.read().await;
    let quote = state.attestation.generate_quote(None).await;
    info!("Generated attestation quote (type: {})", quote.attestation_type);
    Json(quote).into_response()
}

/// Request for attestation with optional nonce
#[derive(Debug, Deserialize)]
pub struct AttestationRequest {
    /// Optional nonce to include in quote
    pub nonce: Option<String>,
}

/// HTTP handler for POST /attestation (with nonce)
pub async fn post_attestation(
    State(state): State<Arc<RwLock<AppState>>>,
    Json(request): Json<AttestationRequest>,
) -> Response {
    let state = state.read().await;
    let nonce_bytes = request.nonce.as_ref().map(|n| n.as_bytes());
    let quote = state.attestation.generate_quote(nonce_bytes).await;
    info!(
        "Generated attestation quote with nonce (type: {})",
        quote.attestation_type
    );
    Json(quote).into_response()
}
