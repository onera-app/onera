/**
 * Supabase Authentication Module
 * Handles JWT verification and user data extraction from Supabase tokens
 *
 * Replaces the previous Clerk authentication module.
 * Maintains the same User interface for backward compatibility.
 */

import { createClient } from "@supabase/supabase-js";
import { db, users } from "../db/client";
import { eq } from "drizzle-orm";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required"
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * User representation for our application
 * Same shape as the previous ClerkUser interface
 */
export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  name: string;
  imageUrl: string | null;
  emailVerified: boolean;
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(
  authHeader: string | null
): string | null {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Verify a Supabase JWT token and return the user
 */
export async function authenticateRequest(
  authHeader: string | null
): Promise<User | null> {
  const token = extractBearerToken(authHeader);
  if (!token) {
    return null;
  }

  try {
    const {
      data: { user: supabaseUser },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !supabaseUser) {
      return null;
    }

    const metadata = supabaseUser.user_metadata || {};
    const email = supabaseUser.email || "";
    const firstName = metadata.first_name || metadata.name?.split(" ")[0] || null;
    const lastName = metadata.last_name || metadata.name?.split(" ").slice(1).join(" ") || null;

    return {
      id: supabaseUser.id,
      email,
      firstName,
      lastName,
      name:
        [firstName, lastName].filter(Boolean).join(" ") ||
        email.split("@")[0] ||
        "User",
      imageUrl: metadata.avatar_url || metadata.picture || null,
      emailVerified: !!supabaseUser.email_confirmed_at,
    };
  } catch (error) {
    console.error("Supabase token verification failed:", error);
    return null;
  }
}

/**
 * Get user role from the users table
 * Replaces Clerk's getUserMetadata for admin checks
 */
export async function getUserRole(
  userId: string
): Promise<string | null> {
  try {
    const result = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return result[0]?.role ?? null;
  } catch (error) {
    console.error("Failed to get user role:", error);
    return null;
  }
}
