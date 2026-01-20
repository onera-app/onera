import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useSearch } from '@tanstack/react-router';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import type { UIMessage } from 'ai';
import { useE2EE } from '@/providers/E2EEProvider';
import { useModelStore } from '@/stores/modelStore';
import { useChat, useUpdateChat, useDeleteChat } from '@/hooks/queries/useChats';
import { getChatKey, decryptChatTitle, decryptChatContent, encryptChatContent, encryptChatTitle } from '@onera/crypto';
import type { ChatMessage, MessageContent, ChatHistory } from '@onera/types';
import { toUIMessage, toChatMessage, areMessagesEqual } from '@/lib/chat/messageUtils';
import { Messages } from '@/components/chat/Messages';
import {
  createMessagesList,
  createBranchFromEdit,
  switchToBranch,
  deleteMessage,
} from '@/lib/messageTree';
import { MessageInput, type MessageInputOptions } from '@/components/chat/MessageInput';
import { ChatNavbar } from '@/components/chat/ChatNavbar';
import { ModelSelector } from '@/components/chat/ModelSelector';
import { useDirectChat } from '@/hooks/useDirectChat';
import { generateFollowUps, generateChatTitle, getProviderFromModelId, supportsNativeSearch } from '@/lib/ai';
import { executeSearch, formatSearchResultsForContext, type SearchResult } from '@/lib/search';
import type { Source } from '@/components/chat/Sources';
import { useToolsStore, type NativeSearchProvider } from '@/stores/toolsStore';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface DecryptedChat {
  id: string;
  title: string;
  messages: ChatMessage[];
  history: ChatHistory;
  createdAt: number;
  updatedAt: number;
  encryptedChatKey?: string;
  chatKeyNonce?: string;
}

