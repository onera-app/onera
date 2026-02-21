import { trpc } from "@/lib/trpc";

/**
 * List all chats for the current user
 */
export function useChats() {
  const query = trpc.chats.list.useQuery();
  return query.data;
}

/**
 * Get a specific chat by ID
 */
export function useChat(id: string) {
  const query = trpc.chats.get.useQuery(
    { chatId: id },
    {
      enabled: !!id,
      // Keep previous data while refetching to prevent loading flicker
      placeholderData: (previousData) => previousData,
    }
  );
  return query.data;
}

/**
 * Create a new encrypted chat
 */
export function useCreateChat() {
  const utils = trpc.useUtils();
  const mutation = trpc.chats.create.useMutation({
    onSuccess: () => {
      return utils.chats.list.invalidate();
    },
  });

  return {
    mutateAsync: async (data: {
      id?: string;
      encryptedChatKey: string;
      chatKeyNonce: string;
      encryptedTitle: string;
      titleNonce: string;
      encryptedChat: string;
      chatNonce: string;
      folderId?: string;
    }) => {
      return mutation.mutateAsync(data);
    },
    mutate: (data: {
      id?: string;
      encryptedChatKey: string;
      chatKeyNonce: string;
      encryptedTitle: string;
      titleNonce: string;
      encryptedChat: string;
      chatNonce: string;
      folderId?: string;
    }) => {
      mutation.mutate(data);
    },
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}

/**
 * Update an existing chat
 */
export function useUpdateChat() {
  const utils = trpc.useUtils();
  const mutation = trpc.chats.update.useMutation({
    onSuccess: (_data, variables) => {
      // Invalidate list if title, folder, or pinned status was updated (for sidebar display)
      // Don't invalidate on message saves to avoid re-render cascade
      if (variables.encryptedTitle || variables.folderId !== undefined || variables.pinned !== undefined) {
        utils.chats.list.invalidate();
      }
      // Never invalidate chats.get - local state is source of truth
    },
  });

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
      return mutation.mutateAsync({
        chatId: id,
        ...data,
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
      mutation.mutate({
        chatId: id,
        ...data,
      });
    },
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}

/**
 * Delete a chat
 */
export function useDeleteChat() {
  const utils = trpc.useUtils();
  const mutation = trpc.chats.remove.useMutation({
    onSuccess: () => {
      return utils.chats.list.invalidate();
    },
  });

  return {
    mutateAsync: async (id: string) => {
      return mutation.mutateAsync({ chatId: id });
    },
    mutate: (id: string) => {
      mutation.mutate({ chatId: id });
    },
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
