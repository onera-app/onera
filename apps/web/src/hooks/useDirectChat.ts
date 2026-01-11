/**
 * Direct Chat Hook
 * Wraps AI SDK's useChat with our DirectBrowserTransport for E2EE compliance
 */

import { useChat, type UseChatHelpers } from '@ai-sdk/react';
import { useMemo, useCallback, useEffect, useRef } from 'react';
import type { UIMessage, ChatInit } from 'ai';
import { useE2EE } from '@/providers/E2EEProvider';
import { useModelStore } from '@/stores/modelStore';
import { useCredentials } from '@/hooks/queries/useCredentials';
import {
  DirectBrowserTransport,
  decryptRawCredentials,
  setCredentialCache,
  clearCredentialCache,
  clearProviderCache,
  type RawCredential,
} from '@/lib/ai';

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
   * Optional temperature (0-2)
   */
  temperature?: number;

  /**
   * Optional max tokens
   */
  maxTokens?: number;
}

interface UseDirectChatReturn extends Omit<UseChatHelpers<UIMessage>, 'sendMessage'> {
  /**
   * Send a message to the AI
   */
  sendMessage: (content: string) => Promise<void>;

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

export function useDirectChat({
  chatId,
  initialMessages,
  onFinish,
  onError,
  systemPrompt,
  temperature = 0.7,
  maxTokens = 4096,
}: UseDirectChatOptions): UseDirectChatReturn {
  const { isUnlocked } = useE2EE();
  const { selectedModelId, setSelectedModel } = useModelStore();
  const transportRef = useRef<DirectBrowserTransport | null>(null);

  // Fetch credentials from Convex
  const rawCredentials = useCredentials();
  const isLoadingCredentials = rawCredentials === undefined;

  // Decrypt credentials when available and E2EE is unlocked
  const credentials = useMemo(() => {
    if (!rawCredentials || !isUnlocked) return [];

    try {
      const raw: RawCredential[] = rawCredentials.map(c => ({
        id: c.id,
        provider: c.provider,
        name: c.name,
        encryptedData: c.encryptedData,
        iv: c.iv,
      }));
      const decrypted = decryptRawCredentials(raw);
      // Update the credential cache for provider lookups
      setCredentialCache(decrypted);
      return decrypted;
    } catch (err) {
      console.error('Failed to decrypt credentials:', err);
      return [];
    }
  }, [rawCredentials, isUnlocked]);

  // Check if transport is ready
  const isReady = useMemo(() => {
    return isUnlocked && !!selectedModelId && credentials.length > 0;
  }, [isUnlocked, selectedModelId, credentials.length]);

  // Create transport on mount (always have one to prevent useChat from using default API)
  useEffect(() => {
    if (!transportRef.current) {
      transportRef.current = new DirectBrowserTransport({
        modelId: selectedModelId || 'placeholder',
        temperature,
        maxTokens,
        systemPrompt,
      });
    }
  }, []);

  // Update transport when model or settings change
  useEffect(() => {
    if (transportRef.current && selectedModelId) {
      transportRef.current.setOptions({
        modelId: selectedModelId,
        temperature,
        maxTokens,
        systemPrompt,
      });
    }
  }, [selectedModelId, temperature, maxTokens, systemPrompt]);

  // Create chat options with our transport - ALWAYS provide transport
  const chatOptions = useMemo((): ChatInit<UIMessage> => {
    // Create a transport if we don't have one yet
    if (!transportRef.current) {
      transportRef.current = new DirectBrowserTransport({
        modelId: selectedModelId || 'placeholder',
        temperature,
        maxTokens,
        systemPrompt,
      });
    }

    return {
      id: chatId,
      messages: initialMessages,
      transport: transportRef.current as any, // Type cast needed due to generic constraints
      onFinish: onFinish
        ? ({ message }) => onFinish(message)
        : undefined,
      onError,
    };
  }, [chatId, initialMessages, selectedModelId, temperature, maxTokens, systemPrompt, onFinish, onError]);

  // Use AI SDK's useChat with our transport
  const chat = useChat(chatOptions);

  // Custom sendMessage that validates state and uses text format
  const sendMessage = useCallback(
    async (content: string) => {
      if (!isReady) {
        const error = new Error(
          !isUnlocked
            ? 'E2EE not unlocked'
            : !selectedModelId
              ? 'No model selected'
              : 'No credentials available'
        );
        onError?.(error);
        throw error;
      }

      // Use the chat's sendMessage with text format
      await chat.sendMessage({ text: content });
    },
    [isReady, isUnlocked, selectedModelId, chat.sendMessage, onError]
  );

  return {
    ...chat,
    sendMessage,
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
