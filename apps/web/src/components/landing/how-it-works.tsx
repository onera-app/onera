const steps = [
  {
    step: "01",
    title: "Create your account",
    detail: "Sign up and secure your account with a passkey.",
  },
  {
    step: "02",
    title: "Start chatting",
    detail: "Use AI in a private workspace built for real tasks.",
  },
  {
    step: "03",
    title: "Stay synced",
    detail: "Access conversations across devices with protected sync.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1180px] rounded-[42px] bg-[#ecebe8] px-7 py-12 md:px-10 md:py-16">
        <div className="mx-auto max-w-[760px] text-center">
          <p className="mx-auto inline-flex rounded-full border border-white/60 bg-white/40 px-5 py-2 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-lg text-[#5f5b59]">
            How it works
          </p>
          <h2 className="mt-6 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-[2.4rem] font-semibold leading-[1.08] tracking-tight text-[#2d2b2a] md:text-[4.2rem]">
            Start securely in three steps
          </h2>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {steps.map((item) => (
            <article
              key={item.step}
              className="rounded-[24px] border border-[#d8d4d0] bg-[#f8f8f6] p-6"
            >
              <p className="font-['Manrope','Avenir_Next','Inter','sans-serif'] text-sm font-semibold tracking-[0.08em] text-[#88817d]">
                STEP {item.step}
              </p>
              <h3 className="mt-5 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-3xl font-semibold leading-tight text-[#2f2c2b]">
                {item.title}
              </h3>
              <p className="mt-4 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-lg leading-relaxed text-[#6f6a68]">
                {item.detail}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
