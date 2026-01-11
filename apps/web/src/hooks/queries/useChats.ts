import { useQuery, useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import type { Id } from 'convex/_generated/dataModel';

/**
 * List all chats for the current user
 */
export function useChats() {
  return useQuery(api.chats.list);
}

/**
 * Get a specific chat by ID
 */
export function useChat(id: string) {
  return useQuery(api.chats.get, { chatId: id as Id<'chats'> });
}

/**
 * Create a new encrypted chat
 */
export function useCreateChat() {
  const createChat = useMutation(api.chats.create);

  return {
    mutateAsync: async (data: {
      encryptedChatKey: string;
      chatKeyNonce: string;
      encryptedTitle: string;
      titleNonce: string;
      encryptedChat: string;
      chatNonce: string;
      folderId?: string;
    }) => {
      return createChat({
        ...data,
        folderId: data.folderId as Id<'folders'> | undefined,
      });
    },
    mutate: (data: {
      encryptedChatKey: string;
      chatKeyNonce: string;
      encryptedTitle: string;
      titleNonce: string;
      encryptedChat: string;
      chatNonce: string;
      folderId?: string;
    }) => {
      createChat({
        ...data,
        folderId: data.folderId as Id<'folders'> | undefined,
      });
    },
  };
}

/**
 * Update an existing chat
 */
export function useUpdateChat() {
  const updateChat = useMutation(api.chats.update);

  return {
    mutateAsync: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        encryptedTitle?: string;
        titleNonce?: string;
        encryptedChat?: string;
        chatNonce?: string;
        folderId?: string | null;
        pinned?: boolean;
        archived?: boolean;
      };
    }) => {
      return updateChat({
        chatId: id as Id<'chats'>,
        ...data,
        folderId: data.folderId === null ? null : (data.folderId as Id<'folders'> | undefined),
      });
    },
    mutate: ({
      id,
      data,
    }: {
      id: string;
      data: {
        encryptedTitle?: string;
        titleNonce?: string;
        encryptedChat?: string;
        chatNonce?: string;
        folderId?: string | null;
        pinned?: boolean;
        archived?: boolean;
      };
    }) => {
      updateChat({
        chatId: id as Id<'chats'>,
        ...data,
        folderId: data.folderId === null ? null : (data.folderId as Id<'folders'> | undefined),
      });
    },
  };
}

/**
 * Delete a chat
 */
export function useDeleteChat() {
  const deleteChat = useMutation(api.chats.remove);

  return {
    mutateAsync: async (id: string) => {
      return deleteChat({ chatId: id as Id<'chats'> });
    },
    mutate: (id: string) => {
      deleteChat({ chatId: id as Id<'chats'> });
    },
  };
}
