/**
 * Date grouping utilities for chat list organization (OpenWebUI style)
 */

export type DateGroup =
  | 'today'
  | 'yesterday'
  | 'previous7Days'
  | 'previous30Days'
  | 'older';

export const DATE_GROUP_LABELS: Record<DateGroup, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  previous7Days: 'Previous 7 Days',
  previous30Days: 'Previous 30 Days',
  older: 'Older',
};

/**
 * Get the date group for a given timestamp
 */
export function getDateGroup(timestamp: number): DateGroup {
  const now = new Date();
  const date = new Date(timestamp);

  // Reset time to start of day for comparison
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOf7DaysAgo = new Date(startOfToday);
  startOf7DaysAgo.setDate(startOf7DaysAgo.getDate() - 7);
  const startOf30DaysAgo = new Date(startOfToday);
  startOf30DaysAgo.setDate(startOf30DaysAgo.getDate() - 30);

  if (date >= startOfToday) {
    return 'today';
  } else if (date >= startOfYesterday) {
    return 'yesterday';
  } else if (date >= startOf7DaysAgo) {
    return 'previous7Days';
  } else if (date >= startOf30DaysAgo) {
    return 'previous30Days';
  } else {
    return 'older';
  }
}

/**
 * Group items by date
 */
export function groupByDate<T extends { updatedAt: number }>(
  items: T[]
): Map<DateGroup, T[]> {
  const groups = new Map<DateGroup, T[]>();

  // Initialize all groups in order
  const groupOrder: DateGroup[] = ['today', 'yesterday', 'previous7Days', 'previous30Days', 'older'];
  groupOrder.forEach(group => groups.set(group, []));

  // Sort items by date (newest first) and group them
  const sorted = [...items].sort((a, b) => b.updatedAt - a.updatedAt);

  sorted.forEach(item => {
    const group = getDateGroup(item.updatedAt);
    groups.get(group)?.push(item);
  });

  // Remove empty groups
  groupOrder.forEach(group => {
    if (groups.get(group)?.length === 0) {
      groups.delete(group);
    }
  });

  return groups;
}

/**
 * Format relative time for display
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}
