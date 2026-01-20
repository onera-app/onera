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
            'bg-muted/50 hover:bg-muted',
            'border border-border hover:border-border/80',
            'text-sm text-muted-foreground hover:text-foreground',
            'transition-all duration-150'
          )}
        >
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-muted-foreground shrink-0 transition-colors" />
          <span>{followUp}</span>
        </button>
      ))}
    </div>
  );
});
