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
    <div className={cn('flex flex-col items-start gap-2 sm:gap-2.5', className)}>
      {followUps.map((followUp, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(followUp)}
          className={cn(
            'group inline-flex items-center gap-2 text-left',
            'px-3 sm:px-4 py-2.5 sm:py-2.5 rounded-xl',
            'bg-muted/50 hover:bg-muted active:bg-muted',
            'border border-border hover:border-border/80',
            'text-sm text-muted-foreground hover:text-foreground',
            'transition-all duration-150',
            'max-w-full'
          )}
        >
          <ArrowRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-muted-foreground shrink-0 transition-colors" />
          <span className="line-clamp-2">{followUp}</span>
        </button>
      ))}
    </div>
  );
});
