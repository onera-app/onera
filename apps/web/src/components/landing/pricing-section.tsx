import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { trpc } from "@/lib/trpc";

const setupSteps = ["Create your account", "Add a passkey", "Start private chat"];

export function PricingSection() {
  const { data: plans } = trpc.billing.getPlans.useQuery();

  const lowestMonthlyCents = plans && plans.length > 0
    ? Math.min(...plans.map((plan) => plan.monthlyPrice))
    : 0;
  const lowestMonthlyDollars = Math.round(lowestMonthlyCents / 100);
  const lowestPriceLabel = `$${lowestMonthlyDollars}`;

  const lowestPlan =
    plans?.find((plan) => plan.monthlyPrice === lowestMonthlyCents) || null;

  return (
    <section id="pricing" className="px-4 py-8 pb-20 sm:px-5 sm:pb-24 md:px-8 md:py-12 md:pb-28">
      <div className="mx-auto grid max-w-[1180px] gap-6 md:grid-cols-[1fr_0.72fr]">
        <article className="relative overflow-hidden rounded-[28px] bg-[#d9e8fa] p-6 sm:rounded-[34px] sm:p-8 md:p-10">
          <h2 className="max-w-[420px] font-['Manrope','Avenir_Next','Inter','sans-serif'] text-3xl font-semibold leading-[1.08] tracking-tight text-[#2a2b31] sm:text-4xl md:text-6xl">
            Start in minutes
          </h2>

          <ul className="mt-8 max-w-[420px] space-y-3">
            {setupSteps.map((step, idx) => (
              <li
                key={step}
                className="flex items-center gap-3 rounded-2xl bg-[#edf4fd] px-3 py-3 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-base text-[#34363d] sm:gap-4 sm:px-4 sm:py-4 sm:text-xl"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#45464d] sm:h-9 sm:w-9 sm:text-lg">
                  {idx + 1}
                </span>
                {step}
              </li>
            ))}
          </ul>

          <p className="mt-5 inline-flex rounded-full bg-white/70 px-4 py-2 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-sm text-[#555861] sm:mt-6 sm:text-lg">
            Plans from {lowestPriceLabel}/month.
          </p>

          <div className="pointer-events-none absolute bottom-4 right-4 hidden h-60 w-44 rotate-[13deg] rounded-[28px] border border-[#bdc5d3] bg-[#fbfcff] p-4 shadow-[0_22px_40px_rgba(33,37,44,0.22)] md:block">
            <div className="h-6 w-28 rounded-full bg-[#e6ebf4]" />
            <div className="mt-4 h-24 rounded-2xl bg-[#eef3fb]" />
            <div className="mt-4 space-y-2">
              <div className="h-3 rounded-full bg-[#e6ebf4]" />
              <div className="h-3 w-3/4 rounded-full bg-[#e6ebf4]" />
            </div>
          </div>
        </article>

        <article className="rounded-[28px] bg-[#1f1f20] p-6 text-white sm:rounded-[34px] sm:p-8 md:p-10">
          <p className="font-['Manrope','Avenir_Next','Inter','sans-serif'] text-3xl font-semibold leading-[1.08] tracking-tight sm:text-4xl md:text-6xl">
            Private AI.
            <br />
            Simple pricing.
          </p>

          <p className="mt-6 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-6xl font-semibold leading-none sm:mt-8 sm:text-7xl md:text-9xl">
            {lowestPriceLabel}
          </p>

          <p className="mt-2 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-base text-white/80 sm:text-xl">
            {lowestPlan ? `${lowestPlan.name} plan` : "Starting plan"}
          </p>

          <Link to="/pricing">
            <Button className="mt-8 h-11 rounded-full bg-white px-8 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-base font-medium text-[#1f1f20] hover:bg-white/90 sm:mt-12 sm:h-14 sm:px-10 sm:text-xl">
              View plans
            </Button>
          </Link>
        </article>
      </div>
    </section>
  );
}
