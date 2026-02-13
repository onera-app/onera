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
    answer: "Yes. Onera is free during early access.",
  },
  {
    question: "Can I use Onera on multiple devices?",
    answer:
      "Yes. Onera supports protected sync so your chats are available wherever you sign in.",
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="px-5 py-24 md:px-8 md:py-28">
      <div className="mx-auto max-w-[980px]">
        <div className="text-center">
          <p className="mx-auto inline-flex rounded-full border border-white/70 bg-white/50 px-5 py-2 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-lg text-[#615b58]">
            FAQ
          </p>
          <h2 className="mt-7 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-[2.4rem] font-semibold leading-[1.08] tracking-tight text-[#2c2a2a] md:text-[4.2rem]">
            Frequently asked questions
          </h2>
        </div>

        <Accordion type="single" collapsible className="mt-12 space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={faq.question}
              value={`faq-${index}`}
              className="rounded-3xl border border-[#e2ded9] bg-[#f5f4f2] px-6"
            >
              <AccordionTrigger className="font-['Manrope','Avenir_Next','Inter','sans-serif'] text-left text-2xl font-semibold text-[#353232] hover:no-underline md:text-3xl [&>svg]:h-6 [&>svg]:w-6 [&>svg]:text-[#87817d]">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="pb-7 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-lg leading-relaxed text-[#6f6966]">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
