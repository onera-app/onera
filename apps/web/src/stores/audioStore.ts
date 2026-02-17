import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AudioState {
    // TTS Settings
    ttsEnabled: boolean;
    ttsAutoPlay: boolean;
    ttsVoice: string | null; // Voice URI
    ttsRate: number; // 0.5 to 2.0
    ttsPitch: number; // 0.5 to 2.0
    ttsVolume: number; // 0 to 1

    // Actions
    setTtsEnabled: (enabled: boolean) => void;
    setTtsAutoPlay: (enabled: boolean) => void;
    setTtsVoice: (voiceUri: string | null) => void;
    setTtsRate: (rate: number) => void;
    setTtsPitch: (pitch: number) => void;
    setTtsVolume: (volume: number) => void;
}

export const useAudioStore = create<AudioState>()(
    persist(
        (set) => ({
            ttsEnabled: false,
            ttsAutoPlay: false,
            ttsVoice: null,
            ttsRate: 1.0,
            ttsPitch: 1.0,
            ttsVolume: 1.0,

            setTtsEnabled: (enabled) => set({ ttsEnabled: enabled }),
            setTtsAutoPlay: (enabled) => set({ ttsAutoPlay: enabled }),
            setTtsVoice: (voiceUri) => set({ ttsVoice: voiceUri }),
            setTtsRate: (rate) => set({ ttsRate: rate }),
            setTtsPitch: (pitch) => set({ ttsPitch: pitch }),
            setTtsVolume: (volume) => set({ ttsVolume: volume }),
        }),
        {
            name: 'onera-audio',
        }
    )
);
