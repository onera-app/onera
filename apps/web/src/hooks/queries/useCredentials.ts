import { trpc } from "@/lib/trpc";
import { clearAllAICaches } from "@/lib/ai";

export function useCredentials() {
  const query = trpc.credentials.list.useQuery();
  return query.data;
}

export function useCreateCredential() {
  const utils = trpc.useUtils();
  const mutation = trpc.credentials.create.useMutation({
    onSuccess: () => {
      utils.credentials.list.invalidate();
    },
  });

  return {
    mutateAsync: async (data: {
      provider: string;
      name: string;
      encryptedData: string;
      iv: string;
    }) => {
      // Clear AI caches so new credentials are used
      clearAllAICaches();
      return mutation.mutateAsync(data);
    },
    mutate: (data: {
      provider: string;
      name: string;
      encryptedData: string;
      iv: string;
    }) => {
      clearAllAICaches();
      mutation.mutate(data);
    },
  };
}

export function useUpdateCredential() {
  const utils = trpc.useUtils();
  const mutation = trpc.credentials.update.useMutation({
    onSuccess: () => {
      utils.credentials.list.invalidate();
    },
  });

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
      return mutation.mutateAsync({
        credentialId: id,
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
      mutation.mutate({
        credentialId: id,
        ...data,
      });
    },
  };
}

export function useDeleteCredential() {
  const utils = trpc.useUtils();
  const mutation = trpc.credentials.remove.useMutation({
    onSuccess: () => {
      utils.credentials.list.invalidate();
    },
  });

  return {
    mutateAsync: async (id: string) => {
      clearAllAICaches();
      return mutation.mutateAsync({ credentialId: id });
    },
    mutate: (id: string) => {
      clearAllAICaches();
      mutation.mutate({ credentialId: id });
    },
  };
}
