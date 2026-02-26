import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon, ArrowDown01Icon, Loading02Icon, LockIcon, PinIcon, Search01Icon } from "@hugeicons/core-free-icons";
import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  memo,
  type KeyboardEvent,
} from "react";
import { useUIStore } from "@/stores/uiStore";
import { useE2EE } from "@/providers/E2EEProvider";
import { useCredentials } from "@/hooks/queries/useCredentials";
import {
  decryptCredentialsWithMetadata,
  getAvailableModelsFromCredentials,
  PRIVATE_MODEL_PREFIX,
  type ModelOption,
  type PartiallyDecryptedCredential,
} from "@/lib/ai";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { analytics } from "@/lib/analytics";

import { TooltipProvider } from "@/components/ui/tooltip";
import { useModelSelection } from "../hooks/useModelSelection";
import { ModelItem } from "./ModelItem";

interface ModelSelectorDropdownProps {
  value: string;
  onChange: (model: string) => void;
}

function groupModelsByProvider(
  models: ModelOption[],
): [string, ModelOption[]][] {
  const groups = new Map<string, ModelOption[]>();

  for (const model of models) {
    const existing = groups.get(model.provider) || [];
    existing.push(model);
    groups.set(model.provider, existing);
  }

  return Array.from(groups.entries());
}

