"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What makes Onera private?",
    answer:
      "Onera uses end-to-end encryption and passkey authentication to protect your account and conversations.",
  },
  {
    question: "Who can access my chats?",
    answer:
      "Your chats are private to you and people you explicitly choose to collaborate with.",
  },
  {
    question: "Can I use different AI models?",
    answer:
      "Yes. Onera supports multiple providers so you can choose the model that fits each task.",
  },
  {
    question: "Is setup complicated?",
    answer: "No. Create an account, add a passkey, and start chatting.",
  },
  {
    question: "Is Onera free to try?",
    answer: "Yes. Onera includes a free plan, with paid tiers for higher limits.",
  },
  {
    question: "Can I use Onera on multiple devices?",
    answer:
      "Yes. Onera supports protected sync so your chats are available wherever you sign in.",
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="px-4 py-16 sm:px-5 sm:py-24 md:px-8 md:py-28">
      <div className="mx-auto max-w-[980px]">
        <div className="text-center">
          <p className="mx-auto inline-flex rounded-full border border-white/70 bg-white/50 px-4 py-1.5 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-sm text-[#615b58] sm:px-5 sm:py-2 sm:text-lg">
            FAQ
          </p>
          <h2 className="mt-6 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-3xl font-semibold leading-[1.08] tracking-tight text-[#2c2a2a] sm:mt-7 sm:text-4xl md:text-6xl">
            Frequently asked questions
          </h2>
        </div>

        <Accordion type="single" collapsible className="mt-8 space-y-3 sm:mt-12 sm:space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={faq.question}
              value={`faq-${index}`}
              className="rounded-2xl border border-[#e2ded9] bg-[#f5f4f2] px-4 sm:rounded-3xl sm:px-6"
            >
              <AccordionTrigger className="font-['Manrope','Avenir_Next','Inter','sans-serif'] text-left text-lg font-semibold text-[#353232] hover:no-underline sm:text-xl md:text-3xl [&>svg]:h-5 [&>svg]:w-5 sm:[&>svg]:h-6 sm:[&>svg]:w-6 [&>svg]:text-[#87817d]">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="pb-5 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-base leading-relaxed text-[#6f6966] sm:pb-7 sm:text-lg">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
