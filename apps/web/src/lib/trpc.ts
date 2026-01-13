import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@onera/server";

export const trpc = createTRPCReact<AppRouter>();
