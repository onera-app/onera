import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import {
  db,
  keyShares,
  devices,
  chats,
  notes,
  credentials,
  prompts,
  folders,
  webauthnCredentials,
} from "../../db/client";
import { supabase } from "../../lib/supabase";

export const usersRouter = router({
  // User profile is synced from auth.users via database trigger (handle_auth_user_change)
  me: protectedProcedure.query(async ({ ctx }) => {
    return {
      id: ctx.user.id,
      email: ctx.user.email,
      name: ctx.user.name,
    };
  }),

  /**
   * Permanently delete the authenticated user's account and all associated data.
   * Requires confirmation phrase to prevent accidental deletion.
   */
  deleteAccount: protectedProcedure
    .input(
      z.object({
        confirmPhrase: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.confirmPhrase !== "DELETE MY ACCOUNT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: 'Please type "DELETE MY ACCOUNT" to confirm',
        });
      }

      const userId = ctx.user.id;

      // Delete all user data in order (respecting foreign key constraints)
      await db.delete(webauthnCredentials).where(eq(webauthnCredentials.userId, userId));
      await db.delete(credentials).where(eq(credentials.userId, userId));
      await db.delete(prompts).where(eq(prompts.userId, userId));
      await db.delete(notes).where(eq(notes.userId, userId));
      await db.delete(chats).where(eq(chats.userId, userId));
      await db.delete(folders).where(eq(folders.userId, userId));
      await db.delete(devices).where(eq(devices.userId, userId));
      await db.delete(keyShares).where(eq(keyShares.userId, userId));

      // Delete the Supabase auth user (requires service_role key)
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete auth account. Please contact support.",
        });
      }

      return { success: true };
    }),
});
