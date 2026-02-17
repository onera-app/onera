import { memo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useUIStore } from "@/stores/uiStore";
import { Button } from "@/components/ui/button";
import { Menu, Plus } from "lucide-react";

interface ChatNavbarProps {
  chatId: string;
  children?: React.ReactNode;
}

export const ChatNavbar = memo(function ChatNavbar({
  children,
}: ChatNavbarProps) {
  const navigate = useNavigate();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <header className="absolute top-1 z-10 flex items-center justify-between px-2 sm:px-4 h-12 left-1/2 -translate-x-1/2 w-fit max-w-[calc(100vw-1.5rem)] sm:left-4 sm:right-4 sm:translate-x-0 sm:w-auto">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Menu button (shown when sidebar is closed) */}
        {!sidebarOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            title="Open sidebar"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-850 h-9 w-9 flex-shrink-0 rounded-xl transition-colors"
          >
            <Menu className="h-[18px] w-[18px]" />
          </Button>
        )}

        {/* Model Selector (passed as children) */}
        {children}
      </div>

      {/* New chat button */}
      <div className="flex items-center flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/app" })}
          title="New chat"
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-850 hidden sm:flex h-8 px-3 rounded-xl transition-colors gap-1.5"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm">New</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: "/app" })}
          title="New chat"
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-850 sm:hidden h-8 w-8 rounded-xl transition-colors"
        >
          <Plus className="h-[18px] w-[18px]" />
        </Button>
      </div>
    </header>
  );
});
