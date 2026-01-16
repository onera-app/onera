import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/providers/ClerkAuthProvider";
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

      // Chat events
      socket.on("chat:created", () => {
        utils.chats.list.invalidate();
      });

      socket.on("chat:updated", () => {
        // Only invalidate the list to update sidebar
        // Don't invalidate chats.get - local state already has data and it causes refresh flicker
        utils.chats.list.invalidate();
      });

      socket.on("chat:deleted", () => {
        utils.chats.list.invalidate();
      });

      // Note events
      socket.on("note:created", () => {
        utils.notes.list.invalidate();
      });

      socket.on("note:updated", (note: { id: string }) => {
        utils.notes.list.invalidate();
        utils.notes.get.invalidate({ noteId: note.id });
      });

      socket.on("note:deleted", () => {
        utils.notes.list.invalidate();
      });

      // Folder events
      socket.on("folder:created", () => {
        utils.folders.list.invalidate();
      });

      socket.on("folder:updated", (folder: { id: string }) => {
        utils.folders.list.invalidate();
        utils.folders.get.invalidate({ folderId: folder.id });
      });

      socket.on("folder:deleted", () => {
        utils.folders.list.invalidate();
      });

      // Credential events
      socket.on("credential:created", () => {
        utils.credentials.list.invalidate();
      });

      socket.on("credential:updated", () => {
        utils.credentials.list.invalidate();
      });

      socket.on("credential:deleted", () => {
        utils.credentials.list.invalidate();
      });

      // Prompt events
      socket.on("prompt:created", () => {
        utils.prompts.list.invalidate();
      });

      socket.on("prompt:updated", (prompt: { id: string }) => {
        utils.prompts.list.invalidate();
        utils.prompts.get.invalidate({ promptId: prompt.id });
      });

      socket.on("prompt:deleted", () => {
        utils.prompts.list.invalidate();
      });
    };

    connectWithToken();

    return () => {
      mounted = false;
      if (socket) {
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [isAuthenticated, getToken, utils]);
}
