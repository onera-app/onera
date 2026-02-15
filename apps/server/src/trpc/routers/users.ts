import { router, protectedProcedure } from "../trpc";
import { db, users } from "../../db/client";

export const usersRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    // Upsert user in users table (sync from Supabase Auth)
    await db
      .insert(users)
      .values({
        id: ctx.user.id,
        email: ctx.user.email,
        name: ctx.user.name,
        imageUrl: ctx.user.imageUrl,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: ctx.user.email,
          name: ctx.user.name,
          imageUrl: ctx.user.imageUrl,
          updatedAt: new Date(),
        },
      });

    return {
      id: ctx.user.id,
      email: ctx.user.email,
      name: ctx.user.name,
    };
  }),
});
