import { trpc } from "@/lib/trpc";

export function usePrompts() {
  const query = trpc.prompts.list.useQuery();
  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
  };
}

export function usePrompt(id: string) {
  const query = trpc.prompts.get.useQuery(
    { promptId: id },
    { enabled: !!id }
  );
  return {
    data: query.data,
    isLoading: query.isLoading,
  };
}

export function useCreatePrompt() {
  const utils = trpc.useUtils();
  const mutation = trpc.prompts.create.useMutation({
    onSuccess: () => {
      utils.prompts.list.invalidate();
    },
  });

  return {
    mutateAsync: async (data: { name: string; description?: string; content: string }) => {
      return mutation.mutateAsync(data);
    },
    mutate: (data: { name: string; description?: string; content: string }) => {
      mutation.mutate(data);
    },
  };
}

export function useUpdatePrompt() {
  const utils = trpc.useUtils();
  const mutation = trpc.prompts.update.useMutation({
    onSuccess: (data) => {
      utils.prompts.list.invalidate();
      utils.prompts.get.invalidate({ promptId: data.id });
    },
  });

  return {
    mutateAsync: async ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; description?: string | null; content?: string };
    }) => {
      return mutation.mutateAsync({
        promptId: id,
        ...data,
      });
    },
    mutate: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; description?: string | null; content?: string };
    }) => {
      mutation.mutate({
        promptId: id,
        ...data,
      });
    },
  };
}

export function useDeletePrompt() {
  const utils = trpc.useUtils();
  const mutation = trpc.prompts.remove.useMutation({
    onSuccess: () => {
      utils.prompts.list.invalidate();
    },
  });

  return {
    mutateAsync: async (id: string) => {
      return mutation.mutateAsync({ promptId: id });
    },
    mutate: (id: string) => {
      mutation.mutate({ promptId: id });
    },
  };
}
