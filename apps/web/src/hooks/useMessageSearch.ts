import { useState, useCallback } from "react";
import { searchService } from "@/services/search";
import type { ChatMessage } from "@onera/types";

export interface MessageSearchResult {
    id: string;
    chatId: string;
    content: string;
    role: string; // 'user' | 'assistant'
    createdAt: number;
}

export function useMessageSearch() {
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState<MessageSearchResult[]>([]);
    const [error, setError] = useState<Error | null>(null);

    const search = useCallback(async (query: string) => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        setIsSearching(true);
        setError(null);

        try {
            console.log(`[useMessageSearch] Searching for: "${query}"`);
            const searchResults = await searchService.search(query);
            console.log(`[useMessageSearch] Found ${searchResults.count} results`);

            const hits = searchResults.hits.map((hit) => ({
                id: hit.document.id as string,
                chatId: hit.document.chatId as string,
                content: hit.document.content as string,
                role: hit.document.role as string,
                createdAt: hit.document.createdAt as number,
            }));

            setResults(hits);
        } catch (err) {
            console.error("[useMessageSearch] Search failed:", err);
            setError(err instanceof Error ? err : new Error("Search failed"));
            setResults([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    const indexChat = useCallback(async (chatId: string, messages: ChatMessage[]) => {
        try {
            await searchService.indexChatMessages(chatId, messages);
        } catch (err) {
            console.warn("Indexing failed for chat", chatId, err);
        }
    }, []);

    return {
        search,
        results,
        isSearching,
        error,
        indexChat
    };
}
