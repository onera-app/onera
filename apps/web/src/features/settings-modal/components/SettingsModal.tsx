import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Settings,
  Layout,
  Plug,
  Volume2,
  Database,
  User,
  Lock,
  Info,
  Wrench,
  Smartphone,
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
import { AboutTab } from '../tabs/AboutTab';

type TabId =
  | 'general'
  | 'interface'
  | 'connections'
  | 'tools'
  | 'audio'
  | 'data'
  | 'account'
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
  }, []);

  const ActiveTabComponent = tabs.find((t) => t.id === activeTab)?.component || GeneralTab;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] p-0 gap-0 flex flex-col border-0">
        <DialogHeader className="px-6 py-4 shrink-0">
          <DialogTitle className="text-xl">Settings</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar navigation */}
          <div className="w-56 flex flex-col shrink-0">
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
                        'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                        activeTab === tab.id
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </ScrollArea>
          </div>

          {/* Tab content */}
          <ScrollArea className="flex-1">
            <div className="p-6">
              <ActiveTabComponent />
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
