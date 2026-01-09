import { useCallback, useEffect, useMemo } from 'react';
import { useParams } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import type { UIMessage } from 'ai';
import { useAuthStore } from '@/stores/authStore';
import { useE2EE } from '@/providers/E2EEProvider';
import { useModelStore } from '@/stores/modelStore';
import { getChat, updateChat } from '@/lib/api/chats';
import { getChatKey, decryptChatTitle, decryptChatContent, encryptChatContent } from '@cortex/crypto';
import type { ChatMessage } from '@cortex/types';
import { Messages } from '@/components/chat/Messages';
import { MessageInput } from '@/components/chat/MessageInput';
import { ChatNavbar } from '@/components/chat/ChatNavbar';
import { ModelSelector } from '@/components/chat/ModelSelector';
import { useDirectChat } from '@/hooks/useDirectChat';

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
  const { token } = useAuthStore();
  const { isUnlocked } = useE2EE();
  const queryClient = useQueryClient();
  const { selectedModelId, setSelectedModel } = useModelStore();

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
        title: '🔒 Encrypted',
        messages: [],
        created_at: encrypted.created_at,
        updated_at: encrypted.updated_at,
        encrypted_chat_key: encrypted.encrypted_chat_key,
        chat_key_nonce: encrypted.chat_key_nonce,
      };
    },
    enabled: !!token && !!chatId,
  });

  // Handle message completion - persist to encrypted storage
  const handleFinish = useCallback(async (message: UIMessage) => {
    if (!token || !chat || !chatId) return;

    // Get current messages from cache and add the new assistant message
    const currentChat = queryClient.getQueryData<DecryptedChat>(['chat', chatId]);
    if (!currentChat) return;

    const assistantMessage = toChatMessage(message, selectedModelId || undefined);
    const finalMessages = [...currentChat.messages, assistantMessage];

    // Update local cache
    queryClient.setQueryData(['chat', chatId], {
      ...currentChat,
      messages: finalMessages,
    });

    // Encrypt and save to server
    try {
      const encrypted = encryptChatContent(
        chatId,
        chat.encrypted_chat_key,
        chat.chat_key_nonce,
        { messages: finalMessages }
      );

      await updateChat(token, chatId, {
        encrypted_chat: encrypted.encryptedChat,
        chat_nonce: encrypted.chatNonce,
      });
    } catch (saveError) {
      console.error('Failed to save chat:', saveError);
      toast.error('Message sent but failed to save');
    }
  }, [chat, chatId, queryClient, selectedModelId, token]);

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

  // Get display messages (exclude streaming assistant message)
  const displayMessages = useMemo(() => {
    if (!chat?.messages) return [];

    // If we have a streaming response, show stored messages + user message from AI state
    if (isStreaming && aiMessages.length > 0) {
      const lastUserMsg = [...aiMessages].reverse().find(m => m.role === 'user');
      if (lastUserMsg) {
        // Check if this user message is already in stored messages
        const alreadyStored = chat.messages.some(m => m.id === lastUserMsg.id);
        if (!alreadyStored) {
          return [...chat.messages, toChatMessage(lastUserMsg)];
        }
      }
    }

    return chat.messages;
  }, [chat?.messages, aiMessages, isStreaming]);

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

    // Create user message for storage
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      created_at: Date.now(),
    };

    // Add user message to storage immediately
    const updatedMessages = [...(chat.messages || []), userMessage];
    queryClient.setQueryData(['chat', chatId], (old: DecryptedChat | undefined) =>
      old ? { ...old, messages: updatedMessages } : old
    );

    // Save user message to server
    try {
      const encrypted = encryptChatContent(
        chatId,
        chat.encrypted_chat_key,
        chat.chat_key_nonce,
        { messages: updatedMessages }
      );

      await updateChat(token, chatId, {
        encrypted_chat: encrypted.encryptedChat,
        chat_nonce: encrypted.chatNonce,
      });
    } catch (saveError) {
      console.error('Failed to save user message:', saveError);
    }

    // Send to AI via the hook
    try {
      await sendMessage(content);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        toast.error(err instanceof Error ? err.message : 'Failed to send message');
      }
    }
  }, [chat, chatId, isLoadingCredentials, isReady, isUnlocked, queryClient, selectedModelId, sendMessage, token]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-500 mb-2">Failed to load chat</p>
          <p className="text-sm text-gray-500">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
        <ChatNavbar title={chat?.title || 'Chat'} chatId={chatId || ''} />
        <div className="pr-4">
          <ModelSelector value={selectedModelId || ''} onChange={setSelectedModel} />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <Messages
          messages={displayMessages}
          streamingMessage={streamingContent}
          isStreaming={isStreaming}
        />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        {isStreaming ? (
          <div className="flex items-center justify-center gap-4">
            <span className="text-sm text-gray-500">Generating response...</span>
            <button
              onClick={stop}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              Stop
            </button>
          </div>
        ) : (
          <MessageInput
            onSend={handleSendMessage}
            disabled={!isUnlocked || !selectedModelId}
            placeholder={
              !isUnlocked
                ? 'Unlock E2EE to send messages'
                : !selectedModelId
                ? 'Select a model to start chatting'
                : 'Send a message...'
            }
          />
        )}
      </div>
    </div>
  );
}
