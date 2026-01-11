import { useQuery, useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import type { Id } from 'convex/_generated/dataModel';

export function useFolders() {
  return useQuery(api.folders.list);
}

export function useFolder(id: string) {
  return useQuery(api.folders.get, { folderId: id as Id<'folders'> });
}

export function useCreateFolder() {
  const createFolder = useMutation(api.folders.create);

  return {
    mutateAsync: async (data: { name: string; parentId?: string }) => {
      return createFolder({
        name: data.name,
        parentId: data.parentId as Id<'folders'> | undefined,
      });
    },
    mutate: (data: { name: string; parentId?: string }) => {
      createFolder({
        name: data.name,
        parentId: data.parentId as Id<'folders'> | undefined,
      });
    },
  };
}

export function useUpdateFolder() {
  const updateFolder = useMutation(api.folders.update);

  return {
    mutateAsync: async ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; parentId?: string | null };
    }) => {
      return updateFolder({
        folderId: id as Id<'folders'>,
        name: data.name,
        parentId: data.parentId === null ? null : (data.parentId as Id<'folders'> | undefined),
      });
    },
    mutate: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; parentId?: string | null };
    }) => {
      updateFolder({
        folderId: id as Id<'folders'>,
        name: data.name,
        parentId: data.parentId === null ? null : (data.parentId as Id<'folders'> | undefined),
      });
    },
  };
}

export function useDeleteFolder() {
  const deleteFolder = useMutation(api.folders.remove);

  return {
    mutateAsync: async (id: string) => {
      return deleteFolder({ folderId: id as Id<'folders'> });
    },
    mutate: (id: string) => {
      deleteFolder({ folderId: id as Id<'folders'> });
    },
  };
}
