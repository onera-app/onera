import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";
import type { ClerkUser } from "../auth/clerk";
import { getUserMetadata } from "../auth/clerk";
import { getEntitlements, type Entitlements } from "../billing/entitlements";

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

/**
 * Middleware to require admin role
 * Checks Clerk publicMetadata.role === "admin"
 */
const isAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Not authenticated",
    });
  }

  const metadata = await getUserMetadata(ctx.user.id);
  if (!metadata || metadata.publicMetadata?.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    } as AuthedContext,
  });
});

/**
 * Admin procedure that requires admin role
 * Use this for admin-only endpoints
 */
export const adminProcedure = t.procedure.use(isAdmin);

interface EntitledContext extends AuthedContext {
  entitlements: Entitlements;
}

/**
 * Middleware to load user entitlements
 */
const withEntitlements = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }

  const entitlements = await getEntitlements(ctx.user.id);

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      entitlements,
    } as EntitledContext,
  });
});

/**
 * Protected procedure with entitlements loaded
 * Use for routes that need to check plan limits
 */
export const entitledProcedure = t.procedure.use(isAuthed).use(withEntitlements);
