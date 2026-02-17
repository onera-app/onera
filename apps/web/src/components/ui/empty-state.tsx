import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
}

const sizeStyles = {
  sm: {
    container: 'py-6',
    iconWrapper: 'w-10 h-10 rounded-lg',
    icon: 'w-5 h-5',
    title: 'text-sm font-medium',
    description: 'text-xs',
  },
  md: {
    container: 'py-8',
    iconWrapper: 'w-12 h-12 rounded-xl',
    icon: 'w-6 h-6',
    title: 'text-base font-medium',
    description: 'text-sm',
  },
  lg: {
    container: 'py-12',
    iconWrapper: 'w-16 h-16 rounded-2xl',
    icon: 'w-8 h-8',
    title: 'text-lg font-semibold',
    description: 'text-sm',
  },
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  size = 'md',
  className,
  children,
}: EmptyStateProps) {
  const styles = sizeStyles[size];

  return (
    <div className={cn('text-center', styles.container, className)}>
      <div
        className={cn(
          'mx-auto mb-3 flex items-center justify-center bg-gray-100 dark:bg-gray-850',
          styles.iconWrapper
        )}
      >
        <Icon className={cn('text-muted-foreground', styles.icon)} />
      </div>
      <p className={cn('text-foreground', styles.title)}>{title}</p>
      {description && (
        <p className={cn('text-muted-foreground mt-1', styles.description)}>
          {description}
        </p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
