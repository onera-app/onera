import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { InvoiceTable } from "@/components/billing/InvoiceTable";
import { ChevronLeft, ChevronRight } from "lucide-react";

const statusOptions = [
  { value: undefined, label: "All" },
  { value: "succeeded" as const, label: "Succeeded" },
  { value: "failed" as const, label: "Failed" },
  { value: "refunded" as const, label: "Refunded" },
];

export function AdminInvoicesPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading } = trpc.admin.listInvoices.useQuery({
    limit,
    offset: page * limit,
    status: statusFilter as any,
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

      <div className="rounded-xl border border-border p-6">
        <InvoiceTable invoices={data?.invoices || []} isLoading={isLoading} />
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
