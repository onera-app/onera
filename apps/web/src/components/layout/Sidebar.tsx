import { Link, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/stores/uiStore';
import { useE2EE } from '@/providers/E2EEProvider';
import { useChats, useDeleteChat, useUpdateChat } from '@/hooks/queries/useChats';
import { useFolders, useCreateFolder, useUpdateFolder, useDeleteFolder } from '@/hooks/queries/useFolders';
import { decryptChatTitle } from '@onera/crypto';
import { cn } from '@/lib/utils';
import { groupByDate, type DateGroup, DATE_GROUP_LABELS } from '@/lib/dateGrouping';
import { ChatItem } from './ChatItem';
import { FolderItem } from './FolderItem';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  PanelLeftClose,
  Plus,
  Search,
  FileText,
  Settings,
  Lock,
  LogOut,
  MessageSquare,
  FolderPlus,
  X,
  ChevronRight,
  Shield,
  ShieldOff,
} from 'lucide-react';

interface ChatWithTitle {
  id: string;
  encryptedChatKey?: string;
  chatKeyNonce?: string;
  encryptedTitle?: string;
  titleNonce?: string;
  updatedAt: number;
  decryptedTitle: string;
  isLocked?: boolean;
  folderId?: string | null;
}

interface FolderWithState {
  id: string;
  name: string;
  isNew?: boolean;
}

