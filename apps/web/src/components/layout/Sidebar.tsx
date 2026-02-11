import { Link, useParams } from "@tanstack/react-router";
import { useMemo, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useUser } from "@clerk/clerk-react";
import { useUIStore } from "@/stores/uiStore";
import { useE2EE } from "@/providers/E2EEProvider";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  useChats,
  useDeleteChat,
  useUpdateChat,
} from "@/hooks/queries/useChats";
import {
  useFolders,
  useCreateFolder,
  useUpdateFolder,
  useDeleteFolder,
} from "@/hooks/queries/useFolders";
import { decryptChatTitle } from "@onera/crypto";
import { cn } from "@/lib/utils";
import {
  groupByDate,
  type DateGroup,
  DATE_GROUP_LABELS,
} from "@/lib/dateGrouping";
import { ChatItem } from "./ChatItem";
import { FolderItem } from "./FolderItem";
import { SearchModal } from "./SearchModal";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  FileText,
  MessageSquare,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Pin,
  Settings,
  Shield,
  LogOut,
} from "lucide-react";
import { OneraLogo } from "@/components/ui/onera-logo";
import { Spinner } from "@/components/ui/spinner";

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
  const params = useParams({ strict: false });
  const currentChatId = (params as { chatId?: string }).chatId;
  const { sidebarOpen, sidebarWidth, toggleSidebar, openSettingsModal } =
    useUIStore();
  const { isUnlocked } = useE2EE();
  const { user, signOut } = useAuth();
  const { user: clerkUser } = useUser();
  const isAdmin =
    (clerkUser?.publicMetadata as Record<string, unknown>)?.role === "admin";
  const { data: subData } = trpc.billing.getSubscription.useQuery(undefined, {
    enabled: !!user,
  });

  // Fetch chats and folders
  const rawChats = useChats();
  const deleteChat = useDeleteChat();
  const updateChat = useUpdateChat();
  const { data: folders = [] } = useFolders();
  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();

  // Refs for mutation functions to avoid recreating callbacks
  // React Query returns new object references on every render
  const deleteChatRef = useRef(deleteChat);
  const updateChatRef = useRef(updateChat);
  deleteChatRef.current = deleteChat;
  updateChatRef.current = updateChat;

  // Track expanded folders and sections
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );
  const [newFolderIds, setNewFolderIds] = useState<Set<string>>(new Set());
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [foldersExpanded, setFoldersExpanded] = useState(true);
  const [chatsExpanded, setChatsExpanded] = useState(true);

  // Decrypt chat titles when unlocked
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
            decryptedTitle: "Encrypted",
            isLocked: true,
            folderId: chat.folderId,
            isPinned: chat.pinned,
          };
        }
      }
      return {
        id: chat.id,
        updatedAt: chat.updatedAt,
        decryptedTitle: "Encrypted",
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

  const handleDeleteChat = useCallback(async (chatId: string) => {
    await deleteChatRef.current.mutateAsync(chatId);
  }, []);

  // Folder actions
  const handleNewFolder = async () => {
    try {
      const folder = await createFolder.mutateAsync({ name: "New Folder" });
      setNewFolderIds((prev) => new Set(prev).add(folder.id));
      setExpandedFolders((prev) => new Set(prev).add(folder.id));
    } catch {
      toast.error("Failed to create folder");
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
      toast.error("Failed to rename folder");
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
      toast.error("Failed to delete folder");
    }
  };

  const handleMoveChatToFolder = async (folderId: string, chatId: string) => {
    try {
      await updateChat.mutateAsync({
        id: chatId,
        data: { folderId },
      });
      toast.success("Chat moved to folder");
    } catch {
      toast.error("Failed to move chat");
    }
  };

  const handleRemoveChatFromFolder = useCallback(async (chatId: string) => {
    try {
      await updateChatRef.current.mutateAsync({
        id: chatId,
        data: { folderId: null },
      });
    } catch {
      toast.error("Failed to remove from folder");
    }
  }, []);

  const handleTogglePin = useCallback(
    async (chatId: string, pinned: boolean) => {
      try {
        await updateChatRef.current.mutateAsync({
          id: chatId,
          data: { pinned },
        });
        toast.success(pinned ? "Chat pinned" : "Chat unpinned");
      } catch {
        toast.error("Failed to update pin status");
      }
    },
    [],
  );

  return (
    <TooltipProvider delayDuration={300}>
      {/* Open sidebar button - visible when sidebar is closed */}
      {!sidebarOpen && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={toggleSidebar}
              className="fixed top-3.5 left-3.5 z-50 p-2 rounded-xl bg-background/80 backdrop-blur-xl border border-border shadow-sm text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] active:scale-[0.97] transition-all duration-200 ease-out"
              aria-label="Open sidebar"
            >
              <PanelLeftOpen className="h-[18px] w-[18px]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            Open sidebar
          </TooltipContent>
        </Tooltip>
      )}

      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden animate-in fade-in duration-300"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      <nav
        id="sidebar"
        className={cn(
          "flex flex-col h-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] flex-shrink-0 bg-sidebar-background",
          // Mobile: fixed overlay that slides in from left
          "fixed md:relative z-40 md:z-20",
          // Width handling
          sidebarOpen
            ? "w-[280px] min-w-[280px] translate-x-0"
            : "w-[280px] min-w-[280px] -translate-x-full md:w-0 md:min-w-0 md:translate-x-0 md:overflow-hidden",
        )}
        style={{
          width: sidebarOpen ? `${sidebarWidth}px` : undefined,
          minWidth: sidebarOpen ? `${sidebarWidth}px` : undefined,
        }}
      >
        {/* Content */}
        <div className="flex flex-col h-full">
          {/* Header */}
          <header className="flex items-center justify-between px-4 h-14">
            <Link to="/app" className="flex items-center gap-2.5 group">
              <div className="w-7 h-7 rounded-[10px] overflow-hidden shadow-sm ring-1 ring-white/10">
                <OneraLogo size={28} />
              </div>
              <span className="font-semibold text-[15px] text-sidebar-foreground tracking-[-0.01em]">
                Onera
              </span>
            </Link>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleSidebar}
                  className="p-1.5 -mr-1 rounded-lg text-muted-foreground hover:text-sidebar-foreground hover:bg-foreground/[0.06] active:scale-[0.94] transition-all duration-200 ease-out"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                Close sidebar
              </TooltipContent>
            </Tooltip>
          </header>

          {/* Navigation Menu */}
          <div className="px-2.5 space-y-0.5">
            {/* Search */}
            <button
              onClick={() => setSearchModalOpen(true)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-foreground/[0.06] active:scale-[0.98] active:bg-foreground/10 transition-all duration-200 ease-out text-sidebar-foreground/90 group"
            >
              <div className="w-7 h-7 rounded-lg bg-foreground/[0.06] flex items-center justify-center group-hover:bg-foreground/10 transition-colors">
                <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-sidebar-foreground transition-colors" />
              </div>
              <span className="text-[13px] font-medium">Search</span>
            </button>

            {/* Notes */}
            <Link
              to="/app/notes"
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-foreground/[0.06] active:scale-[0.98] active:bg-foreground/10 transition-all duration-200 ease-out text-sidebar-foreground/90 group"
            >
              <div className="w-7 h-7 rounded-lg bg-foreground/[0.06] flex items-center justify-center group-hover:bg-foreground/10 transition-colors">
                <FileText className="h-3.5 w-3.5 text-muted-foreground group-hover:text-sidebar-foreground transition-colors" />
              </div>
              <span className="text-[13px] font-medium">Notes</span>
            </Link>

            {/* Admin */}
            {isAdmin && (
              <Link
                to="/app/admin"
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-foreground/[0.06] active:scale-[0.98] active:bg-foreground/10 transition-all duration-200 ease-out text-sidebar-foreground/90 group"
              >
                <div className="w-7 h-7 rounded-lg bg-foreground/[0.06] flex items-center justify-center group-hover:bg-foreground/10 transition-colors">
                  <Shield className="h-3.5 w-3.5 text-muted-foreground group-hover:text-sidebar-foreground transition-colors" />
                </div>
                <span className="text-[13px] font-medium">Admin</span>
              </Link>
            )}
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 mt-2">
            <div className="pb-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Spinner size="lg" className="text-muted-foreground/50" />
                  <span className="text-[11px] text-muted-foreground/60">
                    Loading...
                  </span>
                </div>
              ) : chats.length === 0 && foldersWithState.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-foreground/[0.06] flex items-center justify-center mb-3">
                    <MessageSquare className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-[13px] font-medium text-sidebar-foreground/80 mb-1">
                    No conversations yet
                  </p>
                  <p className="text-[11px] text-muted-foreground/60">
                    Start a new chat to begin
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Folders Section - Always show header */}
                  <Collapsible
                    open={foldersExpanded}
                    onOpenChange={setFoldersExpanded}
                  >
                    <div className="flex items-center justify-between pr-0.5">
                      <CollapsibleTrigger className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50 hover:text-muted-foreground/70 transition-colors">
                        <ChevronRight
                          className={cn(
                            "h-3 w-3 transition-transform duration-200",
                            foldersExpanded && "rotate-90",
                          )}
                        />
                        <span>Folders</span>
                      </CollapsibleTrigger>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={handleNewFolder}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-sidebar-foreground hover:bg-foreground/[0.06] active:scale-90 transition-all duration-200"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs">
                          New folder
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    <CollapsibleContent className="space-y-0.5 mt-1">
                      {foldersWithState.length === 0 ? (
                        <div className="py-2 px-3 ml-5">
                          <p className="text-[11px] text-muted-foreground/50 italic">
                            No folders yet
                          </p>
                        </div>
                      ) : (
                        foldersWithState.map((folder) => {
                          const folderChats =
                            chatsByFolder.get(folder.id) || [];
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
                                  <p className="text-[11px] text-muted-foreground italic">
                                    Empty
                                  </p>
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
                                      isActive={chat.id === currentChatId}
                                      onDelete={handleDeleteChat}
                                      onTogglePin={handleTogglePin}
                                      onRemoveFromFolder={
                                        handleRemoveChatFromFolder
                                      }
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
                  <Collapsible
                    open={chatsExpanded}
                    onOpenChange={setChatsExpanded}
                  >
                    <CollapsibleTrigger className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50 hover:text-muted-foreground/70 transition-colors w-full">
                      <ChevronRight
                        className={cn(
                          "h-3 w-3 transition-transform duration-200",
                          chatsExpanded && "rotate-90",
                        )}
                      />
                      <span>Chats</span>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="mt-1">
                      {/* Pinned Section */}
                      {pinnedChats.length > 0 && (
                        <div className="mb-3">
                          <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-muted-foreground/60">
                            <Pin className="h-2.5 w-2.5" />
                            <span>Pinned</span>
                          </div>
                          <div className="space-y-0.5 mt-1">
                            {pinnedChats.map((chat) => (
                              <ChatItem
                                key={chat.id}
                                id={chat.id}
                                title={chat.decryptedTitle}
                                updatedAt={chat.updatedAt}
                                isLocked={chat.isLocked}
                                isPinned={chat.isPinned}
                                isActive={chat.id === currentChatId}
                                onDelete={handleDeleteChat}
                                onTogglePin={handleTogglePin}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Date Groups */}
                      {Array.from(groupedChats.entries()).map(
                        ([group, groupChats]) => (
                          <div key={group} className="mt-3">
                            <div className="px-2 py-1 text-[11px] font-medium text-muted-foreground/60">
                              {DATE_GROUP_LABELS[group as DateGroup]}
                            </div>
                            <div className="space-y-0.5 mt-1">
                              {groupChats.map((chat) => (
                                <ChatItem
                                  key={chat.id}
                                  id={chat.id}
                                  title={chat.decryptedTitle}
                                  updatedAt={chat.updatedAt}
                                  isLocked={chat.isLocked}
                                  isPinned={chat.isPinned}
                                  isActive={chat.id === currentChatId}
                                  onDelete={handleDeleteChat}
                                  onTogglePin={handleTogglePin}
                                />
                              ))}
                            </div>
                          </div>
                        ),
                      )}

                      {/* Empty state */}
                      {pinnedChats.length === 0 && groupedChats.size === 0 && (
                        <div className="py-2 px-3 ml-5">
                          <p className="text-[11px] text-muted-foreground/50 italic">
                            No chats yet
                          </p>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )}
            </div>
          </div>

          {/* User Profile Section - Apple style: clean, no dividers */}
          {user && (
            <div className="px-2.5 pb-2.5 pt-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 w-full px-2 py-2 rounded-xl hover:bg-foreground/[0.06] active:scale-[0.98] transition-all duration-150 ease-out text-left group">
                    {/* Avatar */}
                    {user.imageUrl ? (
                      <img
                        src={user.imageUrl}
                        alt={user.name || "User"}
                        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-[14px] font-semibold flex-shrink-0">
                        {(user.name || user.email || "U")
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}

                    {/* Name and Plan */}
                    <div className="flex-1 min-w-0">
                      <span className="block text-[13px] font-medium text-sidebar-foreground truncate">
                        {user.name || "User"}
                      </span>
                      <span
                        className={cn(
                          "text-[11px]",
                          subData?.plan?.id === "privacy_max"
                            ? "text-purple-500"
                            : subData?.plan?.id === "pro"
                              ? "text-blue-500"
                              : subData?.plan?.id === "starter"
                                ? "text-emerald-500"
                                : subData?.plan?.id === "team"
                                  ? "text-amber-500"
                                  : subData?.plan?.id === "enterprise"
                                    ? "text-purple-500"
                                    : "text-muted-foreground",
                        )}
                      >
                        {subData?.plan?.name || "Free"} plan
                      </span>
                    </div>

                    {/* Chevron */}
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-sidebar-foreground transition-colors flex-shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  side="top"
                  sideOffset={8}
                  className="w-52"
                >
                  <DropdownMenuItem asChild>
                    <Link to="/app/billing" className="gap-2 cursor-pointer">
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full",
                          subData?.plan?.id === "privacy_max"
                            ? "bg-purple-400"
                            : subData?.plan?.id === "pro"
                              ? "bg-blue-400"
                              : subData?.plan?.id === "starter"
                                ? "bg-emerald-400"
                                : subData?.plan?.id === "team"
                                  ? "bg-amber-400"
                                  : subData?.plan?.id === "enterprise"
                                    ? "bg-purple-400"
                                    : "bg-muted-foreground/50",
                        )}
                      />
                      Manage plan
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => openSettingsModal()}
                    className="gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="gap-2 text-red-400 focus:text-red-400 focus:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </nav>

      {/* Search Modal */}
      <SearchModal open={searchModalOpen} onOpenChange={setSearchModalOpen} />
    </TooltipProvider>
  );
}
