import { Link } from "@tanstack/react-router";
import { trpc } from "@/lib/trpc";

const setupSteps = ["Create your account", "Add a passkey", "Chat with full encryption"];

export function PricingSection() {
  const { data: plans, isLoading } = trpc.billing.getPlans.useQuery();

  const lowestMonthlyCents = plans && plans.length > 0
    ? Math.min(...plans.map((plan) => plan.monthlyPrice))
    : 0;
  const lowestMonthlyDollars = Math.round(lowestMonthlyCents / 100);
  const lowestPriceLabel = `$${lowestMonthlyDollars}`;

  const lowestPlan =
    plans?.find((plan) => plan.monthlyPrice === lowestMonthlyCents) || null;

  return (
    <section id="pricing" className="px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto grid max-w-[980px] gap-5 md:grid-cols-[1fr_0.72fr]">
        <div className="rounded-3xl bg-landing-muted p-7 sm:p-10">
          <h2 className="max-w-[380px] font-landing text-3xl font-semibold leading-tight tracking-tight text-landing-foreground sm:text-4xl">
            Private AI in minutes
          </h2>

          <ol className="mt-8 space-y-3">
            {setupSteps.map((step, idx) => (
              <li
                key={step}
                className="flex items-center gap-3 font-landing text-base text-landing-foreground sm:text-lg"
              >
                <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-landing-foreground shadow-sm">
                  {idx + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>

          <p className="mt-6 font-landing text-sm text-landing-muted-foreground">
            {isLoading ? "Loading plans..." : `Plans from ${lowestPriceLabel}/mo.`}
          </p>
        </div>

        <div className="flex flex-col justify-between rounded-3xl bg-landing-foreground p-7 text-landing sm:p-10">
          <div>
            <p className="font-landing text-2xl font-semibold leading-tight sm:text-3xl">
              Full privacy.
              <br />
              One flat price.
            </p>

            <p className="mt-6 font-landing text-5xl font-semibold tracking-tight sm:text-6xl">
              {isLoading ? "..." : lowestPriceLabel}
            </p>
            <p className="mt-1 font-landing text-sm text-landing-muted-foreground">
              {lowestPlan ? `${lowestPlan.name} plan · per month` : "per month"}
            </p>
          </div>

          <Link
            to="/pricing"
            className="mt-8 inline-flex h-11 w-fit items-center rounded-full bg-white px-7 font-landing text-sm font-medium text-landing-foreground transition-opacity hover:opacity-85"
          >
            View plans
          </Link>
        </div>
      </div>
    </section>
  );
}
