import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import type { EnclaveEndpoint } from '@onera/types';

// Store mock functions for use across tests
let mockFetchAndVerifyAttestation: ReturnType<typeof mock>;
let mockNoiseConnect: ReturnType<typeof mock>;

// Mock the crypto modules before importing
mock.module('@onera/crypto/attestation', () => {
  mockFetchAndVerifyAttestation = mock(() =>
    Promise.resolve({
      valid: true,
      quote: {
        raw_quote: 'mock-quote',
        public_key: 'dGVzdC1wdWJsaWMta2V5',
        timestamp: Date.now(),
        measurements: {
          launch_digest: 'abc123',
          family_id: 'test',
          image_id: 'test',
          vmpl: 0,
          report_data: 'test',
        },
      },
    })
  );
  return {
    fetchAndVerifyAttestation: mockFetchAndVerifyAttestation,
  };
});

mock.module('@onera/crypto/noise', () => {
  mockNoiseConnect = mock(() => Promise.resolve({}));
  return {
    NoiseWebSocketSession: {
      connect: mockNoiseConnect,
    },
  };
});

// Import after mocks are set up
const { createPrivateInferenceModel, clearPrivateInferenceCache } = await import(
  '../private-inference'
);

describe('Private Inference Provider', () => {
  const mockEndpoint: EnclaveEndpoint = {
    id: 'test-enclave-1',
    host: 'localhost',
    port: 8081,
    public_key: 'dGVzdC1wdWJsaWMta2V5', // base64 "test-public-key"
  };

  const mockConfig = {
    endpoint: mockEndpoint,
    wsEndpoint: 'ws://localhost:8081',
    attestationEndpoint: 'http://localhost:8080/attestation',
    expectedMeasurements: {
      launch_digest: 'abc123',
    },
  };

  let mockSession: {
    encrypt: ReturnType<typeof mock>;
    decrypt: ReturnType<typeof mock>;
    sendAndReceive: ReturnType<typeof mock>;
    sendAndStream: ReturnType<typeof mock>;
    close: ReturnType<typeof mock>;
  };

  beforeEach(() => {
    clearPrivateInferenceCache();

    mockSession = {
      encrypt: mock((data: Uint8Array) => data),
      decrypt: mock((data: Uint8Array) => data),
      sendAndReceive: mock(() => Promise.resolve(new Uint8Array())),
      sendAndStream: mock(async function* () {}),
      close: mock(() => {}),
    };

    // Reset attestation mock to successful verification
    mockFetchAndVerifyAttestation.mockImplementation(() =>
      Promise.resolve({
        valid: true,
        quote: {
          raw_quote: 'mock-quote',
          public_key: mockEndpoint.public_key,
          timestamp: Date.now(),
          measurements: {
            launch_digest: 'abc123',
            family_id: 'test',
            image_id: 'test',
            vmpl: 0,
            report_data: 'test',
          },
        },
      })
    );

    // Reset noise connect mock
    mockNoiseConnect.mockImplementation(() => Promise.resolve(mockSession));
  });

  afterEach(() => {
    mockFetchAndVerifyAttestation.mockClear();
    mockNoiseConnect.mockClear();
  });

  it('should verify attestation before connecting', async () => {
    const model = createPrivateInferenceModel(mockConfig);

    mockSession.sendAndReceive.mockImplementation(() =>
      Promise.resolve(
        new TextEncoder().encode(
          JSON.stringify({
            text: 'Hello!',
            finishReason: 'stop',
            usage: { promptTokens: 10, completionTokens: 5 },
          })
        )
      )
    );

    await model.doGenerate({
      prompt: [{ role: 'user', content: 'Hi' }],
      mode: { type: 'regular' },
      inputFormat: 'messages',
    } as any);

    expect(mockFetchAndVerifyAttestation).toHaveBeenCalledWith(
      mockConfig.attestationEndpoint,
      mockConfig.expectedMeasurements
    );
  });

  it('should fail if attestation verification fails', async () => {
    mockFetchAndVerifyAttestation.mockImplementation(() =>
      Promise.resolve({
        valid: false,
        quote: null,
        error: 'Measurements do not match',
      })
    );

    const model = createPrivateInferenceModel(mockConfig);

    await expect(
      model.doGenerate({
        prompt: [{ role: 'user', content: 'Hi' }],
        mode: { type: 'regular' },
        inputFormat: 'messages',
      } as any)
    ).rejects.toThrow('Attestation verification failed');
  });

  it('should establish Noise session after attestation', async () => {
    const model = createPrivateInferenceModel(mockConfig);

    mockSession.sendAndReceive.mockImplementation(() =>
      Promise.resolve(
        new TextEncoder().encode(
          JSON.stringify({
            text: 'Response',
            finishReason: 'stop',
            usage: { promptTokens: 5, completionTokens: 3 },
          })
        )
      )
    );

    await model.doGenerate({
      prompt: [{ role: 'user', content: 'Test' }],
      mode: { type: 'regular' },
      inputFormat: 'messages',
    } as any);

    expect(mockNoiseConnect).toHaveBeenCalledWith(
      mockConfig.wsEndpoint,
      mockEndpoint.public_key
    );
  });

  it('should return generated text from enclave', async () => {
    const model = createPrivateInferenceModel(mockConfig);

    mockSession.sendAndReceive.mockImplementation(() =>
      Promise.resolve(
        new TextEncoder().encode(
          JSON.stringify({
            text: 'This is the AI response',
            finishReason: 'stop',
            usage: { promptTokens: 10, completionTokens: 6 },
          })
        )
      )
    );

    const result = await model.doGenerate({
      prompt: [{ role: 'user', content: 'Hello' }],
      mode: { type: 'regular' },
      inputFormat: 'messages',
    } as any);

    // Verify the response structure matches Vercel AI SDK v3 format
    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toEqual({
      type: 'text',
      text: 'This is the AI response',
    });
    expect(result.finishReason.unified).toBe('stop');
    expect(result.usage.inputTokens.total).toBe(10);
    expect(result.usage.outputTokens.total).toBe(6);
  });

  it('should cache the session and reuse for subsequent calls', async () => {
    const model = createPrivateInferenceModel(mockConfig);

    mockSession.sendAndReceive.mockImplementation(() =>
      Promise.resolve(
        new TextEncoder().encode(
          JSON.stringify({
            text: 'Response 1',
            finishReason: 'stop',
            usage: { promptTokens: 5, completionTokens: 3 },
          })
        )
      )
    );

    // First call
    await model.doGenerate({
      prompt: [{ role: 'user', content: 'First' }],
      mode: { type: 'regular' },
      inputFormat: 'messages',
    } as any);

    // Second call
    await model.doGenerate({
      prompt: [{ role: 'user', content: 'Second' }],
      mode: { type: 'regular' },
      inputFormat: 'messages',
    } as any);

    // Attestation and session should only be established once
    expect(mockFetchAndVerifyAttestation).toHaveBeenCalledTimes(1);
    expect(mockNoiseConnect).toHaveBeenCalledTimes(1);
    expect(mockSession.sendAndReceive).toHaveBeenCalledTimes(2);
  });

  it('should clear cache and close sessions on clearPrivateInferenceCache', async () => {
    const model = createPrivateInferenceModel(mockConfig);

    mockSession.sendAndReceive.mockImplementation(() =>
      Promise.resolve(
        new TextEncoder().encode(
          JSON.stringify({
            text: 'Response',
            finishReason: 'stop',
            usage: { promptTokens: 5, completionTokens: 3 },
          })
        )
      )
    );

    // First call establishes session
    await model.doGenerate({
      prompt: [{ role: 'user', content: 'Test' }],
      mode: { type: 'regular' },
      inputFormat: 'messages',
    } as any);

    expect(mockSession.close).not.toHaveBeenCalled();

    // Clear cache
    clearPrivateInferenceCache();

    expect(mockSession.close).toHaveBeenCalledTimes(1);
  });

  it('should include request and response metadata', async () => {
    const model = createPrivateInferenceModel(mockConfig);

    mockSession.sendAndReceive.mockImplementation(() =>
      Promise.resolve(
        new TextEncoder().encode(
          JSON.stringify({
            id: 'response-123',
            text: 'Hello!',
            finishReason: 'stop',
            usage: { promptTokens: 10, completionTokens: 5 },
          })
        )
      )
    );

    const result = await model.doGenerate({
      prompt: [{ role: 'user', content: 'Hi' }],
      mode: { type: 'regular' },
      inputFormat: 'messages',
    } as any);

    expect(result.request?.body).toMatchObject({
      type: 'generate',
      messages: [{ role: 'user', content: 'Hi' }],
    });
    expect(result.response?.id).toBe('response-123');
    expect(result.response?.modelId).toBe(mockEndpoint.id);
    expect(result.response?.timestamp).toBeInstanceOf(Date);
  });

  it('should pass generation options to the enclave', async () => {
    const model = createPrivateInferenceModel(mockConfig);

    mockSession.sendAndReceive.mockImplementation(() =>
      Promise.resolve(
        new TextEncoder().encode(
          JSON.stringify({
            text: 'Response',
            finishReason: 'stop',
            usage: { promptTokens: 5, completionTokens: 3 },
          })
        )
      )
    );

    await model.doGenerate({
      prompt: [{ role: 'user', content: 'Test' }],
      mode: { type: 'regular' },
      inputFormat: 'messages',
      maxOutputTokens: 1000,
      temperature: 0.7,
      topP: 0.9,
      stopSequences: ['END'],
    } as any);

    const sentData = mockSession.sendAndReceive.mock.calls[0][0];
    const sentRequest = JSON.parse(new TextDecoder().decode(sentData));

    expect(sentRequest).toEqual({
      type: 'generate',
      messages: [{ role: 'user', content: 'Test' }],
      maxTokens: 1000,
      temperature: 0.7,
      topP: 0.9,
      stopSequences: ['END'],
    });
  });

  describe('model properties', () => {
    it('should have correct specification version', () => {
      const model = createPrivateInferenceModel(mockConfig);
      expect(model.specificationVersion).toBe('v3');
    });

    it('should have correct provider', () => {
      const model = createPrivateInferenceModel(mockConfig);
      expect(model.provider).toBe('onera-private');
    });

    it('should use endpoint id as model id', () => {
      const model = createPrivateInferenceModel(mockConfig);
      expect(model.modelId).toBe(mockEndpoint.id);
    });

    it('should have empty supportedUrls', () => {
      const model = createPrivateInferenceModel(mockConfig);
      expect(model.supportedUrls).toEqual({});
    });
  });

  describe('streaming', () => {
    it('should stream responses from enclave', async () => {
      const model = createPrivateInferenceModel(mockConfig);

      const chunks = [
        { type: 'text-delta', text: 'Hello' },
        { type: 'text-delta', text: ' world' },
        {
          type: 'finish',
          finishReason: 'stop',
          usage: { promptTokens: 5, completionTokens: 2 },
        },
      ];

      mockSession.sendAndStream.mockImplementation(async function* () {
        for (const chunk of chunks) {
          yield new TextEncoder().encode(JSON.stringify(chunk));
        }
      });

      const result = await model.doStream({
        prompt: [{ role: 'user', content: 'Test' }],
        mode: { type: 'regular' },
        inputFormat: 'messages',
      } as any);

      const parts: any[] = [];
      const reader = result.stream.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value);
      }

      // Should have stream-start, text-start, text deltas, text-end, and finish
      expect(parts.find((p) => p.type === 'stream-start')).toBeDefined();
      expect(parts.find((p) => p.type === 'text-start')).toBeDefined();
      expect(parts.filter((p) => p.type === 'text-delta')).toHaveLength(2);
      expect(parts.find((p) => p.type === 'text-end')).toBeDefined();
      expect(parts.find((p) => p.type === 'finish')).toBeDefined();

      const textDeltas = parts.filter((p) => p.type === 'text-delta');
      expect(textDeltas[0].delta).toBe('Hello');
      expect(textDeltas[1].delta).toBe(' world');
    });

    it('should include request metadata in stream result', async () => {
      const model = createPrivateInferenceModel(mockConfig);

      mockSession.sendAndStream.mockImplementation(async function* () {
        yield new TextEncoder().encode(
          JSON.stringify({
            type: 'finish',
            finishReason: 'stop',
            usage: { promptTokens: 5, completionTokens: 2 },
          })
        );
      });

      const result = await model.doStream({
        prompt: [{ role: 'user', content: 'Test' }],
        mode: { type: 'regular' },
        inputFormat: 'messages',
      } as any);

      expect(result.request?.body).toMatchObject({
        type: 'stream',
        messages: [{ role: 'user', content: 'Test' }],
      });
    });
  });
});
