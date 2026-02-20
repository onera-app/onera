import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useE2EE } from "@/providers/E2EEProvider";
import { encryptFolderName, decryptFolderName } from "@onera/crypto";

export function useFolders() {
  const { isUnlocked } = useE2EE();
  const query = trpc.folders.list.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const decryptedFolders = useMemo(() => {
    if (!query.data || !isUnlocked) return [];
    return query.data.map((folder) => ({
      ...folder,
      name: decryptFolderName(folder.encryptedName!, folder.nameNonce!),
    }));
  }, [query.data, isUnlocked]);

  return {
    data: decryptedFolders,
    isLoading: query.isLoading,
  };
}

export function useFolder(id: string) {
  const { isUnlocked } = useE2EE();
  const query = trpc.folders.get.useQuery(
    { folderId: id },
    { enabled: !!id }
  );

  const decryptedFolder = useMemo(() => {
    if (!query.data || !isUnlocked) return undefined;
    return {
      ...query.data,
      name: decryptFolderName(query.data.encryptedName!, query.data.nameNonce!),
    };
  }, [query.data, isUnlocked]);

  return {
    data: decryptedFolder,
    isLoading: query.isLoading,
  };
}

export function useCreateFolder() {
  const utils = trpc.useUtils();
  const mutation = trpc.folders.create.useMutation({
    onSuccess: () => {
      return utils.folders.list.invalidate();
    },
  });

  return {
    mutateAsync: async (data: { name: string; parentId?: string }) => {
      const encrypted = encryptFolderName(data.name);
      return mutation.mutateAsync({
        encryptedName: encrypted.encryptedName,
        nameNonce: encrypted.nameNonce,
        parentId: data.parentId,
      });
    },
    mutate: (data: { name: string; parentId?: string }) => {
      const encrypted = encryptFolderName(data.name);
      mutation.mutate({
        encryptedName: encrypted.encryptedName,
        nameNonce: encrypted.nameNonce,
        parentId: data.parentId,
      });
    },
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}

export function useUpdateFolder() {
  const utils = trpc.useUtils();
  const mutation = trpc.folders.update.useMutation({
    onSuccess: (data) => {
      utils.folders.list.invalidate();
      utils.folders.get.invalidate({ folderId: data.id });
    },
  });

  return {
    mutateAsync: async ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; parentId?: string | null };
    }) => {
      const input: {
        folderId: string;
        encryptedName?: string;
        nameNonce?: string;
        parentId?: string | null;
      } = { folderId: id };

      if (data.name) {
        const encrypted = encryptFolderName(data.name);
        input.encryptedName = encrypted.encryptedName;
        input.nameNonce = encrypted.nameNonce;
      }
      if (data.parentId !== undefined) {
        input.parentId = data.parentId;
      }

      return mutation.mutateAsync(input);
    },
    mutate: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; parentId?: string | null };
    }) => {
      const input: {
        folderId: string;
        encryptedName?: string;
        nameNonce?: string;
        parentId?: string | null;
      } = { folderId: id };

      if (data.name) {
        const encrypted = encryptFolderName(data.name);
        input.encryptedName = encrypted.encryptedName;
        input.nameNonce = encrypted.nameNonce;
      }
      if (data.parentId !== undefined) {
        input.parentId = data.parentId;
      }

      mutation.mutate(input);
    },
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}

export function useDeleteFolder() {
  const utils = trpc.useUtils();
  const mutation = trpc.folders.remove.useMutation({
    onSuccess: () => {
      return utils.folders.list.invalidate();
    },
  });

  return {
    mutateAsync: async (id: string) => {
      return mutation.mutateAsync({ folderId: id });
    },
    mutate: (id: string) => {
      mutation.mutate({ folderId: id });
    },
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
