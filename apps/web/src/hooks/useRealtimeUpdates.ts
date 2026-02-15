import { useCallback, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/providers/SupabaseAuthProvider";
import { trpc } from "@/lib/trpc";

// WebSocket URL - empty string or undefined means connect to same origin
// In production, nginx proxies /socket.io/ to the server container
// In development, connect directly to the server at localhost:3000
const WS_URL = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL || "http://localhost:3000";

// Get the Socket.IO connection URL
function getSocketUrl(): string | undefined {
  // Empty string or "/" means connect to same origin (production)
  if (!WS_URL || WS_URL === "/" || WS_URL === "") {
    return undefined; // Socket.IO will connect to the current origin
  }
  // If it's a relative path like "/api", connect to same origin
  if (WS_URL.startsWith("/")) {
    return undefined;
  }
  // Otherwise, it's an absolute URL (development)
  return WS_URL;
}

export function useRealtimeUpdates() {
  const { isAuthenticated, getToken } = useAuth();
  const utils = trpc.useUtils();
  const socketRef = useRef<Socket | null>(null);
  const invalidationQueueRef = useRef<Set<string>>(new Set());
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventTimestampsRef = useRef<Map<string, number>>(new Map());

  const enqueueInvalidation = useCallback((key: string) => {
    invalidationQueueRef.current.add(key);
    if (flushTimerRef.current) {
      return;
    }
    flushTimerRef.current = setTimeout(() => {
      const queued = Array.from(invalidationQueueRef.current);
      invalidationQueueRef.current.clear();
      flushTimerRef.current = null;

      for (const item of queued) {
        if (item === "chats:list") {
          utils.chats.list.invalidate();
        } else if (item === "notes:list") {
          utils.notes.list.invalidate();
        } else if (item.startsWith("notes:get:")) {
          const noteId = item.replace("notes:get:", "");
          utils.notes.get.invalidate({ noteId });
        } else if (item === "folders:list") {
          utils.folders.list.invalidate();
        } else if (item.startsWith("folders:get:")) {
          const folderId = item.replace("folders:get:", "");
          utils.folders.get.invalidate({ folderId });
        } else if (item === "credentials:list") {
          utils.credentials.list.invalidate();
        } else if (item === "prompts:list") {
          utils.prompts.list.invalidate();
        } else if (item.startsWith("prompts:get:")) {
          const promptId = item.replace("prompts:get:", "");
          utils.prompts.get.invalidate({ promptId });
        }
      }
    }, 50);
  }, [utils]);

  const shouldProcessEvent = useCallback((signature: string, ttlMs = 200): boolean => {
    const now = Date.now();
    const previous = eventTimestampsRef.current.get(signature);
    if (previous && now - previous < ttlMs) {
      return false;
    }
    eventTimestampsRef.current.set(signature, now);
    return true;
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    let socket: Socket | null = null;
    let mounted = true;

    // Connect to WebSocket with JWT token for authentication
    const connectWithToken = async () => {
      const token = await getToken();

      if (!mounted) return;

      // Connect to WebSocket
      // undefined URL means connect to same origin (production behind nginx proxy)
      const socketUrl = getSocketUrl();
      socket = io(socketUrl, {
        withCredentials: true,
        transports: ["websocket", "polling"],
        auth: {
          token,
        },
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        console.log("WebSocket connected");
      });

      socket.on("disconnect", () => {
        console.log("WebSocket disconnected");
      });

      socket.on("connect_error", async (error) => {
        console.warn("WebSocket connect error:", error.message);
        const needsRefresh =
          error.message.toLowerCase().includes("unauthorized") ||
          error.message.toLowerCase().includes("not authenticated");
        if (!needsRefresh || !mounted) {
          return;
        }

        try {
          const refreshedToken = await getToken();
          if (!mounted || !socket) return;
          socket.auth = { token: refreshedToken };
          socket.connect();
        } catch (refreshError) {
          console.error("Failed to refresh WebSocket token:", refreshError);
        }
      });

      // Chat events
      socket.on("chat:created", () => {
        if (shouldProcessEvent("chat:created")) {
          enqueueInvalidation("chats:list");
        }
      });

      socket.on("chat:updated", (chat: { id?: string } = {}) => {
        // Only invalidate the list to update sidebar
        // Don't invalidate chats.get - local state already has data and it causes refresh flicker
        const signature = `chat:updated:${chat.id ?? "unknown"}`;
        if (shouldProcessEvent(signature)) {
          enqueueInvalidation("chats:list");
        }
      });

      socket.on("chat:deleted", (chat: { id?: string } = {}) => {
        const signature = `chat:deleted:${chat.id ?? "unknown"}`;
        if (shouldProcessEvent(signature)) {
          enqueueInvalidation("chats:list");
        }
      });

      // Note events
      socket.on("note:created", (note: { id?: string } = {}) => {
        const signature = `note:created:${note.id ?? "unknown"}`;
        if (shouldProcessEvent(signature)) {
          enqueueInvalidation("notes:list");
        }
      });

      socket.on("note:updated", (note: { id: string }) => {
        const signature = `note:updated:${note.id}`;
        if (shouldProcessEvent(signature)) {
          enqueueInvalidation("notes:list");
          enqueueInvalidation(`notes:get:${note.id}`);
        }
      });

      socket.on("note:deleted", (note: { id?: string } = {}) => {
        const signature = `note:deleted:${note.id ?? "unknown"}`;
        if (shouldProcessEvent(signature)) {
          enqueueInvalidation("notes:list");
        }
      });

      // Folder events
      socket.on("folder:created", (folder: { id?: string } = {}) => {
        const signature = `folder:created:${folder.id ?? "unknown"}`;
        if (shouldProcessEvent(signature)) {
          enqueueInvalidation("folders:list");
        }
      });

      socket.on("folder:updated", (folder: { id: string }) => {
        const signature = `folder:updated:${folder.id}`;
        if (shouldProcessEvent(signature)) {
          enqueueInvalidation("folders:list");
          enqueueInvalidation(`folders:get:${folder.id}`);
        }
      });

      socket.on("folder:deleted", (folder: { id?: string } = {}) => {
        const signature = `folder:deleted:${folder.id ?? "unknown"}`;
        if (shouldProcessEvent(signature)) {
          enqueueInvalidation("folders:list");
        }
      });

      // Credential events
      socket.on("credential:created", () => {
        if (shouldProcessEvent("credential:created")) {
          enqueueInvalidation("credentials:list");
        }
      });

      socket.on("credential:updated", () => {
        if (shouldProcessEvent("credential:updated")) {
          enqueueInvalidation("credentials:list");
        }
      });

      socket.on("credential:deleted", () => {
        if (shouldProcessEvent("credential:deleted")) {
          enqueueInvalidation("credentials:list");
        }
      });

      // Prompt events
      socket.on("prompt:created", (prompt: { id?: string } = {}) => {
        const signature = `prompt:created:${prompt.id ?? "unknown"}`;
        if (shouldProcessEvent(signature)) {
          enqueueInvalidation("prompts:list");
        }
      });

      socket.on("prompt:updated", (prompt: { id: string }) => {
        const signature = `prompt:updated:${prompt.id}`;
        if (shouldProcessEvent(signature)) {
          enqueueInvalidation("prompts:list");
          enqueueInvalidation(`prompts:get:${prompt.id}`);
        }
      });

      socket.on("prompt:deleted", (prompt: { id?: string } = {}) => {
        const signature = `prompt:deleted:${prompt.id ?? "unknown"}`;
        if (shouldProcessEvent(signature)) {
          enqueueInvalidation("prompts:list");
        }
      });
    };

    connectWithToken();
    const invalidationQueue = invalidationQueueRef.current;

    return () => {
      mounted = false;
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      invalidationQueue.clear();
      if (socket) {
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [enqueueInvalidation, getToken, isAuthenticated, shouldProcessEvent]);
}
