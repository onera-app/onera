import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useE2EE } from "@/providers/E2EEProvider";
import {
  encryptPromptName,
  decryptPromptName,
  encryptPromptDescription,
  decryptPromptDescription,
  encryptPromptContent,
  decryptPromptContent,
} from "@onera/crypto";

export function usePrompts() {
  const { isUnlocked } = useE2EE();
  const query = trpc.prompts.list.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const decryptedPrompts = useMemo(() => {
    if (!query.data || !isUnlocked) return [];
    return query.data.map((prompt) => ({
      ...prompt,
      name: decryptPromptName(prompt.encryptedName!, prompt.nameNonce!),
      description: prompt.encryptedDescription
        ? decryptPromptDescription(prompt.encryptedDescription, prompt.descriptionNonce!)
        : null,
      content: decryptPromptContent(prompt.encryptedContent!, prompt.contentNonce!),
    }));
  }, [query.data, isUnlocked]);

  return {
    data: decryptedPrompts,
    isLoading: query.isLoading,
  };
}

export function usePrompt(id: string) {
  const { isUnlocked } = useE2EE();
  const query = trpc.prompts.get.useQuery(
    { promptId: id },
    { enabled: !!id }
  );

  const decryptedPrompt = useMemo(() => {
    if (!query.data || !isUnlocked) return undefined;
    return {
      ...query.data,
      name: decryptPromptName(query.data.encryptedName!, query.data.nameNonce!),
      description: query.data.encryptedDescription
        ? decryptPromptDescription(query.data.encryptedDescription, query.data.descriptionNonce!)
        : null,
      content: decryptPromptContent(query.data.encryptedContent!, query.data.contentNonce!),
    };
  }, [query.data, isUnlocked]);

  return {
    data: decryptedPrompt,
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
      const encryptedName = encryptPromptName(data.name);
      const encryptedContent = encryptPromptContent(data.content);

      const input: {
        encryptedName: string;
        nameNonce: string;
        encryptedDescription?: string;
        descriptionNonce?: string;
        encryptedContent: string;
        contentNonce: string;
      } = {
        encryptedName: encryptedName.encryptedName,
        nameNonce: encryptedName.nameNonce,
        encryptedContent: encryptedContent.encryptedContent,
        contentNonce: encryptedContent.contentNonce,
      };

      if (data.description) {
        const encryptedDescription = encryptPromptDescription(data.description);
        input.encryptedDescription = encryptedDescription.encryptedDescription;
        input.descriptionNonce = encryptedDescription.descriptionNonce;
      }

      return mutation.mutateAsync(input);
    },
    mutate: (data: { name: string; description?: string; content: string }) => {
      const encryptedName = encryptPromptName(data.name);
      const encryptedContent = encryptPromptContent(data.content);

      const input: {
        encryptedName: string;
        nameNonce: string;
        encryptedDescription?: string;
        descriptionNonce?: string;
        encryptedContent: string;
        contentNonce: string;
      } = {
        encryptedName: encryptedName.encryptedName,
        nameNonce: encryptedName.nameNonce,
        encryptedContent: encryptedContent.encryptedContent,
        contentNonce: encryptedContent.contentNonce,
      };

      if (data.description) {
        const encryptedDescription = encryptPromptDescription(data.description);
        input.encryptedDescription = encryptedDescription.encryptedDescription;
        input.descriptionNonce = encryptedDescription.descriptionNonce;
      }

      mutation.mutate(input);
    },
  };
}

export function useUpdatePrompt() {
  const utils = trpc.useUtils();
  const mutation = trpc.prompts.update.useMutation({
    onMutate: async (variables) => {
      await utils.prompts.list.cancel();
      const previousPrompts = utils.prompts.list.getData();
      if (previousPrompts) {
        utils.prompts.list.setData(
          undefined,
          previousPrompts.map((p) =>
            p.id === variables.promptId
              ? { ...p, ...variables, updatedAt: Date.now() }
              : p
          )
        );
      }
      return { previousPrompts };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousPrompts) {
        utils.prompts.list.setData(undefined, context.previousPrompts);
      }
    },
    onSettled: (data) => {
      utils.prompts.list.invalidate();
      if (data?.id) {
        utils.prompts.get.invalidate({ promptId: data.id });
      }
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
      const input: {
        promptId: string;
        encryptedName?: string;
        nameNonce?: string;
        encryptedDescription?: string | null;
        descriptionNonce?: string | null;
        encryptedContent?: string;
        contentNonce?: string;
      } = { promptId: id };

      if (data.name) {
        const encrypted = encryptPromptName(data.name);
        input.encryptedName = encrypted.encryptedName;
        input.nameNonce = encrypted.nameNonce;
      }

      if (data.description !== undefined) {
        if (data.description === null) {
          input.encryptedDescription = null;
          input.descriptionNonce = null;
        } else if (data.description) {
          const encrypted = encryptPromptDescription(data.description);
          input.encryptedDescription = encrypted.encryptedDescription;
          input.descriptionNonce = encrypted.descriptionNonce;
        }
      }

      if (data.content) {
        const encrypted = encryptPromptContent(data.content);
        input.encryptedContent = encrypted.encryptedContent;
        input.contentNonce = encrypted.contentNonce;
      }

      return mutation.mutateAsync(input);
    },
    mutate: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; description?: string | null; content?: string };
    }) => {
      const input: {
        promptId: string;
        encryptedName?: string;
        nameNonce?: string;
        encryptedDescription?: string | null;
        descriptionNonce?: string | null;
        encryptedContent?: string;
        contentNonce?: string;
      } = { promptId: id };

      if (data.name) {
        const encrypted = encryptPromptName(data.name);
        input.encryptedName = encrypted.encryptedName;
        input.nameNonce = encrypted.nameNonce;
      }

      if (data.description !== undefined) {
        if (data.description === null) {
          input.encryptedDescription = null;
          input.descriptionNonce = null;
        } else if (data.description) {
          const encrypted = encryptPromptDescription(data.description);
          input.encryptedDescription = encrypted.encryptedDescription;
          input.descriptionNonce = encrypted.descriptionNonce;
        }
      }

      if (data.content) {
        const encrypted = encryptPromptContent(data.content);
        input.encryptedContent = encrypted.encryptedContent;
        input.contentNonce = encrypted.contentNonce;
      }

      mutation.mutate(input);
    },
  };
}

export function useDeletePrompt() {
  const utils = trpc.useUtils();
  const mutation = trpc.prompts.remove.useMutation({
    onMutate: async ({ promptId }) => {
      await utils.prompts.list.cancel();
      const previousPrompts = utils.prompts.list.getData();
      if (previousPrompts) {
        utils.prompts.list.setData(
          undefined,
          previousPrompts.filter((p) => p.id !== promptId)
        );
      }
      return { previousPrompts };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousPrompts) {
        utils.prompts.list.setData(undefined, context.previousPrompts);
      }
    },
    onSettled: () => {
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
