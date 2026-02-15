import { Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";
import { authenticateRequest } from "../auth/supabase";

// Track connected users and their sockets
const userSockets = new Map<string, Set<Socket>>();

let io: Server | null = null;

export function initWebSocket(httpServer: HTTPServer) {
  // Parse allowed origins from FRONTEND_URL (can be comma-separated)
  const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim());

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (same-origin through nginx proxy)
        if (!origin) {
          callback(null, true);
          return;
        }
        // Allow if origin is in the allowed list
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        // Reject unknown origins - prevents CSRF attacks
        callback(new Error("Origin not allowed"), false);
      },
      credentials: true,
    },
  });

  // Authentication middleware - Supabase JWT verification
  io.use(async (socket, next) => {
    try {
      // Get JWT token from query params or auth header
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token ||
        extractBearerToken(socket.handshake.headers.authorization);

      if (!token || typeof token !== "string") {
        return next(new Error("No authentication token"));
      }

      // Verify the Supabase JWT token
      const user = await authenticateRequest(`Bearer ${token}`);

      if (!user) {
        return next(new Error("Invalid token"));
      }

      socket.data.userId = user.id;
      socket.data.email = user.email;
      next();
    } catch (err) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;

    // Track user sockets
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket);

    // Join user-specific room
    socket.join(`user:${userId}`);

    console.log(
      `User ${userId} connected (${userSockets.get(userId)?.size} connections)`
    );

    socket.on("disconnect", () => {
      userSockets.get(userId)?.delete(socket);
      if (userSockets.get(userId)?.size === 0) {
        userSockets.delete(userId);
      }
      console.log(`User ${userId} disconnected`);
    });
  });

  return io;
}

// Extract Bearer token from Authorization header
function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}

// Broadcast event to all sockets of a specific user
export function broadcastToUser(userId: string, event: string, data: unknown) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

// Get the Socket.IO server instance
export function getIO() {
  return io;
}

// WebSocket event types
export type WebSocketEvent =
  | "chat:created"
  | "chat:updated"
  | "chat:deleted"
  | "note:created"
  | "note:updated"
  | "note:deleted"
  | "folder:created"
  | "folder:updated"
  | "folder:deleted"
  | "credential:created"
  | "credential:updated"
  | "credential:deleted"
  | "prompt:created"
  | "prompt:updated"
  | "prompt:deleted";
