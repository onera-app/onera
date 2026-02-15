/**
 * tRPC Context
 * Creates the context for each tRPC request with Supabase authentication
 */

import { authenticateRequest, type User } from "../auth/supabase";

/**
 * Context available to all tRPC procedures
 */
export interface Context extends Record<string, unknown> {
  /**
   * The authenticated Supabase user, or null if not authenticated
   */
  user: User | null;
}

/**
 * Create context for a tRPC request
 * Extracts and verifies the Supabase JWT from the Authorization header
 */
export async function createContext(opts: { req: Request }): Promise<Context> {
  const authHeader = opts.req.headers.get("authorization");
  const user = await authenticateRequest(authHeader);

  return {
    user,
  };
}
