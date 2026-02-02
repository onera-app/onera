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
      "Your browser automatically verifies our servers before every session. For the technical details, check Settings → Security.",
  },
  {
    question: "What happens to my chat history?",
    answer:
      "It's encrypted with a key only you have. We store scrambled data we can't read.",
  },
  {
    question: "What if I lose my recovery key?",
    answer:
      "We can't help you recover it — that's the point. Only you can access your data. Store your recovery key somewhere safe, like a password manager.",
  },
  {
    question: "What encryption do you use?",
    answer:
      "Industry-standard encryption (AES-256) for your stored chats, plus special hardware protection for processing. Happy to nerd out — email us.",
  },
  {
    question: "Is it really free?",
    answer:
      "Yes, during beta. We'll add paid options later for power features, but basic private chat will stay accessible.",
  },
];

export function FAQSection() {
  return (
    <section className="py-16 sm:py-24 px-4 bg-neutral-50 dark:bg-transparent">
      <div className="max-w-3xl mx-auto">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 sm:mb-14"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Questions? We've got answers.
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground">
            Everything you need to know about Onera
          </p>
        </motion.div>

        {/* FAQ Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Accordion type="single" collapsible className="w-full space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-white dark:bg-neutral-900/80 backdrop-blur-sm border border-neutral-200/60 dark:border-neutral-700/60 rounded-xl px-4 sm:px-6 data-[state=open]:shadow-lg transition-shadow"
              >
                <AccordionTrigger className="text-left text-base sm:text-lg font-medium py-4 sm:py-5 hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm sm:text-base text-muted-foreground pb-4 sm:pb-5 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center mt-10 sm:mt-14"
        >
          <p className="text-sm sm:text-base text-muted-foreground">
            Still have questions?{" "}
            <a
              href="mailto:hello@onera.ai"
              className="text-foreground font-medium hover:underline underline-offset-4"
            >
              Reach out to us
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
