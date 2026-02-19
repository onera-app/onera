import {
    createContext,
    useContext,
    useEffect,
    type ReactNode,
    useRef,
    useState,
} from "react";
import { useChats } from "@/hooks/queries/useChats";
import { useNotes } from "@/hooks/queries/useNotes";
import { useE2EE } from "@/providers/E2EEProvider";
import { searchService } from "@/services/search";
import {
    decryptChatContent,
    getChatKey,
    decryptNoteTitle,
    decryptNoteContent,
} from "@onera/crypto";
import { createMessagesList } from "@/lib/messageTree";
import type { ChatHistory } from "@onera/types";
import { trpc } from "@/lib/trpc";

interface SearchContextValue {
    isIndexing: boolean;
    indexingProgress: string | null;
}

const SearchContext = createContext<SearchContextValue>({
    isIndexing: false,
    indexingProgress: null,
});

export function useSearchContext() {
    return useContext(SearchContext);
}

export function SearchProvider({ children }: { children: ReactNode }) {
    const { isUnlocked, getMasterKey } = useE2EE();
    const chats = useChats();
    const { data: notes } = useNotes();
    const utils = trpc.useUtils();
    const indexingQueue = useRef<Set<string>>(new Set());
    const indexedChats = useRef<Map<string, number>>(new Map()); // Map<chatId, updatedAt>
    const indexedNotes = useRef<Map<string, number>>(new Map()); // Map<noteId, updatedAt>
    const [indexingProgress, setIndexingProgress] = useState<string | null>(null);

    // Initialize search service and progress callback
    useEffect(() => {
        searchService.setProgressCallback((progress) => {
            setIndexingProgress(progress);
        });
    }, []);

    // Initialize with key when unlocked
    useEffect(() => {
        if (isUnlocked) {
            let cancelled = false;
            (async () => {
                try {
                    const key = getMasterKey();
                    if (key && !cancelled) {
                        await searchService.init(key);
                    }
                } catch (e) {
                    console.error("Failed to get master key for search init", e);
                }
            })();
            return () => { cancelled = true; };
        } else {
            searchService.clear();
            setIndexingProgress(null);
        }
    }, [isUnlocked, getMasterKey]);

    // Background indexing logic
    useEffect(() => {
        if (!isUnlocked || !chats) {
            return;
        }

        const indexNext = async () => {
            // Basic implementation to avoid loops
            if (indexingQueue.current.size > 0) return;

            // Index Chats
            if (chats) {
                for (const chat of chats) {
                    if (!chat.encryptedChatKey || !chat.chatKeyNonce) continue;

                    const lastIndexed = indexedChats.current.get(chat.id);
                    if (lastIndexed && lastIndexed >= chat.updatedAt) continue;
                    if (indexingQueue.current.has(chat.id)) continue;

                    indexingQueue.current.add(chat.id);
                    setIndexingProgress(`Indexing chat ${chat.id.slice(0, 8)}...`);

                    try {
                        getChatKey(chat.id, chat.encryptedChatKey, chat.chatKeyNonce);
                        const fullChat = await utils.chats.get.fetch({ chatId: chat.id });

                        if (fullChat && fullChat.encryptedChat && fullChat.chatNonce) {
                            const history = decryptChatContent(
                                chat.id,
                                chat.encryptedChatKey,
                                chat.chatKeyNonce,
                                fullChat.encryptedChat,
                                fullChat.chatNonce
                            ) as unknown as ChatHistory;

                            const messages = createMessagesList(history);
                            await searchService.indexChatMessages(chat.id, messages);
                            indexedChats.current.set(chat.id, chat.updatedAt);
                        }
                    } catch (e) {
                        console.error(`[SearchProvider] Failed to index chat ${chat.id}`, e);
                    } finally {
                        indexingQueue.current.delete(chat.id);
                    }
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            }

            // Index Notes
            if (notes) {
                for (const note of notes) {
                    const lastIndexed = indexedNotes.current.get(note.id);
                    if (lastIndexed && lastIndexed >= note.updatedAt) continue;
                    if (indexingQueue.current.has(note.id)) continue;

                    indexingQueue.current.add(note.id);
                    setIndexingProgress(`Indexing note ${note.id.slice(0, 8)}...`);

                    try {
                        const title = decryptNoteTitle(
                            note.id,
                            note.encryptedTitle,
                            note.titleNonce,
                            note.encryptedNoteKey ?? undefined,
                            note.noteKeyNonce ?? undefined
                        );

                        const content = decryptNoteContent(
                            note.id,
                            note.encryptedContent,
                            note.contentNonce,
                            note.encryptedNoteKey ?? undefined,
                            note.noteKeyNonce ?? undefined
                        );

                        await searchService.indexNote(note.id, title, content, note.updatedAt);
                        indexedNotes.current.set(note.id, note.updatedAt);
                    } catch (e) {
                        console.error(`[SearchProvider] Failed to index note ${note.id}`, e);
                    } finally {
                        indexingQueue.current.delete(note.id);
                    }
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            }

            setIndexingProgress(null);
        };

        const timeoutId = setTimeout(() => {
            void indexNext();
        }, 1000);

        return () => clearTimeout(timeoutId);

    }, [chats, notes, isUnlocked, utils]);

    return (
        <SearchContext.Provider value={{ isIndexing: indexingQueue.current.size > 0, indexingProgress }}>
            {children}
        </SearchContext.Provider>
    );
}
