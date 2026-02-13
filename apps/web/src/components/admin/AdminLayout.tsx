import { Link, Navigate, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useUser } from "@clerk/clerk-react";
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
  const { user, isLoaded } = useUser();
  const matchRoute = useMatchRoute();

  if (isLoaded && (!user || (user.publicMetadata as Record<string, unknown>)?.role !== "admin")) {
    return <Navigate to="/app" />;
  }

  if (!isLoaded) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ background: "var(--chat-shell-bg)" }}
      >
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-full" style={{ background: "var(--chat-shell-bg)" }}>
      {/* Admin Sidebar */}
      <aside className="w-60 flex-shrink-0 border-r border-[var(--chat-divider)] bg-[var(--chat-surface)] p-4 space-y-1">
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
                  ? "chat-pill text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-[var(--chat-muted)]"
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
