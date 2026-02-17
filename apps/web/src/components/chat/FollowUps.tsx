import { memo } from 'react';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
        <Button
          key={idx}
          variant="outline"
          onClick={() => onSelect(followUp)}
          className={cn(
            'group h-auto justify-start whitespace-normal text-left',
            'px-3 sm:px-4 py-2.5 sm:py-2.5 rounded-xl',
            'bg-gray-50 dark:bg-gray-850 hover:bg-gray-100 dark:hover:bg-gray-850',
            'border-gray-100 dark:border-gray-850 hover:border-gray-200 dark:hover:border-gray-800',
            'text-gray-500 dark:text-gray-400 hover:text-foreground',
            'transition-all duration-150',
            'max-w-full'
          )}
        >
          <ArrowRight className="h-4 w-4 mr-2 text-muted-foreground/60 group-hover:text-muted-foreground shrink-0 transition-colors" />
          <span className="line-clamp-2">{followUp}</span>
        </Button>
      ))}
    </div>
  );
});
