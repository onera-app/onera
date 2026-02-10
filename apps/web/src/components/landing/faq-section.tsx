"use client";

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
    <section id="faq" className="py-24 px-4 bg-white dark:bg-[#0a0a0a]">
      <div className="max-w-[800px] mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-4 tracking-widest uppercase">
            Questions? We've got answers.
          </p>
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-neutral-900 dark:text-white mb-6">
            Everything you need to know about Onera
          </h2>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-0">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border-b border-neutral-200 dark:border-neutral-800 px-0"
              >
                <div className="py-2">
                  <AccordionTrigger className="text-left text-xl font-medium py-6 hover:no-underline text-neutral-900 dark:text-white transition-colors [&>svg]:size-5 [&>svg]:text-neutral-400">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-neutral-500 dark:text-neutral-400 pb-6 text-lg leading-relaxed max-w-2xl">
                    {faq.answer}
                  </AccordionContent>
                </div>
              </AccordionItem>
            ))}
          </Accordion>

          <p className="mt-16 text-center text-sm text-neutral-500 dark:text-neutral-400">
            Still have questions?{" "}
            <a
              href="mailto:hello@onera.ai"
              className="text-neutral-900 dark:text-white font-medium hover:underline underline-offset-4"
            >
              Reach out to us
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
