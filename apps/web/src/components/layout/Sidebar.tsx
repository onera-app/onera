import { Link, useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/stores/uiStore';
import { useE2EE } from '@/providers/E2EEProvider';
import { useChats, useDeleteChat } from '@/hooks/queries/useChats';
import { decryptChatTitle } from '@onera/crypto';
import { cn } from '@/lib/utils';
import { groupByDate, type DateGroup } from '@/lib/dateGrouping';
import { SidebarSearch } from './SidebarSearch';
import { ChatGroup } from './ChatGroup';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  Link as LinkIcon,
  Settings,
  Lock,
  LogOut,
  MessageSquare,
  Search,
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
}

export function Sidebar() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { sidebarOpen, sidebarWidth, toggleSidebar, sidebarSearchQuery } = useUIStore();
  const { isUnlocked, lock } = useE2EE();

  // Fetch chats using Convex
  const rawChats = useChats();
  const deleteChat = useDeleteChat();

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

  // Filter by search query
  const filteredChats = useMemo(() => {
    if (!sidebarSearchQuery.trim()) return chats;
    const query = sidebarSearchQuery.toLowerCase();
    return chats.filter((chat) =>
      chat.decryptedTitle.toLowerCase().includes(query)
    );
  }, [chats, sidebarSearchQuery]);

  // Group chats by date
  const groupedChats = useMemo(() => {
    return groupByDate(filteredChats);
  }, [filteredChats]);

  const isLoading = rawChats === undefined;

  const handleNewChat = () => {
    navigate({ to: '/' });
  };

  const handleLogout = async () => {
    lock();
    await signOut();
    navigate({ to: '/auth' });
  };

  const handleDeleteChat = async (chatId: string) => {
    await deleteChat.mutateAsync(chatId);
  };

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'flex flex-col h-full transition-all duration-200 ease-out flex-shrink-0 bg-sidebar-background border-r border-sidebar-border',
          sidebarOpen ? '' : 'w-0 min-w-0 overflow-hidden'
        )}
        style={{
          width: sidebarOpen ? `${sidebarWidth}px` : 0,
          minWidth: sidebarOpen ? `${sidebarWidth}px` : 0,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 h-14">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Close sidebar</TooltipContent>
            </Tooltip>
            <span className="font-semibold text-sidebar-primary-foreground tracking-tight">Onera</span>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNewChat}
                className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">New chat</TooltipContent>
          </Tooltip>
        </div>

        {/* Search */}
        <SidebarSearch />

        {/* Chat List */}
        <ScrollArea className="flex-1 px-2 pb-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-sidebar-border border-t-sidebar-foreground" />
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="text-center py-12 px-4">
              {sidebarSearchQuery ? (
                <>
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-sidebar-accent flex items-center justify-center">
                    <Search className="w-6 h-6 text-sidebar-foreground" />
                  </div>
                  <p className="text-sm text-sidebar-foreground font-medium">No matches</p>
                  <p className="text-xs text-muted-foreground mt-1">Try a different search</p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-sidebar-accent flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-sidebar-foreground" />
                  </div>
                  <p className="text-sm text-sidebar-foreground font-medium">No conversations</p>
                  <p className="text-xs text-muted-foreground mt-1">Start a new chat above</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {Array.from(groupedChats.entries()).map(([group, groupChats]) => (
                <ChatGroup
                  key={group}
                  group={group as DateGroup}
                  chats={groupChats}
                  onDelete={handleDeleteChat}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Bottom Section */}
        <div className="mt-auto">
          <Separator className="bg-sidebar-border" />
          
          {/* Quick Links */}
          <div className="p-2 grid grid-cols-2 gap-1">
            <Button
              variant="ghost"
              asChild
              className="justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Link to="/workspace/connections">
                <LinkIcon className="mr-2 h-4 w-4" />
                Keys
              </Link>
            </Button>

            <Button
              variant="ghost"
              asChild
              className="justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Link to="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </Button>
          </div>

          {/* User Section */}
          <div className="p-2 pt-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-auto py-2 px-3 text-sidebar-foreground hover:bg-sidebar-accent"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {user?.name?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user?.name || 'User'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div
                        className={cn(
                          'w-1.5 h-1.5 rounded-full transition-colors',
                          isUnlocked ? 'bg-status-success-text' : 'bg-status-warning-text animate-pulse'
                        )}
                      />
                      <span className="text-[11px] text-muted-foreground">
                        E2EE {isUnlocked ? 'Active' : 'Locked'}
                      </span>
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {isUnlocked && (
                  <>
                    <DropdownMenuItem onClick={lock}>
                      <Lock className="mr-2 h-4 w-4" />
                      Lock E2EE
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
