import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ModelOption } from '@/lib/ai';

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface MentionListProps {
  items: ModelOption[];
  command: (item: { id: string; label: string }) => void;
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) {
        command({ id: item.id, label: item.name });
      }
    };

    const upHandler = () => {
      setSelectedIndex((selectedIndex + items.length - 1) % items.length);
    };

    const downHandler = () => {
      setSelectedIndex((selectedIndex + 1) % items.length);
    };

    const enterHandler = () => {
      selectItem(selectedIndex);
    };

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === 'ArrowUp') {
          upHandler();
          return true;
        }

        if (event.key === 'ArrowDown') {
          downHandler();
          return true;
        }

        if (event.key === 'Enter') {
          enterHandler();
          return true;
        }

        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="p-3 text-sm text-muted-foreground">No models found</div>
      );
    }

    return (
      <ScrollArea className="max-h-64">
        <div className="p-1">
          {items.map((item, index) => (
            <button
              key={item.id}
              onClick={() => selectItem(index)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left',
                'transition-colors',
                index === selectedIndex
                  ? 'bg-gray-100 dark:bg-gray-850 text-gray-900 dark:text-gray-100'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-850'
              )}
            >
              <span className="font-medium">{item.name}</span>
              <span className="text-xs text-muted-foreground">{item.provider}</span>
            </button>
          ))}
        </div>
      </ScrollArea>
    );
  }
);

MentionList.displayName = 'MentionList';
