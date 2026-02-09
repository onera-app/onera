/**
 * Clerk Authentication Module
 * Handles JWT verification and user data extraction from Clerk tokens
 */

import { verifyToken, createClerkClient } from "@clerk/backend";

// Initialize Clerk client for server-side operations
export const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

/**
 * Clerk user representation for our application
 */
export interface ClerkUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  name: string;
  imageUrl: string | null;
  emailVerified: boolean;
}

/**
 * Verified JWT payload with essential claims
 */
export interface ClerkJWTPayload {
  sub: string; // User ID
  email?: string;
  email_verified?: boolean;
  first_name?: string;
  last_name?: string;
  image_url?: string;
  iat: number;
  exp: number;
  iss: string;
  azp?: string; // Authorized party
  sid?: string; // Session ID
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
 * Verify a Clerk JWT token and return the payload
 * Uses the JWT key for networkless verification when available
 */
export async function verifyClerkToken(
  token: string
): Promise<ClerkJWTPayload | null> {
  try {
    const secretKey = process.env.CLERK_SECRET_KEY;
    const jwtKey = process.env.CLERK_JWT_KEY;

    if (!secretKey) {
      console.error("CLERK_SECRET_KEY is not configured");
      return null;
    }

    const verified = await verifyToken(token, {
      secretKey,
      // Use JWT key for faster verification if available
      ...(jwtKey && { jwtKey }),
    });

    if (!verified || !verified.sub) {
      return null;
    }

    return verified as ClerkJWTPayload;
  } catch (error) {
    console.error("Clerk token verification failed:", error);
    return null;
  }
}

/**
 * Get full user details from Clerk
 * This makes a network call to Clerk's API
 */
export async function getClerkUser(userId: string): Promise<ClerkUser | null> {
  try {
    const user = await clerkClient.users.getUser(userId);

    const primaryEmail = user.emailAddresses.find(
      (email) => email.id === user.primaryEmailAddressId
    );

    return {
      id: user.id,
      email: primaryEmail?.emailAddress || "",
      firstName: user.firstName,
      lastName: user.lastName,
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") ||
            primaryEmail?.emailAddress?.split("@")[0] ||
            "User",
      imageUrl: user.imageUrl,
      emailVerified: primaryEmail?.verification?.status === "verified",
    };
  } catch (error) {
    console.error("Failed to fetch Clerk user:", error);
    return null;
  }
}

/**
 * Verify token and get user in one step
 * For most auth operations, this is the main function to use
 */
export async function authenticateRequest(
  authHeader: string | null
): Promise<ClerkUser | null> {
  const token = extractBearerToken(authHeader);
  if (!token) {
    return null;
  }

  const payload = await verifyClerkToken(token);
  if (!payload) {
    return null;
  }

  // If JWT has email, use claims directly (fast path)
  if (payload.email) {
    return {
      id: payload.sub,
      email: payload.email,
      firstName: payload.first_name || null,
      lastName: payload.last_name || null,
      name: [payload.first_name, payload.last_name].filter(Boolean).join(" ") ||
            payload.email.split("@")[0] ||
            "User",
      imageUrl: payload.image_url || null,
      emailVerified: payload.email_verified || false,
    };
  }

  // JWT missing email claim — fetch full user from Clerk API
  const fullUser = await getClerkUser(payload.sub);
  if (fullUser?.email) {
    return fullUser;
  }

  // Last resort: return user without email (non-billing operations will still work)
  console.warn(`User ${payload.sub} has no email in JWT or Clerk profile — billing operations will fail`);
  return {
    id: payload.sub,
    email: "",
    firstName: fullUser?.firstName ?? payload.first_name ?? null,
    lastName: fullUser?.lastName ?? payload.last_name ?? null,
    name: fullUser?.name ||
          [payload.first_name, payload.last_name].filter(Boolean).join(" ") || "User",
    imageUrl: fullUser?.imageUrl ?? payload.image_url ?? null,
    emailVerified: false,
  };
}

/**
 * Update user metadata in Clerk
 * Used for storing encrypted auth share
 */
export async function updateUserMetadata(
  userId: string,
  metadata: {
    publicMetadata?: Record<string, unknown>;
    privateMetadata?: Record<string, unknown>;
    unsafeMetadata?: Record<string, unknown>;
  }
): Promise<boolean> {
  try {
    await clerkClient.users.updateUserMetadata(userId, metadata);
    return true;
  } catch (error) {
    console.error("Failed to update Clerk user metadata:", error);
    return false;
  }
}

/**
 * Get user metadata from Clerk
 * Used for retrieving encrypted auth share
 */
export async function getUserMetadata(
  userId: string
): Promise<{
  publicMetadata: Record<string, unknown>;
  privateMetadata: Record<string, unknown>;
  unsafeMetadata: Record<string, unknown>;
} | null> {
  try {
    const user = await clerkClient.users.getUser(userId);
    return {
      publicMetadata: user.publicMetadata as Record<string, unknown>,
      privateMetadata: user.privateMetadata as Record<string, unknown>,
      unsafeMetadata: user.unsafeMetadata as Record<string, unknown>,
    };
  } catch (error) {
    console.error("Failed to get Clerk user metadata:", error);
    return null;
  }
}

export type { ClerkUser as User };
