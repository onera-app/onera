import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Menu01Icon } from "@hugeicons/core-free-icons";
import { memo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useUIStore } from "@/stores/uiStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TrustBadge } from "./TrustBadge";

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
      <header className={cn(
        "z-30 flex items-center justify-between px-3 h-14 w-full transition-all duration-300",
        // Mobile: Fixed with glassmorphism
        "fixed top-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 sm:border-0 sm:bg-transparent sm:backdrop-blur-none sm:absolute sm:h-12 sm:top-[1px] sm:px-4",
      )}>
        <div className="flex items-center gap-2">
          {/* Menu button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            title="Open sidebar"
            className={cn(
              "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 h-10 w-10 flex-shrink-0 rounded-full transition-colors md:hidden",
              sidebarOpen && "opacity-0 pointer-events-none"
            )}
          >
            <HugeiconsIcon icon={Menu01Icon} className="h-5 w-5 md:h-[18px] md:w-[18px]" />
          </Button>

          {/* Model Selector - Center on mobile if needed, but keeping it left-aligned for now as children */}
          <div className="flex-1 min-w-0 sm:flex-none">
            {children}
          </div>
          <TrustBadge />
        </div>

        {/* New chat button */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: "/app" })}
            title="New chat"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 hidden sm:flex h-9 px-4 rounded-full transition-colors gap-2 font-medium"
          >
            <HugeiconsIcon icon={Add01Icon} className="h-4 w-4" />
            <span>New Chat</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: "/app" })}
            title="New chat"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 sm:hidden h-10 w-10 rounded-full transition-colors"
          >
            <HugeiconsIcon icon={Add01Icon} className="h-5 w-5" />
          </Button>
        </div>
      </header>
    </>
  );
});
