import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/providers/AuthProvider";
import { trpc } from "@/lib/trpc";

const WS_URL = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL || "http://localhost:3000";

export function useRealtimeUpdates() {
  const { isAuthenticated } = useAuth();
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

    // Connect to WebSocket with credentials
    const socket = io(WS_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
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

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, utils]);
}
