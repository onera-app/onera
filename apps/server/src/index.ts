import { Hono } from "hono";
import { cors } from "hono/cors";
import { trpcServer } from "@hono/trpc-server";
import { serve } from "@hono/node-server";
import { Server as HttpServer } from "http";
import { appRouter } from "./trpc";
import { createContext } from "./trpc/context";
import { auth } from "./auth";
import { initWebSocket } from "./websocket";

const app = new Hono();

// CORS configuration
app.use(
  "*",
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Health check endpoint
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Better Auth routes
app.on(["POST", "GET"], "/api/auth/**", (c) => {
  return auth.handler(c.req.raw);
});

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
    console.log(`Auth endpoint: http://localhost:${info.port}/api/auth`);
    console.log(`WebSocket enabled`);
  }
);

// Initialize WebSocket on the HTTP server
initWebSocket(server as HttpServer);

export type { AppRouter } from "./trpc";
