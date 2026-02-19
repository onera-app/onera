import * as React from "react";
import { Search, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SearchableSelectProps {
    options: { value: string; label: string }[];
    value?: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    className?: string;
    triggerClassName?: string;
}

/**
 * A performance-optimized searchable dropdown component.
 * Implements a partial rendering strategy to handle large lists efficiently.
 */
export function SearchableSelect({
    options,
    value,
    onValueChange,
    placeholder = "Select...",
    searchPlaceholder = "Search...",
    className,
    triggerClassName,
}: SearchableSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const [isFullyRendered, setIsFullyRendered] = React.useState(false);

    // Reset rendering state when closed
    React.useEffect(() => {
        if (!open) {
            const timer = setTimeout(() => {
                setIsFullyRendered(false);
                setSearch("");
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [open]);

    const filteredOptions = React.useMemo(() => {
        if (!search) return options;
        const query = search.toLowerCase();
        return options.filter((option) =>
            option.label.toLowerCase().includes(query)
        );
    }, [options, search]);

    // Partial rendering strategy
    const displayOptions = React.useMemo(() => {
        if (isFullyRendered || search.length > 0) return filteredOptions;
        return filteredOptions.slice(0, 15);
    }, [filteredOptions, isFullyRendered, search]);

    // Lazy load the rest of the items
    React.useEffect(() => {
        if (open && !isFullyRendered) {
            const timer = requestIdleCallback(() => {
                setIsFullyRendered(true);
            });
            return () => cancelIdleCallback(timer);
        }
    }, [open, isFullyRendered]);

    const selectedOption = options.find((opt) => opt.value === value);

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        "flex items-center justify-between gap-2 px-3 py-1.5 h-auto text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-850 border border-transparent hover:border-gray-200 dark:hover:border-gray-800 rounded-xl transition-all",
                        triggerClassName
                    )}
                >
                    <span className="truncate max-w-[100px]">{selectedOption?.label || placeholder}</span>
                    <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                className={cn("w-[220px] p-0 overflow-hidden rounded-2xl shadow-2xl z-[100]", className)}
                onCloseAutoFocus={(e) => e.preventDefault()}
            >
                <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50/50 dark:bg-gray-850/50 border-b border-gray-100 dark:border-gray-800">
                    <Search className="h-3.5 w-3.5 text-gray-400" />
                    <input
                        autoFocus
                        className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600 text-gray-900 dark:text-gray-100"
                        placeholder={searchPlaceholder}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') setOpen(false);
                        }}
                    />
                </div>
                <div className="max-h-[280px] overflow-y-auto p-1 custom-scrollbar">
                    {displayOptions.length === 0 ? (
                        <div className="px-3 py-6 text-xs text-center text-gray-500 dark:text-gray-400">
                            No results found
                        </div>
                    ) : (
                        displayOptions.map((option) => (
                            <DropdownMenuItem
                                key={option.value}
                                onSelect={() => {
                                    onValueChange(option.value);
                                    setOpen(false);
                                }}
                                className={cn(
                                    "flex items-center justify-between gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors",
                                    value === option.value
                                        ? "bg-primary/10 text-primary font-medium"
                                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-850"
                                )}
                            >
                                <span className="truncate text-xs">{option.label}</span>
                                {value === option.value && <Check className="h-3 w-3" />}
                            </DropdownMenuItem>
                        ))
                    )}
                    {!isFullyRendered && filteredOptions.length > 15 && !search && (
                        <div className="px-3 py-2 text-[10px] text-center text-gray-400 animate-pulse">
                            Loading more...
                        </div>
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
