import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { credentialsApi, type CredentialCreate } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { clearAllAICaches } from '@/lib/ai';

export const credentialKeys = {
  all: ['credentials'] as const,
  list: () => [...credentialKeys.all, 'list'] as const,
};

export function useCredentials() {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: credentialKeys.list(),
    queryFn: () => credentialsApi.getAll(token!),
    enabled: !!token,
  });
}

/**
 * Helper to invalidate all credential and model-related queries
 */
function invalidateCredentialQueries(queryClient: ReturnType<typeof useQueryClient>) {
  // Clear the AI caches so new credentials are used
  clearAllAICaches();
  // Invalidate credentials list
  queryClient.invalidateQueries({ queryKey: credentialKeys.list() });
  // Invalidate decrypted credentials
  queryClient.invalidateQueries({ queryKey: ['decryptedCredentials'] });
  // Invalidate available models so they're refetched with new credentials
  queryClient.invalidateQueries({ queryKey: ['availableModels'] });
  // Invalidate hasConnections check
  queryClient.invalidateQueries({ queryKey: ['hasConnections'] });
}

export function useCreateCredential() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);

  return useMutation({
    mutationFn: (data: CredentialCreate) => credentialsApi.create(data, token!),
    onSuccess: () => {
      invalidateCredentialQueries(queryClient);
    },
  });
}

export function useUpdateCredential() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CredentialCreate }) =>
      credentialsApi.update(id, data, token!),
    onSuccess: () => {
      invalidateCredentialQueries(queryClient);
    },
  });
}

export function useDeleteCredential() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);

  return useMutation({
    mutationFn: (id: string) => credentialsApi.delete(id, token!),
    onSuccess: () => {
      invalidateCredentialQueries(queryClient);
    },
  });
}
