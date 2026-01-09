import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notesApi, type NoteCreate, type NoteUpdate } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

export const noteKeys = {
  all: ['notes'] as const,
  lists: () => [...noteKeys.all, 'list'] as const,
  list: (filters: { folderId?: string; archived?: boolean }) =>
    [...noteKeys.lists(), filters] as const,
  details: () => [...noteKeys.all, 'detail'] as const,
  detail: (id: string) => [...noteKeys.details(), id] as const,
};

export function useNotes(folderId?: string, archived = false) {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: noteKeys.list({ folderId, archived }),
    queryFn: () => notesApi.getAll(token!, folderId, archived),
    enabled: !!token,
  });
}

export function useNote(id: string) {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: noteKeys.detail(id),
    queryFn: () => notesApi.get(id, token!),
    enabled: !!token && !!id,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);

  return useMutation({
    mutationFn: (data: NoteCreate) => notesApi.create(data, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: NoteUpdate }) =>
      notesApi.update(id, data, token!),
    onSuccess: (updatedNote) => {
      queryClient.setQueryData(noteKeys.detail(updatedNote.id), updatedNote);
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);

  return useMutation({
    mutationFn: (id: string) => notesApi.delete(id, token!),
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: noteKeys.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });
}
