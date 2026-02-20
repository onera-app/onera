import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  CreditCardIcon,
  DatabaseIcon,
  InformationCircleIcon,
  Layout01Icon,
  LockIcon,
  Plug01Icon,
  Search01Icon,
  Settings01Icon,
  SmartPhone01Icon,
  UserIcon,
  VolumeHighIcon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons";
import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Tab components
import { GeneralTab } from "../tabs/GeneralTab";
import { InterfaceTab } from "../tabs/InterfaceTab";
import { ConnectionsTab } from "../tabs/ConnectionsTab";
import { ToolsTab } from "../tabs/ToolsTab";
import { AudioTab } from "../tabs/AudioTab";
import { DataTab } from "../tabs/DataTab";
import { AccountTab } from "../tabs/AccountTab";
import { DevicesTab } from "../tabs/DevicesTab";
import { EncryptionTab } from "../tabs/EncryptionTab";
import { BillingTab } from "../tabs/BillingTab";
import { AboutTab } from "../tabs/AboutTab";

type TabId =
  | "general"
  | "interface"
  | "connections"
  | "tools"
  | "audio"
  | "data"
  | "account"
  | "billing"
  | "devices"
  | "encryption"
  | "about";

interface Tab {
  id: TabId;
  label: string;
  icon: IconSvgElement;
  keywords: string[];
  component: React.ComponentType;
}

const tabs: Tab[] = [
  {
    id: "general",
    label: "General",
    icon: Settings01Icon,
    keywords: [
      "model",
      "parameters",
      "temperature",
      "system prompt",
      "advanced",
    ],
    component: GeneralTab,
  },
  {
    id: "interface",
    label: "Interface",
    icon: Layout01Icon,
    keywords: ["theme", "language", "ui", "appearance", "dark mode", "chat"],
    component: InterfaceTab,
  },
  {
    id: "connections",
    label: "Connections",
    icon: Plug01Icon,
    keywords: [
      "api",
      "openai",
      "anthropic",
      "ollama",
      "credentials",
      "provider",
    ],
    component: ConnectionsTab,
  },
  {
    id: "tools",
    label: "Tools",
    icon: Wrench01Icon,
    keywords: [
      "search",
      "web",
      "exa",
      "brave",
      "tavily",
      "serper",
      "firecrawl",
    ],
    component: ToolsTab,
  },
  {
    id: "audio",
    label: "Audio",
    icon: VolumeHighIcon,
    keywords: ["audio", "tts", "text to speech"],
    component: AudioTab,
  },
  {
    id: "data",
    label: "Data",
    icon: DatabaseIcon,
    keywords: ["export", "import", "backup", "archive", "delete", "chats"],
    component: DataTab,
  },
  {
    id: "account",
    label: "Account",
    icon: UserIcon,
    keywords: ["profile", "name", "email", "password", "avatar"],
    component: AccountTab,
  },
  {
    id: "billing",
    label: "Billing",
    icon: CreditCardIcon,
    keywords: [
      "billing",
      "subscription",
      "plan",
      "upgrade",
      "invoice",
      "payment",
    ],
    component: BillingTab,
  },
  {
    id: "devices",
    label: "Devices",
    icon: SmartPhone01Icon,
    keywords: ["device", "browser", "sessions", "trusted", "revoke"],
    component: DevicesTab,
  },
  {
    id: "encryption",
    label: "Encryption",
    icon: LockIcon,
    keywords: ["e2ee", "security", "recovery", "key", "password"],
    component: EncryptionTab,
  },
  {
    id: "about",
    label: "About",
    icon: InformationCircleIcon,
    keywords: ["version", "updates", "github", "license"],
    component: AboutTab,
  },
];

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: TabId;
}

