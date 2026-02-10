import { motion } from "framer-motion";
import { UserPlus, ShieldCheck, Lock, MessageSquare } from "lucide-react";

const steps = [
  {
    number: 1,
    icon: UserPlus,
    title: "Create an account",
    description:
      "Sign up in seconds. Encryption keys are generated on your device — we never see them.",
  },
  {
    number: 2,
    icon: ShieldCheck,
    title: "We verify the connection",
    description:
      "Your browser checks that you're connected to a secure, unmodified server automatically.",
  },
  {
    number: 3,
    icon: Lock,
    title: "Chat privately",
    description:
      "Messages go into a locked enclave, get processed, and come back — without anyone else seeing them.",
  },
  {
    number: 4,
    icon: MessageSquare,
    title: "Your history, encrypted",
    description:
      "Everything is saved with encryption only you can unlock. Not even us.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 sm:py-32 px-4 border-t border-neutral-100 dark:border-neutral-800/50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 sm:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Start chatting privately
            </h2>
            <p className="mt-4 text-lg text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
              No API keys needed. No complicated setup. Just sign up and go.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="relative rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 bg-white dark:bg-neutral-900/50 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
            >
              {/* Step number */}
              <div className="text-xs font-mono text-neutral-400 dark:text-neutral-500 mb-4">
                0{step.number}
              </div>

              <div className="size-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4 text-neutral-600 dark:text-neutral-300">
                <step.icon className="size-5" strokeWidth={1.5} />
              </div>

              <h3 className="font-semibold text-base mb-2 text-neutral-900 dark:text-white">
                {step.title}
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
