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
    <div className={cn('flex flex-col items-start gap-2', className)}>
      {followUps.map((followUp, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(followUp)}
          className={cn(
            'group inline-flex items-center gap-2 text-left',
            'px-3 py-2 rounded-xl',
            'bg-neutral-900/50 hover:bg-neutral-800/80',
            'border border-neutral-800 hover:border-neutral-700',
            'text-sm text-neutral-300 hover:text-white',
            'transition-all duration-150'
          )}
        >
          <ArrowRight className="h-3.5 w-3.5 text-neutral-500 group-hover:text-neutral-300 shrink-0 transition-colors" />
          <span>{followUp}</span>
        </button>
      ))}
    </div>
  );
});
