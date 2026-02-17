import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type SubscriptionStatus = "active" | "on_hold" | "cancelled" | "trialing" | "expired";

const statusOptions: { value: SubscriptionStatus | undefined; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "cancelled", label: "Cancelled" },
  { value: "trialing", label: "Trialing" },
  { value: "expired", label: "Expired" },
];

export function AdminSubscriptionsPage() {
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | undefined>();
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading, error } = trpc.admin.listSubscriptions.useQuery({
    limit,
    offset: page * limit,
    status: statusFilter,
  });

  const totalPages = data ? Math.ceil(data.totalCount / limit) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Subscriptions</h1>

      {/* Status filter */}
      <div className="flex gap-2">
        {statusOptions.map((opt) => (
          <Button
            key={opt.label}
            variant={statusFilter === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatusFilter(opt.value);
              setPage(0);
            }}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-850">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-850 bg-gray-50 dark:bg-gray-800/50">
              <th scope="col" className="p-3 text-left font-medium">User ID</th>
              <th scope="col" className="p-3 text-left font-medium">Plan</th>
              <th scope="col" className="p-3 text-left font-medium">Status</th>
              <th scope="col" className="p-3 text-left font-medium">Interval</th>
              <th scope="col" className="p-3 text-left font-medium">Period End</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-850">
            {isLoading
              ? [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="p-3">
                      <div className="h-8 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                    </td>
                  </tr>
                ))
              : data?.subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50 dark:hover:bg-gray-850">
                    <td className="p-3 font-mono text-xs">{sub.userId}</td>
                    <td className="p-3">{sub.planId}</td>
                    <td className="p-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          sub.status === "active"
                            ? "bg-status-success/10 text-status-success-text"
                            : sub.status === "on_hold"
                              ? "bg-status-warning/10 text-status-warning-text"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                        )}
                      >
                        {sub.status}
                      </span>
                    </td>
                    <td className="p-3">{sub.billingInterval}</td>
                    <td className="p-3 text-gray-500 dark:text-gray-400">
                      {sub.currentPeriodEnd
                        ? new Date(sub.currentPeriodEnd).toLocaleDateString()
                        : "\u2014"}
                    </td>
                  </tr>
                ))}
            {!isLoading && !error && data?.subscriptions.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500 dark:text-gray-400">
                  No subscriptions found for this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm" role="alert" aria-live="assertive">
          Failed to load subscriptions: {error.message}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">
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
