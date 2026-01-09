import { Outlet } from '@tanstack/react-router';

export function RootLayout() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <Outlet />
    </div>
  );
}
