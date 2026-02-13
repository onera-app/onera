import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

const setupSteps = ["Create your account", "Add a passkey", "Start private chat"];

export function PricingSection() {
  const { isAuthenticated } = useAuth();

  return (
    <section id="pricing" className="px-5 py-8 pb-24 md:px-8 md:py-12 md:pb-28">
      <div className="mx-auto grid max-w-[1180px] gap-6 md:grid-cols-[1fr_0.72fr]">
        <article className="relative overflow-hidden rounded-[34px] bg-[#d9e8fa] p-8 md:p-10">
          <h2 className="max-w-[420px] font-['Manrope','Avenir_Next','Inter','sans-serif'] text-[2.4rem] font-semibold leading-[1.08] tracking-tight text-[#2a2b31] md:text-[4rem]">
            Start in minutes
          </h2>

          <ul className="mt-8 max-w-[420px] space-y-3">
            {setupSteps.map((step, idx) => (
              <li
                key={step}
                className="flex items-center gap-4 rounded-2xl bg-[#edf4fd] px-4 py-4 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-xl text-[#34363d]"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-semibold text-[#45464d]">
                  {idx + 1}
                </span>
                {step}
              </li>
            ))}
          </ul>

          <p className="mt-6 inline-flex rounded-full bg-white/70 px-4 py-2 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-lg text-[#555861]">
            Free during early access.
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

        <article className="rounded-[34px] bg-[#1f1f20] p-8 text-white md:p-10">
          <p className="font-['Manrope','Avenir_Next','Inter','sans-serif'] text-[2.4rem] font-semibold leading-[1.08] tracking-tight md:text-[4rem]">
            Private AI.
            <br />
            Simple pricing.
          </p>

          <p className="mt-8 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-[5rem] font-semibold leading-none md:text-[7rem]">
            $0
          </p>

          <p className="mt-2 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-xl text-white/80">
            Early access
          </p>

          <Link to={isAuthenticated ? "/app" : "/auth"}>
            <Button className="mt-12 h-14 rounded-full bg-white px-10 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-xl font-medium text-[#1f1f20] hover:bg-white/90">
              {isAuthenticated ? "Open app" : "Get started for free"}
            </Button>
          </Link>
        </article>
      </div>
    </section>
  );
}
