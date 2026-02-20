import { Outlet } from '@tanstack/react-router';

export function RootLayout() {
  return (
    <div className="min-h-[100dvh] bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200">
      <Outlet />
    </div>
  );
}
