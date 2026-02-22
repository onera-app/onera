import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, Message01Icon, Cancel01Icon, StickyNote01Icon } from "@hugeicons/core-free-icons";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useChats } from "@/hooks/queries/useChats";
import { useE2EE } from "@/providers/E2EEProvider";
import { useMessageSearch } from "@/hooks/useMessageSearch";
import { useNoteSearch } from "@/hooks/useNoteSearch";
import { useUIStore } from "@/stores/uiStore";
import { useSearchContext } from "@/components/providers/SearchProvider";
import { decryptChatTitle } from "@onera/crypto";
import {
  groupByDate,
  type DateGroup,
  DATE_GROUP_LABELS,
} from "@/lib/dateGrouping";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChatWithTitle {
  id: string;
  encryptedChatKey?: string;
  chatKeyNonce?: string;
  encryptedTitle?: string;
  titleNonce?: string;
  updatedAt: number;
  decryptedTitle: string;
  isLocked?: boolean;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return date.toLocaleDateString(undefined, { weekday: "long" });
  } else {
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
}

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const navigate = useNavigate();
  const { isUnlocked } = useE2EE();
  const rawChats = useChats();
  const inputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const { indexingProgress } = useSearchContext();


  // Search Hooks
  const { search: searchMessages, results: messageResults, isSearching: isSearchingMessages } = useMessageSearch();
  const { search: searchNotes, results: noteResults, isSearching: isSearchingNotes } = useNoteSearch();

  const isSearching = isSearchingMessages || isSearchingNotes;

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      // Focus input when modal opens
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setSearchQuery("");
      setSelectedChatId(null);
    }
  }, [open]);

  // Decrypt chat titles
  const chats = useMemo((): ChatWithTitle[] => {
    if (!rawChats) return [];

    return rawChats.map((chat) => {
      if (
        isUnlocked &&
        chat.encryptedChatKey &&
        chat.chatKeyNonce &&
        chat.encryptedTitle &&
        chat.titleNonce
      ) {
        try {
          const title = decryptChatTitle(
            chat.id,
            chat.encryptedChatKey,
            chat.chatKeyNonce,
            chat.encryptedTitle,
            chat.titleNonce,
          );
          return {
            id: chat.id,
            updatedAt: chat.updatedAt,
            decryptedTitle: title,
            isLocked: false,
          };
        } catch {
          return {
            id: chat.id,
            updatedAt: chat.updatedAt,
            decryptedTitle: "Encrypted",
            isLocked: true,
          };
        }
      }
      return {
        id: chat.id,
        updatedAt: chat.updatedAt,
        decryptedTitle: "Encrypted",
        isLocked: !isUnlocked,
      };
    });
  }, [rawChats, isUnlocked]);

  // Filter chats by search query
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    const query = searchQuery.toLowerCase();
    return chats.filter((chat) =>
      chat.decryptedTitle.toLowerCase().includes(query),
    );
  }, [chats, searchQuery]);

  // Trigger effect for search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchMessages(searchQuery);
        searchNotes(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchMessages, searchNotes]);

  // Group filtered chats by date
  const groupedChats = useMemo(() => {
    return groupByDate(filteredChats);
  }, [filteredChats]);

  const { setSidebarOpen } = useUIStore();

  const handleOpenChat = useCallback((chatId: string, messageId?: string) => {
    navigate({
      to: "/app/c/$chatId",
      params: { chatId },
      search: { pending: false, messageId },
    });
    onOpenChange(false);

    // Close sidebar on mobile
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [navigate, onOpenChange, setSidebarOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && selectedChatId) {
        handleOpenChat(selectedChatId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleOpenChat, open, selectedChatId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl w-full sm:w-[calc(100vw-2rem)] h-[95dvh] sm:h-[600px] p-0 overflow-hidden rounded-t-[2rem] sm:rounded-[2rem] bg-white dark:bg-[#171717] border-0 sm:border border-gray-200 dark:border-gray-800 shadow-2xl"
        hideCloseButton
      >
        <div className="flex flex-col h-full">
          {/* Header Area */}
          <div className="pt-8 sm:pt-4 px-4 pb-2">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 group">
                <HugeiconsIcon
                  icon={Search01Icon}
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-primary transition-colors"
                />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 pl-11 pr-11 rounded-2xl bg-gray-100/80 dark:bg-gray-900/80 border-0 focus:ring-2 focus:ring-primary/20 text-gray-900 dark:text-gray-100 text-[1rem] placeholder:text-gray-500 transition-all font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
                  </button>
                )}
              </div>

              <button
                onClick={() => onOpenChange(false)}
                className="text-primary hover:text-primary/80 font-semibold text-[0.9375rem] px-1 sm:hidden transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Search Hints */}
          {!searchQuery && (
            <div className="px-4 pb-2">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                <span className="text-[11px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-wider mr-1 whitespace-nowrap">
                  Filters:
                </span>
                {[
                  { id: "pinned:", label: "Pinned" },
                  { id: "folder:", label: "Folder" },
                  { id: "tag:", label: "Tag" }
                ].map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setSearchQuery(filter.id)}
                    className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-900 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 border border-gray-200/50 dark:border-gray-800/50 transition-all whitespace-nowrap"
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results List */}
          <div className="flex-1 overflow-y-auto px-2 sm:px-3 no-scrollbar">
            {filteredChats.length === 0 && messageResults.length === 0 && noteResults.length === 0 && !isSearching ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 pb-20">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center mb-5 border border-gray-100 dark:border-gray-800/50 shadow-sm">
                  <HugeiconsIcon icon={Message01Icon} className="h-7 w-7 text-gray-400 dark:text-gray-600" />
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                  {searchQuery ? "No results found" : "No conversations yet"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {searchQuery
                    ? `Try a different search term`
                    : "Start a new chat to begin"}
                </p>
              </div>
            ) : (
              <div className="py-1 space-y-4">
                {/* Note Results */}
                {noteResults.length > 0 && (
                  <div>
                    <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                      Notes
                    </div>
                    <div className="space-y-0.5">
                      {noteResults.map((note) => (
                        <button
                          key={note.id}
                          onClick={() => {
                            navigate({
                              to: "/app/notes",
                              search: { noteId: note.id },
                            });
                            onOpenChange(false);
                          }}
                          className="w-full flex flex-col gap-1 px-3 py-2 rounded-xl text-left transition-all duration-150 hover:bg-gray-100 dark:hover:bg-gray-850"
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate flex items-center gap-2">
                              <HugeiconsIcon icon={StickyNote01Icon} className="h-3 w-3" />
                              {note.title}
                            </span>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">
                              {formatDate(note.createdAt)}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 break-words">
                            {note.content}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message Results */}
                {messageResults.length > 0 && (
                  <div>
                    <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                      Messages
                    </div>
                    <div className="space-y-0.5">
                      {messageResults.map((msg) => {
                        const chat = chats.find(c => c.id === msg.chatId);
                        return (
                          <button
                            key={msg.id}
                            onClick={() => handleOpenChat(msg.chatId, msg.id)}
                            className="w-full flex flex-col gap-1 px-3 py-2 rounded-xl text-left transition-all duration-150 hover:bg-gray-100 dark:hover:bg-gray-850"
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                                {chat?.decryptedTitle || "Unknown Chat"}
                              </span>
                              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                {formatDate(msg.createdAt)}
                              </span>
                            </div>
                            <span className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 break-words">
                              {msg.content}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Chat Results */}
                {Array.from(groupedChats.entries()).map(
                  ([group, groupChats]) => (
                    <div key={group}>
                      <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                        {DATE_GROUP_LABELS[group as DateGroup]}
                      </div>
                      <div className="space-y-1">
                        {groupChats.map((chat) => (
                          <button
                            key={chat.id}
                            onClick={() => handleOpenChat(chat.id)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 h-12 rounded-xl text-left transition-all duration-150 border",
                              selectedChatId === chat.id
                                ? "bg-primary/5 dark:bg-primary/10 border-primary/20 text-gray-900 dark:text-gray-100"
                                : "bg-transparent border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/50 hover:text-gray-900 dark:hover:text-white hover:border-gray-100 dark:hover:border-gray-800",
                            )}
                          >
                            <HugeiconsIcon icon={Message01Icon} className="h-4.5 w-4.5 opacity-50 shrink-0" />
                            <span className="flex-1 truncate text-[0.9375rem] font-medium">
                              {chat.decryptedTitle}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className={cn(
            "px-4 py-3 border-t border-gray-100 dark:border-gray-850 flex items-center justify-between",
            !indexingProgress && "hidden sm:flex"
          )}>
            <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-850 text-gray-500 dark:text-gray-400 font-mono text-xs">
                  ↵
                </kbd>
                <span>open</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-850 text-gray-500 dark:text-gray-400 font-mono text-xs">
                  esc
                </kbd>
                <span>close</span>
              </div>
            </div>

            {indexingProgress && (
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 animate-pulse">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span>{indexingProgress}</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
