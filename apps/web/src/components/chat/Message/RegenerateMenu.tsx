/**
 * RegenerateMenu Component
 * Dropdown menu for regenerating AI responses with different options
 * Inspired by open-webui's implementation
 */

import { useState, memo } from "react";
import {
  RefreshCw,
  ChevronDown,
  Zap,
  FileText,
  Minimize2,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { RegenerateOptions } from "./AssistantMessage";

interface RegenerateMenuProps {
  onRegenerate: (options?: RegenerateOptions) => void;
  disabled?: boolean;
}

const REGENERATE_OPTIONS = [
  {
    id: "retry",
    label: "Try Again",
    description: "Regenerate the response",
    icon: RefreshCw,
    modifier: undefined,
  },
  {
    id: "details",
    label: "Add Details",
    description: "Ask for more detailed explanation",
    icon: FileText,
    modifier: "Please provide more details and expand on your explanation.",
  },
  {
    id: "concise",
    label: "More Concise",
    description: "Ask for a shorter response",
    icon: Minimize2,
    modifier: "Please be more concise and brief in your response.",
  },
  {
    id: "creative",
    label: "Be Creative",
    description: "Ask for a more creative response",
    icon: Zap,
    modifier: "Please be more creative and think outside the box.",
  },
] as const;

export const RegenerateMenu = memo(function RegenerateMenu({
  onRegenerate,
  disabled,
}: RegenerateMenuProps) {
  const [customPrompt, setCustomPrompt] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleRegenerate = (modifier?: string) => {
    onRegenerate(modifier ? { modifier } : undefined);
    setIsOpen(false);
    setCustomPrompt("");
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPrompt.trim()) {
      handleRegenerate(customPrompt.trim());
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="h-7 gap-1 px-2 text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="h-4 w-4" />
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        {REGENERATE_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onClick={() => handleRegenerate(option.modifier)}
            className="flex items-start gap-3 px-3 py-2.5 cursor-pointer"
          >
            <option.icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{option.label}</span>
              <span className="text-xs text-muted-foreground">
                {option.description}
              </span>
            </div>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        {/* Custom prompt input */}
        <form onSubmit={handleCustomSubmit} className="p-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Custom instruction..."
              className="h-8 text-sm"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {customPrompt.trim() && (
            <Button type="submit" size="sm" className="w-full mt-2 h-7">
              Regenerate with custom prompt
            </Button>
          )}
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
