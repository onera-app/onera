import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface FollowUpsProps {
  followUps: string[];
  onSelect: (followUp: string) => void;
  className?: string;
}

export const FollowUps = memo(function FollowUps({ followUps, onSelect, className }: FollowUpsProps) {
  if (followUps.length === 0) return null;

  return (
    <div className={cn('mt-4', className)}>
      <div className="text-xs font-medium text-muted-foreground mb-2">
        Suggested follow-ups
      </div>
      <div className="flex flex-col gap-1">
        {followUps.map((followUp, idx) => (
          <Button
            key={idx}
            variant="outline"
            onClick={() => onSelect(followUp)}
            className="justify-start h-auto py-1.5 px-3 text-left"
          >
            <span className="line-clamp-2">{followUp}</span>
          </Button>
        ))}
      </div>
    </div>
  );
});
