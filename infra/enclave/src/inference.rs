//! Inference Client
//!
//! Forwards requests to local vLLM server for inference.
//! Supports both synchronous and streaming responses.

use anyhow::{anyhow, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tracing::{debug, error};

use crate::noise::InferenceRequest;

/// Client for communicating with vLLM server
pub struct InferenceClient {
    /// HTTP client
    client: Client,
    /// vLLM server URL
    base_url: String,
}

impl InferenceClient {
    /// Create a new inference client
    pub fn new(base_url: &str) -> Result<Self> {
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(300)) // 5 min timeout for long generations
            .build()?;

        Ok(Self {
            client,
            base_url: base_url.trim_end_matches('/').to_string(),
        })
    }

    /// Send a chat completion request to vLLM
    pub async fn chat_completion(&self, request: InferenceRequest) -> Result<String> {
        let url = format!("{}/v1/chat/completions", self.base_url);

        // Convert to vLLM format
        let vllm_request = VllmChatRequest {
            model: request.model.unwrap_or_else(|| "default".to_string()),
            messages: request
                .messages
                .into_iter()
                .map(|m| VllmMessage {
                    role: m.role,
                    content: m.content,
                })
                .collect(),
            temperature: request.temperature,
            max_tokens: request.max_tokens,
            stream: false, // For now, always use non-streaming
        };

        debug!("Sending request to vLLM at {}", url);

        let response = self
            .client
            .post(&url)
            .json(&vllm_request)
            .send()
            .await
            .map_err(|e| anyhow!("Failed to send request to vLLM: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            error!("vLLM error: {} - {}", status, body);
            return Err(anyhow!("vLLM returned error: {} - {}", status, body));
        }

        let vllm_response: VllmChatResponse = response
            .json()
            .await
            .map_err(|e| anyhow!("Failed to parse vLLM response: {}", e))?;

        // Extract content from first choice
        let content = vllm_response
            .choices
            .into_iter()
            .next()
            .map(|c| c.message.content)
            .unwrap_or_default();

        debug!("Received response from vLLM, length: {} chars", content.len());

        Ok(content)
    }

    /// Check if vLLM server is healthy
    pub async fn health_check(&self) -> Result<bool> {
        let url = format!("{}/health", self.base_url);

        let response = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(|e| anyhow!("Health check request failed: {}", e))?;

        Ok(response.status().is_success())
    }

    /// List available models
    pub async fn list_models(&self) -> Result<Vec<String>> {
        let url = format!("{}/v1/models", self.base_url);

        let response = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(|e| anyhow!("Failed to list models: {}", e))?;

        if !response.status().is_success() {
            return Err(anyhow!("Failed to list models: {}", response.status()));
        }

        let models_response: VllmModelsResponse = response
            .json()
            .await
            .map_err(|e| anyhow!("Failed to parse models response: {}", e))?;

        Ok(models_response.data.into_iter().map(|m| m.id).collect())
    }
}

/// vLLM chat completion request format
#[derive(Debug, Serialize)]
struct VllmChatRequest {
    model: String,
    messages: Vec<VllmMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<u32>,
    stream: bool,
}

/// vLLM message format
#[derive(Debug, Serialize, Deserialize)]
struct VllmMessage {
    role: String,
    content: String,
}

/// vLLM chat completion response format
#[derive(Debug, Deserialize)]
struct VllmChatResponse {
    choices: Vec<VllmChoice>,
    #[allow(dead_code)]
    usage: Option<VllmUsage>,
}

/// vLLM response choice
#[derive(Debug, Deserialize)]
struct VllmChoice {
    message: VllmMessage,
    #[allow(dead_code)]
    finish_reason: Option<String>,
}

/// vLLM token usage
#[derive(Debug, Deserialize)]
struct VllmUsage {
    #[allow(dead_code)]
    prompt_tokens: u32,
    #[allow(dead_code)]
    completion_tokens: u32,
    #[allow(dead_code)]
    total_tokens: u32,
}

/// vLLM models list response
#[derive(Debug, Deserialize)]
struct VllmModelsResponse {
    data: Vec<VllmModel>,
}

/// vLLM model info
#[derive(Debug, Deserialize)]
struct VllmModel {
    id: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_client_creation() {
        let client = InferenceClient::new("http://localhost:8000");
        assert!(client.is_ok());
    }

    #[test]
    fn test_url_normalization() {
        let client = InferenceClient::new("http://localhost:8000/").unwrap();
        assert_eq!(client.base_url, "http://localhost:8000");
    }
}