export function ChatPage() {
  const { chatId } = useParams({ strict: false });
  const { pending } = useSearch({ strict: false }) as { pending?: boolean };
  const navigate = useNavigate();
  const { isUnlocked } = useE2EE();
  const { selectedModelId, setSelectedModel } = useModelStore();
  const { nativeSearchSettings, getNativeSearchSettings } = useToolsStore();

  // Track if we've triggered the pending response (prevents duplicate calls)
  const pendingTriggeredRef = useRef(false);
  // Track if we should skip message sync (for pending chats)
  // This is managed by effects, not the initializer, to handle navigation between chats
  const skipSyncRef = useRef(false);
  // Track the last processed chatId to detect chat changes
  const lastChatIdRef = useRef<string | undefined>(undefined);

  // Follow-up suggestions state
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [isGeneratingFollowUps, setIsGeneratingFollowUps] = useState(false);

  // Search sources state - stores results from the current/last search
  const [searchSources, setSearchSources] = useState<Source[]>([]);

  // Determine native search settings based on current provider
  const nativeSearch = useMemo(() => {
    if (!selectedModelId) return undefined;

    const provider = getProviderFromModelId(selectedModelId);
    if (!provider || !supportsNativeSearch(provider)) return undefined;

    const settings = getNativeSearchSettings(provider as NativeSearchProvider);
    if (!settings?.enabled) return undefined;

    return {
      enabled: true,
      settings,
    };
  }, [selectedModelId, getNativeSearchSettings, nativeSearchSettings]);

  // Fetch chat using Convex
  const rawChat = useChat(chatId || '');
  const updateChatMutation = useUpdateChat();
  const deleteChatMutation = useDeleteChat();

  // Decrypt chat data
  const chat = useMemo((): DecryptedChat | null => {
    if (!rawChat) return null;

    if (isUnlocked && rawChat.encryptedChatKey && rawChat.chatKeyNonce) {
      try {
        getChatKey(
          rawChat.id,
          rawChat.encryptedChatKey,
          rawChat.chatKeyNonce
        );

        const title = rawChat.encryptedTitle && rawChat.titleNonce
          ? decryptChatTitle(
            rawChat.id,
            rawChat.encryptedChatKey,
            rawChat.chatKeyNonce,
            rawChat.encryptedTitle,
            rawChat.titleNonce
          )
          : 'Untitled';

        const history: ChatHistory = rawChat.encryptedChat && rawChat.chatNonce
          ? decryptChatContent(
            rawChat.id,
            rawChat.encryptedChatKey,
            rawChat.chatKeyNonce,
            rawChat.encryptedChat,
            rawChat.chatNonce
          ) as unknown as ChatHistory
          : { currentId: null, messages: {} };

        // Get linear messages from history for display
        const messages = createMessagesList(history);

        return {
          id: rawChat.id,
          title,
          messages,
          history,
          createdAt: rawChat.createdAt,
          updatedAt: rawChat.updatedAt,
          encryptedChatKey: rawChat.encryptedChatKey,
          chatKeyNonce: rawChat.chatKeyNonce,
        };
      } catch {
        const emptyHistory: ChatHistory = { currentId: null, messages: {} };
        return {
          id: rawChat.id,
          title: 'Encrypted',
          messages: [],
          history: emptyHistory,
          createdAt: rawChat.createdAt,
          updatedAt: rawChat.updatedAt,
          encryptedChatKey: rawChat.encryptedChatKey,
          chatKeyNonce: rawChat.chatKeyNonce,
        };
      }
    }

    const emptyHistory: ChatHistory = { currentId: null, messages: {} };
    return {
      id: rawChat.id,
      title: 'Encrypted',
      messages: [],
      history: emptyHistory,
      createdAt: rawChat.createdAt,
      updatedAt: rawChat.updatedAt,
      encryptedChatKey: rawChat.encryptedChatKey,
      chatKeyNonce: rawChat.chatKeyNonce,
    };
  }, [rawChat, isUnlocked]);

  const isLoading = rawChat === undefined;

  // Handle delete - uses ref to avoid callback recreation
  const handleDelete = useCallback(async () => {
    if (!chatId) return;
    try {
      await deleteChatMutationRef.current.mutateAsync(chatId);
      navigate({ to: '/app' });
      toast.success('Chat deleted');
    } catch {
      toast.error('Failed to delete chat');
    }
  }, [chatId, navigate]);

  // Handle title change - uses refs to avoid recreating callback during streaming
  const handleTitleChange = useCallback(async (newTitle: string) => {
    const { encryptedChatKey, chatKeyNonce } = encryptionKeysRef.current;
    if (!chatId || !encryptedChatKey || !chatKeyNonce) return;

    try {
      const encrypted = encryptChatTitle(
        chatId,
        encryptedChatKey,
        chatKeyNonce,
        newTitle
      );

      await updateChatMutationRef.current.mutateAsync({
        id: chatId,
        data: {
          encryptedTitle: encrypted.encryptedTitle,
          titleNonce: encrypted.titleNonce,
        },
      });

      toast.success('Title updated');
    } catch {
      toast.error('Failed to update title');
    }
  }, [chatId]);

  // Ref to track pending user message for persistence (ref needed for async callbacks)
  const pendingUserMessageRef = useRef<ChatMessage | null>(null);
  // Ref to track current history for persistence (required for async callbacks)
  const currentHistoryRef = useRef<ChatHistory>({ currentId: null, messages: {} });
  // Ref to track previous display messages for stable references (React memo optimization)
  const prevDisplayMessagesRef = useRef<ChatMessage[]>([]);
  // Refs for encryption keys - stable during streaming to avoid callback recreation
  const encryptionKeysRef = useRef<{ encryptedChatKey?: string; chatKeyNonce?: string }>({});
  // Refs for mutation functions to avoid callback recreation
  const deleteChatMutationRef = useRef(deleteChatMutation);
  const updateChatMutationRef = useRef(updateChatMutation);
  
  // Local history state for immediate UI updates (server query may lag behind)
  const [localHistory, setLocalHistory] = useState<ChatHistory>({ currentId: null, messages: {} });

  // Keep currentHistoryRef and localHistory in sync with chat
  useEffect(() => {
    if (chat?.history) {
      currentHistoryRef.current = chat.history;
      setLocalHistory(chat.history);
    }
  }, [chat?.history]);

  // Keep encryption keys ref in sync - these are stable during streaming
  useEffect(() => {
    if (chat?.encryptedChatKey && chat?.chatKeyNonce) {
      encryptionKeysRef.current = {
        encryptedChatKey: chat.encryptedChatKey,
        chatKeyNonce: chat.chatKeyNonce,
      };
    }
  }, [chat?.encryptedChatKey, chat?.chatKeyNonce]);

  // Keep mutation refs in sync (no dependency tracking needed - always update)
  useEffect(() => {
    deleteChatMutationRef.current = deleteChatMutation;
    updateChatMutationRef.current = updateChatMutation;
  });

  // Handle message completion - persist user + assistant messages
  const handleFinish = useCallback(async (message: UIMessage) => {
    if (!chatId || !chat?.encryptedChatKey || !chat?.chatKeyNonce) return;

    // Capture encryption keys for use in async callbacks
    const encryptedChatKey = chat.encryptedChatKey;
    const chatKeyNonce = chat.chatKeyNonce;

    // Build final messages: stored + pending user + assistant
    const pendingUserMessage = pendingUserMessageRef.current;
    const assistantMessage = toChatMessage(message, selectedModelId || undefined);

    // Get current history or initialize empty (deep copy to avoid mutations)
    const history: ChatHistory = {
      currentId: currentHistoryRef.current.currentId,
      messages: { ...currentHistoryRef.current.messages },
    };

    // Find the current leaf message (parent for new messages)
    let parentId: string | null = history.currentId;

    // Add pending user message to history
    if (pendingUserMessage) {
      // Check if this user message already exists (e.g., pending from home.tsx navigation)
      const existingUserMessage = history.messages[pendingUserMessage.id];
      
      if (existingUserMessage) {
        // User message already in history - just use it as parent for assistant
        parentId = pendingUserMessage.id;
      } else {
        // New user message - add to history with tree structure
        const userMsgWithTree: ChatMessage = {
          ...pendingUserMessage,
          parentId,
          childrenIds: [],
        };

        // Update parent's childrenIds
        if (parentId && history.messages[parentId]) {
          history.messages[parentId] = {
            ...history.messages[parentId],
            childrenIds: [...(history.messages[parentId].childrenIds || []), pendingUserMessage.id],
          };
        }

        history.messages[pendingUserMessage.id] = userMsgWithTree;
        parentId = pendingUserMessage.id;
      }
      
      pendingUserMessageRef.current = null; // Clear pending
    }

    // Add assistant message to history
    const assistantMsgWithTree: ChatMessage = {
      ...assistantMessage,
      parentId,
      childrenIds: [],
    };

    // Update parent's childrenIds if it exists
    if (parentId && history.messages[parentId]) {
      history.messages[parentId] = {
        ...history.messages[parentId],
        childrenIds: [...(history.messages[parentId].childrenIds || []), assistantMessage.id],
      };
    }

    history.messages[assistantMessage.id] = assistantMsgWithTree;
    history.currentId = assistantMessage.id;

    // Update history ref and local state for immediate UI updates
    currentHistoryRef.current = history;
    setLocalHistory(history);

    // Encrypt and save to server
    try {
      const encrypted = encryptChatContent(
        chatId,
        encryptedChatKey,
        chatKeyNonce,
        history as unknown as Record<string, unknown>
      );

      await updateChatMutation.mutateAsync({
        id: chatId,
        data: {
          encryptedChat: encrypted.encryptedChat,
          chatNonce: encrypted.chatNonce,
        },
      });

      // Generate follow-up suggestions asynchronously and persist them
      if (selectedModelId) {
        setIsGeneratingFollowUps(true);
        // Derive messages from history for follow-up generation
        const messagesForFollowUps = createMessagesList(currentHistoryRef.current);
        generateFollowUps(messagesForFollowUps, selectedModelId, 3)
          .then(async (suggestions) => {
            setFollowUps(suggestions);

            // Persist follow-ups to the assistant message
            if (suggestions.length > 0 && currentHistoryRef.current.messages[assistantMessage.id]) {
              currentHistoryRef.current.messages[assistantMessage.id] = {
                ...currentHistoryRef.current.messages[assistantMessage.id],
                followUps: suggestions,
              };

              // Re-encrypt and save with follow-ups
              try {
                const encryptedWithFollowUps = encryptChatContent(
                  chatId,
                  encryptedChatKey,
                  chatKeyNonce,
                  currentHistoryRef.current as unknown as Record<string, unknown>
                );

                await updateChatMutation.mutateAsync({
                  id: chatId,
                  data: {
                    encryptedChat: encryptedWithFollowUps.encryptedChat,
                    chatNonce: encryptedWithFollowUps.chatNonce,
                  },
                });
              } catch (followUpSaveError) {
                console.warn('Failed to persist follow-ups:', followUpSaveError);
              }
            }
          })
          .catch((err) => {
            console.warn('Failed to generate follow-ups:', err);
          })
          .finally(() => {
            setIsGeneratingFollowUps(false);
          });

        // Generate AI title for new chats (first exchange only)
        const messageCount = Object.keys(currentHistoryRef.current.messages).length;
        if (messageCount === 2) {
          generateChatTitle(messagesForFollowUps, selectedModelId)
            .then(async (generatedTitle) => {
              if (generatedTitle) {
                try {
                  const encryptedTitle = encryptChatTitle(
                    chatId,
                    encryptedChatKey,
                    chatKeyNonce,
                    generatedTitle
                  );

                  await updateChatMutation.mutateAsync({
                    id: chatId,
                    data: {
                      encryptedTitle: encryptedTitle.encryptedTitle,
                      titleNonce: encryptedTitle.titleNonce,
                    },
                  });
                } catch (titleSaveError) {
                  console.warn('Failed to save generated title:', titleSaveError);
                }
              }
            })
            .catch((err) => {
              console.warn('Failed to generate title:', err);
            });
        }
      }
    } catch (saveError) {
      console.error('Failed to save chat:', saveError);
      toast.error('Message sent but failed to save');
    }
  }, [chatId, chat?.encryptedChatKey, chat?.chatKeyNonce, selectedModelId, updateChatMutation]);

  // Use the direct chat hook
  const {
    messages: aiMessages,
    setMessages,
    sendMessage,
    status,
    stop,
    isReady,
    isLoadingCredentials,
  } = useDirectChat({
    chatId: chatId || 'new',
    onFinish: handleFinish,
    onError: (error) => {
      if (error.name !== 'AbortError') {
        toast.error(error.message || 'Failed to get response');
      }
    },
    nativeSearch,
  });

  // Sync decrypted messages to AI SDK state when chat loads
  // Skip syncing if this is a pending chat - we'll let the AI SDK handle messages naturally
  useEffect(() => {
    // Detect if this is a new chat navigation
    const isNewChat = lastChatIdRef.current !== chatId;
    if (isNewChat) {
      lastChatIdRef.current = chatId;
      // Reset refs for the new chat
      pendingTriggeredRef.current = false;
      // Skip sync only if this new chat has pending=true
      skipSyncRef.current = pending === true;
    }

    // Skip if this is a pending chat - the pending handler will trigger sendMessage
    if (skipSyncRef.current) return;

    if (chat?.messages && chat.messages.length > 0) {
      const uiMessages = chat.messages.map(toUIMessage);
      setMessages(uiMessages);

      // Load persisted follow-ups from the last assistant message
      const lastMessage = chat.messages[chat.messages.length - 1];
      if (lastMessage?.role === 'assistant' && lastMessage.followUps && lastMessage.followUps.length > 0) {
        // Use persisted follow-ups
        setFollowUps(lastMessage.followUps);
      } else if (lastMessage?.role === 'assistant' && selectedModelId) {
        // No persisted follow-ups - generate them now
        // This handles the case when coming from home.tsx before follow-ups were persisted
        setFollowUps([]);
        setIsGeneratingFollowUps(true);
        generateFollowUps(chat.messages, selectedModelId, 3)
          .then(async (suggestions) => {
            setFollowUps(suggestions);

            // Persist follow-ups to the assistant message if we have encryption keys
            if (suggestions.length > 0 && chat.encryptedChatKey && chat.chatKeyNonce && chatId) {
              try {
                const updatedHistory: ChatHistory = {
                  ...chat.history,
                  messages: {
                    ...chat.history.messages,
                    [lastMessage.id]: {
                      ...chat.history.messages[lastMessage.id],
                      followUps: suggestions,
                    },
                  },
                };

                const encryptedWithFollowUps = encryptChatContent(
                  chatId,
                  chat.encryptedChatKey,
                  chat.chatKeyNonce,
                  updatedHistory as unknown as Record<string, unknown>
                );

                await updateChatMutation.mutateAsync({
                  id: chatId,
                  data: {
                    encryptedChat: encryptedWithFollowUps.encryptedChat,
                    chatNonce: encryptedWithFollowUps.chatNonce,
                  },
                });

                // Update local history ref
                currentHistoryRef.current = updatedHistory;
              } catch (err) {
                console.warn('Failed to persist follow-ups:', err);
              }
            }
          })
          .catch((err) => {
            console.warn('Failed to generate follow-ups:', err);
          })
          .finally(() => {
            setIsGeneratingFollowUps(false);
          });
      } else {
        // Clear any stale follow-ups
        setFollowUps([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat?.id, chatId, pending]); // Depend on chatId and pending to handle navigation

  // Handle pending response from home.tsx navigation
  // When navigated with ?pending=true, trigger AI response for the user message
  useEffect(() => {
    const triggerPendingResponse = async () => {
      // Only trigger once per chat
      if (!pending || pendingTriggeredRef.current || !chat || !isReady || !selectedModelId) {
        return;
      }

      // Mark as triggered to prevent duplicate calls
      pendingTriggeredRef.current = true;

      // Clear the pending param from URL without triggering navigation
      navigate({
        to: '/app/c/$chatId',
        params: { chatId: chatId! },
        search: { pending: false },
        replace: true,
      });

      // Get the user message from the chat
      const messages = chat.messages;
      if (messages.length === 0) return;

      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role !== 'user') return;

      // Extract user message content
      const userContent = typeof lastMessage.content === 'string'
        ? lastMessage.content
        : lastMessage.content
            .filter(c => c.type === 'text')
            .map(c => c.text)
            .join('\n');

      if (!userContent) return;

      // Set the pending user message so displayMessages uses the stored message
      // This ensures consistent message IDs between stored history and display
      pendingUserMessageRef.current = lastMessage;

      try {
        // Send the message to trigger AI response
        await sendMessage(userContent);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          toast.error(err instanceof Error ? err.message : 'Failed to get response');
        }
      }
    };

    triggerPendingResponse();
  }, [pending, chat, isReady, selectedModelId, chatId, navigate, sendMessage]);


  // Derive streaming state from AI SDK status
  const isStreaming = status === 'streaming' || status === 'submitted';

  // Get streaming message parts from the last message if it's streaming
  // Includes both text and reasoning parts from the AI SDK
  const streamingParts = useMemo(() => {
    if (!isStreaming) return undefined;

    const lastMessage = aiMessages[aiMessages.length - 1];
    if (lastMessage?.role === 'assistant' && lastMessage.parts) {
      return lastMessage.parts;
    }
    return [];
  }, [aiMessages, isStreaming]);

  // Get display messages - combine stored messages with streaming state
  // Uses ref comparison to return stable reference when content unchanged
  const displayMessages = useMemo(() => {
    // Use localHistory for stored messages to reflect branch switches immediately
    const storedMessages = createMessagesList(localHistory);
    let result: ChatMessage[];

    // If we have AI messages that include more than stored (user sent new message)
    // Include ALL messages - streaming message stays in array (like Vercel's approach)
    if (aiMessages.length > storedMessages.length) {
      // Use pendingUserMessageRef for user message to preserve multimodal content (images/docs)
      // The AI SDK may not preserve file parts in the same format we need
      const pendingUser = pendingUserMessageRef.current;

      result = aiMessages.map((m, index) => {
        // If this is the user message we just sent and we have a pending ref, use it
        // This preserves images/documents that the AI SDK might not keep in parts
        if (pendingUser && m.role === 'user' && index === aiMessages.length - 2) {
          return pendingUser;
        }
        return toChatMessage(m, m.role === 'assistant' ? selectedModelId || undefined : undefined);
      });
    } else {
      // Use stored messages from localHistory
      result = storedMessages;
    }

    // Return same reference if content unchanged to prevent re-renders
    if (areMessagesEqual(prevDisplayMessagesRef.current, result)) {
      return prevDisplayMessagesRef.current;
    }
    prevDisplayMessagesRef.current = result;
    return result;
  }, [localHistory, aiMessages, selectedModelId]);

  // Handle sending a message with optional attachments and search
  const handleSendMessage = useCallback(async (content: string, options?: MessageInputOptions) => {
    if (!isUnlocked || !chat || !selectedModelId || !chatId) {
      if (!selectedModelId) {
        toast.error('Please select a model first');
      }
      return;
    }

    if (!isReady) {
      if (isLoadingCredentials) {
        toast.error('Loading credentials...');
      } else {
        toast.error('Please add a connection first');
      }
      return;
    }

    // Clear follow-ups and search sources when sending a new message
    setFollowUps([]);
    if (!options?.searchEnabled) {
      setSearchSources([]);
    }

    try {
      // Build the message content
      let messageContent: string | MessageContent[] = content;
      const uiParts: Array<{ type: string; text?: string; image?: string }> = [];
      // Parts for sendMessage in AI SDK format
      const sendParts: Array<{ type: 'text' | 'file'; text?: string; url?: string; mediaType?: string }> = [];

      // Process attachments if provided
      if (options?.attachments && options.attachments.length > 0) {
        const contentParts: MessageContent[] = [];

        for (const attachment of options.attachments) {
          if (attachment.type === 'image') {
            // Add image to content parts - stored in E2EE message history
            const dataUrl = `data:${attachment.mimeType};base64,${attachment.data}`;
            contentParts.push({
              type: 'image_url',
              image_url: { url: dataUrl },
            });
            uiParts.push({ type: 'image', image: dataUrl });
            // Add to sendParts in AI SDK format
            sendParts.push({ type: 'file', url: dataUrl, mediaType: attachment.mimeType });
          } else if (attachment.type === 'document' || attachment.type === 'text') {
            // Store original document in E2EE message history
            const dataUrl = `data:${attachment.mimeType};base64,${attachment.data}`;
            contentParts.push({
              type: 'document_url',
              document_url: {
                url: dataUrl,
                fileName: attachment.fileName,
                mimeType: attachment.mimeType,
                extractedText: attachment.metadata?.extractedText,
              },
            });

            // Send extracted text to the LLM for context
            if (attachment.metadata?.extractedText) {
              const docContext = `[Document: ${attachment.fileName}]\n${attachment.metadata.extractedText}\n\n`;
              sendParts.push({ type: 'text', text: docContext });
            }
          }
        }

        // Add user's text message
        if (content) {
          contentParts.push({ type: 'text', text: content });
          uiParts.push({ type: 'text', text: content });
          sendParts.push({ type: 'text', text: content });
        }

        messageContent = contentParts;
      }

      // Execute search if enabled
      let searchContext = '';
      if (options?.searchEnabled) {
        try {
          const searchResult = await executeSearch(content, options.searchProvider);
          if (searchResult.results.length > 0) {
            searchContext = formatSearchResultsForContext(searchResult.results, content);
            toast.success(`Found ${searchResult.results.length} search results`);

            // Convert search results to sources for display
            const sources: Source[] = searchResult.results.map((r: SearchResult) => ({
              sourceType: 'url',
              url: r.url,
              title: r.title,
              domain: r.url ? new URL(r.url).hostname.replace(/^www\./, '') : undefined,
            }));
            setSearchSources(sources);
          } else {
            setSearchSources([]);
          }
        } catch (searchError) {
          console.warn('Search failed:', searchError);
          setSearchSources([]);
          // Don't block the message, just warn
          toast.warning('Search failed, sending message without search results');
        }
      }

      // Build the final message text for the AI
      let finalContent = '';
      if (searchContext) {
        finalContent = `${searchContext}\n\n`;
      }

      // Handle multimodal content
      if (Array.isArray(messageContent)) {
        // Extract text parts and prepend search context
        const textParts = messageContent.filter(p => p.type === 'text');

        if (searchContext && textParts.length > 0) {
          textParts[0] = { type: 'text', text: searchContext + '\n\n' + (textParts[0].text || '') };
        } else if (searchContext) {
          messageContent = [{ type: 'text', text: searchContext }, ...messageContent];
        }

        // Build UI parts for AI SDK
        for (const part of messageContent) {
          if (part.type === 'text' && part.text) {
            uiParts.push({ type: 'text', text: part.text });
          } else if (part.type === 'image_url' && part.image_url?.url) {
            uiParts.push({ type: 'image', image: part.image_url.url });
          }
        }

        finalContent = messageContent.filter(p => p.type === 'text').map(p => p.text).join('\n');
      } else {
        finalContent += messageContent;
        uiParts.push({ type: 'text', text: finalContent });
      }

      // Create and store pending user message for persistence
      const userMessage: ChatMessage = {
        id: uuidv4(),
        role: 'user',
        content: messageContent,
        created_at: Date.now(),
      };
      pendingUserMessageRef.current = userMessage;

      // Send to AI via the hook - use multimodal parts if we have attachments
      if (sendParts.length > 0) {
        // Prepend search context to first text part if present
        if (searchContext && sendParts.length > 0) {
          const firstTextIndex = sendParts.findIndex(p => p.type === 'text');
          if (firstTextIndex >= 0) {
            sendParts[firstTextIndex].text = searchContext + '\n\n' + (sendParts[firstTextIndex].text || '');
          } else {
            sendParts.unshift({ type: 'text', text: searchContext });
          }
        }
        await sendMessage({ parts: sendParts });
      } else {
        await sendMessage(finalContent);
      }
    } catch (err) {
      pendingUserMessageRef.current = null; // Clear on error
      if ((err as Error).name !== 'AbortError') {
        toast.error(err instanceof Error ? err.message : 'Failed to send message');
      }
    }
  }, [chat, chatId, isLoadingCredentials, isReady, isUnlocked, selectedModelId, sendMessage]);

  // Handle message edit - creates a new branch (uses refs for stable callback)
  const handleEditMessage = useCallback(async (messageId: string, newContent: string) => {
    const { encryptedChatKey, chatKeyNonce } = encryptionKeysRef.current;
    if (!chatId || !encryptedChatKey || !chatKeyNonce) return;

    try {
      // Create a new branch from the edit
      const { history: newHistory } = createBranchFromEdit(
        currentHistoryRef.current,
        messageId,
        newContent
      );

      // Update history ref and local state for immediate UI updates
      currentHistoryRef.current = newHistory;
      setLocalHistory(newHistory);

      // Encrypt and save to server
      const encrypted = encryptChatContent(
        chatId,
        encryptedChatKey,
        chatKeyNonce,
        newHistory as unknown as Record<string, unknown>
      );

      await updateChatMutationRef.current.mutateAsync({
        id: chatId,
        data: {
          encryptedChat: encrypted.encryptedChat,
          chatNonce: encrypted.chatNonce,
        },
      });

      toast.success('Message edited - new branch created');

      // Now re-send to get a new AI response
      // The AI messages need to be updated to reflect the new branch
      const newMessages = createMessagesList(newHistory);
      const uiMessages = newMessages.map(toUIMessage);
      setMessages(uiMessages);

      // Trigger a new AI response by sending the edited message
      if (selectedModelId && isReady) {
        await sendMessage(newContent);
      }
    } catch (error) {
      console.error('Failed to edit message:', error);
      toast.error('Failed to edit message');
    }
  }, [chatId, setMessages, selectedModelId, isReady, sendMessage]);

  // Handle branch switching (uses refs for stable callback)
  const handleSwitchBranch = useCallback(async (messageId: string) => {
    const { encryptedChatKey, chatKeyNonce } = encryptionKeysRef.current;
    if (!chatId || !encryptedChatKey || !chatKeyNonce) return;

    try {
      // Switch to the new branch
      const newHistory = switchToBranch(currentHistoryRef.current, messageId);

      // Update history ref and local state immediately for responsive UI
      currentHistoryRef.current = newHistory;
      setLocalHistory(newHistory);

      // Update AI messages to reflect the switched branch
      const newMessages = createMessagesList(newHistory);
      const uiMessages = newMessages.map(toUIMessage);
      setMessages(uiMessages);

      // Load follow-ups from the new branch's last assistant message
      const lastMessage = newMessages[newMessages.length - 1];
      if (lastMessage?.role === 'assistant' && lastMessage.followUps && lastMessage.followUps.length > 0) {
        setFollowUps(lastMessage.followUps);
      } else {
        setFollowUps([]);
      }

      // Encrypt and save to server (async, don't block UI)
      const encrypted = encryptChatContent(
        chatId,
        encryptedChatKey,
        chatKeyNonce,
        newHistory as unknown as Record<string, unknown>
      );

      await updateChatMutationRef.current.mutateAsync({
        id: chatId,
        data: {
          encryptedChat: encrypted.encryptedChat,
          chatNonce: encrypted.chatNonce,
        },
      });
    } catch (error) {
      console.error('Failed to switch branch:', error);
      toast.error('Failed to switch branch');
    }
  }, [chatId, setMessages]);

  // Handle message regeneration (uses encryptionKeysRef for stable callback)
  const handleRegenerateMessage = useCallback(async (
    messageId: string,
    options?: { modifier?: string }
  ) => {
    // Check if we have encryption keys (means chat is loaded)
    const { encryptedChatKey } = encryptionKeysRef.current;
    if (!encryptedChatKey || !chatId || !selectedModelId || !isReady) return;

    try {
      // Find the message index
      const messageIndex = displayMessages.findIndex(m => m.id === messageId);
      if (messageIndex === -1) return;

      // Get all messages up to (but not including) the message to regenerate
      // This should include the user message that prompted this response
      const messagesToKeep = displayMessages.slice(0, messageIndex);
      const userMessage = messagesToKeep[messagesToKeep.length - 1];

      if (!userMessage || userMessage.role !== 'user') {
        toast.error('Cannot regenerate: no user message found');
        return;
      }

      // Clear follow-ups
      setFollowUps([]);

      // Get the user message content
      let userContent = typeof userMessage.content === 'string'
        ? userMessage.content
        : userMessage.content.filter(c => c.type === 'text').map(c => c.text).join('\n');

      // Apply modifier if provided (e.g., "Please be more concise")
      if (options?.modifier) {
        userContent = `${userContent}\n\n${options.modifier}`;
      }

      // Rewind history pointer to the parent of the user message
      // This is CRITICAL to avoid creating cycles in the message tree if we are reusing the user message ID
      if (userMessage.parentId) {
        currentHistoryRef.current.currentId = userMessage.parentId;
      } else {
        // If no parent, we are at the root
        currentHistoryRef.current.currentId = null;
      }

      // Set up messages for regeneration (exclude the user message as sendMessage will add it back)
      const uiMessages = messagesToKeep.slice(0, -1).map(toUIMessage);
      setMessages(uiMessages);

      // Store the pending user message for persistence (without modifier in stored content)
      pendingUserMessageRef.current = {
        ...userMessage,
        id: userMessage.id, // Keep same ID for the original user message
      };

      // Send the message again to regenerate
      await sendMessage(userContent);
    } catch (error) {
      console.error('Failed to regenerate message:', error);
      toast.error('Failed to regenerate message');
    }
  }, [chatId, selectedModelId, isReady, displayMessages, setMessages, sendMessage]);

  // Handle message deletion - uses refs to avoid callback recreation during streaming
  const handleDeleteMessage = useCallback(async (messageId: string) => {
    const { encryptedChatKey, chatKeyNonce } = encryptionKeysRef.current;
    if (!chatId || !encryptedChatKey || !chatKeyNonce) return;

    try {
      // Delete the message and its children from history
      const newHistory = deleteMessage(currentHistoryRef.current, messageId, true);

      // Update history ref and local state for immediate UI updates
      currentHistoryRef.current = newHistory;
      setLocalHistory(newHistory);

      // Encrypt and save to server
      const encrypted = encryptChatContent(
        chatId,
        encryptedChatKey,
        chatKeyNonce,
        newHistory as unknown as Record<string, unknown>
      );

      await updateChatMutationRef.current.mutateAsync({
        id: chatId,
        data: {
          encryptedChat: encrypted.encryptedChat,
          chatNonce: encrypted.chatNonce,
        },
      });

      // Update AI messages to reflect the deletion
      const newMessages = createMessagesList(newHistory);
      const uiMessages = newMessages.map(toUIMessage);
      setMessages(uiMessages);

      // Clear follow-ups if we deleted the last message
      if (newMessages.length === 0 || newMessages[newMessages.length - 1]?.role !== 'assistant') {
        setFollowUps([]);
      }

      toast.success('Message deleted');
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast.error('Failed to delete message');
    }
  }, [chatId, setMessages]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-border border-t-foreground animate-spin" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="text-center max-w-md px-4">
          <Alert variant="destructive" className="bg-card border-border">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-foreground">Chat not found</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              This conversation may have been deleted or doesn't exist.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Memoize navbar children to prevent ChatNavbar re-renders
  const navbarChildren = useMemo(() => (
    <div className="hidden md:block">
      <ModelSelector value={selectedModelId || ''} onChange={setSelectedModel} />
    </div>
  ), [selectedModelId, setSelectedModel]);

  return (
    <div className="relative flex flex-col h-full w-full bg-background overflow-hidden">
      {/* Chat header - Absolute overlay */}
      <ChatNavbar
        title={chat?.title || 'Chat'}
        chatId={chatId || ''}
        onTitleChange={isUnlocked ? handleTitleChange : undefined}
        onDelete={handleDelete}
      >
        {navbarChildren}
      </ChatNavbar>

      {/* Mobile Model Selector - visible only on small screens below navbar */}
      <div className="md:hidden absolute top-14 left-0 right-0 z-20 px-4 py-2 bg-background/80 backdrop-blur border-b border-border">
        <ModelSelector value={selectedModelId || ''} onChange={setSelectedModel} />
      </div>

      {/* Messages - Takes full space */}
      <div className="relative flex-1 w-full h-full">
        <Messages
          messages={displayMessages}
          history={localHistory}
          streamingParts={streamingParts}
          streamingSources={searchSources}
          isStreaming={isStreaming}
          currentModelId={selectedModelId || undefined}
          onEditMessage={handleEditMessage}
          onRegenerateMessage={handleRegenerateMessage}
          onDeleteMessage={handleDeleteMessage}
          onSwitchBranch={handleSwitchBranch}
          onSendMessage={handleSendMessage}
          inputDisabled={!isUnlocked || !selectedModelId}
          followUps={followUps}
          isGeneratingFollowUps={isGeneratingFollowUps}
          onFollowUpSelect={handleSendMessage}
        />
      </div>

      {/* Input area - Floating at bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-background via-background/80 to-transparent pb-6 pt-10">
        <div className="max-w-3xl mx-auto">
          <MessageInput
            onSend={handleSendMessage}
            onStop={stop}
            isStreaming={isStreaming}
            disabled={!isUnlocked || !selectedModelId}
            placeholder={
              !isUnlocked
                ? 'Unlock E2EE to send messages'
                : !selectedModelId
                  ? 'Select a model to continue'
                  : 'Message Onera...'
            }
          />
        </div>
      </div>
    </div>
  );
}
