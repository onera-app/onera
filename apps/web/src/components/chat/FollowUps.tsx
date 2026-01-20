import { memo } from 'react';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

interface FollowUpsProps {
  followUps: string[];
  onSelect: (followUp: string) => void;
  className?: string;
}

export const FollowUps = memo(function FollowUps({ followUps, onSelect, className }: FollowUpsProps) {
  if (followUps.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      {followUps.map((followUp, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(followUp)}
          className={cn(
            'group flex items-center gap-3 w-full text-left',
            'px-3 py-2.5 rounded-xl',
            'bg-neutral-900/50 hover:bg-neutral-800/80',
            'border border-neutral-800 hover:border-neutral-700',
            'text-sm text-neutral-300 hover:text-white',
            'transition-all duration-150'
          )}
        >
          <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-200 shrink-0 transition-colors" />
          <span className="line-clamp-2">{followUp}</span>
        </button>
      ))}
    </div>
  );
});
