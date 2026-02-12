import { ArrowDown } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Start a chat",
    description:
      "Open the app and start typing. No sign-up required for basic usage.",
  },
  {
    number: "02",
    title: "Encryption in flight",
    description:
      "Your message is encrypted on your device before it ever hits the network.",
  },
  {
    number: "03",
    title: "Secure Enclave",
    description:
      "The message is decrypted only inside a hardware enclave where code is verified.",
  },
  {
    number: "04",
    title: "Blind Processing",
    description:
      "The AI generates a response, which is immediately re-encrypted for your device.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="py-32 px-4 overflow-hidden bg-white dark:bg-background"
    >
      <div className="max-w-[980px] mx-auto">
        <div className="mb-24">
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-neutral-900 dark:text-white mb-8">
            How it works
          </h2>
          <div className="h-px w-full bg-neutral-200 dark:bg-neutral-800" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-16">
          {steps.map((step, i) => (
            <div key={i} className="relative group">
              <span className="block text-6xl md:text-7xl font-bold text-neutral-200 dark:text-neutral-600 mb-8 group-hover:text-neutral-300 dark:group-hover:text-neutral-500 transition-colors select-none">
                {step.number}
              </span>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
                {step.title}
              </h3>
              <p className="text-neutral-500 dark:text-neutral-300 leading-relaxed text-sm">
                {step.description}
              </p>

              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 -right-4 text-neutral-200 dark:text-neutral-600">
                  <ArrowDown className="w-6 h-6 -rotate-90" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
