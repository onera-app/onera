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
  chatId,
  children,
}: ChatNavbarProps) {
  void chatId;
  const navigate = useNavigate();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 sm:px-4 h-14 bg-background/60 backdrop-blur-2xl w-full">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Menu button (shown when sidebar is closed) */}
        {!sidebarOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            title="Open sidebar"
            className="text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] h-9 w-9 flex-shrink-0 rounded-xl transition-all duration-200"
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
          className="text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] hidden sm:flex h-8 px-3 rounded-xl transition-all duration-200 gap-1.5"
        >
          <Plus className="h-4 w-4" />
          <span className="text-[13px]">New</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: "/app" })}
          title="New chat"
          className="text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] sm:hidden h-8 w-8 rounded-xl transition-all duration-200"
        >
          <Plus className="h-[18px] w-[18px]" />
        </Button>
      </div>
    </header>
  );
});
