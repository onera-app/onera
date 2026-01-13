import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/client";
import * as schema from "../db/schema";

export const auth = betterAuth({
  appName: "Onera",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,

  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  // In production, FRONTEND_URL is set to the tenant's public URL (https://subdomain.baseDomain)
  // This allows CORS and cookie sharing between the frontend and backend
  trustedOrigins: (process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim()),
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
