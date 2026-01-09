import { cn } from '@/lib/utils';

interface FollowUpsProps {
  followUps: string[];
  onSelect: (followUp: string) => void;
  className?: string;
}

export function FollowUps({ followUps, onSelect, className }: FollowUpsProps) {
  if (followUps.length === 0) return null;

  return (
    <div className={cn('mt-4', className)}>
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
        Suggested follow-ups
      </div>
      <div className="flex flex-col gap-1">
        {followUps.map((followUp, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(followUp)}
            className={cn(
              'text-left text-sm py-1.5 px-3 rounded-lg transition-colors',
              'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700',
              'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white',
              'border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            )}
          >
            <span className="line-clamp-2">{followUp}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