export function SettingsModal({
  open,
  onOpenChange,
  initialTab = "general",
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  // On mobile, track whether we're viewing a tab or the tab list
  const [mobileShowContent, setMobileShowContent] = useState(false);

  // Update active tab when initialTab prop changes (e.g., from openSettingsModal)
  useEffect(() => {
    if (open && initialTab) {
      setActiveTab(initialTab);
      // On desktop, always show content; on mobile, show content if initialTab specified
      setMobileShowContent(initialTab !== "general");
    }
  }, [open, initialTab]);

  // Reset mobile state when modal closes
  useEffect(() => {
    if (!open) {
      setMobileShowContent(false);
      setSearchQuery("");
    }
  }, [open]);

  const filteredTabs = searchQuery
    ? tabs.filter(
        (tab) =>
          tab.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tab.keywords.some((kw) =>
            kw.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
      )
    : tabs;

  const handleTabChange = useCallback((tabId: TabId) => {
    setActiveTab(tabId);
    setSearchQuery("");
    setMobileShowContent(true);
  }, []);

  const handleMobileBack = useCallback(() => {
    setMobileShowContent(false);
  }, []);

  const ActiveTabComponent =
    tabs.find((t) => t.id === activeTab)?.component || GeneralTab;
  const activeTabLabel =
    tabs.find((t) => t.id === activeTab)?.label || "Settings";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="max-w-4xl h-[85vh] max-h-[85vh] sm:h-[85vh] p-0 gap-0 flex flex-col w-[calc(100vw-2rem)] sm:w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-white dark:border-gray-850 rounded-[2rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]"
      >
        {/* Desktop Header — Open WebUI style */}
        <DialogHeader className="hidden sm:flex flex-row items-center justify-between dark:text-gray-300 px-4 md:px-[1.125rem] pt-[1.125rem] pb-0.5 md:pb-2.5 shrink-0">
          <DialogTitle className="text-lg font-medium">Settings</DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-850 transition-colors focus:outline-none"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
          </button>
        </DialogHeader>

        {/* Mobile Header */}
        <DialogHeader className="sm:hidden px-3 py-3 shrink-0 border-b border-gray-100 dark:border-gray-850">
          {mobileShowContent ? (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -ml-1"
                onClick={handleMobileBack}
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} className="h-5 w-5" />
              </Button>
              <DialogTitle className="text-lg font-medium">
                {activeTabLabel}
              </DialogTitle>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-medium">
                Settings
              </DialogTitle>
              <button
                onClick={() => onOpenChange(false)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-850 transition-colors"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
              </button>
            </div>
          )}
        </DialogHeader>

        <div className="flex flex-col md:flex-row flex-1 min-h-0 w-full pt-1 pb-4">
          {/* Sidebar navigation — Open WebUI tab style */}
          <div
            className={cn(
              "tabs flex flex-row overflow-x-auto gap-2.5 mx-3 md:pr-4 md:gap-1 md:flex-col flex-1 md:flex-none md:w-[200px] md:overflow-y-auto md:scrollbar-hidden text-gray-700 dark:text-gray-200 text-sm text-left mb-1 md:mb-0",
              mobileShowContent && "hidden md:flex",
            )}
          >
            {/* Search — desktop only */}
            <div className="hidden md:flex w-full rounded-full px-2.5 gap-2 bg-gray-100/80 dark:bg-gray-850/80 my-1 mb-1.5 items-center">
              <HugeiconsIcon
                icon={Search01Icon}
                className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0"
              />
              <input
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-1.5 text-sm bg-transparent dark:text-gray-300 outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
              />
            </div>

            {/* Mobile search */}
            <div className="md:hidden w-full px-0 py-1">
              <Input
                placeholder="Search settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9"
              />
            </div>

            {/* Tab list */}
            <nav className="flex flex-row md:flex-col gap-0.5 overflow-x-auto md:overflow-x-visible scrollbar-hide">
              {filteredTabs.map((tab) => {
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={cn(
                      "px-0.5 md:px-2.5 py-1 min-w-fit rounded-xl flex-1 md:flex-none flex text-left transition items-center gap-2",
                      activeTab === tab.id
                        ? "text-gray-900 dark:text-white"
                        : "text-gray-300 dark:text-gray-600 hover:text-gray-700 dark:hover:text-white",
                    )}
                  >
                    <HugeiconsIcon
                      icon={tab.icon}
                      size={16}
                      className="shrink-0"
                    />
                    <span className="flex-1 text-left whitespace-nowrap">
                      {tab.label}
                    </span>
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      className="h-4 w-4 md:hidden text-gray-300 dark:text-gray-600 shrink-0"
                    />
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab content */}
          <ScrollArea
            className={cn(
              "flex-1 px-3.5 md:pl-0 md:pr-[1.125rem]",
              !mobileShowContent && "hidden sm:block",
            )}
          >
            <div className="py-1">
              <ActiveTabComponent />
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
