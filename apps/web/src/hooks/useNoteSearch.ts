import { useState, useCallback } from "react";
import { searchService } from "@/services/search";

export interface NoteSearchResult {
    id: string;
    title: string;
    content: string;
    createdAt: number;
}

export function useNoteSearch() {
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState<NoteSearchResult[]>([]);
    const [error, setError] = useState<Error | null>(null);

    const search = useCallback(async (query: string) => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        setIsSearching(true);
        setError(null);

        try {
            const searchResults = await searchService.searchNotes(query);

            const hits = searchResults.hits.map((hit) => ({
                id: hit.document.id as string,
                title: hit.document.title as string,
                content: hit.document.content as string,
                createdAt: hit.document.createdAt as number,
            }));

            setResults(hits);
        } catch (err) {
            console.error("[useNoteSearch] Search failed:", err);
            setError(err instanceof Error ? err : new Error("Search failed"));
            setResults([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    return {
        search,
        results,
        isSearching,
        error,
    };
}
