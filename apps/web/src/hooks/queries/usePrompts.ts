import { useQuery, useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import type { Id } from 'convex/_generated/dataModel';

export function usePrompts() {
  return useQuery(api.prompts.list);
}

export function usePrompt(id: string) {
  return useQuery(api.prompts.get, { promptId: id as Id<'prompts'> });
}

export function useCreatePrompt() {
  const createPrompt = useMutation(api.prompts.create);

  return {
    mutateAsync: async (data: { name: string; description?: string; content: string }) => {
      return createPrompt(data);
    },
    mutate: (data: { name: string; description?: string; content: string }) => {
      createPrompt(data);
    },
  };
}

export function useUpdatePrompt() {
  const updatePrompt = useMutation(api.prompts.update);

  return {
    mutateAsync: async ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; description?: string | null; content?: string };
    }) => {
      return updatePrompt({
        promptId: id as Id<'prompts'>,
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
      updatePrompt({
        promptId: id as Id<'prompts'>,
        ...data,
      });
    },
  };
}

export function useDeletePrompt() {
  const deletePrompt = useMutation(api.prompts.remove);

  return {
    mutateAsync: async (id: string) => {
      return deletePrompt({ promptId: id as Id<'prompts'> });
    },
    mutate: (id: string) => {
      deletePrompt({ promptId: id as Id<'prompts'> });
    },
  };
}
