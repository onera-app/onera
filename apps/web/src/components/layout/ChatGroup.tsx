import { type DateGroup, DATE_GROUP_LABELS } from '@/lib/dateGrouping';
import { ChatItem } from './ChatItem';

interface Chat {
  id: string;
  decryptedTitle: string;
  updatedAt: number;
  isLocked?: boolean;
}

interface ChatGroupProps {
  group: DateGroup;
  chats: Chat[];
  onDelete: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
}

export function ChatGroup({ group, chats, onDelete, onRename }: ChatGroupProps) {
  if (chats.length === 0) return null;

  return (
    <div className="mb-2">
      {/* Group header */}
      <div className="px-4 py-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {DATE_GROUP_LABELS[group]}
        </h3>
      </div>

      {/* Chat items */}
      <div className="space-y-0.5">
        {chats.map((chat) => (
          <ChatItem
            key={chat.id}
            id={chat.id}
            title={chat.decryptedTitle}
            updatedAt={chat.updatedAt}
            isLocked={chat.isLocked}
            onDelete={onDelete}
            onRename={onRename}
          />
        ))}
      </div>
    </div>
  );
}
