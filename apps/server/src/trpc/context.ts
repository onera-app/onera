/**
 * tRPC Context
 * Creates the context for each tRPC request with Clerk authentication
 */

import { authenticateRequest, type ClerkUser } from "../auth/clerk";

/**
 * Context available to all tRPC procedures
 */
export interface Context extends Record<string, unknown> {
  /**
   * The authenticated Clerk user, or null if not authenticated
   */
  user: ClerkUser | null;
}

/**
 * Create context for a tRPC request
 * Extracts and verifies the Clerk JWT from the Authorization header
 */
export async function createContext(opts: { req: Request }): Promise<Context> {
  const authHeader = opts.req.headers.get("authorization");
  const user = await authenticateRequest(authHeader);

  return {
    user,
  };
}
