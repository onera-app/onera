export { router, publicProcedure, protectedProcedure, adminProcedure } from "./trpc";

// Import routers
import { router } from "./trpc";
import { usersRouter } from "./routers/users";
import { userKeysRouter } from "./routers/userKeys"; // Legacy, for migration
import { keySharesRouter, devicesRouter } from "./routers/keyShares"; // E2EE key management
import { webauthnRouter } from "./routers/webauthn"; // Passkey-based E2EE unlock
import { foldersRouter } from "./routers/folders";
import { chatsRouter } from "./routers/chats";
import { notesRouter } from "./routers/notes";
import { credentialsRouter } from "./routers/credentials";
import { apiTokensRouter } from "./routers/apiTokens";
import { promptsRouter } from "./routers/prompts";
import { enclavesRouter } from "./routers/enclaves";
import { modelServersRouter } from "./routers/modelServers";
import { billingRouter } from "./routers/billing";
import { adminRouter } from "./routers/admin";

// Main app router
export const appRouter = router({
  users: usersRouter,
  userKeys: userKeysRouter, // Legacy, for migration
  keyShares: keySharesRouter, // New key sharding system
  devices: devicesRouter, // Device management
  webauthn: webauthnRouter, // Passkey-based E2EE unlock
  folders: foldersRouter,
  chats: chatsRouter,
  notes: notesRouter,
  credentials: credentialsRouter,
  apiTokens: apiTokensRouter,
  prompts: promptsRouter,
  enclaves: enclavesRouter,
  modelServers: modelServersRouter,
  billing: billingRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