export const ModelSelectorDropdown = memo(function ModelSelectorDropdown({
  value,
  onChange,
}: ModelSelectorDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [models, setModels] = useState<ModelOption[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const { isUnlocked } = useE2EE();
  const { openSettingsModal } = useUIStore();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch credentials
  const rawCredentials = useCredentials();
  const checkingConnections = rawCredentials === undefined;
  const hasAnyConnections = rawCredentials && rawCredentials.length > 0;

  // Fetch private inference models from server (cached for 5 minutes)
  const { data: privateModels, isLoading: loadingPrivateModels } =
    trpc.enclaves.listModels.useQuery(undefined, {
      enabled: isUnlocked,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    });

  // Only block on initial load, not background refetches (show stale data while refetching)
  const privateModelsQueryPending =
    !isUnlocked || (loadingPrivateModels && !privateModels);

  // Use the model selection hook
  const { filteredModels, pinnedModels, unpinnedModels, togglePin, isPinned } =
    useModelSelection({
      models,
      searchQuery,
    });

  // Fetch available models when credentials or private models change
  useEffect(() => {
    async function loadModels() {
      if (!isUnlocked) {
        setModels([]);
        return;
      }

      setLoadingModels(true);
      try {
        // Fetch credential-based models
        let credentialModels: ModelOption[] = [];
        if (rawCredentials && rawCredentials.length > 0) {
          const partial: PartiallyDecryptedCredential[] = rawCredentials.map(
            (c) => ({
              id: c.id,
              provider: c.provider,
              name: c.name,
              encryptedData: c.encryptedData,
              iv: c.iv,
            }),
          );
          const decrypted = decryptCredentialsWithMetadata(partial);
          credentialModels = await getAvailableModelsFromCredentials(decrypted);
        }

        // Convert private models to ModelOption format
        const privateModelOptions: ModelOption[] = (privateModels || []).map(
          (m) => ({
            id: `${PRIVATE_MODEL_PREFIX}${m.id}`,
            name: m.displayName,
            provider: m.provider, // 'onera-private'
            credentialId: "", // No credential needed for private models
          }),
        );

        // Merge: private models first, then credential models
        setModels([...privateModelOptions, ...credentialModels]);
      } catch (err) {
        console.error("Failed to load models:", err);
        setModels([]);
      } finally {
        setLoadingModels(false);
      }
    }

    loadModels();
  }, [rawCredentials, isUnlocked, privateModels]);

  // Auto-select first model if none selected
  useEffect(() => {
    if (!value && models.length > 0) {
      onChange(models[0].id);
    }
  }, [models, value, onChange]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
      setHighlightedIndex(0);
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [isOpen]);

  // Flat list for keyboard navigation (pinned first, then unpinned)
  const flatModelList = useMemo(() => {
    return [...pinnedModels, ...unpinnedModels];
  }, [pinnedModels, unpinnedModels]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, flatModelList.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && flatModelList[highlightedIndex]) {
        e.preventDefault();
        onChange(flatModelList[highlightedIndex].id);
        setIsOpen(false);
        setSearchQuery("");
      } else if (e.key === "Escape") {
        setIsOpen(false);
        setSearchQuery("");
      }
    },
    [flatModelList, highlightedIndex, onChange],
  );

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-model-item]");
      const highlighted = items[highlightedIndex];
      if (highlighted) {
        highlighted.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Reset highlight when search changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  // Stable callbacks for ModelItem - prevents re-renders of all items
  const handleModelSelect = useCallback(
    (modelId: string) => {
      const selected = models.find((m) => m.id === modelId);
      analytics.model.selected({ model_id: modelId, provider: selected?.provider || '' });
      onChange(modelId);
      setIsOpen(false);
      setSearchQuery("");
    },
    [onChange, models],
  );

  const handleTogglePin = useCallback(
    (modelId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      togglePin(modelId);
    },
    [togglePin],
  );

  const selectedModel = models.find((m) => m.id === value);
  const isLoading =
    checkingConnections || loadingModels || privateModelsQueryPending;

  // No connections and no private models - only show after all queries complete
  const hasPrivateModels = privateModels && privateModels.length > 0;
  if (
    !checkingConnections &&
    !privateModelsQueryPending &&
    !hasAnyConnections &&
    !hasPrivateModels
  ) {
    return (
      <button
        onClick={() => openSettingsModal("connections")}
        className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm text-amber-500 hover:text-amber-600 hover:bg-gray-900/[0.06] dark:hover:bg-gray-100/[0.06] transition-colors duration-150"
      >
        <HugeiconsIcon icon={Alert01Icon} className="h-3.5 w-3.5" />
        <span>Add Connection</span>
      </button>
    );
  }

  // Not unlocked
  if (!isUnlocked) {
    return (
      <div className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm text-gray-500 dark:text-gray-400">
        <HugeiconsIcon icon={LockIcon} className="h-3 w-3" />
        <span>Unlock to select</span>
      </div>
    );
  }

  // Format provider name for display (e.g., "onera-private" -> "Private")
  const formatProviderName = (provider: string) => {
    if (provider === "onera-private") return "Private";
    // Capitalize first letter
    return provider.charAt(0).toUpperCase() + provider.slice(1);
  };

  return (
    <TooltipProvider>
      <div className="relative" ref={dropdownRef}>
        {/* Trigger button - Apple style: minimal, no border */}
        <button
          onClick={() => {
            if (!isOpen) analytics.model.selectorOpened();
            setIsOpen(!isOpen);
          }}
          disabled={isLoading || models.length === 0}
          className={cn(
            "flex max-w-[220px] sm:max-w-[280px] items-center gap-2 h-9 px-3 rounded-lg text-[15px] transition-all duration-150",
            "hover:bg-gray-900/[0.06] dark:hover:bg-gray-100/[0.06] active:bg-gray-900/10 dark:active:bg-gray-100/10",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            isOpen && "bg-gray-900/[0.06] dark:bg-gray-100/[0.06]",
          )}
        >
          {isLoading ? (
            <>
              <HugeiconsIcon icon={Loading02Icon} className="h-4 w-4 animate-spin text-gray-500 dark:text-gray-400" />
              <span className="text-[15px] text-gray-500 dark:text-gray-400">Loading...</span>
            </>
          ) : models.length === 0 ? (
            <span className="text-[15px] text-gray-500 dark:text-gray-400">No models</span>
          ) : (
            <>
              <span className="truncate text-[15px] text-gray-900 dark:text-gray-100 max-w-[164px] sm:max-w-[214px]">
                {selectedModel?.name || "Select model"}
              </span>
              <HugeiconsIcon icon={ArrowDown01Icon} className={cn(
                                                    "h-3.5 w-3.5 text-gray-500 dark:text-gray-400 transition-transform duration-150",
                                                    isOpen && "rotate-180",
                                                  )} />
            </>
          )}
        </button>

        {/* Dropdown panel */}
        {isOpen && models.length > 0 && (
          <div className="absolute left-0 mt-1 w-64 sm:w-80 max-w-[calc(100vw-2rem)] z-50 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-850 overflow-hidden">
            {/* Search input - cleaner, more subtle */}
            <div className="p-2 pb-1">
              <div className="relative">
                <HugeiconsIcon icon={Search01Icon} className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full h-9 pl-9 pr-3 rounded-lg bg-gray-900/[0.06] dark:bg-gray-100/[0.06] border-0 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                />
              </div>
            </div>

            {/* Model list */}
            <div className="max-h-64 overflow-y-auto overscroll-contain">
              <div ref={listRef} className="py-1">
                {filteredModels.length === 0 ? (
                  <div className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No models found
                  </div>
                ) : (
                  <>
                    {/* Pinned models section */}
                    {pinnedModels.length > 0 && (
                      <>
                        <div className="px-3 pt-1 pb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                          <HugeiconsIcon icon={PinIcon} className="h-2.5 w-2.5" />
                          Pinned
                        </div>
                        {pinnedModels.map((model) => {
                          const flatIndex = flatModelList.findIndex(
                            (m) => m.id === model.id,
                          );
                          return (
                            <ModelItem
                              key={model.id}
                              model={model}
                              isSelected={model.id === value}
                              isHighlighted={flatIndex === highlightedIndex}
                              isPinned={true}
                              onSelect={handleModelSelect}
                              onTogglePin={handleTogglePin}
                            />
                          );
                        })}
                        {unpinnedModels.length > 0 && (
                          <div className="my-1.5 mx-3 h-px bg-border" />
                        )}
                      </>
                    )}

                    {/* Unpinned models grouped by provider */}
                    {groupModelsByProvider(unpinnedModels).map(
                      ([provider, providerModels]) => (
                        <div key={provider}>
                          <div className="px-3 pt-1 pb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                            {formatProviderName(provider)}
                          </div>
                          {providerModels.map((model) => {
                            const flatIndex = flatModelList.findIndex(
                              (m) => m.id === model.id,
                            );
                            return (
                              <ModelItem
                                key={model.id}
                                model={model}
                                isSelected={model.id === value}
                                isHighlighted={flatIndex === highlightedIndex}
                                isPinned={isPinned(model.id)}
                                onSelect={handleModelSelect}
                                onTogglePin={handleTogglePin}
                              />
                            );
                          })}
                        </div>
                      ),
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
});
