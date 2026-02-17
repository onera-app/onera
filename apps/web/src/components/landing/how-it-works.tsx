const steps = [
  {
    number: "1",
    title: "Set up your passkey",
    detail: "No passwords to leak. Your passkey lives on your device and never touches a server.",
  },
  {
    number: "2",
    title: "Chat privately",
    detail: "Ask anything. Your messages are encrypted before they leave your browser.",
  },
  {
    number: "3",
    title: "Sync with zero exposure",
    detail: "Your encrypted conversations follow you across devices. Only you hold the key.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-[980px]">
        <div className="text-center">
          <h2 className="font-landing text-3xl font-semibold leading-tight tracking-tight text-landing-foreground sm:text-4xl md:text-5xl">
            Private in three steps
          </h2>
          <p className="mx-auto mt-4 max-w-[480px] font-landing text-base leading-relaxed text-landing-muted-foreground sm:text-lg">
            No IT team needed. No servers to configure. Just open and go.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-[820px] gap-8 sm:mt-20 md:grid-cols-3 md:gap-12">
          {steps.map((item) => (
            <div key={item.number} className="text-center md:text-left">
              <span className="font-landing text-4xl font-semibold text-landing-muted-foreground/40">
                {item.number}
              </span>
              <h3 className="mt-2 font-landing text-lg font-semibold text-landing-foreground">
                {item.title}
              </h3>
              <p className="mt-1.5 font-landing text-base leading-relaxed text-landing-muted-foreground">
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
