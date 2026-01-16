import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";
import type { ClerkUser } from "../auth/clerk";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Authenticated context with guaranteed user
 */
interface AuthedContext extends Context {
  user: ClerkUser;
}

/**
 * Middleware to require authentication
 * Verifies that a valid Clerk user is present in the context
 */
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    } as AuthedContext,
  });
});

/**
 * Protected procedure that requires authentication
 * Use this for all endpoints that need a logged-in user
 */
export const protectedProcedure = t.procedure.use(isAuthed);
