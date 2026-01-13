import { trpc } from "@/lib/trpc";

export function useNotes(folderId?: string, archived = false) {
  const query = trpc.notes.list.useQuery({ folderId, archived });
  return {
    data: query.data,
    isLoading: query.isLoading,
  };
}

export function useNote(id: string) {
  const query = trpc.notes.get.useQuery(
    { noteId: id },
    { enabled: !!id }
  );
  return {
    data: query.data,
    isLoading: query.isLoading,
  };
}

export function useCreateNote() {
  const utils = trpc.useUtils();
  const mutation = trpc.notes.create.useMutation({
    onSuccess: () => {
      utils.notes.list.invalidate();
    },
  });

  return {
    mutateAsync: async (data: {
      encryptedTitle: string;
      titleNonce: string;
      encryptedContent: string;
      contentNonce: string;
      folderId?: string;
    }) => {
      return mutation.mutateAsync(data);
    },
    mutate: (data: {
      encryptedTitle: string;
      titleNonce: string;
      encryptedContent: string;
      contentNonce: string;
      folderId?: string;
    }) => {
      mutation.mutate(data);
    },
  };
}

export function useUpdateNote() {
  const utils = trpc.useUtils();
  const mutation = trpc.notes.update.useMutation({
    onSuccess: (data) => {
      utils.notes.list.invalidate();
      utils.notes.get.invalidate({ noteId: data.id });
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
        encryptedContent?: string;
        contentNonce?: string;
        folderId?: string | null;
        pinned?: boolean;
        archived?: boolean;
      };
    }) => {
      return mutation.mutateAsync({
        noteId: id,
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
        encryptedContent?: string;
        contentNonce?: string;
        folderId?: string | null;
        pinned?: boolean;
        archived?: boolean;
      };
    }) => {
      mutation.mutate({
        noteId: id,
        ...data,
      });
    },
  };
}

export function useDeleteNote() {
  const utils = trpc.useUtils();
  const mutation = trpc.notes.remove.useMutation({
    onSuccess: () => {
      utils.notes.list.invalidate();
    },
  });

  return {
    mutateAsync: async (id: string) => {
      return mutation.mutateAsync({ noteId: id });
    },
    mutate: (id: string) => {
      mutation.mutate({ noteId: id });
    },
  };
}
