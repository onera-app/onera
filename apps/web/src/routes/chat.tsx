import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import type { UIMessage } from 'ai';
import { useE2EE } from '@/providers/E2EEProvider';
import { useModelStore } from '@/stores/modelStore';
import { useChat, useUpdateChat, useDeleteChat } from '@/hooks/queries/useChats';
import { getChatKey, decryptChatTitle, decryptChatContent, encryptChatContent, encryptChatTitle } from '@onera/crypto';
import type { ChatMessage, MessageContent } from '@onera/types';
import { Messages } from '@/components/chat/Messages';
import { MessageInput, type MessageInputOptions } from '@/components/chat/MessageInput';
import { ChatNavbar } from '@/components/chat/ChatNavbar';
import { ModelSelector } from '@/components/chat/ModelSelector';
import { FollowUps } from '@/components/chat/FollowUps';
import { useDirectChat } from '@/hooks/useDirectChat';
import { generateFollowUps } from '@/lib/ai';
import { storeAttachment } from '@/lib/storage/attachmentStorage';
import { executeSearch, formatSearchResultsForContext } from '@/lib/search';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';

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

/**
 * Compare two message arrays for equality to avoid unnecessary re-renders
 */
function areMessagesEqual(a: ChatMessage[], b: ChatMessage[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((msg, i) =>
    msg.id === b[i].id &&
    msg.content === b[i].content &&
    msg.role === b[i].role
  );
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
  // Ref to track previous display messages for stable references
  const prevDisplayMessagesRef = useRef<ChatMessage[]>([]);

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

      // Generate follow-ups for existing chat if none exist and not streaming
      if (followUps.length === 0 && !isGeneratingFollowUps && selectedModelId && status !== 'streaming') {
        setIsGeneratingFollowUps(true);
        generateFollowUps(chat.messages, selectedModelId, 3)
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
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat?.id]); // Only depend on chat.id to avoid re-running on every message update

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
  // Uses ref comparison to return stable reference when content unchanged
  const displayMessages = useMemo(() => {
    const storedMessages = chat?.messages || [];
    let result: ChatMessage[];

    // If we have AI messages that include more than stored (user sent new message)
    if (aiMessages.length > storedMessages.length) {
      // Filter out the streaming assistant message (it's shown separately)
      const messagesToShow = isStreaming
        ? aiMessages.filter((m, i) => !(m.role === 'assistant' && i === aiMessages.length - 1))
        : aiMessages;

      result = messagesToShow.map(m => toChatMessage(m, m.role === 'assistant' ? selectedModelId || undefined : undefined));
    } else {
      // Use stored messages
      result = storedMessages;
    }

    // Return same reference if content unchanged to prevent re-renders
    if (areMessagesEqual(prevDisplayMessagesRef.current, result)) {
      return prevDisplayMessagesRef.current;
    }
    prevDisplayMessagesRef.current = result;
    return result;
  }, [chat?.messages, aiMessages, isStreaming, selectedModelId]);

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

    // Clear follow-ups when sending a new message
    setFollowUps([]);

    try {
      // Build the message content
      let messageContent: string | MessageContent[] = content;
      const uiParts: Array<{ type: string; text?: string; image?: string }> = [];

      // Process attachments if provided
      if (options?.attachments && options.attachments.length > 0) {
        const contentParts: MessageContent[] = [];

        for (const attachment of options.attachments) {
          if (attachment.type === 'image') {
            // Store the image and add to message
            await storeAttachment({
              chatId,
              type: 'image',
              mimeType: attachment.mimeType,
              fileName: attachment.fileName,
              fileSize: attachment.fileSize,
              data: attachment.data,
              metadata: attachment.metadata,
            });

            // Add image to content parts for LLM
            const dataUrl = `data:${attachment.mimeType};base64,${attachment.data}`;
            contentParts.push({
              type: 'image_url',
              image_url: { url: dataUrl },
            });
            uiParts.push({ type: 'image', image: dataUrl });
          } else if (attachment.type === 'document' || attachment.type === 'text') {
            // Store the document and add extracted text to context
            await storeAttachment({
              chatId,
              type: attachment.type,
              mimeType: attachment.mimeType,
              fileName: attachment.fileName,
              fileSize: attachment.fileSize,
              data: attachment.data,
              metadata: attachment.metadata,
            });

            // Add document context as text
            if (attachment.metadata?.extractedText) {
              const docContext = `[Document: ${attachment.fileName}]\n${attachment.metadata.extractedText}\n\n`;
              contentParts.push({ type: 'text', text: docContext });
            }
          }
        }

        // Add user's text message
        if (content) {
          contentParts.push({ type: 'text', text: content });
          uiParts.push({ type: 'text', text: content });
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
          }
        } catch (searchError) {
          console.warn('Search failed:', searchError);
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

      // Send to AI via the hook - include image parts if any
      const hasImages = uiParts.some(p => p.type === 'image');
      if (hasImages) {
        // For multimodal, we need to update the AI messages directly
        // This is a workaround since sendMessage only accepts text
        await sendMessage(finalContent);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="text-center max-w-md px-4">
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Chat not found</AlertTitle>
            <AlertDescription>
              This conversation may have been deleted or doesn't exist.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Chat header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
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
      <div className="p-4 bg-background">
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
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <Loader2 className="h-3 w-3 animate-spin" />
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
                : 'Message Onera...'
            }
          />
        </div>
      </div>
    </div>
  );
}
