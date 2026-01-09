import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import type { UIMessage } from 'ai';
import { useAuthStore } from '@/stores/authStore';
import { useE2EE } from '@/providers/E2EEProvider';
import { useModelStore } from '@/stores/modelStore';
import { getChat, updateChat, deleteChat } from '@/lib/api/chats';
import { getChatKey, decryptChatTitle, decryptChatContent, encryptChatContent, encryptChatTitle } from '@cortex/crypto';
import type { ChatMessage } from '@cortex/types';
import { Messages } from '@/components/chat/Messages';
import { MessageInput } from '@/components/chat/MessageInput';
import { ChatNavbar } from '@/components/chat/ChatNavbar';
import { ModelSelector } from '@/components/chat/ModelSelector';
import { FollowUps } from '@/components/chat/FollowUps';
import { useDirectChat } from '@/hooks/useDirectChat';
import { generateFollowUps } from '@/lib/ai';

interface DecryptedChat {
  id: string;
  title: string;
  messages: ChatMessage[];
  created_at: number;
  updated_at: number;
  encrypted_chat_key: string;
  chat_key_nonce: string;
}

/**
 * Convert ChatMessage (storage format) to UIMessage (AI SDK format)
 */
function toUIMessage(msg: ChatMessage): UIMessage {
  const content = typeof msg.content === 'string'
    ? msg.content
    : msg.content.filter(c => c.type === 'text').map(c => c.text).join('\n');

  return {
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    parts: [{ type: 'text', text: content }],
  };
}

/**
 * Convert UIMessage (AI SDK format) to ChatMessage (storage format)
 */
function toChatMessage(msg: UIMessage, model?: string): ChatMessage {
  let content = '';
  if (msg.parts) {
    for (const part of msg.parts) {
      if (part.type === 'text') {
        content += part.text;
      }
    }
  }

  return {
    id: msg.id,
    role: msg.role,
    content,
    created_at: Date.now(),
    model: msg.role === 'assistant' ? model : undefined,
  };
}

