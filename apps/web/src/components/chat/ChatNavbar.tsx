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
    <header className="absolute top-2 z-10 flex items-center justify-between px-3 sm:px-4 md:px-6 h-12 left-0 right-0 w-full max-w-5xl md:max-w-none mx-auto md:mx-0 pointer-events-none">
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Menu button (shown when sidebar is closed) */}
        {!sidebarOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            title="Open sidebar"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-850 h-9 w-9 flex-shrink-0 rounded-xl transition-colors md:hidden"
          >
            <Menu className="h-[18px] w-[18px]" />
          </Button>
        )}

        {/* Model Selector (passed as children) */}
        {children}
      </div>

      {/* New chat button */}
      <div className="flex items-center flex-shrink-0 pointer-events-auto">
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
