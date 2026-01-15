import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'oled-dark' | 'system';
export type ChatDensity = 'compact' | 'normal' | 'comfortable';

export type SettingsTab = 'general' | 'interface' | 'connections' | 'tools' | 'audio' | 'data' | 'account' | 'encryption' | 'about';

interface UIState {
  // Theme & appearance
  theme: Theme;
  uiScale: number; // 0.75 - 1.5
  chatDensity: ChatDensity;

  // Sidebar
  sidebarOpen: boolean;
  sidebarWidth: number;
  sidebarSearchQuery: string;

  // Input preferences
  useRichTextInput: boolean;

  // Settings modal
  settingsModalOpen: boolean;
  settingsModalTab: SettingsTab;

  // Actions
  setTheme: (theme: Theme) => void;
  setUIScale: (scale: number) => void;
  setChatDensity: (density: ChatDensity) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setSidebarSearchQuery: (query: string) => void;
  setUseRichTextInput: (enabled: boolean) => void;
  openSettingsModal: (tab?: SettingsTab) => void;
  closeSettingsModal: () => void;
}

// Sidebar width constraints (OpenWebUI style)
export const SIDEBAR_MIN_WIDTH = 220;
export const SIDEBAR_MAX_WIDTH = 480;
export const SIDEBAR_DEFAULT_WIDTH = 260;

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'system',
      uiScale: 1,
      chatDensity: 'normal',
      sidebarOpen: true,
      sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
      sidebarSearchQuery: '',
      useRichTextInput: true, // Default to rich text input
      settingsModalOpen: false,
      settingsModalTab: 'general' as SettingsTab,

      setTheme: (theme) => set({ theme }),
      setUIScale: (uiScale) => {
        // Clamp between 0.75 and 1.5
        const clamped = Math.min(1.5, Math.max(0.75, uiScale));
        document.documentElement.style.setProperty('--ui-scale', String(clamped));
        set({ uiScale: clamped });
      },
      setChatDensity: (chatDensity) => set({ chatDensity }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setSidebarWidth: (width) => {
        // Clamp between min and max
        const clamped = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width));
        document.documentElement.style.setProperty('--sidebar-width', `${clamped}px`);
        set({ sidebarWidth: clamped });
      },
      setSidebarSearchQuery: (sidebarSearchQuery) => set({ sidebarSearchQuery }),
      setUseRichTextInput: (useRichTextInput) => set({ useRichTextInput }),
      openSettingsModal: (tab) => set({ settingsModalOpen: true, settingsModalTab: tab || 'general' }),
      closeSettingsModal: () => set({ settingsModalOpen: false }),
    }),
    {
      name: 'onera-ui',
      version: 2, // Bump version for migration
      onRehydrateStorage: () => (state) => {
        // Apply stored values to CSS variables on hydration
        if (state) {
          document.documentElement.style.setProperty('--ui-scale', String(state.uiScale));
          document.documentElement.style.setProperty('--sidebar-width', `${state.sidebarWidth}px`);
        }
      },
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Partial<UIState>;
        if (version < 2) {
          return {
            ...state,
            useRichTextInput: true, // Default to rich text
          };
        }
        return state as UIState;
      },
    }
  )
);
