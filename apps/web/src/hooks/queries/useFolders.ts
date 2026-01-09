import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { foldersApi, type FolderCreate, type FolderUpdate } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

export const folderKeys = {
  all: ['folders'] as const,
  lists: () => [...folderKeys.all, 'list'] as const,
  list: () => [...folderKeys.lists()] as const,
  details: () => [...folderKeys.all, 'detail'] as const,
  detail: (id: string) => [...folderKeys.details(), id] as const,
};

export function useFolders() {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: folderKeys.list(),
    queryFn: () => foldersApi.getAll(token!),
    enabled: !!token,
  });
}

export function useFolder(id: string) {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: folderKeys.detail(id),
    queryFn: () => foldersApi.get(id, token!),
    enabled: !!token && !!id,
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);

  return useMutation({
    mutationFn: (data: FolderCreate) => foldersApi.create(data, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
    },
  });
}

export function useUpdateFolder() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: FolderUpdate }) =>
      foldersApi.update(id, data, token!),
    onSuccess: (updatedFolder) => {
      queryClient.setQueryData(folderKeys.detail(updatedFolder.id), updatedFolder);
      queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);

  return useMutation({
    mutationFn: (id: string) => foldersApi.delete(id, token!),
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: folderKeys.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
    },
  });
}
