/**
 * Direct Chat Hook
 * Wraps AI SDK's useChat with our DirectBrowserTransport for E2EE compliance
 */

import { useChat, type UseChatHelpers } from '@ai-sdk/react';
import { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import type { UIMessage, ChatInit } from 'ai';
import { useE2EE } from '@/providers/E2EEProvider';
import { useModelStore } from '@/stores/modelStore';
import { useCredentials } from '@/hooks/queries/useCredentials';
import {
  DirectBrowserTransport,
  decryptCredentialsWithMetadata,
  setCredentialCache,
  clearCredentialCache,
  clearProviderCache,
  clearPrivateInferenceCache,
  isPrivateModel,
  parseModelId,
  setEnclaveConfigForTasks,
  type PartiallyDecryptedCredential,
  type EnclaveConfig,
} from '@/lib/ai';
import { trpc } from '@/lib/trpc';
import type { NativeSearchSettings } from '@/stores/toolsStore';
import { useModelParamsStore } from '@/stores/modelParamsStore';
import { AppError, normalizeAppError } from '@/lib/errors/app-error';
import { useAttestationStore } from '@/stores/attestationStore';

interface UseDirectChatOptions {
  /**
   * Unique chat ID
   */
  chatId: string;

  /**
   * Initial messages to populate the chat
   */
  initialMessages?: UIMessage[];

  /**
   * Callback when assistant message is complete
   */
  onFinish?: (message: UIMessage) => void;

  /**
   * Callback on error
   */
  onError?: (error: Error) => void;

  /**
   * Optional system prompt
   */
  systemPrompt?: string;

  /**
   * Optional max tokens
   */
  maxTokens?: number;

  /**
   * Native search settings for supported providers (Google, xAI)
   */
  nativeSearch?: {
    enabled: boolean;
    settings?: NativeSearchSettings;
  };
}

/**
 * Message part for multimodal content
 */
export interface MessagePart {
  type: 'text' | 'file';
  text?: string;
  url?: string;
  mediaType?: string;
}

/**
 * Input for sendMessage - either a string or multimodal parts
 */
export type SendMessageInput = string | { parts: MessagePart[] };

interface UseDirectChatReturn extends Omit<UseChatHelpers<UIMessage>, 'sendMessage' | 'regenerate'> {
  /**
   * Send a message to the AI (text or multimodal with parts)
   */
  sendMessage: (content: SendMessageInput, options?: { id?: string }) => Promise<void>;

  /**
   * Regenerate the last assistant message
   * Optionally with a modifier prompt (e.g., "be more concise")
   */
  regenerate: (options?: { modifier?: string; id?: string }) => Promise<void>;

  /**
   * Whether the transport is ready (E2EE unlocked and credentials available)
   */
  isReady: boolean;

  /**
   * Whether credentials are loading
   */
  isLoadingCredentials: boolean;

  /**
   * Currently selected model ID
   */
  selectedModelId: string | null;

  /**
   * Set the selected model
   */
  setSelectedModel: (modelId: string) => void;
}

interface UpgradeRequiredError extends Error {
  upgradeRequired?: boolean;
}

export function useDirectChat({
  chatId,
  initialMessages,
  onFinish,
  onError,
  systemPrompt,
  maxTokens = 4096,
  nativeSearch,
}: UseDirectChatOptions): UseDirectChatReturn {
  const { isUnlocked } = useE2EE();
  const { selectedModelId, setSelectedModel } = useModelStore();
  const { providerSettings } = useModelParamsStore();
  const transportRef = useRef<DirectBrowserTransport | null>(null);

  // Enclave state for private inference
  const [enclaveConfig, setEnclaveConfig] = useState<EnclaveConfig | null>(null);
  const [enclaveAssignmentId, setEnclaveAssignmentId] = useState<string | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const enclaveAssignmentIdRef = useRef<string | null>(null);
  const activeEnclaveModelIdRef = useRef<string | null>(null);
  const requestInFlightRef = useRef(false);
  const lastFailureRef = useRef<{ modelId: string; at: number } | null>(null);

  // tRPC mutations for enclave lifecycle
  const requestEnclaveMutation = trpc.enclaves.requestEnclave.useMutation();
  const releaseEnclaveMutation = trpc.enclaves.releaseEnclave.useMutation();
  const heartbeatMutation = trpc.enclaves.heartbeat.useMutation();
  const requestMutationRef = useRef(requestEnclaveMutation);
  const releaseMutationRef = useRef(releaseEnclaveMutation);
  const heartbeatMutationRef = useRef(heartbeatMutation);

  // Pre-flight inference allowance check
  const checkAllowance = trpc.billing.checkInferenceAllowance.useMutation();

  // Stable refs for callbacks to avoid recreating chatOptions on every render
  const onFinishRef = useRef(onFinish);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change (no dependency tracking needed)
  useEffect(() => {
    onFinishRef.current = onFinish;
    onErrorRef.current = onError;
  });
  useEffect(() => {
    requestMutationRef.current = requestEnclaveMutation;
    releaseMutationRef.current = releaseEnclaveMutation;
    heartbeatMutationRef.current = heartbeatMutation;
  });
  useEffect(() => {
    enclaveAssignmentIdRef.current = enclaveAssignmentId;
  }, [enclaveAssignmentId]);

  // Fetch credentials from Convex
  const rawCredentials = useCredentials();
  const isLoadingCredentials = rawCredentials === undefined;

  // Decrypt credentials when available and E2EE is unlocked
  const credentials = useMemo(() => {
    if (!rawCredentials || !isUnlocked) return [];

    try {
      const partial: PartiallyDecryptedCredential[] = rawCredentials.map(c => ({
        id: c.id,
        provider: c.provider,
        name: c.name,
        encryptedData: c.encryptedData,
        iv: c.iv,
      }));
      return decryptCredentialsWithMetadata(partial);
    } catch (err) {
      console.error('Failed to decrypt credentials:', err);
      return [];
    }
  }, [rawCredentials, isUnlocked]);

  // Update credential cache when credentials change (moved out of useMemo)
  useEffect(() => {
    if (credentials.length > 0) {
      setCredentialCache(credentials);
    }
  }, [credentials]);

  // Request enclave when a private model is selected
  useEffect(() => {
    const releaseCurrentEnclave = () => {
      const currentAssignmentId = enclaveAssignmentIdRef.current;
      if (currentAssignmentId) {
        releaseMutationRef.current.mutate({ assignmentId: currentAssignmentId });
      }
      enclaveAssignmentIdRef.current = null;
      activeEnclaveModelIdRef.current = null;
      setEnclaveAssignmentId(null);
      setEnclaveConfig(null);
      setEnclaveConfigForTasks(null);
      useAttestationStore.getState().clear();
      clearPrivateInferenceCache();
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };

    if (!selectedModelId || !isUnlocked) {
      releaseCurrentEnclave();
      return;
    }

    const isPrivate = isPrivateModel(selectedModelId);

    if (!isPrivate) {
      releaseCurrentEnclave();
      return;
    }

    // Already connected for this model
    if (activeEnclaveModelIdRef.current === selectedModelId && enclaveAssignmentIdRef.current) {
      return;
    }

    // Switching private models: release old enclave first
    if (
      activeEnclaveModelIdRef.current &&
      activeEnclaveModelIdRef.current !== selectedModelId
    ) {
      releaseCurrentEnclave();
    }

    // Prevent duplicate in-flight requests and tight retry loops on 5xx
    if (requestInFlightRef.current) {
      return;
    }
    if (
      lastFailureRef.current &&
      lastFailureRef.current.modelId === selectedModelId &&
      Date.now() - lastFailureRef.current.at < 10_000
    ) {
      return;
    }

    const { modelName } = parseModelId(selectedModelId);
    const sessionId = crypto.randomUUID();
    requestInFlightRef.current = true;

    useAttestationStore.getState().setConnecting();

    requestMutationRef.current.mutate(
      { modelId: modelName, tier: 'shared', sessionId },
      {
        onSuccess: (data) => {
          const config = {
            endpoint: data.endpoint,
            wsEndpoint: data.wsEndpoint,
            attestationEndpoint: data.attestationEndpoint,
            expectedMeasurements: data.expectedMeasurements,
            allowUnverified: data.allowUnverified,
          };
          activeEnclaveModelIdRef.current = selectedModelId;
          lastFailureRef.current = null;
          enclaveAssignmentIdRef.current = data.assignmentId;
          setEnclaveConfig(config);
          setEnclaveConfigForTasks(config);
          setEnclaveAssignmentId(data.assignmentId);

          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
          }
          heartbeatIntervalRef.current = setInterval(() => {
            const assignmentId = enclaveAssignmentIdRef.current;
            if (assignmentId) {
              heartbeatMutationRef.current.mutate({ assignmentId });
            }
          }, 30000);
        },
        onError: (error) => {
          lastFailureRef.current = { modelId: selectedModelId, at: Date.now() };
          console.error('Failed to request enclave:', error);
          const wrapped = new AppError({
            code: 'IntegrationError',
            message: `Failed to connect to private inference: ${error.message}`,
            userMessage: 'Could not connect to private inference. Please retry.',
            retryable: true,
            blocking: false,
            cause: error,
            context: { modelId: selectedModelId },
          });
          onErrorRef.current?.(wrapped);
        },
        onSettled: () => {
          requestInFlightRef.current = false;
        },
      }
    );

    // Cleanup on unmount
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [isUnlocked, selectedModelId]);

  // Cleanup enclave on unmount
  useEffect(() => {
    return () => {
      const assignmentId = enclaveAssignmentIdRef.current;
      if (assignmentId) {
        releaseMutationRef.current.mutate({ assignmentId });
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      useAttestationStore.getState().clear();
    };
  }, []);

  // Check if transport is ready
  const isReady = useMemo(() => {
    if (!isUnlocked || !selectedModelId) {
      return false;
    }

    // For private models, need enclave config
    if (isPrivateModel(selectedModelId)) {
      return !!enclaveConfig;
    }

    // For credential models, need credentials
    return credentials.length > 0;
  }, [isUnlocked, selectedModelId, credentials.length, enclaveConfig]);

  // Create transport on mount (always have one to prevent useChat from using default API)
  useEffect(() => {
    if (!transportRef.current) {
      transportRef.current = new DirectBrowserTransport({
        modelId: 'placeholder',
      });
    }
  }, []);

  // Pre-flight: check inference allowance before sending/regenerating
  const checkAllowanceRef = useRef(checkAllowance);
  useEffect(() => { checkAllowanceRef.current = checkAllowance; });
  const selectedModelIdRef = useRef(selectedModelId);
  useEffect(() => { selectedModelIdRef.current = selectedModelId; });

  const enforceAllowance = useCallback(async () => {
    const inferenceType = selectedModelIdRef.current && isPrivateModel(selectedModelIdRef.current)
      ? 'private' as const
      : 'byok' as const;
    try {
      const allowance = await checkAllowanceRef.current.mutateAsync({ inferenceType });
      if (!allowance.allowed) {
        const label = inferenceType === 'private' ? 'private inference' : 'BYOK inference';
        const error = new Error(
          allowance.remaining === 0
            ? `You've reached your ${allowance.limit} ${label} request limit for this period. Upgrade your plan for more.`
            : 'Inference not available on your current plan.'
        );
        (error as UpgradeRequiredError).upgradeRequired = true;
        onErrorRef.current?.(error);
        throw error;
      }
      if (allowance.isOverage) {
        console.info('Request billed as overage (usage-based billing)');
      }
    } catch (err) {
      if ((err as UpgradeRequiredError).upgradeRequired) throw err;
      // Network/server errors should not block inference — fail open
      const normalized = normalizeAppError(err, 'Allowance check failed', { stage: 'allowance_check' });
      console.warn('Allowance check failed, proceeding:', normalized);
    }
  }, []);

  // Update transport when model, settings, or enclave config changes
  useEffect(() => {
    if (transportRef.current && selectedModelId) {
      transportRef.current.setOptions({
        modelId: selectedModelId,
        maxTokens,
        systemPrompt,
        nativeSearch,
        providerSettings,
        enclaveConfig: enclaveConfig || undefined,
        preflight: enforceAllowance,
      });
    }
  }, [selectedModelId, maxTokens, systemPrompt, nativeSearch, providerSettings, enclaveConfig, enforceAllowance]);

  // Create chat options with our transport - ALWAYS provide transport
  // Uses refs for callbacks to avoid recreating on every render
  const chatOptions = useMemo((): ChatInit<UIMessage> => {
    // Create a transport if we don't have one yet
    if (!transportRef.current) {
      transportRef.current = new DirectBrowserTransport({
        modelId: selectedModelId || 'placeholder',
        maxTokens,
        systemPrompt,
        nativeSearch,
        providerSettings,
        enclaveConfig: enclaveConfig || undefined,
        preflight: enforceAllowance,
      });
    }

    return {
      id: chatId,
      messages: initialMessages,
      transport: transportRef.current as unknown as ChatInit<UIMessage>['transport'],
      onFinish: ({ message }) => onFinishRef.current?.(message),
      onError: (error) => onErrorRef.current?.(error),
    };
  }, [chatId, initialMessages, selectedModelId, maxTokens, systemPrompt, nativeSearch, providerSettings, enclaveConfig, enforceAllowance]);
  // REMOVED: onFinish, onError from dependencies - using refs instead

  // Use AI SDK's useChat with our transport
  const chat = useChat(chatOptions);

  // Custom sendMessage that validates state and supports multimodal content
  const sendMessage = useCallback(
    async (content: SendMessageInput, options?: { id?: string }) => {
      if (!isReady) {
        let errorMessage = 'Unable to send message';
        if (!isUnlocked) {
          errorMessage = 'E2EE not unlocked';
        } else if (!selectedModelId) {
          errorMessage = 'No model selected';
        } else if (selectedModelId && isPrivateModel(selectedModelId) && !enclaveConfig) {
          errorMessage = 'Connecting to private inference...';
        } else {
          errorMessage = 'No credentials available';
        }
        const error = new Error(errorMessage);
        onErrorRef.current?.(error);
        throw error;
      }

      // Handle string input (text only)
      if (typeof content === 'string') {
        await chat.sendMessage({
          role: 'user',
          parts: [{ type: 'text', text: content }],
          ...(options?.id && { id: options.id })
        });
        return;
      }

      // Handle multimodal input with parts
      await chat.sendMessage({
        id: options?.id,
        role: 'user',
        parts: content.parts.map(part => {
          if (part.type === 'text') {
            return { type: 'text' as const, text: part.text || '' };
          }
          // For images/files, use the file part format
          return {
            type: 'file' as const,
            mediaType: part.mediaType || 'image/png',
            url: part.url || '',
          };
        }),
      });
    },
    [chat, enclaveConfig, enforceAllowance, isReady, isUnlocked, selectedModelId]
  );

  // Regenerate the last assistant message
  const regenerate = useCallback(
    async (options?: { modifier?: string; id?: string }) => {
      if (!isReady) {
        let errorMessage = 'Unable to regenerate';
        if (!isUnlocked) {
          errorMessage = 'E2EE not unlocked';
        } else if (!selectedModelId) {
          errorMessage = 'No model selected';
        } else if (selectedModelId && isPrivateModel(selectedModelId) && !enclaveConfig) {
          errorMessage = 'Connecting to private inference...';
        } else {
          errorMessage = 'No credentials available';
        }
        const error = new Error(errorMessage);
        onErrorRef.current?.(error);
        throw error;
      }

      const messages = chat.messages;
      if (messages.length === 0) {
        throw new Error('No messages to regenerate');
      }

      // Find the last user message
      let lastUserMessageIndex = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          lastUserMessageIndex = i;
          break;
        }
      }

      if (lastUserMessageIndex === -1) {
        throw new Error('No user message found to regenerate from');
      }

      // Get the content of the last user message
      const lastUserMessage = messages[lastUserMessageIndex];
      let userContent = '';
      if (lastUserMessage.parts) {
        for (const part of lastUserMessage.parts) {
          if (part.type === 'text') {
            userContent += part.text;
          }
        }
      }

      // Apply modifier if provided
      if (options?.modifier) {
        userContent = `${userContent}\n\n${options.modifier}`;
      }

      // Set messages to everything up to (but not including) the last assistant message
      const messagesToKeep = messages.slice(0, lastUserMessageIndex);
      chat.setMessages(messagesToKeep);

      // Re-send the user message to get a new response
      await chat.sendMessage({
        role: 'user',
        parts: [{ type: 'text', text: userContent }],
        ...(options?.id && { id: options.id })
      });
    },
    [chat, enclaveConfig, enforceAllowance, isReady, isUnlocked, selectedModelId]
  );

  return {
    ...chat,
    sendMessage,
    regenerate,
    isReady,
    isLoadingCredentials,
    selectedModelId,
    setSelectedModel,
  };
}

/**
 * Clear all AI-related caches
 * Call on logout, lock, or credential changes
 */
export function clearAICaches(): void {
  clearCredentialCache();
  clearProviderCache();
}
