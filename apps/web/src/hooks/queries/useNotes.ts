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
      return utils.notes.list.invalidate();
    },
  });

  return {
    mutateAsync: async (data: {
      noteId?: string;
      encryptedNoteKey?: string;
      noteKeyNonce?: string;
      encryptedTitle: string;
      titleNonce: string;
      encryptedContent: string;
      contentNonce: string;
      folderId?: string;
    }) => {
      return mutation.mutateAsync(data);
    },
    mutate: (data: {
      noteId?: string;
      encryptedNoteKey?: string;
      noteKeyNonce?: string;
      encryptedTitle: string;
      titleNonce: string;
      encryptedContent: string;
      contentNonce: string;
      folderId?: string;
    }) => {
      mutation.mutate(data);
    },
    isPending: mutation.isPending,
  };
}

export function useUpdateNote() {
  const utils = trpc.useUtils();
  const mutation = trpc.notes.update.useMutation({
    onMutate: async (variables) => {
      await utils.notes.list.cancel();
      const previousNotes = utils.notes.list.getData();
      if (previousNotes) {
        // We can't optimistically decrypt everything if keys are needed, but we can optimistically structure it
        utils.notes.list.setData(
          undefined,
          previousNotes.map((n) =>
            n.id === variables.noteId
              ? { ...n, ...variables, updatedAt: Date.now() }
              : n
          )
        );
      }
      return { previousNotes };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousNotes) {
        utils.notes.list.setData(undefined, context.previousNotes);
      }
    },
    onSettled: (data) => {
      const promises = [utils.notes.list.invalidate()];
      if (data?.id) {
        promises.push(utils.notes.get.invalidate({ noteId: data.id }));
      }
      return Promise.all(promises);
    },
  });

  return {
    mutateAsync: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        encryptedNoteKey?: string;
        noteKeyNonce?: string;
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
        encryptedNoteKey?: string;
        noteKeyNonce?: string;
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
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}

export function useDeleteNote() {
  const utils = trpc.useUtils();
  const mutation = trpc.notes.remove.useMutation({
    onMutate: async ({ noteId }) => {
      await utils.notes.list.cancel();
      const previousNotes = utils.notes.list.getData();
      if (previousNotes) {
        utils.notes.list.setData(
          undefined,
          previousNotes.filter((n) => n.id !== noteId)
        );
      }
      return { previousNotes };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousNotes) {
        utils.notes.list.setData(undefined, context.previousNotes);
      }
    },
    onSettled: () => {
      return utils.notes.list.invalidate();
    },
  });

  return {
    mutateAsync: async (id: string) => {
      return mutation.mutateAsync({ noteId: id });
    },
    mutate: (id: string) => {
      mutation.mutate({ noteId: id });
    },
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
