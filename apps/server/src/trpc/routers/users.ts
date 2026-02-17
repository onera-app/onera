import { router, protectedProcedure } from "../trpc";

export const usersRouter = router({
  // User profile is synced from auth.users via database trigger (handle_auth_user_change)
  me: protectedProcedure.query(async ({ ctx }) => {
    return {
      id: ctx.user.id,
      email: ctx.user.email,
      name: ctx.user.name,
    };
  }),
});
