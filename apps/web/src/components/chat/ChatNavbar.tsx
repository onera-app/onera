import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Menu01Icon } from "@hugeicons/core-free-icons";
import { memo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useUIStore } from "@/stores/uiStore";
import { Button } from "@/components/ui/button";

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
    <>
      <header className="absolute top-[1px] z-10 left-1 sm:left-4 flex items-center gap-2 sm:gap-3 px-2 sm:px-3 h-12 w-fit max-w-[calc(100vw-1.5rem)] sm:w-auto pointer-events-none">
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
              <HugeiconsIcon icon={Menu01Icon} className="h-[18px] w-[18px]" />
            </Button>
          )}

          {/* Model Selector (passed as children) */}
          {children}
        </div>
      </header>

      {/* New chat button */}
      <div className="absolute top-[1px] right-3 sm:right-4 md:right-6 z-10 h-12 flex items-center pointer-events-none">
        <div className="flex items-center flex-shrink-0 pointer-events-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: "/app" })}
            title="New chat"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-850 hidden sm:flex h-8 px-3 rounded-xl transition-colors gap-1.5"
          >
            <HugeiconsIcon icon={Add01Icon} className="h-4 w-4" />
            <span className="text-sm">New</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: "/app" })}
            title="New chat"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-850 sm:hidden h-8 w-8 rounded-xl transition-colors"
          >
            <HugeiconsIcon icon={Add01Icon} className="h-[18px] w-[18px]" />
          </Button>
        </div>
      </div>
    </>
  );
});
