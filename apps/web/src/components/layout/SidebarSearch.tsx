import { useUIStore } from '@/stores/uiStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

export function SidebarSearch() {
  const { sidebarSearchQuery, setSidebarSearchQuery } = useUIStore();

  return (
    <div className="px-2 pb-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search chats..."
          value={sidebarSearchQuery}
          onChange={(e) => setSidebarSearchQuery(e.target.value)}
          className="pl-9 pr-8 h-9 bg-sidebar-accent border-sidebar-border text-sidebar-foreground placeholder:text-muted-foreground focus-visible:ring-sidebar-ring"
        />
        {sidebarSearchQuery && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarSearchQuery('')}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-sidebar-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
