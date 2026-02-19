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
    type TypedDocument,
    type RawData
} from "@orama/orama";

import { type ChatMessage } from "@onera/types";
import { encryptJSON, decryptJSON, type EncryptedData } from "@onera/crypto";

// Define the schema for our search index
// We index individual messages, not entire chats
export const messageSchema = {
    id: "string",
    chatId: "string",
    content: "string", // Decrypted text content
    role: "string", // 'user' | 'assistant'
    createdAt: "number",
} as const;

// Define schema for notes
export const noteSchema = {
    id: "string",
    title: "string",
    content: "string",
    createdAt: "number",
} as const;

type MessageDocument = TypedDocument<Orama<typeof messageSchema>>;
type NoteDocument = TypedDocument<Orama<typeof noteSchema>>;

export class SearchService {
    private static instance: SearchService;
    private db: Orama<typeof messageSchema> | null = null;
    private notesDb: Orama<typeof noteSchema> | null = null;
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
                const encryptedData = await this.loadFromIDB("main-index");
                const encryptedNotesData = await this.loadFromIDB("notes-index");

                if (encryptedData) {
                    try {
                        const decrypted = await decryptJSON(encryptedData, key);
                        if (decrypted) {
                            this.db = await create({ schema: messageSchema });
                            oramaLoad(this.db, decrypted as RawData);
                        }
                    } catch (e) {
                        console.warn("Failed to decrypt message index, creating new:", e);
                        this.db = await create({ schema: messageSchema });
                    }
                } else {
                    this.db = await create({ schema: messageSchema });
                }

                if (encryptedNotesData) {
                    try {
                        const decrypted = await decryptJSON(encryptedNotesData, key);
                        if (decrypted) {
                            this.notesDb = await create({ schema: noteSchema });
                            oramaLoad(this.notesDb, decrypted as RawData);
                        }
                    } catch (e) {
                        console.warn("Failed to decrypt notes index, creating new:", e);
                        this.notesDb = await create({ schema: noteSchema });
                    }
                } else {
                    this.notesDb = await create({ schema: noteSchema });
                }
            } catch (e) {
                console.warn("Failed to restore indices, creating new:", e);
                this.db = await create({ schema: messageSchema });
                this.notesDb = await create({ schema: noteSchema });
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
        // Limit is well above any realistic single-chat message count
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

    /**
     * Index a single note
     */
    public async indexNote(id: string, title: string, content: string, createdAt: number) {
        if (!this.notesDb || !this.encryptionKey) return;

        // Strip HTML if content is HTML
        const doc: NoteDocument = {
            id,
            title,
            content: content.replace(/<[^>]*>?/gm, ""),
            createdAt,
        } as NoteDocument;

        // Remove existing note before re-inserting
        await removeMultiple(this.notesDb, [id]);

        // Insert
        await insertMultiple(this.notesDb, [doc]);
        await this.saveNotes();

        if (this.indexingProgressCallback) {
            const stats = await this.getIndexStats();
            this.indexingProgressCallback(`Indexed ${stats.count} messages, ${stats.notesCount} notes`);
        }
    }

    public async getIndexStats() {
        if (!this.db || !this.notesDb) return { count: 0, notesCount: 0 };
        return {
            count: await count(this.db),
            notesCount: await count(this.notesDb)
        };
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
     * Search for notes
     */
    public async searchNotes(
        query: string,
        params?: Partial<SearchParams<Orama<typeof noteSchema>>>
    ): Promise<Results<NoteDocument>> {
        if (!this.notesDb) {
            return {
                count: 0,
                hits: [],
                elapsed: { raw: 0, formatted: "0ms" },
            };
        }

        return search(this.notesDb, {
            term: query,
            properties: ["title", "content"],
            threshold: 0.2,
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
            await this.saveToIDB(encrypted, "main-index");
        } catch (e) {
            console.warn("Failed to persist search index", e);
        }
    }

    private async saveNotes() {
        if (!this.notesDb || !this.encryptionKey) return;
        try {
            const snapshot = oramaSave(this.notesDb);
            const encrypted = await encryptJSON(snapshot, this.encryptionKey);
            await this.saveToIDB(encrypted, "notes-index");
        } catch (e) {
            console.warn("Failed to persist notes search index", e);
        }
    }

    // Simple IDB helpers
    private idbInstance: IDBDatabase | null = null;

    private async getIDB(): Promise<IDBDatabase> {
        if (this.idbInstance) return this.idbInstance;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open("onera-search-db", 1);
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains("index")) {
                    db.createObjectStore("index");
                }
            };
            request.onsuccess = () => {
                this.idbInstance = request.result;
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });
    }

    private async saveToIDB(data: EncryptedData, key: string): Promise<void> {
        const db = await this.getIDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction("index", "readwrite");
            const store = tx.objectStore("index");
            const request = store.put(data, key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    private async loadFromIDB(key: string): Promise<EncryptedData | undefined> {
        const db = await this.getIDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction("index", "readonly");
            const store = tx.objectStore("index");
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear the index (useful for logout)
     */
    public clear() {
        this.db = null;
        this.notesDb = null;
        this.isInitialized = false;
        this.initPromise = null;
        this.encryptionKey = null;
        if (this.idbInstance) {
            this.idbInstance.close();
            this.idbInstance = null;
        }
        // Delete encrypted index data from IDB
        const request = indexedDB.open("onera-search-db", 1);
        request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction("index", "readwrite");
            tx.objectStore("index").delete("main-index");
            tx.objectStore("index").delete("notes-index");
            tx.oncomplete = () => db.close();
        };
    }
}

export const searchService = SearchService.getInstance();
