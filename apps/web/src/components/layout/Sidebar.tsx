import { Link, useLocation, useParams, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
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
  CreditCard,
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
  const location = useLocation();
  const navigate = useNavigate();
  const currentChatId = (params as { chatId?: string }).chatId;
  const { sidebarOpen, sidebarWidth, toggleSidebar, openSettingsModal } =
    useUIStore();
  const { isUnlocked } = useE2EE();
  const { user, signOut } = useAuth();
  const adminCheck = trpc.admin.checkAccess.useQuery(undefined, {
    enabled: !!user,
    retry: false,
  });
  const isAdmin = adminCheck.data?.isAdmin === true;
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
    if (chatId === currentChatId) {
      navigate({ to: "/app" });
    }
  }, [currentChatId, navigate]);

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

  const hasInlineMenuTrigger =
    location.pathname === "/app" || location.pathname.startsWith("/app/c/");

  return (
    <TooltipProvider delayDuration={300}>
      {/* Open sidebar button - visible when sidebar is closed */}
      {!sidebarOpen && !hasInlineMenuTrigger && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={toggleSidebar}
              className="fixed top-3.5 left-3.5 z-50 p-2 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-850 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

      {/* Mobile overlay backdrop — Open WebUI style */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden animate-in fade-in duration-300"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      <nav
        id="sidebar"
        className={cn(
          "flex flex-col h-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] flex-shrink-0",
          "text-gray-900 dark:text-gray-200 text-sm select-none",
          // Mobile: fixed overlay; Desktop: relative
          "fixed md:relative z-40 md:z-20",
          // Background — Open WebUI: opaque on mobile, semi-transparent on desktop
          sidebarOpen
            ? "bg-gray-50 dark:bg-gray-950 md:bg-gray-50 md:dark:bg-gray-950/70"
            : "",
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
        <div className="flex flex-col h-full overflow-hidden relative">
          {/* Header — Open WebUI style */}
          <header className="flex items-center justify-between px-[0.5625rem] pt-2 pb-1.5 sticky top-0 z-10">
            <Link to="/app" className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-full overflow-hidden">
                <OneraLogo size={30} />
              </div>
              <span className="font-primary font-medium text-sm text-gray-850 dark:text-white tracking-tight">
                Onera
              </span>
            </Link>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleSidebar}
                  className="flex rounded-xl size-[34px] justify-center items-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-850 transition-colors focus-visible:outline-none"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                Close sidebar
              </TooltipContent>
            </Tooltip>
          </header>

          {/* Top gradient fade */}
          <div className="sidebar-gradient-top absolute top-12 left-0 right-0 h-6 z-[5]" />

          {/* Navigation Menu — Open WebUI style */}
          <div className="px-[0.4375rem] py-1.5">
            {/* New Chat */}
            <Link
              to="/app"
              className="group grow flex items-center space-x-3 rounded-2xl px-2.5 py-2 hover:bg-gray-100 dark:hover:bg-gray-900 transition text-gray-800 dark:text-gray-200 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="size-[18px]" />
              <span className="font-primary text-sm">New Chat</span>
            </Link>

            {/* Search */}
            <button
              onClick={() => setSearchModalOpen(true)}
              className="w-full group grow flex items-center space-x-3 rounded-2xl px-2.5 py-2 hover:bg-gray-100 dark:hover:bg-gray-900 transition text-gray-800 dark:text-gray-200 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Search className="size-[18px]" />
              <span className="font-primary text-sm">Search</span>
            </button>

            {/* Notes */}
            <Link
              to="/app/notes"
              className="group grow flex items-center space-x-3 rounded-2xl px-2.5 py-2 hover:bg-gray-100 dark:hover:bg-gray-900 transition text-gray-800 dark:text-gray-200 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <FileText className="size-[18px]" />
              <span className="font-primary text-sm">Notes</span>
            </Link>

            {/* Admin */}
            {isAdmin && (
              <Link
                to="/app/admin"
                className="group grow flex items-center space-x-3 rounded-2xl px-2.5 py-2 hover:bg-gray-100 dark:hover:bg-gray-900 transition text-gray-800 dark:text-gray-200 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Shield className="size-[18px]" />
                <span className="font-primary text-sm">Admin</span>
              </Link>
            )}
          </div>

          {/* Main Content (scrollable) */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hidden px-[0.4375rem] mt-3">
            <div className="pb-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Spinner size="lg" className="text-gray-500 dark:text-gray-400" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">Loading...</span>
                </div>
              ) : chats.length === 0 && foldersWithState.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <MessageSquare className="w-8 h-8 text-gray-400 dark:text-gray-600 mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    No conversations yet
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Start a new chat to begin
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Folders Section */}
                  <Collapsible
                    open={foldersExpanded}
                    onOpenChange={setFoldersExpanded}
                  >
                    <div className="flex items-center justify-between">
                      <CollapsibleTrigger className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors focus-visible:outline-none rounded-md">
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
                            className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-850 transition-colors focus-visible:outline-none"
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
                          <p className="text-xs text-gray-400 dark:text-gray-600 italic">
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
                                  <p className="text-xs text-gray-400 dark:text-gray-600 italic">
                                    Empty
                                  </p>
                                </div>
                              ) : (
                                <div className="ml-3 pl-1 space-y-0.5 mt-[1px] border-s border-gray-100 dark:border-gray-900">
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
                    <CollapsibleTrigger className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors w-full focus-visible:outline-none rounded-md">
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
                        <div className="mb-2">
                          <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
                            <Pin className="h-3 w-3" />
                            <span>Pinned</span>
                          </div>
                          <div className="ml-3 pl-1 space-y-0.5 mt-1 border-s border-gray-100 dark:border-gray-900">
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

                      {/* Date Groups — Open WebUI style time labels */}
                      {Array.from(groupedChats.entries()).map(
                        ([group, groupChats]) => (
                          <div key={group} className="mt-3">
                            <div className="w-full pl-2.5 text-xs text-gray-500 dark:text-gray-400 font-medium pb-1.5">
                              {DATE_GROUP_LABELS[group as DateGroup]}
                            </div>
                            <div className="space-y-0.5 mt-0.5">
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
                          <p className="text-xs text-gray-400 dark:text-gray-600 italic">
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

          {/* Bottom gradient fade */}
          <div className="sidebar-gradient-bottom absolute bottom-16 left-0 right-0 h-6 z-[5]" />

          {/* User Profile Section — Open WebUI style */}
          {user && (
            <div className="px-1.5 pt-1.5 pb-2 sticky bottom-0 z-10 -mt-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center rounded-2xl py-2 px-1.5 w-full hover:bg-gray-100/50 dark:hover:bg-gray-900/50 transition text-left group focus-visible:outline-none">
                    {/* Avatar */}
                    {user.imageUrl ? (
                      <img
                        src={user.imageUrl}
                        alt={user.name || "User"}
                        className="size-7 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="size-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-white text-xs font-medium flex-shrink-0">
                        {(user.name || user.email || "U")
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}

                    {/* Name and Plan */}
                    <div className="flex-1 min-w-0 ml-3">
                      <span className="block text-sm font-primary font-medium text-gray-850 dark:text-white truncate">
                        {user.name || "User"}
                      </span>
                      <span
                        className={cn(
                          "text-xs",
                          subData?.plan?.id === "pro"
                            ? "text-primary"
                            : subData?.plan?.id === "team"
                              ? "text-status-warning-text"
                              : subData?.plan?.id === "starter"
                                ? "text-status-success-text"
                                : subData?.plan?.id === "enterprise"
                                  ? "text-primary"
                                  : "text-gray-500 dark:text-gray-400",
                        )}
                      >
                        {subData?.plan?.name || "Free"} plan
                      </span>
                    </div>

                    {/* Chevron */}
                    <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors flex-shrink-0" />
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
                      <CreditCard
                        className={cn(
                          "h-4 w-4",
                          subData?.plan?.id === "pro"
                            ? "text-primary"
                            : subData?.plan?.id === "team"
                              ? "text-status-warning"
                              : subData?.plan?.id === "starter"
                                ? "text-status-success"
                                : subData?.plan?.id === "enterprise"
                                  ? "text-primary"
                                  : "text-gray-500 dark:text-gray-400",
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
                    className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
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
