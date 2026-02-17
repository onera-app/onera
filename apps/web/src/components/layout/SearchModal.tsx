import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useChats } from "@/hooks/queries/useChats";
import { useE2EE } from "@/providers/E2EEProvider";
import { useMessageSearch } from "@/hooks/useMessageSearch";
import { useUIStore } from "@/stores/uiStore";
import { useSearchContext } from "@/components/providers/SearchProvider";
import { decryptChatTitle } from "@onera/crypto";
import {
  groupByDate,
  type DateGroup,
  DATE_GROUP_LABELS,
} from "@/lib/dateGrouping";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Search, X, MessageSquare, ArrowRight } from "lucide-react";

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


  // Message Search
  const { search: searchMessages, results: messageResults, isSearching } = useMessageSearch();

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

  // Trigger effect for message search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchMessages(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchMessages]);

  // Group filtered chats by date
  const groupedChats = useMemo(() => {
    return groupByDate(filteredChats);
  }, [filteredChats]);

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
  };

  const { setSidebarOpen } = useUIStore();

  const handleOpenChat = useCallback((chatId: string, messageId?: string) => {
    navigate({
      to: "/app/c/$chatId",
      params: { chatId },
      // @ts-ignore - dynamic param
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

  const selectedChat = chats.find((c) => c.id === selectedChatId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl h-[100dvh] md:h-[600px] p-0 overflow-hidden rounded-none md:rounded-[2rem]"
        hideCloseButton
      >
        <div className="flex flex-col md:flex-row h-full">
          {/* Left Panel - Search & Results */}
          <div className="flex-1 flex flex-col border-r-0 md:border-r border-gray-100 dark:border-gray-850">
            {/* Search Input */}
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 dark:text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-12 pr-12 rounded-xl bg-gray-100 dark:bg-gray-850 border border-gray-100 dark:border-gray-850 text-gray-900 dark:text-gray-100 text-base placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-850 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Search Hints */}
            {!searchQuery && (
              <div className="px-4 pb-4">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-850">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Quick filters
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSearchQuery("pinned:")}
                      className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-850 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-850 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                    >
                      pinned:
                    </button>
                    <button
                      onClick={() => setSearchQuery("folder:")}
                      className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-850 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-850 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                    >
                      folder:
                    </button>
                    <button
                      onClick={() => setSearchQuery("tag:")}
                      className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-850 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-850 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                    >
                      tag:
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Results List */}
            <div className="flex-1 overflow-y-auto px-3">
              {filteredChats.length === 0 && messageResults.length === 0 && !isSearching ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 pb-20">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-850 flex items-center justify-center mb-4">
                    <MessageSquare className="h-8 w-8 text-gray-500/60 dark:text-gray-400/60" />
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
                        <div className="space-y-0.5">
                          {groupChats.map((chat) => (
                            <button
                              key={chat.id}
                              onClick={() => handleSelectChat(chat.id)}
                              onDoubleClick={() => handleOpenChat(chat.id)}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 h-10 rounded-xl text-left transition-all duration-150",
                                selectedChatId === chat.id
                                  ? "bg-gray-100 dark:bg-gray-850 text-gray-900 dark:text-gray-100"
                                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-850/50 hover:text-gray-900 dark:hover:text-gray-100",
                              )}
                            >
                              <span className="flex-1 truncate text-sm">
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
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-850 flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
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

          {/* Right Panel - Preview */}
          <div className="hidden md:flex w-80 flex-col bg-gray-50 dark:bg-gray-900">
            {selectedChat ? (
              <div className="flex-1 flex flex-col p-5">
                {/* Chat icon */}
                <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-850/50 border border-gray-100 dark:border-gray-850 flex items-center justify-center mb-4">
                  <MessageSquare className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </div>

                {/* Title */}
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
                  {selectedChat.decryptedTitle}
                </h3>

                {/* Date */}
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  {formatDate(selectedChat.updatedAt)}
                </p>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Open button */}
                <button
                  onClick={() => handleOpenChat(selectedChat.id)}
                  className="flex items-center justify-center gap-2 w-full h-11 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors group"
                >
                  <span>Open conversation</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-850 flex items-center justify-center mb-4">
                  <Search className="h-7 w-7 text-gray-500 dark:text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Select a conversation to preview
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
