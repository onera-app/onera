import { cn } from "@/lib/utils";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

interface EmptyStateProps {
  icon: IconSvgElement;
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  children?: React.ReactNode;
}

const sizeStyles = {
  sm: {
    container: "py-6",
    iconWrapper: "w-10 h-10 rounded-lg",
    iconSize: 20,
    title: "text-sm font-medium",
    description: "text-xs",
  },
  md: {
    container: "py-8",
    iconWrapper: "w-12 h-12 rounded-xl",
    iconSize: 24,
    title: "text-base font-medium",
    description: "text-sm",
  },
  lg: {
    container: "py-12",
    iconWrapper: "w-16 h-16 rounded-2xl",
    iconSize: 32,
    title: "text-lg font-semibold",
    description: "text-sm",
  },
};

export function EmptyState({
  icon,
  title,
  description,
  size = "md",
  className,
  children,
}: EmptyStateProps) {
  const styles = sizeStyles[size];

  return (
    <div className={cn("text-center", styles.container, className)}>
      <div
        className={cn(
          "mx-auto mb-3 flex items-center justify-center bg-gray-100 dark:bg-gray-850",
          styles.iconWrapper,
        )}
      >
        <HugeiconsIcon
          icon={icon}
          size={styles.iconSize}
          className="text-gray-500 dark:text-gray-400"
        />
      </div>
      <p className={cn("text-gray-900 dark:text-gray-100", styles.title)}>
        {title}
      </p>
      {description && (
        <p
          className={cn(
            "text-gray-500 dark:text-gray-400 mt-1",
            styles.description,
          )}
        >
          {description}
        </p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
