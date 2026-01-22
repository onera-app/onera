import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { clearAllAICaches } from "@/lib/ai";
import {
  encryptCredentialName,
  decryptCredentialName,
  encryptCredentialProvider,
  decryptCredentialProvider,
} from "@onera/crypto";

export function useCredentials() {
  const query = trpc.credentials.list.useQuery();

  const decryptedCredentials = useMemo(() => {
    if (!query.data) return undefined;
    return query.data.map((credential) => ({
      ...credential,
      name: decryptCredentialName(credential.encryptedName!, credential.nameNonce!),
      provider: decryptCredentialProvider(credential.encryptedProvider!, credential.providerNonce!),
    }));
  }, [query.data]);

  return decryptedCredentials;
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
      // Encrypt name and provider
      const encryptedName = encryptCredentialName(data.name);
      const encryptedProvider = encryptCredentialProvider(data.provider);

      // Clear AI caches so new credentials are used
      clearAllAICaches();
      return mutation.mutateAsync({
        encryptedName: encryptedName.encryptedName,
        nameNonce: encryptedName.nameNonce,
        encryptedProvider: encryptedProvider.encryptedProvider,
        providerNonce: encryptedProvider.providerNonce,
        encryptedData: data.encryptedData,
        iv: data.iv,
      });
    },
    mutate: (data: {
      provider: string;
      name: string;
      encryptedData: string;
      iv: string;
    }) => {
      // Encrypt name and provider
      const encryptedName = encryptCredentialName(data.name);
      const encryptedProvider = encryptCredentialProvider(data.provider);

      clearAllAICaches();
      mutation.mutate({
        encryptedName: encryptedName.encryptedName,
        nameNonce: encryptedName.nameNonce,
        encryptedProvider: encryptedProvider.encryptedProvider,
        providerNonce: encryptedProvider.providerNonce,
        encryptedData: data.encryptedData,
        iv: data.iv,
      });
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
        provider?: string;
        name?: string;
        encryptedData?: string;
        iv?: string;
      };
    }) => {
      const input: {
        credentialId: string;
        encryptedName?: string;
        nameNonce?: string;
        encryptedProvider?: string;
        providerNonce?: string;
        encryptedData?: string;
        iv?: string;
      } = { credentialId: id };

      // Encrypt name if provided
      if (data.name) {
        const encrypted = encryptCredentialName(data.name);
        input.encryptedName = encrypted.encryptedName;
        input.nameNonce = encrypted.nameNonce;
      }

      // Encrypt provider if provided
      if (data.provider) {
        const encrypted = encryptCredentialProvider(data.provider);
        input.encryptedProvider = encrypted.encryptedProvider;
        input.providerNonce = encrypted.providerNonce;
      }

      // Pass through encrypted API key data if provided
      if (data.encryptedData && data.iv) {
        input.encryptedData = data.encryptedData;
        input.iv = data.iv;
      }

      clearAllAICaches();
      return mutation.mutateAsync(input);
    },
    mutate: ({
      id,
      data,
    }: {
      id: string;
      data: {
        provider?: string;
        name?: string;
        encryptedData?: string;
        iv?: string;
      };
    }) => {
      const input: {
        credentialId: string;
        encryptedName?: string;
        nameNonce?: string;
        encryptedProvider?: string;
        providerNonce?: string;
        encryptedData?: string;
        iv?: string;
      } = { credentialId: id };

      // Encrypt name if provided
      if (data.name) {
        const encrypted = encryptCredentialName(data.name);
        input.encryptedName = encrypted.encryptedName;
        input.nameNonce = encrypted.nameNonce;
      }

      // Encrypt provider if provided
      if (data.provider) {
        const encrypted = encryptCredentialProvider(data.provider);
        input.encryptedProvider = encrypted.encryptedProvider;
        input.providerNonce = encrypted.providerNonce;
      }

      // Pass through encrypted API key data if provided
      if (data.encryptedData && data.iv) {
        input.encryptedData = data.encryptedData;
        input.iv = data.iv;
      }

      clearAllAICaches();
      mutation.mutate(input);
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
