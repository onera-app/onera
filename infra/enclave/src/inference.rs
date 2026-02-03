//! Inference Client
//!
//! Forwards requests to local vLLM server for inference.
//! Supports both synchronous and streaming responses.

use anyhow::{anyhow, Result};
use futures_util::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;
use tracing::{debug, error};

use crate::noise::InferenceRequest;

/// Client for communicating with vLLM server
#[derive(Clone)]
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

    /// Send a chat completion request to vLLM (non-streaming)
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
            stream: false,
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

    /// Send a streaming chat completion request to vLLM
    /// Returns a channel receiver that yields StreamChunk messages
    pub async fn chat_completion_stream(
        &self,
        request: InferenceRequest,
    ) -> Result<mpsc::Receiver<StreamChunk>> {
        let url = format!("{}/v1/chat/completions", self.base_url);

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
            stream: true,
        };

        debug!("Sending streaming request to vLLM at {}", url);

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
            error!("vLLM streaming error: {} - {}", status, body);
            return Err(anyhow!("vLLM returned error: {} - {}", status, body));
        }

        let (tx, rx) = mpsc::channel(32);

        // Spawn task to process SSE stream
        let mut stream = response.bytes_stream();
        tokio::spawn(async move {
            let mut buffer = String::new();

            while let Some(chunk_result) = stream.next().await {
                match chunk_result {
                    Ok(bytes) => {
                        buffer.push_str(&String::from_utf8_lossy(&bytes));

                        // Process complete SSE events
                        while let Some(pos) = buffer.find("\n\n") {
                            let event = buffer[..pos].to_string();
                            buffer = buffer[pos + 2..].to_string();

                            // Parse SSE data line
                            for line in event.lines() {
                                if let Some(data) = line.strip_prefix("data: ") {
                                    if data == "[DONE]" {
                                        let _ = tx
                                            .send(StreamChunk::Finish {
                                                finish_reason: "stop".to_string(),
                                            })
                                            .await;
                                        return;
                                    }

                                    if let Ok(chunk) =
                                        serde_json::from_str::<VllmStreamChunk>(data)
                                    {
                                        if let Some(choice) = chunk.choices.first() {
                                            if let Some(content) = &choice.delta.content {
                                                if !content.is_empty() {
                                                    let _ = tx
                                                        .send(StreamChunk::Delta {
                                                            text: content.clone(),
                                                        })
                                                        .await;
                                                }
                                            }
                                            if let Some(reason) = &choice.finish_reason {
                                                let _ = tx
                                                    .send(StreamChunk::Finish {
                                                        finish_reason: reason.clone(),
                                                    })
                                                    .await;
                                                return;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    Err(e) => {
                        error!("Stream error: {}", e);
                        let _ = tx
                            .send(StreamChunk::Error {
                                message: e.to_string(),
                            })
                            .await;
                        return;
                    }
                }
            }

            // Stream ended without explicit finish
            let _ = tx
                .send(StreamChunk::Finish {
                    finish_reason: "stop".to_string(),
                })
                .await;
        });

        Ok(rx)
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

/// Streaming chunk types
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type")]
pub enum StreamChunk {
    #[serde(rename = "text-delta")]
    Delta { text: String },
    #[serde(rename = "finish")]
    Finish { finish_reason: String },
    #[serde(rename = "error")]
    Error { message: String },
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

/// vLLM streaming chunk format
#[derive(Debug, Deserialize)]
struct VllmStreamChunk {
    choices: Vec<VllmStreamChoice>,
}

/// vLLM streaming choice
#[derive(Debug, Deserialize)]
struct VllmStreamChoice {
    delta: VllmStreamDelta,
    finish_reason: Option<String>,
}

/// vLLM streaming delta
#[derive(Debug, Deserialize)]
struct VllmStreamDelta {
    content: Option<String>,
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
