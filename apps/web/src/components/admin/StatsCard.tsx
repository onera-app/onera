import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: IconSvgElement;
  description?: string;
}

export function StatsCard({ label, value, icon, description }: StatsCardProps) {
  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-850 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {label}
        </span>
        <HugeiconsIcon
          icon={icon}
          size={16}
          className="text-gray-500 dark:text-gray-400"
        />
      </div>
      <div className="mt-2">
        <span className="text-2xl font-bold">{value}</span>
      </div>
      {description && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}
    </div>
  );
}
