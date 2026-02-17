import { useState, useEffect, useCallback, useRef } from 'react';
import { useAudioStore } from '@/stores/audioStore';

export interface UseSpeechSynthesisReturn {
    speak: (text: string) => void;
    cancel: () => void;
    pause: () => void;
    resume: () => void;
    speaking: boolean;
    paused: boolean;
    voices: SpeechSynthesisVoice[];
    supported: boolean;
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [speaking, setSpeaking] = useState(false);
    const [paused, setPaused] = useState(false);
    const [supported, setSupported] = useState(false);

    const { ttsVoice, ttsRate, ttsPitch, ttsVolume } = useAudioStore();
    const synthRef = useRef<SpeechSynthesis | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            setSupported(true);
            synthRef.current = window.speechSynthesis;

            const updateVoices = () => {
                setVoices(window.speechSynthesis.getVoices());
            };

            // Chrome requires this event to load voices
            window.speechSynthesis.onvoiceschanged = updateVoices;
            updateVoices();

            return () => {
                window.speechSynthesis.onvoiceschanged = null;
            };
        }
    }, []);

    // Update speaking state periodically since events can be unreliable
    useEffect(() => {
        if (!synthRef.current) return;

        const interval = setInterval(() => {
            setSpeaking(synthRef.current?.speaking || false);
            setPaused(synthRef.current?.paused || false);
        }, 100);

        return () => clearInterval(interval);
    }, []);

    const speak = useCallback((text: string) => {
        if (!synthRef.current || !text) return;

        // Cancel current speech if speaking
        synthRef.current.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // Configure utterance
        if (ttsVoice) {
            const selectedVoice = voices.find(v => v.voiceURI === ttsVoice);
            if (selectedVoice) utterance.voice = selectedVoice;
        }

        utterance.rate = ttsRate;
        utterance.pitch = ttsPitch;
        utterance.volume = ttsVolume;

        utterance.onstart = () => {
            setSpeaking(true);
            setPaused(false);
        };

        utterance.onend = () => {
            setSpeaking(false);
            setPaused(false);
        };

        utterance.onerror = (event) => {
            console.error('Speech synthesis error', event);
            setSpeaking(false);
            setPaused(false);
        };

        synthRef.current.speak(utterance);
    }, [voices, ttsVoice, ttsRate, ttsPitch, ttsVolume]);

    const cancel = useCallback(() => {
        if (synthRef.current) {
            synthRef.current.cancel();
            setSpeaking(false);
            setPaused(false);
        }
    }, []);

    const pause = useCallback(() => {
        if (synthRef.current) {
            synthRef.current.pause();
            setPaused(true);
        }
    }, []);

    const resume = useCallback(() => {
        if (synthRef.current) {
            synthRef.current.resume();
            setPaused(false);
        }
    }, []);

    return {
        speak,
        cancel,
        pause,
        resume,
        speaking,
        paused,
        voices,
        supported,
    };
}
