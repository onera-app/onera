import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Settings,
  Layout,
  Plug,
  Volume2,
  Database,
  User,
  CreditCard,
  Lock,
  Info,
  Wrench,
  Smartphone,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// Tab components
import { GeneralTab } from '../tabs/GeneralTab';
import { InterfaceTab } from '../tabs/InterfaceTab';
import { ConnectionsTab } from '../tabs/ConnectionsTab';
import { ToolsTab } from '../tabs/ToolsTab';
import { AudioTab } from '../tabs/AudioTab';
import { DataTab } from '../tabs/DataTab';
import { AccountTab } from '../tabs/AccountTab';
import { DevicesTab } from '../tabs/DevicesTab';
import { EncryptionTab } from '../tabs/EncryptionTab';
import { BillingTab } from '../tabs/BillingTab';
import { AboutTab } from '../tabs/AboutTab';

type TabId =
  | 'general'
  | 'interface'
  | 'connections'
  | 'tools'
  | 'audio'
  | 'data'
  | 'account'
  | 'billing'
  | 'devices'
  | 'encryption'
  | 'about';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string[];
  component: React.ComponentType;
}

const tabs: Tab[] = [
  {
    id: 'general',
    label: 'General',
    icon: Settings,
    keywords: ['model', 'parameters', 'temperature', 'system prompt', 'advanced'],
    component: GeneralTab,
  },
  {
    id: 'interface',
    label: 'Interface',
    icon: Layout,
    keywords: ['theme', 'language', 'ui', 'appearance', 'dark mode', 'chat'],
    component: InterfaceTab,
  },
  {
    id: 'connections',
    label: 'Connections',
    icon: Plug,
    keywords: ['api', 'openai', 'anthropic', 'ollama', 'credentials', 'provider'],
    component: ConnectionsTab,
  },
  {
    id: 'tools',
    label: 'Tools',
    icon: Wrench,
    keywords: ['search', 'web', 'exa', 'brave', 'tavily', 'serper', 'firecrawl'],
    component: ToolsTab,
  },
  {
    id: 'audio',
    label: 'Audio',
    icon: Volume2,
    keywords: ['voice', 'speech', 'tts', 'stt', 'text to speech'],
    component: AudioTab,
  },
  {
    id: 'data',
    label: 'Data',
    icon: Database,
    keywords: ['export', 'import', 'backup', 'archive', 'delete', 'chats'],
    component: DataTab,
  },
  {
    id: 'account',
    label: 'Account',
    icon: User,
    keywords: ['profile', 'name', 'email', 'password', 'avatar'],
    component: AccountTab,
  },
  {
    id: 'billing',
    label: 'Billing',
    icon: CreditCard,
    keywords: ['billing', 'subscription', 'plan', 'upgrade', 'invoice', 'payment'],
    component: BillingTab,
  },
  {
    id: 'devices',
    label: 'Devices',
    icon: Smartphone,
    keywords: ['device', 'browser', 'sessions', 'trusted', 'revoke'],
    component: DevicesTab,
  },
  {
    id: 'encryption',
    label: 'Encryption',
    icon: Lock,
    keywords: ['e2ee', 'security', 'recovery', 'key', 'password'],
    component: EncryptionTab,
  },
  {
    id: 'about',
    label: 'About',
    icon: Info,
    keywords: ['version', 'updates', 'github', 'license'],
    component: AboutTab,
  },
];

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: TabId;
}

export function SettingsModal({ open, onOpenChange, initialTab = 'general' }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  // On mobile, track whether we're viewing a tab or the tab list
  const [mobileShowContent, setMobileShowContent] = useState(false);

  // Update active tab when initialTab prop changes (e.g., from openSettingsModal)
  useEffect(() => {
    if (open && initialTab) {
      setActiveTab(initialTab);
      // On desktop, always show content; on mobile, show content if initialTab specified
      setMobileShowContent(initialTab !== 'general');
    }
  }, [open, initialTab]);

  // Reset mobile state when modal closes
  useEffect(() => {
    if (!open) {
      setMobileShowContent(false);
      setSearchQuery('');
    }
  }, [open]);

  const filteredTabs = searchQuery
    ? tabs.filter(
        (tab) =>
          tab.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tab.keywords.some((kw) => kw.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : tabs;

  const handleTabChange = useCallback((tabId: TabId) => {
    setActiveTab(tabId);
    setSearchQuery('');
    setMobileShowContent(true);
  }, []);

  const handleMobileBack = useCallback(() => {
    setMobileShowContent(false);
  }, []);

  const ActiveTabComponent = tabs.find((t) => t.id === activeTab)?.component || GeneralTab;
  const activeTabLabel = tabs.find((t) => t.id === activeTab)?.label || 'Settings';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] max-h-[85vh] sm:h-[85vh] p-0 gap-0 flex flex-col border-0 w-[calc(100vw-2rem)] sm:w-full">
        {/* Desktop Header - always visible on desktop */}
        <DialogHeader className="hidden sm:block px-6 py-4 shrink-0">
          <DialogTitle className="text-xl">Settings</DialogTitle>
        </DialogHeader>

        {/* Mobile Header - changes based on state */}
        <DialogHeader className="sm:hidden px-3 py-3 shrink-0 border-b border-border">
          {mobileShowContent ? (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -ml-1"
                onClick={handleMobileBack}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <DialogTitle className="text-lg">{activeTabLabel}</DialogTitle>
            </div>
          ) : (
            <DialogTitle className="text-lg">Settings</DialogTitle>
          )}
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar navigation - hidden on mobile when viewing content */}
          <div className={cn(
            "w-full sm:w-56 flex flex-col shrink-0",
            mobileShowContent && "hidden sm:flex"
          )}>
            {/* Search */}
            <div className="p-3">
              <Input
                placeholder="Search settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9"
              />
            </div>

            {/* Tab list */}
            <ScrollArea className="flex-1">
              <nav className="p-2 space-y-1">
                {filteredTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 sm:py-2 rounded-md text-sm font-medium transition-colors',
                        activeTab === tab.id
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1 text-left">{tab.label}</span>
                      <ChevronRight className="h-4 w-4 sm:hidden text-muted-foreground" />
                    </button>
                  );
                })}
              </nav>
            </ScrollArea>
          </div>

          {/* Tab content - hidden on mobile when viewing tab list */}
          <ScrollArea className={cn(
            "flex-1",
            !mobileShowContent && "hidden sm:block"
          )}>
            <div className="p-4 sm:p-6">
              <ActiveTabComponent />
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
