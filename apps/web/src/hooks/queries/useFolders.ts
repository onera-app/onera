import { trpc } from "@/lib/trpc";

export function useFolders() {
  const query = trpc.folders.list.useQuery();
  return {
    data: query.data,
    isLoading: query.isLoading,
  };
}

export function useFolder(id: string) {
  const query = trpc.folders.get.useQuery(
    { folderId: id },
    { enabled: !!id }
  );
  return {
    data: query.data,
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
      return mutation.mutateAsync(data);
    },
    mutate: (data: { name: string; parentId?: string }) => {
      mutation.mutate(data);
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
      return mutation.mutateAsync({
        folderId: id,
        ...data,
      });
    },
    mutate: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; parentId?: string | null };
    }) => {
      mutation.mutate({
        folderId: id,
        ...data,
      });
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
