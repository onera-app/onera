import {
    createContext,
    useContext,
    useEffect,
    type ReactNode,
    useRef,
    useState,
} from "react";
import { useChats } from "@/hooks/queries/useChats";
import { useE2EE } from "@/providers/E2EEProvider";
import { searchService } from "@/services/search";
import {
    decryptChatContent,
    getChatKey,
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
    const utils = trpc.useUtils();
    const indexingQueue = useRef<Set<string>>(new Set());
    const indexedChats = useRef<Map<string, number>>(new Map()); // Map<chatId, updatedAt>
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

            for (const chat of chats) {
                if (!chat.encryptedChatKey || !chat.chatKeyNonce) continue;

                const lastIndexed = indexedChats.current.get(chat.id);

                if (lastIndexed && lastIndexed >= chat.updatedAt) continue;

                if (indexingQueue.current.has(chat.id)) continue;

                indexingQueue.current.add(chat.id);
                setIndexingProgress(`Indexing ${chat.id.slice(0, 8)}...`);

                try {
                    // Get the key first
                    getChatKey(chat.id, chat.encryptedChatKey, chat.chatKeyNonce);

                    // Fetch full chat data to get the encrypted content
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

                        // Index messages
                        await searchService.indexChatMessages(chat.id, messages);

                        // Mark as indexed
                        indexedChats.current.set(chat.id, chat.updatedAt);
                    }
                } catch (e) {
                    // Silent fail for indexing errors
                    console.error(`[SearchProvider] Failed to index chat ${chat.id}`, e);
                } finally {
                    indexingQueue.current.delete(chat.id);
                }

                // Yield to main thread
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            setIndexingProgress(null);
        };

        const timeoutId = setTimeout(() => {
            void indexNext();
        }, 1000);

        return () => clearTimeout(timeoutId);

    }, [chats, isUnlocked, utils]);

    return (
        <SearchContext.Provider value={{ isIndexing: indexingQueue.current.size > 0, indexingProgress }}>
            {children}
        </SearchContext.Provider>
    );
}
