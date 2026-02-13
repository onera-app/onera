import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { Footer, Header } from "@/components/landing";

const CONTACT_ONLY_PLAN_IDS = new Set(["team"]);
const CONTACT_US_URL = "https://github.com/onera-app/onera";

function formatLimit(value: number, unit: string, unlimitedLabel?: string): string {
  if (value === -1) return unlimitedLabel ?? `Unlimited ${unit}`;
  return `${value.toLocaleString()} ${unit}`;
}

function formatStorage(mb: number): string {
  if (mb === -1) return "Unlimited storage";
  if (mb >= 1000) return `${(mb / 1000).toFixed(mb % 1000 === 0 ? 0 : 1)} GB storage`;
  return `${mb} MB storage`;
}

export function PricingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { data: plans, isLoading, error } = trpc.billing.getPlans.useQuery();

  return (
    <main className="min-h-screen bg-[#f2f2f0] text-[#262525] selection:bg-[#262525] selection:text-[#f2f2f0]">
      <Header variant="pricing" activeNav="pricing" />

      <section className="px-4 pb-20 pt-28 sm:px-5 sm:pt-32 sm:pb-24 md:px-8 md:pt-36 md:pb-28">
      <div className="mx-auto max-w-[1180px]">
        <div className="text-center mb-12">
          <h1 className="font-['Manrope','Avenir_Next','Inter','sans-serif'] text-3xl font-semibold leading-[1.08] tracking-tight text-[#2b2929] sm:text-4xl md:text-6xl">
            Pricing plans
          </h1>
          <p className="mx-auto mt-4 max-w-[680px] font-['Manrope','Avenir_Next','Inter','sans-serif'] text-base leading-relaxed text-[#706b68] sm:text-lg">
            Choose the plan that matches your privacy and usage needs.
          </p>
        </div>

        {error && (
          <Alert className="mb-8 border-destructive/40 bg-destructive/5 max-w-3xl mx-auto">
            <AlertTitle>Couldn&apos;t load plans</AlertTitle>
            <AlertDescription>
              Pricing is temporarily unavailable. Please refresh and try again.
            </AlertDescription>
          </Alert>
        )}

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-full rounded-[28px] border border-[#dad5d1] bg-[#f6f4f1] p-6 sm:p-8 animate-pulse"
              >
                <div className="h-6 w-24 rounded bg-[#e6ebf4] mb-2" />
                <div className="h-4 w-40 rounded bg-[#e6ebf4] mb-6" />
                <div className="h-10 w-20 rounded bg-[#e6ebf4] mb-6" />
                <div className="space-y-3">
                  <div className="h-4 rounded bg-[#e6ebf4]" />
                  <div className="h-4 rounded bg-[#e6ebf4]" />
                  <div className="h-4 rounded bg-[#e6ebf4]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {plans && plans.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {plans.map((plan) => {
              const isContactOnly = CONTACT_ONLY_PLAN_IDS.has(plan.id);
              const isFeatured = plan.id === "pro";
              return (
                <div
                  key={plan.id}
                  className={`h-full rounded-[28px] border p-6 sm:p-8 flex flex-col ${
                    isFeatured
                      ? "border-[#c8d4e7] bg-[#e9f0fb] shadow-[0_20px_38px_rgba(58,64,78,0.16)]"
                      : "border-[#dad5d1] bg-[#f6f4f1]"
                  }`}
                >
                  <div className="mb-6 min-h-[154px]">
                    <h3 className="font-['Manrope','Avenir_Next','Inter','sans-serif'] text-2xl font-semibold text-[#2f2d2d]">
                      {plan.name}
                    </h3>
                    <p className="mt-1 text-sm text-[#6f6966]">
                      {plan.description}
                    </p>
                    <div className="mt-4">
                      {isContactOnly ? (
                        <span className="font-['Manrope','Avenir_Next','Inter','sans-serif'] text-3xl font-semibold text-[#2f2d2d]">
                          Contact us
                        </span>
                      ) : (
                        <>
                          <span className="font-['Manrope','Avenir_Next','Inter','sans-serif'] text-5xl font-semibold text-[#2f2d2d]">
                            ${(plan.monthlyPrice / 100).toFixed(0)}
                          </span>
                          <span className="text-[#6f6966]">/mo</span>
                        </>
                      )}
                    </div>
                    {!isContactOnly && plan.yearlyPrice > 0 && (
                      <p className="mt-1 text-xs text-[#6f6966]">
                        ${(plan.yearlyPrice / 100).toFixed(0)} billed yearly
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8 min-h-[124px]">
                    <li className="flex items-center gap-2 text-sm text-[#3f3d3c]">
                      <Check className="h-4 w-4 text-[#2f6c3b] flex-shrink-0 mt-0.5" />
                      {formatLimit(
                        plan.inferenceRequestsLimit,
                        "private requests/mo",
                        "Unlimited private requests",
                      )}
                    </li>
                    <li className="flex items-center gap-2 text-sm text-[#3f3d3c]">
                      <Check className="h-4 w-4 text-[#2f6c3b] flex-shrink-0 mt-0.5" />
                      {formatLimit(
                        plan.byokInferenceRequestsLimit,
                        "BYOK requests/mo",
                        "Unlimited BYOK requests",
                      )}
                    </li>
                    <li className="flex items-center gap-2 text-sm text-[#3f3d3c]">
                      <Check className="h-4 w-4 text-[#2f6c3b] flex-shrink-0 mt-0.5" />
                      {formatStorage(plan.storageLimitMb)}
                    </li>
                  </ul>

                  {isContactOnly ? (
                    <Button className="w-full h-11 rounded-full mt-auto bg-[#2f2d2d] text-white hover:bg-[#1f1d1d]" onClick={() => window.open(CONTACT_US_URL, "_blank", "noopener,noreferrer")}>
                      Contact us
                    </Button>
                  ) : (
                    <Button
                      className={`w-full h-11 rounded-full mt-auto ${
                        isFeatured
                          ? "bg-[#2f2d2d] text-white hover:bg-[#1f1d1d]"
                          : "bg-white text-[#2f2d2d] border border-[#d6d1cd] hover:bg-[#f3f1ee]"
                      }`}
                      onClick={() => {
                        if (isAuthenticated) {
                          navigate({ to: "/app/billing" });
                        } else {
                          navigate({ to: "/auth" });
                        }
                      }}
                    >
                      {isAuthenticated ? "Manage Billing" : "Get Started"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!isLoading && !error && (!plans || plans.length === 0) && (
          <div className="rounded-[28px] border border-[#e2ded9] bg-[#f5f4f2] p-8 text-center text-[#6f6966]">
            No plans are currently available.
          </div>
        )}

        <p className="mt-8 text-center text-sm text-[#7b7673]">
          Prices shown in USD and billed through Dodo Payments.
        </p>
      </div>
      </section>
      <Footer />
    </main>
  );
}
