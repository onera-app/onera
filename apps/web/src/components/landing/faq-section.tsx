"use client";

import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How is this different from ChatGPT?",
    answer:
      "ChatGPT can see everything you type. Onera is built so we physically cannot access your conversations — it's not just a policy, it's how the technology works.",
  },
  {
    question: "Do I need API keys?",
    answer:
      "Nope. Just sign up and start chatting. If you want to use your own OpenAI or Anthropic keys, that's optional.",
  },
  {
    question: "How do I know you really can't see my chats?",
    answer:
      "Your browser automatically verifies our servers before every session. For the technical details, check Settings after signing up.",
  },
  {
    question: "What happens to my chat history?",
    answer:
      "It's encrypted with a key only you have. We store data we can't read.",
  },
  {
    question: "What if I lose my recovery key?",
    answer:
      "We can't help you recover it — that's the point. Only you can access your data. Store your recovery key somewhere safe, like a password manager.",
  },
  {
    question: "What encryption do you use?",
    answer:
      "Industry-standard encryption (AES-256) for stored chats, plus hardware-level protection for processing. All open source.",
  },
  {
    question: "Is it really free?",
    answer:
      "Yes, during early access. We'll add paid tiers later for power features, but basic private chat will stay accessible.",
  },
];

export function FAQSection() {
  return (
    <section className="py-20 sm:py-32 px-4 border-t border-neutral-100 dark:border-neutral-800/50">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 text-neutral-900 dark:text-white">
            Questions
          </h2>
          <p className="text-lg text-neutral-500 dark:text-neutral-400">
            Everything you need to know about Onera
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Accordion type="single" collapsible className="w-full space-y-2">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border border-neutral-200 dark:border-neutral-800 rounded-xl px-5 data-[state=open]:bg-neutral-50 dark:data-[state=open]:bg-neutral-900/50 transition-colors"
              >
                <AccordionTrigger className="text-left text-base font-medium py-4 hover:no-underline text-neutral-900 dark:text-white">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-neutral-500 dark:text-neutral-400 pb-4 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center mt-12"
        >
          <p className="text-sm text-neutral-400">
            Still have questions?{" "}
            <a
              href="mailto:hello@onera.ai"
              className="text-neutral-900 dark:text-white font-medium hover:underline underline-offset-4"
            >
              Reach out
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
