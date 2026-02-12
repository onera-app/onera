import { cn } from "@/lib/utils";

interface Invoice {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  description: string | null;
  paidAt: number | null;
  createdAt: number;
}

interface InvoiceTableProps {
  invoices: Invoice[];
  isLoading?: boolean;
}

const statusColors: Record<string, string> = {
  succeeded: "bg-status-success/10 text-status-success-text",
  failed: "bg-destructive/10 text-destructive",
  refunded: "bg-status-warning/10 text-status-warning-text",
};

export function InvoiceTable({ invoices, isLoading }: InvoiceTableProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-secondary" />
        ))}
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">
        No invoices yet
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="pb-2 text-left font-medium text-muted-foreground">
              Date
            </th>
            <th className="pb-2 text-left font-medium text-muted-foreground">
              Description
            </th>
            <th className="pb-2 text-right font-medium text-muted-foreground">
              Amount
            </th>
            <th className="pb-2 text-right font-medium text-muted-foreground">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {invoices.map((invoice) => (
            <tr key={invoice.id}>
              <td className="py-3">
                {new Date(invoice.createdAt).toLocaleDateString()}
              </td>
              <td className="py-3 text-muted-foreground">
                {invoice.description || "Payment"}
              </td>
              <td className="py-3 text-right font-medium">
                ${(invoice.amountCents / 100).toFixed(2)}{" "}
                {invoice.currency}
              </td>
              <td className="py-3 text-right">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                    statusColors[invoice.status] || "bg-secondary text-foreground"
                  )}
                >
                  {invoice.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
