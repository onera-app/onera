import { useParams, Link } from "@tanstack/react-router";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { UsageMeter } from "@/components/billing/UsageMeter";
import { InvoiceTable } from "@/components/billing/InvoiceTable";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export function AdminUserDetailPage() {
  const { userId } = useParams({ from: "/app/admin/users/$userId" });
  const { data, isLoading, error, refetch } = trpc.admin.getUser.useQuery({ userId });
  const { data: allPlans } = trpc.billing.getPlans.useQuery();

  const updatePlan = trpc.admin.updateUserPlan.useMutation({
    onSuccess: () => {
      toast.success("Plan updated");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800" />
        <div className="h-40 rounded-xl bg-gray-100 dark:bg-gray-800" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6" role="alert" aria-live="assertive">
        <h2 className="font-semibold text-destructive">Unable to load user details</h2>
        <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
      </div>
    );
  }

  if (!data) return <p role="status">User not found</p>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link to="/app/admin/users">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          {data.user.imageUrl ? (
            <img
              src={data.user.imageUrl}
              alt=""
              className="h-10 w-10 rounded-full"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-medium">
              {data.user.name[0]}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold">{data.user.name}</h1>
            <p className="text-sm text-muted-foreground">{data.user.email}</p>
          </div>
        </div>
      </div>

      {/* Subscription Management */}
      <section className="rounded-xl border border-gray-100 dark:border-gray-850 p-6 space-y-4">
        <h2 className="font-semibold">Subscription</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm">
            Current plan:{" "}
            <strong>{data.plan?.name || "Free"}</strong>
          </span>
          {data.subscription && (
            <span className="text-sm text-muted-foreground">
              Status: {data.subscription.status}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {allPlans?.map((plan) => (
            <Button
              key={plan.id}
              variant={data.plan?.id === plan.id ? "default" : "outline"}
              size="sm"
              onClick={() => updatePlan.mutate({ userId, planId: plan.id })}
              disabled={
                data.plan?.id === plan.id || updatePlan.isPending
              }
            >
              {data.plan?.id === plan.id ? `${plan.name} (current)` : plan.name}
            </Button>
          ))}
        </div>
      </section>

      {/* Usage */}
      {data.plan && (
        <section className="rounded-xl border border-gray-100 dark:border-gray-850 p-6 space-y-4">
          <h2 className="font-semibold">Usage</h2>
          <UsageMeter
            label="Inference Requests"
            used={data.usage.inferenceRequests}
            limit={data.plan.inferenceRequestsLimit}
            unit="requests"
          />
          <UsageMeter
            label="Storage"
            used={Math.round(data.usage.storageMb / 100) / 10}
            limit={data.plan.storageLimitMb === -1 ? -1 : Math.round(data.plan.storageLimitMb / 100) / 10}
            unit="GB"
          />
        </section>
      )}

      {/* Invoices */}
      <section className="rounded-xl border border-gray-100 dark:border-gray-850 p-6 space-y-4">
        <h2 className="font-semibold">Invoice History</h2>
        <InvoiceTable invoices={data.invoices || []} />
      </section>
    </div>
  );
}
