import { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounce search input (#17)
  useEffect(() => {
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(debounceTimer.current);
  }, [search]);

  const { data, isLoading, error } = trpc.admin.listUsers.useQuery({
    limit,
    offset: page * limit,
    search: debouncedSearch || undefined,
  });

  const totalPages = data ? Math.ceil(data.totalCount / limit) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
      </div>

      {/* Search */}
      <div className="relative">
        <Label htmlFor="admin-user-search" className="sr-only">
          Search users
        </Label>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id="admin-user-search"
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm" role="alert" aria-live="assertive">
          Failed to load users: {error.message}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th scope="col" className="p-3 text-left font-medium">User</th>
              <th scope="col" className="p-3 text-left font-medium">Plan</th>
              <th scope="col" className="p-3 text-left font-medium">Status</th>
              <th scope="col" className="p-3 text-left font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading
              ? [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={4} className="p-3">
                      <div className="h-8 animate-pulse rounded bg-secondary" />
                    </td>
                  </tr>
                ))
              : data?.users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-accent/50 transition-colors"
                  >
                    <td className="p-3">
                      <Link
                        to="/app/admin/users/$userId"
                        params={{ userId: user.id }}
                        className="flex items-center gap-3"
                      >
                        {user.imageUrl ? (
                          <img
                            src={user.imageUrl}
                            alt=""
                            className="h-8 w-8 rounded-full"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-medium">
                            {user.name?.[0] || "?"}
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {user.email}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="p-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          user.subscription?.planId === "privacy_max" || user.subscription?.planId === "enterprise"
                            ? "bg-purple-500/10 text-purple-600"
                            : user.subscription?.planId === "pro"
                              ? "bg-blue-500/10 text-blue-600"
                              : user.subscription?.planId === "starter"
                                ? "bg-emerald-500/10 text-emerald-600"
                                : user.subscription?.planId === "team"
                                  ? "bg-amber-500/10 text-amber-600"
                                  : "bg-secondary text-muted-foreground"
                        )}
                      >
                        {user.subscription?.planId || "free"}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          user.subscription?.status === "active"
                            ? "bg-green-500/10 text-green-600"
                            : user.subscription?.status === "on_hold"
                              ? "bg-yellow-500/10 text-yellow-600"
                              : "bg-secondary text-muted-foreground"
                        )}
                      >
                        {user.subscription?.status || "none"}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
            {!isLoading && !error && data?.users.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-muted-foreground">
                  No users found for the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
