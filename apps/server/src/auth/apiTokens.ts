import { createHash, randomUUID } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db, apiTokens } from "../db/client";
import { authenticateRequest, extractBearerToken } from "./supabase";

const API_TOKEN_PREFIX = "onr_";

function tokenPepper(): string {
  return process.env.API_TOKEN_PEPPER || "";
}

export function hashApiToken(token: string): string {
  return createHash("sha256")
    .update(`${token}:${tokenPepper()}`)
    .digest("hex");
}

export function generateApiToken(): { token: string; prefix: string; hash: string } {
  const randomPart = createHash("sha256")
    .update(`${Date.now()}:${Math.random()}:${randomUUID()}`)
    .digest("hex");

  const token = `${API_TOKEN_PREFIX}${randomPart}`;
  return {
    token,
    prefix: token.slice(0, 14),
    hash: hashApiToken(token),
  };
}

export async function authenticateApiToken(token: string): Promise<string | null> {
  const hash = hashApiToken(token);

  const [row] = await db
    .select({ id: apiTokens.id, userId: apiTokens.userId })
    .from(apiTokens)
    .where(and(eq(apiTokens.tokenHash, hash), isNull(apiTokens.revokedAt)))
    .limit(1);

  if (!row) {
    return null;
  }

  await db
    .update(apiTokens)
    .set({
      lastUsedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(apiTokens.id, row.id));

  return row.userId;
}

export async function authenticateApiRequest(headers: Headers): Promise<string | null> {
  const xApiKey = headers.get("x-api-key");
  if (xApiKey) {
    const byKey = await authenticateApiToken(xApiKey.trim());
    if (byKey) return byKey;
  }

  const authHeader = headers.get("authorization");
  const bearer = extractBearerToken(authHeader);

  if (!bearer) {
    return null;
  }

  if (bearer.startsWith(API_TOKEN_PREFIX)) {
    return authenticateApiToken(bearer);
  }

  const user = await authenticateRequest(authHeader);
  return user?.id ?? null;
}
