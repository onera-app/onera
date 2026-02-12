import { create } from "zustand";

export type ModalId =
  | "settings"
  | "e2ee_setup"
  | "e2ee_unlock"
  | "onboarding_completion"
  | null;

interface UINavState {
  activeModal: ModalId;
  focusedElementId: string | null;
  setActiveModal: (modal: ModalId) => void;
  setFocusedElement: (elementId: string | null) => void;
}

export const useUINavigationStore = create<UINavState>((set) => ({
  activeModal: null,
  focusedElementId: null,
  setActiveModal: (modal) => set({ activeModal: modal }),
  setFocusedElement: (focusedElementId) => set({ focusedElementId }),
}));

