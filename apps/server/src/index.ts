import { Hono } from "hono";
import { cors } from "hono/cors";
import { trpcServer } from "@hono/trpc-server";
import { serve } from "@hono/node-server";
import { Server as HttpServer } from "http";
import { appRouter } from "./trpc";
import { createContext } from "./trpc/context";
import { initWebSocket } from "./websocket";

const app = new Hono();

// CORS configuration
// In production, requests come through nginx proxy (same origin), so we need to handle that
// FRONTEND_URL can be a comma-separated list of allowed origins
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

app.use(
  "*",
  cors({
    origin: (origin) => {
      // Allow requests with no origin (same-origin requests through nginx proxy)
      if (!origin) return allowedOrigins[0];
      // Allow if origin is in the allowed list
      if (allowedOrigins.includes(origin)) return origin;
      // Reject unknown origins - prevents CSRF attacks
      return null;
    },
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Health check endpoint
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Apple App Site Association for passkeys/WebAuthn
// This enables passkey authentication on iOS
app.get("/.well-known/apple-app-site-association", (c) => {
  const aasa = {
    webcredentials: {
      apps: ["J3LH4H9AA4.chat.onera.mobile"],
    },
  };
  return c.json(aasa, 200, {
    "Content-Type": "application/json",
  });
});

// Note: Authentication is handled by Clerk (https://clerk.com)
// JWT tokens are verified in the tRPC context via the Authorization header

// tRPC routes
app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: ({ req }) => createContext({ req }),
  })
);

// Create server with WebSocket support
const port = parseInt(process.env.PORT || "3000", 10);

const server = serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`Server running on http://localhost:${info.port}`);
    console.log(`tRPC endpoint: http://localhost:${info.port}/trpc`);
    console.log(`Auth: Clerk JWT verification enabled`);
    console.log(`WebSocket enabled`);
  }
);

// Initialize WebSocket on the HTTP server
initWebSocket(server as HttpServer);

export type { AppRouter } from "./trpc";
