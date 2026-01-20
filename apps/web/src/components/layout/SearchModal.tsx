import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { useChats } from '@/hooks/queries/useChats';
import { useE2EE } from '@/providers/E2EEProvider';
import { decryptChatTitle } from '@onera/crypto';
import { groupByDate, type DateGroup, DATE_GROUP_LABELS } from '@/lib/dateGrouping';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Search, X, MessageSquare, ArrowRight, Sparkles } from 'lucide-react';

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
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString(undefined, { weekday: 'long' });
  } else {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const navigate = useNavigate();
  const { isUnlocked } = useE2EE();
  const rawChats = useChats();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      // Focus input when modal opens
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setSearchQuery('');
      setSelectedChatId(null);
    }
  }, [open]);

  // Decrypt chat titles
  const chats = useMemo((): ChatWithTitle[] => {
    if (!rawChats) return [];

    return rawChats.map((chat) => {
      if (isUnlocked && chat.encryptedChatKey && chat.chatKeyNonce && chat.encryptedTitle && chat.titleNonce) {
        try {
          const title = decryptChatTitle(
            chat.id,
            chat.encryptedChatKey,
            chat.chatKeyNonce,
            chat.encryptedTitle,
            chat.titleNonce
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
            decryptedTitle: 'Encrypted',
            isLocked: true,
          };
        }
      }
      return {
        id: chat.id,
        updatedAt: chat.updatedAt,
        decryptedTitle: 'Encrypted',
        isLocked: !isUnlocked,
      };
    });
  }, [rawChats, isUnlocked]);

  // Filter chats by search query
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    const query = searchQuery.toLowerCase();
    return chats.filter((chat) =>
      chat.decryptedTitle.toLowerCase().includes(query)
    );
  }, [chats, searchQuery]);

  // Group filtered chats by date
  const groupedChats = useMemo(() => {
    return groupByDate(filteredChats);
  }, [filteredChats]);

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
  };

  const handleOpenChat = (chatId: string) => {
    navigate({ to: '/app/c/$chatId', params: { chatId } });
    onOpenChange(false);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && selectedChatId) {
        handleOpenChat(selectedChatId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, selectedChatId]);

  const selectedChat = chats.find(c => c.id === selectedChatId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[600px] p-0 overflow-hidden" hideCloseButton>
        <div className="flex h-full">
          {/* Left Panel - Search & Results */}
          <div className="flex-1 flex flex-col border-r border-neutral-800/50">
            {/* Search Input */}
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-12 pr-12 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-[15px] placeholder:text-neutral-500 focus:outline-none focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg text-neutral-500 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Search Hints */}
            {!searchQuery && (
              <div className="px-4 pb-4">
                <div className="p-3 rounded-xl bg-neutral-900/50 border border-neutral-800/50">
                  <div className="text-xs font-medium text-neutral-400 mb-2">Quick filters</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSearchQuery('pinned:')}
                      className="px-3 py-1.5 rounded-lg bg-neutral-800 text-xs text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors"
                    >
                      pinned:
                    </button>
                    <button
                      onClick={() => setSearchQuery('folder:')}
                      className="px-3 py-1.5 rounded-lg bg-neutral-800 text-xs text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors"
                    >
                      folder:
                    </button>
                    <button
                      onClick={() => setSearchQuery('tag:')}
                      className="px-3 py-1.5 rounded-lg bg-neutral-800 text-xs text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors"
                    >
                      tag:
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Results List */}
            <div className="flex-1 overflow-y-auto px-3">
              {filteredChats.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-neutral-500 pb-20">
                  <div className="w-16 h-16 rounded-2xl bg-neutral-900 flex items-center justify-center mb-4">
                    <MessageSquare className="h-8 w-8 text-neutral-600" />
                  </div>
                  <p className="text-sm font-medium text-neutral-400 mb-1">
                    {searchQuery ? 'No results found' : 'No conversations yet'}
                  </p>
                  <p className="text-xs text-neutral-600">
                    {searchQuery ? `Try a different search term` : 'Start a new chat to begin'}
                  </p>
                </div>
              ) : (
                <div className="py-1 space-y-4">
                  {Array.from(groupedChats.entries()).map(([group, groupChats]) => (
                    <div key={group}>
                      <div className="px-3 py-2 text-xs font-medium text-neutral-500">
                        {DATE_GROUP_LABELS[group as DateGroup]}
                      </div>
                      <div className="space-y-0.5">
                        {groupChats.map((chat) => (
                          <button
                            key={chat.id}
                            onClick={() => handleSelectChat(chat.id)}
                            onDoubleClick={() => handleOpenChat(chat.id)}
                            className={cn(
                              'w-full flex items-center gap-3 px-3 h-10 rounded-xl text-left transition-all duration-150',
                              selectedChatId === chat.id
                                ? 'bg-neutral-800 text-white'
                                : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                            )}
                          >
                            <span className="flex-1 truncate text-sm">{chat.decryptedTitle}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-3 border-t border-neutral-800/50">
              <div className="flex items-center gap-4 text-xs text-neutral-500">
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono text-[10px]">↵</kbd>
                  <span>open</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono text-[10px]">esc</kbd>
                  <span>close</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="w-80 flex flex-col bg-neutral-900/30">
            {selectedChat ? (
              <div className="flex-1 flex flex-col p-5">
                {/* Chat icon */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/20 flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-violet-400" />
                </div>

                {/* Title */}
                <h3 className="text-lg font-medium text-white mb-2 line-clamp-2">
                  {selectedChat.decryptedTitle}
                </h3>

                {/* Date */}
                <p className="text-sm text-neutral-500 mb-6">
                  {formatDate(selectedChat.updatedAt)}
                </p>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Open button */}
                <button
                  onClick={() => handleOpenChat(selectedChat.id)}
                  className="flex items-center justify-center gap-2 w-full h-11 bg-white text-black rounded-xl text-sm font-medium hover:bg-neutral-200 transition-colors group"
                >
                  <span>Open conversation</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <div className="w-16 h-16 rounded-2xl bg-neutral-800/50 flex items-center justify-center mb-4">
                  <Search className="h-7 w-7 text-neutral-600" />
                </div>
                <p className="text-sm text-neutral-500">
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
