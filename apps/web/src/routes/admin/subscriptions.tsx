import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const statusOptions = [
  { value: undefined, label: "All" },
  { value: "active" as const, label: "Active" },
  { value: "on_hold" as const, label: "On Hold" },
  { value: "cancelled" as const, label: "Cancelled" },
  { value: "trialing" as const, label: "Trialing" },
];

export function AdminSubscriptionsPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading } = trpc.admin.listSubscriptions.useQuery({
    limit,
    offset: page * limit,
    status: statusFilter as any,
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
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="p-3 text-left font-medium">User ID</th>
              <th className="p-3 text-left font-medium">Plan</th>
              <th className="p-3 text-left font-medium">Status</th>
              <th className="p-3 text-left font-medium">Interval</th>
              <th className="p-3 text-left font-medium">Period End</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading
              ? [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="p-3">
                      <div className="h-8 animate-pulse rounded bg-secondary" />
                    </td>
                  </tr>
                ))
              : data?.subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-accent/50">
                    <td className="p-3 font-mono text-xs">{sub.userId}</td>
                    <td className="p-3">{sub.planId}</td>
                    <td className="p-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          sub.status === "active"
                            ? "bg-green-500/10 text-green-600"
                            : sub.status === "on_hold"
                              ? "bg-yellow-500/10 text-yellow-600"
                              : "bg-secondary text-muted-foreground"
                        )}
                      >
                        {sub.status}
                      </span>
                    </td>
                    <td className="p-3">{sub.billingInterval}</td>
                    <td className="p-3 text-muted-foreground">
                      {sub.currentPeriodEnd
                        ? new Date(sub.currentPeriodEnd).toLocaleDateString()
                        : "\u2014"}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

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
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
