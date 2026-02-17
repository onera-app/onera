import { Link, Navigate, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useAuth } from "@/providers/SupabaseAuthProvider";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/app/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/admin/users", label: "Users", icon: Users, exact: false },
  {
    to: "/app/admin/subscriptions",
    label: "Subscriptions",
    icon: CreditCard,
    exact: false,
  },
  { to: "/app/admin/invoices", label: "Invoices", icon: Receipt, exact: false },
] as const;

export function AdminLayout() {
  const { user, isLoading } = useAuth();
  const adminCheck = trpc.admin.checkAccess.useQuery(undefined, {
    enabled: !!user,
    retry: false,
  });
  const matchRoute = useMatchRoute();

  if (!isLoading && adminCheck.isFetched && adminCheck.data?.isAdmin !== true) {
    return <Navigate to="/app" />;
  }

  if (isLoading || adminCheck.isLoading) {
    return (
      <div
        className="flex items-center justify-center h-full bg-white dark:bg-gray-900"
      >
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white dark:bg-gray-900">
      {/* Admin Sidebar */}
      <aside className="w-60 flex-shrink-0 border-r border-gray-100 dark:border-gray-850 bg-gray-50 dark:bg-gray-900 p-4 space-y-1">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link to="/app">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h2 className="font-semibold text-sm">Admin Panel</h2>
        </div>

        {navItems.map((item) => {
          const isActive = item.exact
            ? matchRoute({ to: item.to })
            : matchRoute({ to: item.to, fuzzy: true });

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                isActive
                  ? "chat-pill text-gray-900 dark:text-gray-100 font-medium"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-850"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </aside>

      {/* Admin Content */}
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
