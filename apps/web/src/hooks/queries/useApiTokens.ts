import { trpc } from "@/lib/trpc";

export function useApiTokens() {
  return trpc.apiTokens.list.useQuery();
}

export function useCreateApiToken() {
  const utils = trpc.useUtils();

  return trpc.apiTokens.create.useMutation({
    onSuccess: () => {
      utils.apiTokens.list.invalidate();
    },
  });
}

export function useRevokeApiToken() {
  const utils = trpc.useUtils();

  return trpc.apiTokens.revoke.useMutation({
    onSuccess: () => {
      utils.apiTokens.list.invalidate();
    },
  });
}