export function ChatPage() {
  const { chatId } = useParams({ strict: false });
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const { isUnlocked } = useE2EE();
  const queryClient = useQueryClient();
  const { selectedModelId, setSelectedModel } = useModelStore();

  // Follow-up suggestions state
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [isGeneratingFollowUps, setIsGeneratingFollowUps] = useState(false);

  // Fetch and decrypt chat
  const {
    data: chat,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['chat', chatId],
    queryFn: async (): Promise<DecryptedChat> => {
      if (!token) throw new Error('Not authenticated');
      if (!chatId) throw new Error('No chat ID');

      const encrypted = await getChat(token, chatId);

      if (isUnlocked) {
        getChatKey(
          chatId,
          encrypted.encrypted_chat_key,
          encrypted.chat_key_nonce
        );

        const title = decryptChatTitle(
          chatId,
          encrypted.encrypted_chat_key,
          encrypted.chat_key_nonce,
          encrypted.encrypted_title,
          encrypted.title_nonce
        );

        const chatContent = decryptChatContent(
          chatId,
          encrypted.encrypted_chat_key,
          encrypted.chat_key_nonce,
          encrypted.encrypted_chat,
          encrypted.chat_nonce
        ) as { messages: ChatMessage[] };

        return {
          id: encrypted.id,
          title,
          messages: chatContent.messages || [],
          created_at: encrypted.created_at,
          updated_at: encrypted.updated_at,
          encrypted_chat_key: encrypted.encrypted_chat_key,
          chat_key_nonce: encrypted.chat_key_nonce,
        };
      }

      return {
        id: encrypted.id,
        title: 'Encrypted',
        messages: [],
        created_at: encrypted.created_at,
        updated_at: encrypted.updated_at,
        encrypted_chat_key: encrypted.encrypted_chat_key,
        chat_key_nonce: encrypted.chat_key_nonce,
      };
    },
    enabled: !!token && !!chatId,
  });

  // Delete chat mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteChat(token!, chatId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      navigate({ to: '/' });
      toast.success('Chat deleted');
    },
    onError: () => {
      toast.error('Failed to delete chat');
    },
  });

  // Handle title change
  const handleTitleChange = useCallback(async (newTitle: string) => {
    if (!token || !chat || !chatId) return;

    try {
      const encrypted = encryptChatTitle(
        chatId,
        chat.encrypted_chat_key,
        chat.chat_key_nonce,
        newTitle
      );

      await updateChat(token, chatId, {
        encrypted_title: encrypted.encryptedTitle,
        title_nonce: encrypted.titleNonce,
      });

      // Update local cache
      queryClient.setQueryData(['chat', chatId], (old: DecryptedChat | undefined) =>
        old ? { ...old, title: newTitle } : old
      );
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      toast.success('Title updated');
    } catch {
      toast.error('Failed to update title');
    }
  }, [chat, chatId, queryClient, token]);

  // Ref to track pending user message for persistence
  const pendingUserMessageRef = useRef<ChatMessage | null>(null);

  // Handle message completion - persist user + assistant messages
  const handleFinish = useCallback(async (message: UIMessage) => {
    if (!token || !chatId) return;

    // Get current chat from cache (need fresh data)
    const currentChat = queryClient.getQueryData<DecryptedChat>(['chat', chatId]);
    if (!currentChat) return;

    // Build final messages: stored + pending user + assistant
    const pendingUserMessage = pendingUserMessageRef.current;
    const assistantMessage = toChatMessage(message, selectedModelId || undefined);

    let finalMessages: ChatMessage[];
    if (pendingUserMessage) {
      finalMessages = [...currentChat.messages, pendingUserMessage, assistantMessage];
      pendingUserMessageRef.current = null; // Clear pending
    } else {
      // No pending user message - this shouldn't happen but handle gracefully
      finalMessages = [...currentChat.messages, assistantMessage];
    }

    // Update local cache
    queryClient.setQueryData(['chat', chatId], {
      ...currentChat,
      messages: finalMessages,
    });

    // Encrypt and save to server
    try {
      const encrypted = encryptChatContent(
        chatId,
        currentChat.encrypted_chat_key,
        currentChat.chat_key_nonce,
        { messages: finalMessages }
      );

      await updateChat(token, chatId, {
        encrypted_chat: encrypted.encryptedChat,
        chat_nonce: encrypted.chatNonce,
      });

      // Invalidate chats list to update sidebar
      queryClient.invalidateQueries({ queryKey: ['chats'] });

      // Generate follow-up suggestions asynchronously
      if (selectedModelId) {
        setIsGeneratingFollowUps(true);
        generateFollowUps(finalMessages, selectedModelId, 3)
          .then((suggestions) => {
            setFollowUps(suggestions);
          })
          .catch((err) => {
            console.warn('Failed to generate follow-ups:', err);
          })
          .finally(() => {
            setIsGeneratingFollowUps(false);
          });
      }
    } catch (saveError) {
      console.error('Failed to save chat:', saveError);
      toast.error('Message sent but failed to save');
    }
  }, [chatId, queryClient, selectedModelId, token]);

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
  });

  // Sync decrypted messages to AI SDK state when chat loads
  useEffect(() => {
    if (chat?.messages && chat.messages.length > 0) {
      const uiMessages = chat.messages.map(toUIMessage);
      setMessages(uiMessages);
    }
  }, [chat?.messages, setMessages]);

  // Derive streaming state from AI SDK status
  const isStreaming = status === 'streaming' || status === 'submitted';

  // Get streaming content from the last message if it's streaming
  const streamingContent = useMemo(() => {
    if (!isStreaming) return undefined;

    const lastMessage = aiMessages[aiMessages.length - 1];
    if (lastMessage?.role === 'assistant') {
      let content = '';
      if (lastMessage.parts) {
        for (const part of lastMessage.parts) {
          if (part.type === 'text') {
            content += part.text;
          }
        }
      }
      return content;
    }
    return '';
  }, [aiMessages, isStreaming]);

  // Get display messages - combine stored messages with streaming state
  const displayMessages = useMemo(() => {
    const storedMessages = chat?.messages || [];

    // If we have AI messages that include more than stored (user sent new message)
    if (aiMessages.length > storedMessages.length) {
      // Filter out the streaming assistant message (it's shown separately)
      const messagesToShow = isStreaming
        ? aiMessages.filter((m, i) => !(m.role === 'assistant' && i === aiMessages.length - 1))
        : aiMessages;

      return messagesToShow.map(m => toChatMessage(m, m.role === 'assistant' ? selectedModelId || undefined : undefined));
    }

    // Use stored messages
    return storedMessages;
  }, [chat?.messages, aiMessages, isStreaming, selectedModelId]);

  // Handle sending a message
  const handleSendMessage = useCallback(async (content: string) => {
    if (!isUnlocked || !token || !chat || !selectedModelId || !chatId) {
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

    // Clear follow-ups when sending a new message
    setFollowUps([]);

    // Create and store pending user message for persistence
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      created_at: Date.now(),
    };
    pendingUserMessageRef.current = userMessage;

    // Send to AI via the hook
    try {
      await sendMessage(content);
    } catch (err) {
      pendingUserMessageRef.current = null; // Clear on error
      if ((err as Error).name !== 'AbortError') {
        toast.error(err instanceof Error ? err.message : 'Failed to send message');
      }
    }
  }, [chat, chatId, isLoadingCredentials, isReady, isUnlocked, selectedModelId, sendMessage, token]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-600 dark:border-gray-600 dark:border-t-gray-300" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-red-600 dark:text-red-400 font-medium mb-2">Failed to load chat</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950">
      {/* Chat header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
        <ChatNavbar
          title={chat?.title || 'Chat'}
          chatId={chatId || ''}
          onTitleChange={isUnlocked ? handleTitleChange : undefined}
          onDelete={() => deleteMutation.mutate()}
        />
        <div className="pr-4">
          <ModelSelector value={selectedModelId || ''} onChange={setSelectedModel} />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <Messages
          messages={displayMessages}
          streamingMessage={streamingContent}
          streamingModel={selectedModelId || undefined}
          isStreaming={isStreaming}
        />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="max-w-3xl mx-auto">
          {/* Follow-up suggestions */}
          {!isStreaming && followUps.length > 0 && (
            <FollowUps
              followUps={followUps}
              onSelect={handleSendMessage}
              className="mb-3"
            />
          )}

          {/* Loading follow-ups indicator */}
          {isGeneratingFollowUps && (
            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mb-2">
              <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-500 dark:border-gray-600 dark:border-t-gray-400 rounded-full animate-spin" />
              <span>Generating suggestions...</span>
            </div>
          )}

          <MessageInput
            onSend={handleSendMessage}
            onStop={stop}
            isStreaming={isStreaming}
            disabled={!isUnlocked || !selectedModelId}
            placeholder={
              !isUnlocked
                ? 'Unlock E2EE to send messages'
                : !selectedModelId
                ? 'Select a model to start chatting'
                : 'Send a message...'
            }
          />
        </div>
      </div>
    </div>
  );
}
