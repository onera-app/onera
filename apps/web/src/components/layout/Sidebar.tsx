import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  ArrowRight01Icon,
  CreditCardIcon,
  FileAttachmentIcon,
  Logout01Icon,
  Message01Icon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PinIcon,
  Search01Icon,
  Settings01Icon,
  Shield01Icon,
} from "@hugeicons/core-free-icons";
import {
  Link,
  useLocation,
  useParams,
  useNavigate,
} from "@tanstack/react-router";
import { useMemo, useState, useCallback, useRef, type UIEvent } from "react";
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
  isTitleGenerating?: boolean;
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
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setScrollTop(target.scrollTop);
  }, []);

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
            isTitleGenerating: title === "New Chat" || title === "Untitled",
          };
        } catch {
          return {
            id: chat.id,
            updatedAt: chat.updatedAt,
            decryptedTitle: "Encrypted",
            isLocked: true,
            folderId: chat.folderId,
            isPinned: chat.pinned,
            isTitleGenerating: false,
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
        isTitleGenerating: false,
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

  const handleDeleteChat = useCallback(
    async (chatId: string) => {
      await deleteChatRef.current.mutateAsync(chatId);
      if (chatId === currentChatId) {
        navigate({ to: "/app" });
      }
    },
    [currentChatId, navigate],
  );

  const handleMobileNav = useCallback(() => {
    if (window.innerWidth < 768) {
      toggleSidebar();
    }
  }, [toggleSidebar]);

  // Folder actions
  const handleNewFolder = async () => {
    try {
      const folder = await createFolder.mutateAsync({ name: "New Folder" });
      setNewFolderIds((prev) => new Set(prev).add(folder.id));
      setExpandedFolders((prev) => new Set(prev).add(folder.id));
    } catch (error) {
      console.error("Failed to create folder:", error);
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
    } catch (error) {
      console.error("Failed to rename folder:", error);
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
    } catch (error) {
      console.error("Failed to delete folder:", error);
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
    } catch (error) {
      console.error("Failed to move chat:", error);
      toast.error("Failed to move chat");
    }
  };

  const handleRemoveChatFromFolder = useCallback(async (chatId: string) => {
    try {
      await updateChatRef.current.mutateAsync({
        id: chatId,
        data: { folderId: null },
      });
    } catch (error) {
      console.error("Failed to remove from folder:", error);
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
      } catch (error) {
        console.error("Failed to update pin status:", error);
        toast.error("Failed to update pin status");
      }
    },
    [],
  );

  const hasInlineMenuTrigger =
    location.pathname === "/app" ||
    location.pathname.startsWith("/app/c/") ||
    location.pathname.startsWith("/app/notes");

  return (
    <TooltipProvider delayDuration={300}>
      {/* Mobile: floating open button when sidebar is closed */}
      {!sidebarOpen && !hasInlineMenuTrigger && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={toggleSidebar}
              className="fixed top-3.5 left-3.5 z-50 p-2 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-850 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
              aria-label="Open sidebar"
            >
              <HugeiconsIcon
                icon={PanelLeftOpenIcon}
                className="h-[18px] w-[18px]"
              />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            Open sidebar
          </TooltipContent>
        </Tooltip>
      )}

      {/* Desktop: collapsed icon rail — Open WebUI style */}
      {!sidebarOpen && (
        <div
          className="hidden md:flex flex-col justify-between h-full pt-[7px] pb-2 px-2 text-gray-900 dark:text-gray-200 border-e-[0.5px] border-gray-100 dark:border-gray-850/30 z-10 flex-shrink-0 bg-gray-50 dark:bg-gray-950"
          id="sidebar-rail"
        >
          <button
            className="flex flex-col flex-1 cursor-[e-resize] items-center"
            onClick={toggleSidebar}
          >
            {/* Logo / Sidebar toggle */}
            <div className="pb-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex rounded-xl hover:bg-gray-100 dark:hover:bg-gray-850 transition group cursor-[e-resize]">
                    <div className="flex items-center justify-center size-9">
                      <div className="group-hover:hidden">
                        <OneraLogo size={24} />
                      </div>
                      <HugeiconsIcon
                        icon={PanelLeftOpenIcon}
                        className="size-5 hidden group-hover:flex text-gray-600 dark:text-gray-400"
                      />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  Open sidebar
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Action icons */}
            <div className="-mt-[0.5px] flex flex-col items-center">
              {/* New Chat */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/app"
                    className="flex rounded-xl hover:bg-gray-100 dark:hover:bg-gray-850 transition"
                    onClick={(e) => e.stopPropagation()}
                    draggable={false}
                  >
                    <div className="flex items-center justify-center size-9">
                      <HugeiconsIcon
                        icon={Add01Icon}
                        className="size-[18px] text-gray-800 dark:text-gray-200"
                      />
                    </div>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  New Chat
                </TooltipContent>
              </Tooltip>

              {/* Search */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="flex rounded-xl hover:bg-gray-100 dark:hover:bg-gray-850 transition"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchModalOpen(true);
                    }}
                  >
                    <div className="flex items-center justify-center size-9">
                      <HugeiconsIcon
                        icon={Search01Icon}
                        className="size-[18px] text-gray-800 dark:text-gray-200"
                      />
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  Search
                </TooltipContent>
              </Tooltip>

              {/* Notes */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/app/notes"
                    className="flex rounded-xl hover:bg-gray-100 dark:hover:bg-gray-850 transition"
                    onClick={(e) => e.stopPropagation()}
                    draggable={false}
                  >
                    <div className="flex items-center justify-center size-9">
                      <HugeiconsIcon
                        icon={FileAttachmentIcon}
                        className="size-[18px] text-gray-800 dark:text-gray-200"
                      />
                    </div>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  Notes
                </TooltipContent>
              </Tooltip>

              {/* Admin */}
              {isAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/app/admin"
                      className="flex rounded-xl hover:bg-gray-100 dark:hover:bg-gray-850 transition"
                      onClick={(e) => e.stopPropagation()}
                      draggable={false}
                    >
                      <div className="flex items-center justify-center size-9">
                        <HugeiconsIcon
                          icon={Shield01Icon}
                          className="size-[18px] text-gray-800 dark:text-gray-200"
                        />
                      </div>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    Admin
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </button>

          {/* Bottom: User avatar */}
          {user && (
            <div className="flex justify-center py-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex rounded-xl hover:bg-gray-100 dark:hover:bg-gray-850 transition cursor-pointer focus-visible:outline-none">
                    <div className="relative">
                      {user.imageUrl ? (
                        <img
                          src={user.imageUrl}
                          alt={user.name || "User"}
                          className="size-7 rounded-full object-cover"
                        />
                      ) : (
                        <div className="size-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-white text-xs font-medium">
                          {(user.name || user.email || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  side="right"
                  sideOffset={8}
                  className="w-52"
                >
                  <DropdownMenuItem asChild>
                    <Link to="/app/billing" className="gap-2 cursor-pointer">
                      <HugeiconsIcon
                        icon={CreditCardIcon}
                        className="h-4 w-4 text-gray-500 dark:text-gray-400"
                      />
                      Manage plan
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => openSettingsModal()}
                    className="gap-2"
                  >
                    <HugeiconsIcon icon={Settings01Icon} className="h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <HugeiconsIcon icon={Logout01Icon} className="h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      )}

      {/* Mobile overlay backdrop — Open WebUI style */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden animate-in fade-in duration-300"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      {/* Expanded sidebar */}
      <nav
        id="sidebar"
        className={cn(
          "flex flex-col h-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] flex-shrink-0",
          "text-gray-900 dark:text-gray-200 text-sm select-none",
          // Mobile: fixed overlay; Desktop: relative
          "fixed md:relative z-40 md:z-20",
          // Background — Open WebUI: opaque on mobile, semi-transparent on desktop
          sidebarOpen
            ? "bg-gray-50 dark:bg-black md:bg-gray-50 md:dark:bg-black"
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
          <header className="flex items-center justify-between px-3 pt-2 pb-1 sticky top-0 z-10">
            <Link to="/app" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-full overflow-hidden">
                <OneraLogo size={32} />
              </div>
              <span className="font-primary font-semibold text-[0.9rem] text-gray-850 dark:text-white tracking-tight">
                Onera
              </span>
            </Link>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleSidebar}
                  className="flex rounded-xl size-[34px] justify-center items-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors focus-visible:outline-none"
                >
                  <HugeiconsIcon
                    icon={PanelLeftCloseIcon}
                    className="h-4 w-4"
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                Close sidebar
              </TooltipContent>
            </Tooltip>
          </header>

          {/* Top gradient fade — only visible when scrolled (Open WebUI style) */}
          <div
            className={cn(
              "absolute top-12 left-0 right-0 h-6 z-[5] pointer-events-none bg-linear-to-b from-gray-50 dark:from-black from-50% to-transparent transition-opacity duration-150",
              scrollTop > 0 ? "opacity-100" : "opacity-0",
            )}
          />

          {/* Main Content (scrollable) — includes nav menu + chat list */}
          <div
            className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hidden"
            onScroll={handleScroll}
          >
            {/* Navigation Menu — Open WebUI style */}
            <div className="px-1 py-2">
              {/* New Chat */}
              <Link
                to="/app"
                onClick={handleMobileNav}
                className="group grow flex items-center space-x-3 rounded-xl px-2.5 py-2 hover:bg-gray-100 dark:hover:bg-gray-900 transition text-gray-800 dark:text-gray-100 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <HugeiconsIcon icon={Add01Icon} className="size-[18px]" />
                <span className="font-primary text-[0.9rem] font-medium leading-none">
                  New Chat
                </span>
              </Link>

              {/* Search */}
              <button
                onClick={() => {
                  setSearchModalOpen(true);
                  handleMobileNav();
                }}
                className="w-full group grow flex items-center space-x-3 rounded-xl px-2.5 py-2 hover:bg-gray-100 dark:hover:bg-gray-900 transition text-gray-800 dark:text-gray-100 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <HugeiconsIcon icon={Search01Icon} className="size-[18px]" />
                <span className="font-primary text-[0.9rem] font-medium leading-none">
                  Search
                </span>
              </button>

              {/* Notes */}
              <Link
                to="/app/notes"
                onClick={handleMobileNav}
                className="group grow flex items-center space-x-3 rounded-xl px-2.5 py-2 hover:bg-gray-100 dark:hover:bg-gray-900 transition text-gray-800 dark:text-gray-100 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <HugeiconsIcon
                  icon={FileAttachmentIcon}
                  className="size-[18px]"
                />
                <span className="font-primary text-[0.9rem] font-medium leading-none">
                  Notes
                </span>
              </Link>

              {/* Admin */}
              {isAdmin && (
                <Link
                  to="/app/admin"
                  onClick={handleMobileNav}
                  className="group grow flex items-center space-x-3 rounded-xl px-2.5 py-2 hover:bg-gray-100 dark:hover:bg-gray-900 transition text-gray-800 dark:text-gray-100 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <HugeiconsIcon icon={Shield01Icon} className="size-[18px]" />
                  <span className="font-primary text-[0.9rem] font-medium leading-none">
                    Admin
                  </span>
                </Link>
              )}
            </div>

            {/* Chat list */}
            <div className="px-1.5 mt-3 pb-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Spinner
                    size="lg"
                    className="text-gray-500 dark:text-gray-400"
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Loading...
                  </span>
                </div>
              ) : chats.length === 0 && foldersWithState.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <HugeiconsIcon
                    icon={Message01Icon}
                    className="w-8 h-8 text-gray-400 dark:text-gray-600 mb-3"
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    No conversations yet
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Start a new chat to begin
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Folders Section */}
                  <Collapsible
                    open={foldersExpanded}
                    onOpenChange={setFoldersExpanded}
                  >
                    <div className="relative">
                      <CollapsibleTrigger className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors focus-visible:outline-none rounded-xl">
                        <span>Folders</span>
                      </CollapsibleTrigger>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNewFolder();
                            }}
                            disabled={createFolder.isPending}
                            className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <HugeiconsIcon
                              icon={Add01Icon}
                              className="h-3.5 w-3.5"
                            />
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
                                      isTitleGenerating={chat.isTitleGenerating}
                                      isActive={chat.id === currentChatId}
                                      onDelete={handleDeleteChat}
                                      onTogglePin={handleTogglePin}
                                      onRemoveFromFolder={
                                        handleRemoveChatFromFolder
                                      }
                                      onClick={handleMobileNav}
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
                    <CollapsibleTrigger className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors w-full focus-visible:outline-none rounded-xl">
                      <span>Chats</span>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="mt-1">
                      {/* Pinned Section */}
                      {pinnedChats.length > 0 && (
                        <div className="mb-2">
                          <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
                            <HugeiconsIcon icon={PinIcon} className="h-3 w-3" />
                            <span>Pinned</span>
                          </div>
                          <div className="ml-3 pl-1 space-y-1 mt-1 border-s border-gray-100 dark:border-gray-900">
                            {pinnedChats.map((chat) => (
                              <ChatItem
                                key={chat.id}
                                id={chat.id}
                                title={chat.decryptedTitle}
                                updatedAt={chat.updatedAt}
                                isLocked={chat.isLocked}
                                isPinned={chat.isPinned}
                                isTitleGenerating={chat.isTitleGenerating}
                                isActive={chat.id === currentChatId}
                                onDelete={handleDeleteChat}
                                onTogglePin={handleTogglePin}
                                onClick={handleMobileNav}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Date Groups — Open WebUI style time labels */}
                      {Array.from(groupedChats.entries()).map(
                        ([group, groupChats], groupIndex) => (
                          <div
                            key={group}
                            className={cn(groupIndex === 0 ? "mt-1.5" : "mt-4")}
                          >
                            <div className="w-full pl-2.5 text-[0.7rem] text-gray-500 dark:text-gray-500 font-medium pb-1.5">
                              {DATE_GROUP_LABELS[group as DateGroup]}
                            </div>
                            <div className="space-y-1 mt-0.5">
                              {groupChats.map((chat) => (
                                <ChatItem
                                  key={chat.id}
                                  id={chat.id}
                                  title={chat.decryptedTitle}
                                  updatedAt={chat.updatedAt}
                                  isLocked={chat.isLocked}
                                  isPinned={chat.isPinned}
                                  isTitleGenerating={chat.isTitleGenerating}
                                  isActive={chat.id === currentChatId}
                                  onDelete={handleDeleteChat}
                                  onTogglePin={handleTogglePin}
                                  onClick={handleMobileNav}
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
          <div className="absolute bottom-16 left-0 right-0 h-6 z-[5] pointer-events-none bg-linear-to-t from-gray-50 dark:from-black from-50% to-transparent" />

          {/* User Profile Section — Open WebUI style */}
          {user && (
            <div className="px-1.5 pt-1.5 pb-2 sticky bottom-0 z-10 -mt-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center rounded-2xl py-2 px-1.5 w-full hover:bg-gray-100/50 dark:hover:bg-gray-900 transition text-left group focus-visible:outline-none">
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
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      className="h-4 w-4 text-gray-400 dark:text-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors flex-shrink-0"
                    />
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
                      <HugeiconsIcon
                        icon={CreditCardIcon}
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
                    <HugeiconsIcon icon={Settings01Icon} className="h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <HugeiconsIcon icon={Logout01Icon} className="h-4 w-4" />
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
