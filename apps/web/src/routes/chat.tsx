import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import type { UIMessage } from 'ai';
import { useE2EE } from '@/providers/E2EEProvider';
import { useModelStore } from '@/stores/modelStore';
import { useChat, useUpdateChat, useDeleteChat } from '@/hooks/queries/useChats';
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
  createdAt: number;
  updatedAt: number;
  encryptedChatKey?: string;
  chatKeyNonce?: string;
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
  const { isUnlocked } = useE2EE();
  const { selectedModelId, setSelectedModel } = useModelStore();

  // Follow-up suggestions state
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [isGeneratingFollowUps, setIsGeneratingFollowUps] = useState(false);

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

        const chatContent = rawChat.encryptedChat && rawChat.chatNonce
          ? decryptChatContent(
              rawChat.id,
              rawChat.encryptedChatKey,
              rawChat.chatKeyNonce,
              rawChat.encryptedChat,
              rawChat.chatNonce
            ) as { messages: ChatMessage[] }
          : { messages: [] };

        return {
          id: rawChat.id,
          title,
          messages: chatContent.messages || [],
          createdAt: rawChat.createdAt,
          updatedAt: rawChat.updatedAt,
          encryptedChatKey: rawChat.encryptedChatKey,
          chatKeyNonce: rawChat.chatKeyNonce,
        };
      } catch {
        return {
          id: rawChat.id,
          title: 'Encrypted',
          messages: [],
          createdAt: rawChat.createdAt,
          updatedAt: rawChat.updatedAt,
          encryptedChatKey: rawChat.encryptedChatKey,
          chatKeyNonce: rawChat.chatKeyNonce,
        };
      }
    }

    return {
      id: rawChat.id,
      title: 'Encrypted',
      messages: [],
      createdAt: rawChat.createdAt,
      updatedAt: rawChat.updatedAt,
      encryptedChatKey: rawChat.encryptedChatKey,
      chatKeyNonce: rawChat.chatKeyNonce,
    };
  }, [rawChat, isUnlocked]);

  const isLoading = rawChat === undefined;

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!chatId) return;
    try {
      await deleteChatMutation.mutateAsync(chatId);
      navigate({ to: '/' });
      toast.success('Chat deleted');
    } catch {
      toast.error('Failed to delete chat');
    }
  }, [chatId, deleteChatMutation, navigate]);

  // Handle title change
  const handleTitleChange = useCallback(async (newTitle: string) => {
    if (!chat || !chatId || !chat.encryptedChatKey || !chat.chatKeyNonce) return;

    try {
      const encrypted = encryptChatTitle(
        chatId,
        chat.encryptedChatKey,
        chat.chatKeyNonce,
        newTitle
      );

      await updateChatMutation.mutateAsync({
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
  }, [chat, chatId, updateChatMutation]);

  // Ref to track pending user message for persistence
  const pendingUserMessageRef = useRef<ChatMessage | null>(null);
  // Ref to track current messages for persistence
  const currentMessagesRef = useRef<ChatMessage[]>([]);

  // Keep currentMessagesRef in sync with chat.messages
  useEffect(() => {
    if (chat?.messages) {
      currentMessagesRef.current = chat.messages;
    }
  }, [chat?.messages]);

  // Handle message completion - persist user + assistant messages
  const handleFinish = useCallback(async (message: UIMessage) => {
    if (!chatId || !chat?.encryptedChatKey || !chat?.chatKeyNonce) return;

    // Build final messages: stored + pending user + assistant
    const pendingUserMessage = pendingUserMessageRef.current;
    const assistantMessage = toChatMessage(message, selectedModelId || undefined);

    let finalMessages: ChatMessage[];
    if (pendingUserMessage) {
      finalMessages = [...currentMessagesRef.current, pendingUserMessage, assistantMessage];
      pendingUserMessageRef.current = null; // Clear pending
    } else {
      // No pending user message - this shouldn't happen but handle gracefully
      finalMessages = [...currentMessagesRef.current, assistantMessage];
    }

    // Update ref for next message
    currentMessagesRef.current = finalMessages;

    // Encrypt and save to server
    try {
      const encrypted = encryptChatContent(
        chatId,
        chat.encryptedChatKey,
        chat.chatKeyNonce,
        { messages: finalMessages }
      );

      await updateChatMutation.mutateAsync({
        id: chatId,
        data: {
          encryptedChat: encrypted.encryptedChat,
          chatNonce: encrypted.chatNonce,
        },
      });

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
  }, [chat, chatId, isLoadingCredentials, isReady, isUnlocked, selectedModelId, sendMessage]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-white dark:bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent/20 to-secondary/20 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-accent" />
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex items-center justify-center h-full bg-white dark:bg-gray-950">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-error/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="font-display text-xl text-gray-900 dark:text-white mb-2">
            Chat not found
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This conversation may have been deleted or doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950">
      {/* Chat header - refined */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800/50">
        <ChatNavbar
          title={chat?.title || 'Chat'}
          chatId={chatId || ''}
          onTitleChange={isUnlocked ? handleTitleChange : undefined}
          onDelete={handleDelete}
        />
        <div className="flex-shrink-0">
          <ModelSelector value={selectedModelId || ''} onChange={setSelectedModel} />
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <Messages
          messages={displayMessages}
          streamingMessage={streamingContent}
          streamingModel={selectedModelId || undefined}
          isStreaming={isStreaming}
        />
      </div>

      {/* Input area */}
      <div className="p-4 bg-white dark:bg-gray-950">
        <div className="max-w-3xl mx-auto">
          {/* Follow-up suggestions */}
          {!isStreaming && followUps.length > 0 && (
            <FollowUps
              followUps={followUps}
              onSelect={handleSendMessage}
              className="mb-4"
            />
          )}

          {/* Loading follow-ups indicator */}
          {isGeneratingFollowUps && (
            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mb-3">
              <div className="w-3 h-3 border-2 border-gray-300 border-t-accent rounded-full animate-spin" />
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
                ? 'Select a model to continue'
                : 'Message Cortex...'
            }
          />
        </div>
      </div>
    </div>
  );
}
