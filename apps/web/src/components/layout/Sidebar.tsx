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
          'relative flex flex-col h-full bg-sidebar-background transition-all duration-300 ease-out flex-shrink-0',
          sidebarOpen ? 'border-r border-sidebar-border/60' : 'w-0 min-w-0 overflow-hidden'
        )}
        style={{
          width: sidebarOpen ? `${sidebarWidth}px` : 0,
          minWidth: sidebarOpen ? `${sidebarWidth}px` : 0,
        }}
      >
        {/* Subtle gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-sidebar-accent/20 pointer-events-none" />

        {/* Header */}
        <header className="relative flex items-center justify-between px-3 py-3 h-14">
          <Link
            to="/app"
            className="flex items-center gap-2.5 group"
          >
            <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm transition-transform duration-200 group-hover:scale-105">
              <span className="text-sm font-bold text-primary-foreground tracking-tight">O</span>
            </div>
            <span className="font-semibold text-[15px] text-sidebar-foreground tracking-tight">
              Onera
            </span>
          </Link>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/80 transition-all duration-200"
              >
                <PanelLeftClose className="h-[18px] w-[18px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">Close sidebar</TooltipContent>
          </Tooltip>
        </header>

        {/* New Chat Button */}
        <div className="px-3 pb-2">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-sidebar-accent/60 hover:bg-sidebar-accent text-sidebar-foreground transition-all duration-200 group"
          >
            <div className="p-1 rounded-lg bg-sidebar-background/80 group-hover:bg-sidebar-background transition-colors">
              <Plus className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium">New Chat</span>
          </button>
        </div>

        {/* Action Bar */}
        <div className="px-3 pb-3">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-sidebar-accent/40">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleSearchToggle}
                  className={cn(
                    "flex-1 flex items-center justify-center p-2 rounded-lg transition-all duration-200",
                    showSearch
                      ? "bg-sidebar-background text-sidebar-foreground shadow-sm"
                      : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
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
                  className="flex-1 flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-all duration-200"
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
                  className="flex-1 flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-all duration-200"
                >
                  <FileText className="h-4 w-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Notes</TooltipContent>
            </Tooltip>
          </div>

          {/* Search Input */}
          {showSearch && (
            <div className="relative mt-2 animate-in fade-in slide-down duration-200">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={sidebarSearchQuery}
                onChange={(e) => setSidebarSearchQuery(e.target.value)}
                autoFocus
                className="w-full h-10 pl-9 pr-9 rounded-xl bg-sidebar-accent/60 border-0 text-sm text-sidebar-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sidebar-ring/50 focus:bg-sidebar-accent transition-all"
              />
              {sidebarSearchQuery && (
                <button
                  onClick={() => setSidebarSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-background/50 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="mx-3 h-px bg-gradient-to-r from-transparent via-sidebar-border/60 to-transparent" />

        {/* Chat List */}
        <ScrollArea className="flex-1 px-2">
          <div className="py-2">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full border-2 border-sidebar-accent" />
                  <div className="absolute inset-0 w-8 h-8 rounded-full border-2 border-transparent border-t-sidebar-foreground animate-spin" />
                </div>
                <span className="text-xs text-muted-foreground">Loading...</span>
              </div>
            ) : filteredChats.length === 0 && foldersWithState.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                {sidebarSearchQuery ? (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-sidebar-accent/60 flex items-center justify-center mb-3">
                      <Search className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-sidebar-foreground mb-1">No results</p>
                    <p className="text-xs text-muted-foreground">Try a different search term</p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-sidebar-accent/60 flex items-center justify-center mb-3">
                      <MessageSquare className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-sidebar-foreground mb-1">No conversations</p>
                    <p className="text-xs text-muted-foreground">Start a new chat to begin</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {/* Folders */}
                {foldersWithState.length > 0 && (
                  <div className="mb-3">
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
                            <div className="py-3 px-2 text-center">
                              <p className="text-xs text-muted-foreground">Drop chats here</p>
                            </div>
                          ) : (
                            folderChats.map((chat) => (
                              <ChatItem
                                key={chat.id}
                                id={chat.id}
                                title={chat.decryptedTitle}
                                updatedAt={chat.updatedAt}
                                isLocked={chat.isLocked}
                                onDelete={handleDeleteChat}
                                onRemoveFromFolder={() => handleRemoveChatFromFolder(chat.id)}
                              />
                            ))
                          )}
                        </FolderItem>
                      );
                    })}
                  </div>
                )}

                {/* Date-grouped Chats */}
                {Array.from(groupedChats.entries()).map(([group, groupChats]) => (
                  <div key={group} className="mb-2">
                    <div className="flex items-center gap-2 px-2 py-2">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        {DATE_GROUP_LABELS[group as DateGroup]}
                      </span>
                      <div className="flex-1 h-px bg-sidebar-border/40" />
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
          <div className="mx-3 h-px bg-gradient-to-r from-transparent via-sidebar-border/60 to-transparent" />

          <div className="flex items-center gap-1 p-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 flex-1 p-2 rounded-xl hover:bg-sidebar-accent/50 transition-colors text-left group">
                  <div className="relative">
                    <Avatar className="h-9 w-9 ring-2 ring-sidebar-accent/80 ring-offset-1 ring-offset-sidebar-background">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-sm font-medium">
                        {user?.name?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-sidebar-background transition-colors',
                        isUnlocked
                          ? 'bg-emerald-500'
                          : 'bg-amber-500 animate-pulse'
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">
                      {user?.name || 'User'}
                    </p>
                    <div className="flex items-center gap-1.5">
                      {isUnlocked ? (
                        <Shield className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <ShieldOff className="w-3 h-3 text-amber-500" />
                      )}
                      <span className="text-[11px] text-muted-foreground">
                        {isUnlocked ? 'Encrypted' : 'Locked'}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" className="w-56 mb-2">
                {isUnlocked && (
                  <DropdownMenuItem onClick={lock} className="gap-2">
                    <Lock className="h-4 w-4" />
                    <span>Lock encryption</span>
                  </DropdownMenuItem>
                )}
                {isUnlocked && <DropdownMenuSeparator />}
                <DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => openSettingsModal()}
                  className="p-2.5 rounded-xl text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-all duration-200"
                >
                  <Settings className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Settings</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </nav>
    </TooltipProvider>
  );
}
