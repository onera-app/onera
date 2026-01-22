import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { encryptFolderName, decryptFolderName } from "@onera/crypto";

export function useFolders() {
  const query = trpc.folders.list.useQuery();

  const decryptedFolders = useMemo(() => {
    if (!query.data) return [];
    return query.data.map((folder) => ({
      ...folder,
      name: folder.encryptedName
        ? decryptFolderName(folder.encryptedName, folder.nameNonce!)
        : folder.name ?? "Unnamed Folder",
    }));
  }, [query.data]);

  return {
    data: decryptedFolders,
    isLoading: query.isLoading,
  };
}

export function useFolder(id: string) {
  const query = trpc.folders.get.useQuery(
    { folderId: id },
    { enabled: !!id }
  );

  const decryptedFolder = useMemo(() => {
    if (!query.data) return undefined;
    return {
      ...query.data,
      name: query.data.encryptedName
        ? decryptFolderName(query.data.encryptedName, query.data.nameNonce!)
        : query.data.name ?? "Unnamed Folder",
    };
  }, [query.data]);

  return {
    data: decryptedFolder,
    isLoading: query.isLoading,
  };
}

export function useCreateFolder() {
  const utils = trpc.useUtils();
  const mutation = trpc.folders.create.useMutation({
    onSuccess: () => {
      utils.folders.list.invalidate();
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
  };
}

export function useDeleteFolder() {
  const utils = trpc.useUtils();
  const mutation = trpc.folders.remove.useMutation({
    onSuccess: () => {
      utils.folders.list.invalidate();
    },
  });

  return {
    mutateAsync: async (id: string) => {
      return mutation.mutateAsync({ folderId: id });
    },
    mutate: (id: string) => {
      mutation.mutate({ folderId: id });
    },
  };
}
