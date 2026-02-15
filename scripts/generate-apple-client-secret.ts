/**
 * Generate Sign in with Apple client secret JWT (max 180 days).
 *
 * Required env:
 * - APPLE_TEAM_ID
 * - APPLE_KEY_ID
 * - APPLE_CLIENT_ID
 * - APPLE_PRIVATE_KEY (PEM content) OR APPLE_PRIVATE_KEY_PATH
 *
 * Optional env:
 * - APPLE_SECRET_TTL_DAYS (default: 180, max: 180)
 *
 * Prints the JWT to stdout.
 */

import { readFileSync } from "node:fs";
import { importPKCS8, SignJWT } from "jose";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getPrivateKeyPem(): string {
  const fromEnv = process.env.APPLE_PRIVATE_KEY;
  if (fromEnv) {
    // Support escaped newlines when stored as a single-line secret.
    return fromEnv.replace(/\\n/g, "\n");
  }

  const path = process.env.APPLE_PRIVATE_KEY_PATH;
  if (!path) {
    throw new Error(
      "Missing APPLE_PRIVATE_KEY or APPLE_PRIVATE_KEY_PATH environment variable"
    );
  }

  return readFileSync(path, "utf8");
}

function getTtlDays(): number {
  const raw = process.env.APPLE_SECRET_TTL_DAYS;
  if (!raw) return 180;

  const ttl = Number(raw);
  if (!Number.isFinite(ttl) || ttl <= 0) {
    throw new Error("APPLE_SECRET_TTL_DAYS must be a positive number");
  }
  if (ttl > 180) {
    throw new Error("APPLE_SECRET_TTL_DAYS cannot exceed 180");
  }
  return Math.floor(ttl);
}

async function main(): Promise<void> {
  const teamId = getRequiredEnv("APPLE_TEAM_ID");
  const keyId = getRequiredEnv("APPLE_KEY_ID");
  const clientId = getRequiredEnv("APPLE_CLIENT_ID");
  const privateKeyPem = getPrivateKeyPem();
  const ttlDays = getTtlDays();

  const now = Math.floor(Date.now() / 1000);
  const exp = now + ttlDays * 24 * 60 * 60;

  const key = await importPKCS8(privateKeyPem, "ES256");

  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setSubject(clientId)
    .setAudience("https://appleid.apple.com")
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(key);

  process.stdout.write(jwt);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`Failed to generate Apple client secret: ${message}`);
  process.exit(1);
});

