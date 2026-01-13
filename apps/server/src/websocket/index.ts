import { Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";
import { auth } from "../auth";

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
        // In production, allow same-origin requests
        callback(null, true);
      },
      credentials: true,
    },
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      // Get session from cookies
      const cookies = socket.handshake.headers.cookie;
      if (!cookies) {
        return next(new Error("No authentication cookie"));
      }

      // Parse cookie header into Headers object
      const headers = new Headers();
      headers.set("cookie", cookies);

      const session = await auth.api.getSession({ headers });

      if (!session?.user) {
        return next(new Error("Invalid session"));
      }

      socket.data.userId = session.user.id;
      socket.data.user = session.user;
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

    console.log(`User ${userId} connected (${userSockets.get(userId)?.size} connections)`);

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
