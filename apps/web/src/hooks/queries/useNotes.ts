import { useQuery, useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import type { Id } from 'convex/_generated/dataModel';

export function useNotes(folderId?: string, archived = false) {
  const data = useQuery(api.notes.list, {
    folderId: folderId as Id<'folders'> | undefined,
    archived,
  });
  return {
    data,
    isLoading: data === undefined,
  };
}

export function useNote(id: string) {
  const data = useQuery(api.notes.get, { noteId: id as Id<'notes'> });
  return {
    data,
    isLoading: data === undefined,
  };
}

export function useCreateNote() {
  const createNote = useMutation(api.notes.create);

  return {
    mutateAsync: async (data: {
      encryptedTitle: string;
      titleNonce: string;
      encryptedContent: string;
      contentNonce: string;
      folderId?: string;
    }) => {
      return createNote({
        ...data,
        folderId: data.folderId as Id<'folders'> | undefined,
      });
    },
    mutate: (data: {
      encryptedTitle: string;
      titleNonce: string;
      encryptedContent: string;
      contentNonce: string;
      folderId?: string;
    }) => {
      createNote({
        ...data,
        folderId: data.folderId as Id<'folders'> | undefined,
      });
    },
  };
}

export function useUpdateNote() {
  const updateNote = useMutation(api.notes.update);

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
      return updateNote({
        noteId: id as Id<'notes'>,
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
        encryptedContent?: string;
        contentNonce?: string;
        folderId?: string | null;
        pinned?: boolean;
        archived?: boolean;
      };
    }) => {
      updateNote({
        noteId: id as Id<'notes'>,
        ...data,
        folderId: data.folderId === null ? null : (data.folderId as Id<'folders'> | undefined),
      });
    },
  };
}

export function useDeleteNote() {
  const deleteNote = useMutation(api.notes.remove);

  return {
    mutateAsync: async (id: string) => {
      return deleteNote({ noteId: id as Id<'notes'> });
    },
    mutate: (id: string) => {
      deleteNote({ noteId: id as Id<'notes'> });
    },
  };
}
