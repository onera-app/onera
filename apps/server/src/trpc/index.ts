export { router, publicProcedure, protectedProcedure } from "./trpc";

// Import routers
import { router } from "./trpc";
import { usersRouter } from "./routers/users";
import { userKeysRouter } from "./routers/userKeys";
import { foldersRouter } from "./routers/folders";
import { chatsRouter } from "./routers/chats";
import { notesRouter } from "./routers/notes";
import { credentialsRouter } from "./routers/credentials";
import { promptsRouter } from "./routers/prompts";

// Main app router
export const appRouter = router({
  users: usersRouter,
  userKeys: userKeysRouter,
  folders: foldersRouter,
  chats: chatsRouter,
  notes: notesRouter,
  credentials: credentialsRouter,
  prompts: promptsRouter,
});

export type AppRouter = typeof appRouter;
