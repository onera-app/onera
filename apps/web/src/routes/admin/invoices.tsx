import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { InvoiceTable } from "@/components/billing/InvoiceTable";
import { ChevronLeft, ChevronRight } from "lucide-react";

type InvoiceStatus = "succeeded" | "failed" | "refunded";

const statusOptions: { value: InvoiceStatus | undefined; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "succeeded", label: "Succeeded" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

export function AdminInvoicesPage() {
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | undefined>();
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading, error } = trpc.admin.listInvoices.useQuery({
    limit,
    offset: page * limit,
    status: statusFilter,
  });

  const totalPages = data ? Math.ceil(data.totalCount / limit) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Invoices</h1>

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

      <div className="rounded-xl border border-gray-100 dark:border-gray-850 p-6">
        <InvoiceTable invoices={data?.invoices || []} isLoading={isLoading} />
      </div>

      {!isLoading && !error && (data?.invoices.length ?? 0) === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400" role="status">
          No invoices found for the selected filter.
        </p>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm" role="alert" aria-live="assertive">
          Failed to load invoices: {error.message}
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
