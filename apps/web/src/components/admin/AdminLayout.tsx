import { Link, Outlet, useMatchRoute } from "@tanstack/react-router";
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
  const matchRoute = useMatchRoute();

  return (
    <div className="flex h-full">
      {/* Admin Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-border p-4 space-y-1">
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
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
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