export function Sidebar() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { sidebarOpen, sidebarWidth, toggleSidebar, sidebarSearchQuery, setSidebarSearchQuery, openSettingsModal } = useUIStore();
  const { isUnlocked, lock } = useE2EE();

  // Fetch chats and folders
  const rawChats = useChats();
  const deleteChat = useDeleteChat();
  const updateChat = useUpdateChat();
  const { data: folders = [] } = useFolders();
  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();

  // Track expanded folders and new folder IDs
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [newFolderIds, setNewFolderIds] = useState<Set<string>>(new Set());
  const [showSearch, setShowSearch] = useState(false);

  // Decrypt chat titles when unlocked
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
            encryptedChatKey: chat.encryptedChatKey,
            chatKeyNonce: chat.chatKeyNonce,
            encryptedTitle: chat.encryptedTitle,
            titleNonce: chat.titleNonce,
            updatedAt: chat.updatedAt,
            decryptedTitle: title,
            isLocked: false,
            folderId: chat.folderId,
          };
        } catch {
          return {
            id: chat.id,
            updatedAt: chat.updatedAt,
            decryptedTitle: 'Encrypted',
            isLocked: true,
            folderId: chat.folderId,
          };
        }
      }
      return {
        id: chat.id,
        updatedAt: chat.updatedAt,
        decryptedTitle: 'Encrypted',
        isLocked: !isUnlocked,
        folderId: chat.folderId,
      };
    });
  }, [rawChats, isUnlocked]);

  // Filter by search query
  const filteredChats = useMemo(() => {
    if (!sidebarSearchQuery.trim()) return chats;
    const query = sidebarSearchQuery.toLowerCase();
    return chats.filter((chat) =>
      chat.decryptedTitle.toLowerCase().includes(query)
    );
  }, [chats, sidebarSearchQuery]);

  // Get unfiled chats (not in any folder)
  const unfiledChats = useMemo(() => {
    return filteredChats.filter((chat) => !chat.folderId);
  }, [filteredChats]);

  // Group unfiled chats by date
  const groupedChats = useMemo(() => {
    return groupByDate(unfiledChats);
  }, [unfiledChats]);

  // Group chats by folder
  const chatsByFolder = useMemo(() => {
    const byFolder = new Map<string, ChatWithTitle[]>();
    folders.forEach((folder) => {
      byFolder.set(folder.id, []);
    });
    filteredChats.forEach((chat) => {
      if (chat.folderId) {
        const existing = byFolder.get(chat.folderId) || [];
        existing.push(chat);
        byFolder.set(chat.folderId, existing);
      }
    });
    return byFolder;
  }, [filteredChats, folders]);

  // Folders with new state
  const foldersWithState = useMemo((): FolderWithState[] => {
    return folders.map((f) => ({
      id: f.id,
      name: f.name,
      isNew: newFolderIds.has(f.id),
    }));
  }, [folders, newFolderIds]);

  // Toggle folder expansion
  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const isLoading = rawChats === undefined;

  const handleNewChat = () => {
    navigate({ to: '/app' });
  };

  const handleLogout = async () => {
    lock();
    await signOut();
    navigate({ to: '/auth' });
  };

  const handleDeleteChat = async (chatId: string) => {
    await deleteChat.mutateAsync(chatId);
  };

  const handleSearchToggle = () => {
    if (showSearch) {
      setSidebarSearchQuery('');
    }
    setShowSearch(!showSearch);
  };

  // Folder actions
  const handleNewFolder = async () => {
    try {
      const folder = await createFolder.mutateAsync({ name: 'New Folder' });
      setNewFolderIds((prev) => new Set(prev).add(folder.id));
      setExpandedFolders((prev) => new Set(prev).add(folder.id));
    } catch {
      toast.error('Failed to create folder');
    }
  };

  const handleRenameFolder = async (folderId: string, newName: string) => {
    try {
      await updateFolder.mutateAsync({ id: folderId, data: { name: newName } });
      setNewFolderIds((prev) => {
        const next = new Set(prev);
        next.delete(folderId);
        return next;
      });
    } catch {
      toast.error('Failed to rename folder');
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      await deleteFolder.mutateAsync(folderId);
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        next.delete(folderId);
        return next;
      });
      setNewFolderIds((prev) => {
        const next = new Set(prev);
        next.delete(folderId);
        return next;
      });
    } catch {
      toast.error('Failed to delete folder');
    }
  };

  const handleMoveChatToFolder = async (folderId: string, chatId: string) => {
    try {
      await updateChat.mutateAsync({
        id: chatId,
        data: { folderId },
      });
      toast.success('Chat moved to folder');
    } catch {
      toast.error('Failed to move chat');
    }
  };

  const handleRemoveChatFromFolder = async (chatId: string) => {
    try {
      await updateChat.mutateAsync({
        id: chatId,
        data: { folderId: null },
      });
    } catch {
      toast.error('Failed to remove from folder');
    }
  };

  return (
    <TooltipProvider delayDuration={300}>

      <nav
        id="sidebar"
        className={cn(
          'relative flex flex-col h-full transition-all duration-300 ease-out flex-shrink-0 z-20',
          sidebarOpen ? 'w-[280px] min-w-[280px]' : 'w-0 min-w-0 overflow-hidden'
        )}
        style={{
          width: sidebarOpen ? `${sidebarWidth}px` : 0,
          minWidth: sidebarOpen ? `${sidebarWidth}px` : 0,
        }}
      >
        {/* Glass Background Layer */}
        <div className="absolute inset-0 bg-sidebar-background/60 backdrop-blur-xl border-r border-white/5 shadow-2xl z-0" />

        {/* Content Layer */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <header className="flex items-center justify-between px-4 py-4 h-16">
            <Link
              to="/app"
              className="flex items-center gap-3 group"
            >
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-lg shadow-primary/20 ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
                <span className="text-base font-bold text-white tracking-tighter">O</span>
              </div>
              <span className="font-bold text-lg text-sidebar-foreground tracking-tight group-hover:text-primary transition-colors">
                Onera
              </span>
            </Link>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleSidebar}
                  className="p-2 rounded-lg text-muted-foreground/70 hover:text-sidebar-foreground hover:bg-white/5 transition-all duration-200"
                >
                  <PanelLeftClose className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs font-medium">Close sidebar</TooltipContent>
            </Tooltip>
          </header>

          {/* New Chat Button */}
          <div className="px-4 pb-4">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 border border-primary/10 hover:border-primary/20 text-sidebar-foreground transition-all duration-300 group shadow-sm hover:shadow-md hover:shadow-primary/5"
            >
              <div className="p-1.5 rounded-lg bg-primary/20 text-primary group-hover:scale-110 transition-transform duration-300">
                <Plus className="h-4 w-4 stroke-[3]" />
              </div>
              <span className="text-sm font-semibold tracking-wide">New Chat</span>
            </button>
          </div>

          {/* Action Bar */}
          <div className="px-4 pb-4">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-black/20 border border-white/5 backdrop-blur-sm">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleSearchToggle}
                    className={cn(
                      "flex-1 flex items-center justify-center p-2 rounded-lg transition-all duration-200",
                      showSearch
                        ? "bg-white/10 text-sidebar-foreground shadow-sm ring-1 ring-white/5"
                        : "text-muted-foreground hover:text-sidebar-foreground hover:bg-white/5"
                    )}
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Search</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleNewFolder}
                    className="flex-1 flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:text-sidebar-foreground hover:bg-white/5 transition-all duration-200"
                  >
                    <FolderPlus className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">New Folder</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/app/notes"
                    className="flex-1 flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:text-sidebar-foreground hover:bg-white/5 transition-all duration-200"
                  >
                    <FileText className="h-4 w-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Notes</TooltipContent>
              </Tooltip>
            </div>

            {/* Search Input */}
            {showSearch && (
              <div className="relative mt-3 animate-in fade-in slide-down duration-300">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={sidebarSearchQuery}
                  onChange={(e) => setSidebarSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full h-10 pl-9 pr-9 rounded-xl bg-black/20 border border-white/10 text-sm text-sidebar-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
                />
                {sidebarSearchQuery && (
                  <button
                    onClick={() => setSidebarSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-sidebar-foreground hover:bg-white/10 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* Chat List */}
          <ScrollArea className="flex-1 px-3">
            <div className="py-3">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full border-2 border-primary/20" />
                    <div className="absolute inset-0 w-10 h-10 rounded-full border-2 border-transparent border-t-primary animate-spin" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Loading chats...</span>
                </div>
              ) : filteredChats.length === 0 && foldersWithState.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                  {sidebarSearchQuery ? (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4 ring-1 ring-white/10">
                        <Search className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-semibold text-sidebar-foreground mb-1">No results found</p>
                      <p className="text-xs text-muted-foreground max-w-[12rem] mx-auto leading-relaxed">
                        We couldn't find any chats matching "{sidebarSearchQuery}"
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-purple-500/10 flex items-center justify-center mb-4 ring-1 ring-white/10">
                        <MessageSquare className="w-6 h-6 text-primary/80" />
                      </div>
                      <p className="text-sm font-semibold text-sidebar-foreground mb-1">No conversations yet</p>
                      <p className="text-xs text-muted-foreground max-w-[12rem] mx-auto leading-relaxed">
                        Start a new chat to begin your journey with Onera
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {/* Folders */}
                  {foldersWithState.length > 0 && (
                    <div className="mb-4 space-y-1">
                      {foldersWithState.map((folder) => {
                        const folderChats = chatsByFolder.get(folder.id) || [];
                        const isExpanded = expandedFolders.has(folder.id);

                        return (
                          <FolderItem
                            key={folder.id}
                            id={folder.id}
                            name={folder.name}
                            chatCount={folderChats.length}
                            isExpanded={isExpanded}
                            isNew={folder.isNew}
                            onToggle={() => toggleFolder(folder.id)}
                            onRename={handleRenameFolder}
                            onDelete={handleDeleteFolder}
                            onDrop={handleMoveChatToFolder}
                          >
                            {folderChats.length === 0 ? (
                              <div className="py-4 px-2 text-center border-l border-white/5 ml-3">
                                <p className="text-xs font-medium text-muted-foreground/60 italic">Drop chats here...</p>
                              </div>
                            ) : (
                              <div className="space-y-0.5 border-l border-white/5 ml-3 pl-1 my-1">
                                {folderChats.map((chat) => (
                                  <ChatItem
                                    key={chat.id}
                                    id={chat.id}
                                    title={chat.decryptedTitle}
                                    updatedAt={chat.updatedAt}
                                    isLocked={chat.isLocked}
                                    onDelete={handleDeleteChat}
                                    onRemoveFromFolder={() => handleRemoveChatFromFolder(chat.id)}
                                  />
                                ))}
                              </div>
                            )}
                          </FolderItem>
                        );
                      })}
                    </div>
                  )}

                  {/* Date-grouped Chats */}
                  {Array.from(groupedChats.entries()).map(([group, groupChats]) => (
                    <div key={group} className="mb-4 last:mb-0">
                      <div className="flex items-center gap-3 px-3 py-2 sticky top-0 bg-sidebar-background/40 backdrop-blur-md z-10 -mx-1 rounded-lg mb-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                          {DATE_GROUP_LABELS[group as DateGroup]}
                        </span>
                        <div className="flex-1 h-px bg-white/5" />
                      </div>
                      <div className="space-y-0.5">
                        {groupChats.map((chat) => (
                          <ChatItem
                            key={chat.id}
                            id={chat.id}
                            title={chat.decryptedTitle}
                            updatedAt={chat.updatedAt}
                            isLocked={chat.isLocked}
                            onDelete={handleDeleteChat}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* User Section */}
          <div className="relative mt-auto">
            <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <div className="flex items-center gap-1.5 p-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 flex-1 p-2.5 rounded-xl hover:bg-white/5 transition-all duration-200 text-left group outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
                    <div className="relative">
                      <Avatar className="h-9 w-9 ring-2 ring-white/10 transition-all group-hover:ring-primary/40">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-indigo-600 text-white text-sm font-bold">
                          {user?.name?.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={cn(
                          'absolute -bottom-0.5 -right-0.5 w-[11px] h-[11px] rounded-full border-2 border-[#121212] transition-colors shadow-sm',
                          isUnlocked
                            ? 'bg-emerald-500'
                            : 'bg-amber-500 animate-pulse'
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-sidebar-foreground truncate group-hover:text-primary transition-colors">
                        {user?.name || 'User'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {isUnlocked ? (
                          <Shield className="w-3 h-3 text-emerald-500/80" />
                        ) : (
                          <ShieldOff className="w-3 h-3 text-amber-500/80" />
                        )}
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                          {isUnlocked ? 'Encrypted' : 'Locked'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top" className="w-60 mb-2 p-1.5 bg-[#1a1a1a]/95 backdrop-blur-xl border-white/10 shadow-2xl rounded-xl">
                  {isUnlocked && (
                    <DropdownMenuItem onClick={lock} className="gap-2.5 p-2.5 rounded-lg focus:bg-white/10 cursor-pointer">
                      <Lock className="h-4 w-4 text-amber-500" />
                      <span className="font-medium">Lock encryption</span>
                    </DropdownMenuItem>
                  )}
                  {isUnlocked && <DropdownMenuSeparator className="bg-white/5 my-1" />}
                  <DropdownMenuItem onClick={handleLogout} className="gap-2.5 p-2.5 rounded-lg focus:bg-red-500/10 text-red-400 focus:text-red-400 cursor-pointer">
                    <LogOut className="h-4 w-4" />
                    <span className="font-medium">Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => openSettingsModal()}
                    className="p-2.5 rounded-xl text-muted-foreground/70 hover:text-sidebar-foreground hover:bg-white/5 transition-all duration-200"
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">Settings</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </nav>
    </TooltipProvider>
  );
}
