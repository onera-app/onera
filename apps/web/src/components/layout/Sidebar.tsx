import { Link, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useUIStore } from '@/stores/uiStore';
import { useE2EE } from '@/providers/E2EEProvider';
import { useAuth } from '@/hooks/useAuth';
import { useChats, useDeleteChat, useUpdateChat } from '@/hooks/queries/useChats';
import { useFolders, useCreateFolder, useUpdateFolder, useDeleteFolder } from '@/hooks/queries/useFolders';
import { decryptChatTitle } from '@onera/crypto';
import { cn } from '@/lib/utils';
import { groupByDate, type DateGroup, DATE_GROUP_LABELS } from '@/lib/dateGrouping';
import { ChatItem } from './ChatItem';
import { FolderItem } from './FolderItem';
import { SearchModal } from './SearchModal';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Search,
  FileText,
  MessageSquare,
  ChevronRight,
  Pencil,
  PanelLeftClose,
  Plus,
  Pin,
  Sparkles,
  Settings,
  LogOut,
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
  isPinned?: boolean;
}

interface FolderWithState {
  id: string;
  name: string;
  isNew?: boolean;
}

export function Sidebar() {
  const navigate = useNavigate();
  const { sidebarOpen, sidebarWidth, toggleSidebar, openSettingsModal } = useUIStore();
  const { isUnlocked } = useE2EE();
  const { user, signOut } = useAuth();

  // Fetch chats and folders
  const rawChats = useChats();
  const deleteChat = useDeleteChat();
  const updateChat = useUpdateChat();
  const { data: folders = [] } = useFolders();
  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();

  // Track expanded folders and sections
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [newFolderIds, setNewFolderIds] = useState<Set<string>>(new Set());
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [foldersExpanded, setFoldersExpanded] = useState(true);
  const [chatsExpanded, setChatsExpanded] = useState(true);

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
            isPinned: chat.pinned,
          };
        } catch {
          return {
            id: chat.id,
            updatedAt: chat.updatedAt,
            decryptedTitle: 'Encrypted',
            isLocked: true,
            folderId: chat.folderId,
            isPinned: chat.pinned,
          };
        }
      }
      return {
        id: chat.id,
        updatedAt: chat.updatedAt,
        decryptedTitle: 'Encrypted',
        isLocked: !isUnlocked,
        folderId: chat.folderId,
        isPinned: chat.pinned,
      };
    });
  }, [rawChats, isUnlocked]);

  // Get unfiled chats (not in any folder)
  const unfiledChats = useMemo(() => {
    return chats.filter((chat) => !chat.folderId);
  }, [chats]);

  // Separate pinned and unpinned chats
  const pinnedChats = useMemo(() => {
    return unfiledChats.filter((chat) => chat.isPinned);
  }, [unfiledChats]);

  const unpinnedChats = useMemo(() => {
    return unfiledChats.filter((chat) => !chat.isPinned);
  }, [unfiledChats]);

  // Group unfiled, unpinned chats by date
  const groupedChats = useMemo(() => {
    return groupByDate(unpinnedChats);
  }, [unpinnedChats]);

  // Group chats by folder
  const chatsByFolder = useMemo(() => {
    const byFolder = new Map<string, ChatWithTitle[]>();
    folders.forEach((folder) => {
      byFolder.set(folder.id, []);
    });
    chats.forEach((chat) => {
      if (chat.folderId) {
        const existing = byFolder.get(chat.folderId) || [];
        existing.push(chat);
        byFolder.set(chat.folderId, existing);
      }
    });
    return byFolder;
  }, [chats, folders]);

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

  const handleDeleteChat = async (chatId: string) => {
    await deleteChat.mutateAsync(chatId);
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

  const handleTogglePin = async (chatId: string, pinned: boolean) => {
    try {
      await updateChat.mutateAsync({
        id: chatId,
        data: { pinned },
      });
      toast.success(pinned ? 'Chat pinned' : 'Chat unpinned');
    } catch {
      toast.error('Failed to update pin status');
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <nav
        id="sidebar"
        className={cn(
          'relative flex flex-col h-full transition-all duration-300 ease-out flex-shrink-0 z-20 bg-[#0a0a0a]',
          sidebarOpen ? 'w-[280px] min-w-[280px]' : 'w-0 min-w-0 overflow-hidden'
        )}
        style={{
          width: sidebarOpen ? `${sidebarWidth}px` : 0,
          minWidth: sidebarOpen ? `${sidebarWidth}px` : 0,
        }}
      >
        {/* Content */}
        <div className="flex flex-col h-full">
          {/* Header */}
          <header className="flex items-center justify-between px-4 py-4 h-14">
            <Link
              to="/app"
              className="flex items-center gap-2.5 group"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Sparkles className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="font-semibold text-[15px] text-white tracking-tight">
                Onera
              </span>
            </Link>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleSidebar}
                  className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <PanelLeftClose className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">Close sidebar</TooltipContent>
            </Tooltip>
          </header>

          {/* Navigation Menu */}
          <div className="px-3 space-y-0.5">
            {/* New Chat */}
            <button
              onClick={handleNewChat}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-white/90 group"
            >
              <Pencil className="h-[18px] w-[18px] text-neutral-400 group-hover:text-white transition-colors" />
              <span className="text-[14px]">New Chat</span>
            </button>

            {/* Search */}
            <button
              onClick={() => setSearchModalOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-white/90 group"
            >
              <Search className="h-[18px] w-[18px] text-neutral-400 group-hover:text-white transition-colors" />
              <span className="text-[14px]">Search</span>
            </button>

            {/* Notes */}
            <Link
              to="/app/notes"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-white/90 group"
            >
              <FileText className="h-[18px] w-[18px] text-neutral-400 group-hover:text-white transition-colors" />
              <span className="text-[14px]">Notes</span>
            </Link>
          </div>

          {/* Divider */}
          <div className="mx-4 my-3 h-px bg-white/5" />

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-3">
            <div className="pb-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-neutral-700 border-t-white animate-spin" />
                  <span className="text-xs text-neutral-500">Loading chats...</span>
                </div>
              ) : chats.length === 0 && foldersWithState.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <MessageSquare className="w-10 h-10 text-neutral-600 mb-3" />
                  <p className="text-sm text-white mb-1">No conversations yet</p>
                  <p className="text-xs text-neutral-500">
                    Start a new chat to begin
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Folders Section - Always show header */}
                  <Collapsible open={foldersExpanded} onOpenChange={setFoldersExpanded}>
                    <div className="flex items-center justify-between pr-1">
                      <CollapsibleTrigger className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-300 transition-colors">
                        <ChevronRight className={cn(
                          "h-3.5 w-3.5 transition-transform duration-200",
                          foldersExpanded && "rotate-90"
                        )} />
                        <span>Folders</span>
                      </CollapsibleTrigger>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={handleNewFolder}
                            className="p-1 rounded text-neutral-500 hover:text-white hover:bg-white/5 transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs">New folder</TooltipContent>
                      </Tooltip>
                    </div>

                    <CollapsibleContent className="space-y-0.5 mt-0.5">
                      {foldersWithState.length === 0 ? (
                        <div className="py-2 px-3 ml-5">
                          <p className="text-[11px] text-neutral-600">No folders yet</p>
                        </div>
                      ) : (
                        foldersWithState.map((folder) => {
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
                                <div className="py-1.5 px-3 ml-5">
                                  <p className="text-[11px] text-neutral-600 italic">Empty</p>
                                </div>
                              ) : (
                                <div className="ml-5 space-y-0.5 mt-0.5">
                                  {folderChats.map((chat) => (
                                    <ChatItem
                                      key={chat.id}
                                      id={chat.id}
                                      title={chat.decryptedTitle}
                                      updatedAt={chat.updatedAt}
                                      isLocked={chat.isLocked}
                                      isPinned={chat.isPinned}
                                      onDelete={handleDeleteChat}
                                      onTogglePin={handleTogglePin}
                                      onRemoveFromFolder={() => handleRemoveChatFromFolder(chat.id)}
                                    />
                                  ))}
                                </div>
                              )}
                            </FolderItem>
                          );
                        })
                      )}
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Chats Section */}
                  <Collapsible open={chatsExpanded} onOpenChange={setChatsExpanded}>
                    <CollapsibleTrigger className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-300 transition-colors w-full">
                      <ChevronRight className={cn(
                        "h-3.5 w-3.5 transition-transform duration-200",
                        chatsExpanded && "rotate-90"
                      )} />
                      <span>Chats</span>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="mt-0.5">
                      {/* Pinned Section */}
                      {pinnedChats.length > 0 && (
                        <div className="mb-2">
                          <div className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-neutral-500">
                            <Pin className="h-3 w-3" />
                            <span>Pinned</span>
                          </div>
                          <div className="space-y-0.5">
                            {pinnedChats.map((chat) => (
                              <ChatItem
                                key={chat.id}
                                id={chat.id}
                                title={chat.decryptedTitle}
                                updatedAt={chat.updatedAt}
                                isLocked={chat.isLocked}
                                isPinned={chat.isPinned}
                                onDelete={handleDeleteChat}
                                onTogglePin={handleTogglePin}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Date Groups */}
                      {Array.from(groupedChats.entries()).map(([group, groupChats]) => (
                        <div key={group} className="mt-2">
                          <div className="px-2 py-1.5 text-xs font-medium text-neutral-500">
                            {DATE_GROUP_LABELS[group as DateGroup]}
                          </div>
                          <div className="space-y-0.5">
                            {groupChats.map((chat) => (
                              <ChatItem
                                key={chat.id}
                                id={chat.id}
                                title={chat.decryptedTitle}
                                updatedAt={chat.updatedAt}
                                isLocked={chat.isLocked}
                                isPinned={chat.isPinned}
                                onDelete={handleDeleteChat}
                                onTogglePin={handleTogglePin}
                              />
                            ))}
                          </div>
                        </div>
                      ))}

                      {/* Empty state */}
                      {pinnedChats.length === 0 && groupedChats.size === 0 && (
                        <div className="py-2 px-3 ml-5">
                          <p className="text-[11px] text-neutral-600">No chats yet</p>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )}
            </div>
          </div>

          {/* User Profile Section */}
          {user && (
            <div className="border-t border-white/5 p-3">
              <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors group">
                {/* Avatar */}
                {user.imageUrl ? (
                  <img
                    src={user.imageUrl}
                    alt={user.name || 'User'}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-sm font-medium">
                    {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Name */}
                <span className="flex-1 min-w-0 text-sm font-medium text-white truncate">
                  {user.name || 'User'}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => openSettingsModal()}
                        className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">Settings</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => signOut()}
                        className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">Sign out</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Search Modal */}
      <SearchModal open={searchModalOpen} onOpenChange={setSearchModalOpen} />
    </TooltipProvider>
  );
}
