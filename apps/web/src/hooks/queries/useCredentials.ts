import { useQuery, useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import type { Id } from 'convex/_generated/dataModel';
import { clearAllAICaches } from '@/lib/ai';

export function useCredentials() {
  return useQuery(api.credentials.list);
}

export function useCreateCredential() {
  const createCredential = useMutation(api.credentials.create);

  return {
    mutateAsync: async (data: {
      provider: string;
      name: string;
      encryptedData: string;
      iv: string;
    }) => {
      // Clear AI caches so new credentials are used
      clearAllAICaches();
      return createCredential(data);
    },
    mutate: (data: {
      provider: string;
      name: string;
      encryptedData: string;
      iv: string;
    }) => {
      clearAllAICaches();
      createCredential(data);
    },
  };
}

export function useUpdateCredential() {
  const updateCredential = useMutation(api.credentials.update);

  return {
    mutateAsync: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        provider: string;
        name: string;
        encryptedData: string;
        iv: string;
      };
    }) => {
      clearAllAICaches();
      return updateCredential({
        credentialId: id as Id<'credentials'>,
        ...data,
      });
    },
    mutate: ({
      id,
      data,
    }: {
      id: string;
      data: {
        provider: string;
        name: string;
        encryptedData: string;
        iv: string;
      };
    }) => {
      clearAllAICaches();
      updateCredential({
        credentialId: id as Id<'credentials'>,
        ...data,
      });
    },
  };
}

export function useDeleteCredential() {
  const deleteCredential = useMutation(api.credentials.remove);

  return {
    mutateAsync: async (id: string) => {
      clearAllAICaches();
      return deleteCredential({ credentialId: id as Id<'credentials'> });
    },
    mutate: (id: string) => {
      clearAllAICaches();
      deleteCredential({ credentialId: id as Id<'credentials'> });
    },
  };
}
