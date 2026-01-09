import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { promptsApi, type PromptCreate, type PromptUpdate } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

export const promptKeys = {
  all: ['prompts'] as const,
  lists: () => [...promptKeys.all, 'list'] as const,
  list: () => [...promptKeys.lists()] as const,
  details: () => [...promptKeys.all, 'detail'] as const,
  detail: (id: string) => [...promptKeys.details(), id] as const,
};

export function usePrompts() {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: promptKeys.list(),
    queryFn: () => promptsApi.getAll(token!),
    enabled: !!token,
  });
}

export function usePrompt(id: string) {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: promptKeys.detail(id),
    queryFn: () => promptsApi.get(id, token!),
    enabled: !!token && !!id,
  });
}

export function useCreatePrompt() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);

  return useMutation({
    mutationFn: (data: PromptCreate) => promptsApi.create(data, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promptKeys.lists() });
    },
  });
}

export function useUpdatePrompt() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PromptUpdate }) =>
      promptsApi.update(id, data, token!),
    onSuccess: (updatedPrompt) => {
      queryClient.setQueryData(promptKeys.detail(updatedPrompt.id), updatedPrompt);
      queryClient.invalidateQueries({ queryKey: promptKeys.lists() });
    },
  });
}

export function useDeletePrompt() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);

  return useMutation({
    mutationFn: (id: string) => promptsApi.delete(id, token!),
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: promptKeys.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: promptKeys.lists() });
    },
  });
}
