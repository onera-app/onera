import { trpc } from "@/lib/trpc";
import { StatsCard } from "@/components/admin/StatsCard";
import { InvoiceTable } from "@/components/billing/InvoiceTable";
import { DollarSign, Users, CreditCard, TrendingUp } from "lucide-react";

export function AdminDashboard() {
  const { data: stats, isLoading } = trpc.admin.getStats.useQuery();

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-secondary" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of billing and subscriptions
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Monthly Recurring Revenue"
          value={`$${((stats?.mrr || 0) / 100).toFixed(2)}`}
          icon={DollarSign}
        />
        <StatsCard
          label="Active Subscriptions"
          value={stats?.totalActiveSubscriptions || 0}
          icon={CreditCard}
        />
        <StatsCard
          label="Total Revenue"
          value={`$${((stats?.totalRevenue || 0) / 100).toFixed(2)}`}
          icon={TrendingUp}
        />
        <StatsCard
          label="Pro Users"
          value={stats?.subscriptionsByPlan?.pro || 0}
          icon={Users}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Invoices</h2>
        <div className="rounded-xl border border-border p-6">
          <InvoiceTable invoices={stats?.recentInvoices || []} />
        </div>
      </div>
    </div>
  );
}
