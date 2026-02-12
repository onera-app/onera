import { create } from "zustand";

export type SessionFlowStatus =
  | "loading"
  | "unauthenticated"
  | "needs_setup"
  | "locked"
  | "unlocking"
  | "onboarding_incomplete"
  | "ready";

interface SessionFlowState {
  status: SessionFlowStatus;
  redirectTo: "/auth" | "/app" | null;
  setFlow: (status: SessionFlowStatus, redirectTo: "/auth" | "/app" | null) => void;
}

export const useSessionFlowStore = create<SessionFlowState>((set) => ({
  status: "loading",
  redirectTo: null,
  setFlow: (status, redirectTo) => set({ status, redirectTo }),
}));

