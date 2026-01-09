import { useNavigate } from '@tanstack/react-router';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';

interface ChatNavbarProps {
  title: string;
  chatId: string;
}

export function ChatNavbar({ title, chatId }: ChatNavbarProps) {
  const navigate = useNavigate();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <header className="flex items-center gap-4 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
      {/* Menu button (shown when sidebar is closed) */}
      {!sidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800"
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
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      )}

      {/* Title */}
      <h1 className="flex-1 font-semibold text-gray-900 dark:text-white truncate">
        {title}
      </h1>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Settings/More button */}
        <button
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800"
          title="Chat settings"
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
              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
