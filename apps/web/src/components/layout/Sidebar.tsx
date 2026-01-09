import { Link, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { useE2EE } from '@/providers/E2EEProvider';
import { getChats } from '@/lib/api/chats';
import { decryptChatTitle } from '@cortex/crypto';
import { cn, formatRelativeTime, truncate } from '@/lib/utils';
import { Button } from '@/components/common/Button';

export function Sidebar() {
  const navigate = useNavigate();
  const { token, user, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { isUnlocked, lock } = useE2EE();

  // Fetch chats
  const { data: chats = [], isLoading } = useQuery({
    queryKey: ['chats'],
    queryFn: async () => {
      if (!token) return [];
      const encrypted = await getChats(token);

      // Decrypt titles if E2EE is unlocked
      if (isUnlocked) {
        return encrypted.map((chat) => {
          try {
            const title = decryptChatTitle(
              chat.id,
              chat.encrypted_chat_key,
              chat.chat_key_nonce,
              chat.encrypted_title,
              chat.title_nonce
            );
            return { ...chat, decryptedTitle: title };
          } catch {
            return { ...chat, decryptedTitle: '🔒 Encrypted' };
          }
        });
      }

      return encrypted.map((chat) => ({
        ...chat,
        decryptedTitle: '🔒 Encrypted',
      }));
    },
    enabled: !!token,
  });

  const handleNewChat = () => {
    navigate({ to: '/' });
  };

  const handleLogout = () => {
    lock();
    logout();
    navigate({ to: '/auth' });
  };

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">
          Cortex
        </h1>
        <button
          onClick={toggleSidebar}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 dark:hover:text-gray-300 dark:hover:bg-gray-800"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          </svg>
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <Button onClick={handleNewChat} className="w-full">
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Chat
        </Button>
      </div>

      {/* Navigation */}
      <div className="px-2 mb-2">
        <Link
          to="/notes"
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
            'hover:bg-gray-200 dark:hover:bg-gray-800',
            'text-gray-700 dark:text-gray-300'
          )}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Notes
        </Link>
        <Link
          to="/workspace/prompts"
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
            'hover:bg-gray-200 dark:hover:bg-gray-800',
            'text-gray-700 dark:text-gray-300'
          )}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          Prompts
        </Link>
        <Link
          to="/workspace/connections"
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
            'hover:bg-gray-200 dark:hover:bg-gray-800',
            'text-gray-700 dark:text-gray-300'
          )}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Connections
        </Link>
        <Link
          to="/settings"
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
            'hover:bg-gray-200 dark:hover:bg-gray-800',
            'text-gray-700 dark:text-gray-300'
          )}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </Link>
      </div>

      {/* Divider */}
      <div className="px-4 mb-2">
        <div className="border-t border-gray-200 dark:border-gray-800" />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 mb-1">Chats</p>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600" />
          </div>
        ) : chats.length === 0 ? (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
            No chats yet
          </p>
        ) : (
          <div className="space-y-1">
            {chats.map((chat) => (
              <Link
                key={chat.id}
                to="/c/$chatId"
                params={{ chatId: chat.id }}
                className={cn(
                  'block px-3 py-2 rounded-lg text-sm transition-colors',
                  'hover:bg-gray-200 dark:hover:bg-gray-800',
                  'text-gray-700 dark:text-gray-300'
                )}
              >
                <div className="font-medium truncate">
                  {truncate(chat.decryptedTitle || '🔒', 30)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {formatRelativeTime(chat.updated_at)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* User Menu */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
            {user?.name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user?.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 dark:hover:text-gray-300 dark:hover:bg-gray-800"
            title="Logout"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>

        {/* E2EE Status */}
        <div className="mt-3 flex items-center gap-2 text-xs">
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              isUnlocked ? 'bg-green-500' : 'bg-yellow-500'
            )}
          />
          <span className="text-gray-500 dark:text-gray-400">
            E2EE {isUnlocked ? 'Unlocked' : 'Locked'}
          </span>
          {isUnlocked && (
            <button
              onClick={lock}
              className="ml-auto text-blue-600 dark:text-blue-400 hover:underline"
            >
              Lock
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
