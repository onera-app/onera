import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { useE2EE } from '@/providers/E2EEProvider';
import { getChats, deleteChat } from '@/lib/api/chats';
import { decryptChatTitle } from '@cortex/crypto';
import { cn, truncate } from '@/lib/utils';

interface ChatWithTitle {
  id: string;
  encrypted_chat_key: string;
  chat_key_nonce: string;
  encrypted_title: string;
  title_nonce: string;
  updated_at: number;
  decryptedTitle: string;
}

export function Sidebar() {
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const queryClient = useQueryClient();
  const { token, user, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { isUnlocked, lock } = useE2EE();

  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const currentChatId = (params as { chatId?: string }).chatId;

  // Focus edit input when editing
  useEffect(() => {
    if (editingChatId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingChatId]);

  // Fetch chats - re-fetch when isUnlocked changes to decrypt titles
  const { data: chats = [], isLoading } = useQuery({
    queryKey: ['chats', isUnlocked],
    queryFn: async () => {
      if (!token) return [];
      const encrypted = await getChats(token);

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
            return { ...chat, decryptedTitle: 'Encrypted' };
          }
        }) as ChatWithTitle[];
      }

      return encrypted.map((chat) => ({
        ...chat,
        decryptedTitle: 'Encrypted',
      })) as ChatWithTitle[];
    },
    enabled: !!token,
  });

  // Delete chat mutation
  const deleteMutation = useMutation({
    mutationFn: (chatId: string) => deleteChat(token!, chatId),
    onSuccess: (_, deletedChatId) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      if (currentChatId === deletedChatId) {
        navigate({ to: '/' });
      }
    },
  });

  const handleNewChat = () => {
    navigate({ to: '/' });
  };

  const handleLogout = () => {
    lock();
    logout();
    navigate({ to: '/auth' });
  };

  const handleDeleteChat = (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Delete this chat?')) {
      deleteMutation.mutate(chatId);
    }
  };

  const handleStartEdit = (e: React.MouseEvent, chat: ChatWithTitle) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditTitle(chat.decryptedTitle);
  };

  const handleCancelEdit = () => {
    setEditingChatId(null);
    setEditTitle('');
  };

  const handleSaveEdit = async () => {
    // TODO: Implement title update with encryption
    handleCancelEdit();
  };

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-gray-50 dark:bg-gray-900 transition-all duration-200 ease-out',
        sidebarOpen ? 'w-[260px] min-w-[260px]' : 'w-0 min-w-0 overflow-hidden'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-2 h-14">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
          title="Close sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
          </svg>
        </button>

        <button
          onClick={handleNewChat}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
          title="New chat"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>

      {/* Navigation Links */}
      <div className="px-2 space-y-0.5">
        <Link
          to="/"
          className={cn(
            'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            'hover:bg-gray-200/70 dark:hover:bg-gray-800/70',
            'text-gray-700 dark:text-gray-200'
          )}
        >
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          Home
        </Link>

        <Link
          to="/workspace/connections"
          className={cn(
            'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            'hover:bg-gray-200/70 dark:hover:bg-gray-800/70',
            'text-gray-700 dark:text-gray-200'
          )}
        >
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
          Connections
        </Link>

        <Link
          to="/settings"
          className={cn(
            'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            'hover:bg-gray-200/70 dark:hover:bg-gray-800/70',
            'text-gray-700 dark:text-gray-200'
          )}
        >
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </Link>
      </div>

      {/* Chats Section */}
      <div className="mt-4 px-3">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Chats
        </p>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-2 mt-2 scrollbar-thin">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-gray-600 dark:border-gray-600 dark:border-t-gray-300" />
          </div>
        ) : chats.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No chats yet
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Start a new conversation
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className="relative group"
                onMouseEnter={() => setHoveredChatId(chat.id)}
                onMouseLeave={() => setHoveredChatId(null)}
              >
                {editingChatId === chat.id ? (
                  <div className="flex items-center px-2 py-1.5">
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      onBlur={handleCancelEdit}
                      className="flex-1 px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ) : (
                  <Link
                    to="/c/$chatId"
                    params={{ chatId: chat.id }}
                    className={cn(
                      'flex items-center px-3 py-2 rounded-lg text-sm transition-colors',
                      currentChatId === chat.id
                        ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white'
                        : 'hover:bg-gray-200/70 dark:hover:bg-gray-800/70 text-gray-700 dark:text-gray-300'
                    )}
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="truncate">
                        {!isUnlocked && (
                          <span className="mr-1.5 text-gray-400">🔒</span>
                        )}
                        {truncate(chat.decryptedTitle, 28)}
                      </div>
                    </div>

                    {/* Hover Actions */}
                    {(hoveredChatId === chat.id || currentChatId === chat.id) && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleStartEdit(e, chat)}
                          className="p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                          title="Rename"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => handleDeleteChat(e, chat.id)}
                          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                          title="Delete"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Menu */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-200/70 dark:hover:bg-gray-800/70 transition-colors cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium shadow-sm">
            {user?.name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {user?.name || 'User'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-300/50 dark:hover:text-gray-300 dark:hover:bg-gray-700/50 transition-colors"
            title="Logout"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </button>
        </div>

        {/* E2EE Status */}
        <div className="mt-1 mx-2 flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800/50">
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              isUnlocked ? 'bg-green-500' : 'bg-amber-500'
            )}
          />
          <span className="text-xs text-gray-600 dark:text-gray-400 flex-1">
            E2EE {isUnlocked ? 'Active' : 'Locked'}
          </span>
          {isUnlocked && (
            <button
              onClick={lock}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Lock
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
