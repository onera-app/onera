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
import type { NativeSearchSettings } from '@/stores/toolsStore';

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
  sendMessage: (content: SendMessageInput) => Promise<void>;

  /**
   * Regenerate the last assistant message
   * Optionally with a modifier prompt (e.g., "be more concise")
   */
  regenerate: (options?: { modifier?: string }) => Promise<void>;

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
  maxTokens = 4096,
  nativeSearch,
}: UseDirectChatOptions): UseDirectChatReturn {
  const { isUnlocked } = useE2EE();
  const { selectedModelId, setSelectedModel } = useModelStore();
  const transportRef = useRef<DirectBrowserTransport | null>(null);

  // Stable refs for callbacks to avoid recreating chatOptions on every render
  const onFinishRef = useRef(onFinish);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change (no dependency tracking needed)
  useEffect(() => {
    onFinishRef.current = onFinish;
    onErrorRef.current = onError;
  });

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
      return decryptRawCredentials(raw);
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

  // Check if transport is ready
  const isReady = useMemo(() => {
    return isUnlocked && !!selectedModelId && credentials.length > 0;
  }, [isUnlocked, selectedModelId, credentials.length]);

  // Create transport on mount (always have one to prevent useChat from using default API)
  useEffect(() => {
    if (!transportRef.current) {
      transportRef.current = new DirectBrowserTransport({
        modelId: selectedModelId || 'placeholder',
        maxTokens,
        systemPrompt,
        nativeSearch,
      });
    }
  }, []);

  // Update transport when model or settings change
  useEffect(() => {
    if (transportRef.current && selectedModelId) {
      transportRef.current.setOptions({
        modelId: selectedModelId,
        maxTokens,
        systemPrompt,
        nativeSearch,
      });
    }
  }, [selectedModelId, maxTokens, systemPrompt, nativeSearch]);

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
      });
    }

    return {
      id: chatId,
      messages: initialMessages,
      transport: transportRef.current as any, // Type cast needed due to generic constraints
      onFinish: ({ message }) => onFinishRef.current?.(message),
      onError: (error) => onErrorRef.current?.(error),
    };
  }, [chatId, initialMessages, selectedModelId, maxTokens, systemPrompt, nativeSearch]);
  // REMOVED: onFinish, onError from dependencies - using refs instead

  // Use AI SDK's useChat with our transport
  const chat = useChat(chatOptions);

  // Custom sendMessage that validates state and supports multimodal content
  const sendMessage = useCallback(
    async (content: SendMessageInput) => {
      if (!isReady) {
        const error = new Error(
          !isUnlocked
            ? 'E2EE not unlocked'
            : !selectedModelId
              ? 'No model selected'
              : 'No credentials available'
        );
        onErrorRef.current?.(error);
        throw error;
      }

      // Handle string input (text only)
      if (typeof content === 'string') {
        await chat.sendMessage({ text: content });
        return;
      }

      // Handle multimodal input with parts
      await chat.sendMessage({
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
    [isReady, isUnlocked, selectedModelId, chat.sendMessage]
  );

  // Regenerate the last assistant message
  const regenerate = useCallback(
    async (options?: { modifier?: string }) => {
      if (!isReady) {
        const error = new Error(
          !isUnlocked
            ? 'E2EE not unlocked'
            : !selectedModelId
              ? 'No model selected'
              : 'No credentials available'
        );
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
      await chat.sendMessage({ text: userContent });
    },
    [isReady, isUnlocked, selectedModelId, chat]
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
