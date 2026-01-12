import { Link, useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/stores/uiStore';
import { useE2EE } from '@/providers/E2EEProvider';
import { useChats, useDeleteChat } from '@/hooks/queries/useChats';
import { decryptChatTitle } from '@cortex/crypto';
import { cn } from '@/lib/utils';
import { groupByDate, type DateGroup } from '@/lib/dateGrouping';
import { SidebarSearch } from './SidebarSearch';
import { ChatGroup } from './ChatGroup';

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
    <aside
      className={cn(
        'sidebar flex flex-col h-full transition-all duration-200 ease-out flex-shrink-0',
        sidebarOpen ? '' : 'w-0 min-w-0 overflow-hidden'
      )}
      style={{
        width: sidebarOpen ? `${sidebarWidth}px` : 0,
        minWidth: sidebarOpen ? `${sidebarWidth}px` : 0,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 h-16">
        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-sidebar-hover transition-all duration-150"
            title="Close sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
            </svg>
          </button>
          <span className="font-display text-lg font-medium text-white tracking-tight">Cortex</span>
        </div>

        <button
          onClick={handleNewChat}
          className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-sidebar-hover transition-all duration-150"
          title="New chat"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <SidebarSearch />

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-600 border-t-gray-300" />
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center py-12 px-4">
            {sidebarSearchQuery ? (
              <>
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-sidebar-hover flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-400 font-medium">No matches</p>
                <p className="text-xs text-gray-500 mt-1">Try a different search</p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-sidebar-hover flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-400 font-medium">No conversations</p>
                <p className="text-xs text-gray-500 mt-1">Start a new chat above</p>
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
      </div>

      {/* Bottom Section */}
      <div className="border-t border-sidebar-border mt-auto">
        {/* Quick Links */}
        <div className="p-2.5 grid grid-cols-2 gap-1.5">
          <Link
            to="/workspace/connections"
            className={cn(
              'flex items-center gap-2 px-3 py-2.5 rounded-xl',
              'text-sm text-gray-400 hover:text-white',
              'hover:bg-sidebar-hover transition-all duration-150'
            )}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            <span>Keys</span>
          </Link>

          <Link
            to="/settings"
            className={cn(
              'flex items-center gap-2 px-3 py-2.5 rounded-xl',
              'text-sm text-gray-400 hover:text-white',
              'hover:bg-sidebar-hover transition-all duration-150'
            )}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Settings</span>
          </Link>
        </div>

        {/* User Section */}
        <div className="p-2.5 pt-0">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-sidebar-hover transition-all duration-150 group">
            {/* Avatar */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center text-white text-sm font-semibold shadow-soft-sm">
              {user?.name?.charAt(0).toUpperCase() || '?'}
            </div>

            {/* Name & E2EE Status */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.name || 'User'}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div
                  className={cn(
                    'w-1.5 h-1.5 rounded-full transition-colors',
                    isUnlocked ? 'bg-success' : 'bg-warning animate-pulse'
                  )}
                />
                <span className="text-[11px] text-gray-500">
                  E2EE {isUnlocked ? 'Active' : 'Locked'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {isUnlocked && (
                <button
                  onClick={lock}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-sidebar-active transition-all duration-150"
                  title="Lock E2EE"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </button>
              )}
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-sidebar-active transition-all duration-150"
                title="Sign out"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
