import { trpc } from "@/lib/trpc";
import { StatsCard } from "@/components/admin/StatsCard";
import { InvoiceTable } from "@/components/billing/InvoiceTable";
import {
  ChartIncreaseIcon,
  CreditCardIcon,
  DollarCircleIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";

export function AdminDashboard() {
  const { data: stats, isLoading, error } = trpc.admin.getStats.useQuery();

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-xl bg-gray-100 dark:bg-gray-800"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-xl border border-destructive/30 bg-destructive/5 p-6"
        role="alert"
        aria-live="assertive"
      >
        <h2 className="font-semibold text-destructive">
          Unable to load dashboard stats
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Overview of billing and subscriptions
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Monthly Recurring Revenue"
          value={`$${((stats?.mrr || 0) / 100).toFixed(2)}`}
          icon={DollarCircleIcon}
        />
        <StatsCard
          label="Active Subscriptions"
          value={stats?.totalActiveSubscriptions || 0}
          icon={CreditCardIcon}
        />
        <StatsCard
          label="Total Revenue"
          value={`$${((stats?.totalRevenue || 0) / 100).toFixed(2)}`}
          icon={ChartIncreaseIcon}
        />
        <StatsCard
          label="Pro Users"
          value={stats?.subscriptionsByPlan?.pro || 0}
          icon={UserGroupIcon}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Invoices</h2>
        <div className="rounded-xl border border-gray-100 dark:border-gray-850 p-6">
          <InvoiceTable invoices={stats?.recentInvoices || []} />
        </div>
      </div>
    </div>
  );
}
