import {
    create,
    insertMultiple,
    removeMultiple,
    search,
    count,
    save as oramaSave,
    load as oramaLoad,
    type Orama,
    type Results,
    type SearchParams,
    type TypedDocument
} from "@orama/orama";

import { type ChatMessage } from "@onera/types";
import { encryptJSON, decryptJSON } from "@onera/crypto";

// Define the schema for our search index
// We index individual messages, not entire chats
export const messageSchema = {
    id: "string",
    chatId: "string",
    content: "string", // Decrypted text content
    role: "string", // 'user' | 'assistant'
    createdAt: "number",
} as const;

type MessageDocument = TypedDocument<Orama<typeof messageSchema>>;

export class SearchService {
    private static instance: SearchService;
    private db: Orama<typeof messageSchema> | null = null;
    private isInitialized = false;
    private initPromise: Promise<void> | null = null;
    private encryptionKey: Uint8Array | null = null;
    private indexingProgressCallback: ((progress: string) => void) | null = null;

    private constructor() { }

    public static getInstance(): SearchService {
        if (!SearchService.instance) {
            SearchService.instance = new SearchService();
        }
        return SearchService.instance;
    }

    public setProgressCallback(callback: (progress: string) => void) {
        this.indexingProgressCallback = callback;
    }

    /**
     * Initialize the Orama database
     * Loads from IndexedDB if available, otherwise creates new
     */
    public async init(key: Uint8Array) {
        if (this.isInitialized && this.db) return;
        if (this.initPromise) return this.initPromise;

        this.encryptionKey = key;

        this.initPromise = (async () => {
            try {
                // Try to load encrypted data from IDB
                const encryptedData = await this.loadFromIDB();

                if (encryptedData) {
                    try {
                        const decrypted = await decryptJSON(encryptedData, key);
                        if (decrypted) {
                            this.db = await create({ schema: messageSchema });
                            oramaLoad(this.db, decrypted);
                        }
                    } catch (e) {
                        console.warn("Failed to decrypt index, creating new:", e);
                        this.db = await create({ schema: messageSchema });
                    }
                } else {
                    this.db = await create({ schema: messageSchema });
                }
            } catch (e) {
                console.warn("Failed to restore index, creating new:", e);
                this.db = await create({
                    schema: messageSchema,
                });
            }
            this.isInitialized = true;
        })();

        return this.initPromise;
    }

    /**
     * Index a list of messages for a chat
     */
    public async indexChatMessages(chatId: string, messages: ChatMessage[]) {
        if (!this.db || !this.encryptionKey) return;

        // Filter for text content only
        const docs: MessageDocument[] = [];

        for (const msg of messages) {
            let content = "";

            if (typeof msg.content === "string") {
                content = msg.content;
            } else if (Array.isArray(msg.content)) {
                // Extract text from parts
                content = msg.content
                    .filter((c) => c.type === "text")
                    .map((c) => c.text || "")
                    .join(" ");
            }

            if (content && content.trim()) {
                docs.push({
                    id: msg.id,
                    chatId,
                    content,
                    role: msg.role,
                    createdAt: msg.created_at || Date.now(),
                } as MessageDocument);
            }
        }

        if (docs.length === 0) return;

        // Remove existing messages for this chat before re-inserting
        const existing = await search(this.db, {
            term: "",
            where: { chatId },
            limit: 10000,
        });
        if (existing.hits.length > 0) {
            const idsToRemove = existing.hits.map((h) => h.id);
            await removeMultiple(this.db, idsToRemove);
        }

        // Bulk insert
        await insertMultiple(this.db, docs);
        await this.save();

        if (this.indexingProgressCallback) {
            const stats = await this.getIndexStats();
            this.indexingProgressCallback(`Indexed ${stats.count} messages`);
        }
    }

    public async getIndexStats() {
        if (!this.db) return { count: 0 };
        // @ts-ignore - count is available on the orama instance
        return { count: await count(this.db) };
    }

    public async debugLogAll() {
        // Debugging disabled
    }

    /**
     * Search for messages
     */
    public async search(
        query: string,
        params?: Partial<SearchParams<Orama<typeof messageSchema>>>
    ): Promise<Results<MessageDocument>> {
        if (!this.db) {
            return {
                count: 0,
                hits: [],
                elapsed: { raw: 0, formatted: "0ms" },
            };
        }

        return search(this.db, {
            term: query,
            properties: ["content"], // Only search content
            threshold: 0.2, // 0.2 is a good default for typo tolerance
            limit: 20,
            ...params,
        });
    }

    /**
     * Persist index to IndexedDB
     */
    private async save() {
        if (!this.db || !this.encryptionKey) return;
        try {
            const snapshot = oramaSave(this.db);
            const encrypted = await encryptJSON(snapshot, this.encryptionKey);
            await this.saveToIDB(encrypted);
        } catch (e) {
            console.warn("Failed to persist search index", e);
        }
    }

    // Simple IDB helpers
    private getIDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open("onera-search-db", 1);
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains("index")) {
                    db.createObjectStore("index");
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    private async saveToIDB(data: any): Promise<void> {
        const db = await this.getIDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction("index", "readwrite");
            const store = tx.objectStore("index");
            const request = store.put(data, "main-index");
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    private async loadFromIDB(): Promise<any> {
        const db = await this.getIDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction("index", "readonly");
            const store = tx.objectStore("index");
            const request = store.get("main-index");
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear the index (useful for logout)
     */
    public async clear() {
        this.db = null;
        this.isInitialized = false;
        this.initPromise = null;
        this.encryptionKey = null;
    }
}

export const searchService = SearchService.getInstance();
