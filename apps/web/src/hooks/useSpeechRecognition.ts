import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseSpeechRecognitionReturn {
    isListening: boolean;
    transcript: string;
    interimTranscript: string;
    finalTranscript: string;
    start: () => void;
    stop: () => void;
    reset: () => void;
    error: string | null;
    supported: boolean;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [finalTranscript, setFinalTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [supported, setSupported] = useState(false);

    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition =
                (window as any).SpeechRecognition ||
                (window as any).webkitSpeechRecognition;

            if (SpeechRecognition) {
                setSupported(true);
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = 'en-US'; // Could be parameterized in future

                recognition.onstart = () => {
                    setIsListening(true);
                    setError(null);
                };

                recognition.onend = () => {
                    setIsListening(false);
                };

                recognition.onerror = (event: any) => {
                    console.error('Speech recognition error', event.error);
                    setError(event.error);
                    setIsListening(false);
                };

                recognition.onresult = (event: any) => {
                    let interim = '';
                    let final = '';

                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            final += event.results[i][0].transcript;
                        } else {
                            interim += event.results[i][0].transcript;
                        }
                    }

                    setInterimTranscript(interim);
                    setFinalTranscript((prev) => prev + final); // Append to existing final
                    setTranscript(final + interim);
                };

                recognitionRef.current = recognition;
            }
        }
    }, []);

    const start = useCallback(() => {
        if (recognitionRef.current && !isListening) {
            try {
                setFinalTranscript('');
                setInterimTranscript('');
                setTranscript('');
                recognitionRef.current.start();
            } catch (err) {
                console.error('Failed to start recognition:', err);
            }
        }
    }, [isListening]);

    const stop = useCallback(() => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
    }, [isListening]);

    const reset = useCallback(() => {
        setFinalTranscript('');
        setInterimTranscript('');
        setTranscript('');
        setError(null);
    }, []);

    // Update combined transcript when parts change
    useEffect(() => {
        setTranscript(finalTranscript + interimTranscript);
    }, [finalTranscript, interimTranscript]);

    return {
        isListening,
        transcript,
        interimTranscript,
        finalTranscript,
        start,
        stop,
        reset,
        error,
        supported,
    };
}
