import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Can Onera read my conversations?",
    answer:
      "No. Your messages are encrypted on your device before they're sent anywhere. Onera never has access to your decryption keys, so we couldn't read your data even if compelled to.",
  },
  {
    question: "How is this different from ChatGPT or Claude?",
    answer:
      "Standard AI tools process your prompts in plaintext on their servers. Onera encrypts your input before it reaches any provider, so the content of your conversations stays invisible to third parties.",
  },
  {
    question: "What AI models can I use?",
    answer:
      "Onera supports models from OpenAI, Anthropic, Google, and other providers. You choose the model. Onera handles the encryption layer on top.",
  },
  {
    question: "Are my prompts used to train AI models?",
    answer:
      "No. Your prompts are encrypted and never stored in plaintext. There is nothing for any provider to train on.",
  },
  {
    question: "What happens if Onera gets breached?",
    answer:
      "An attacker would only find encrypted blobs. Without your passkey and device-held keys, the data is unreadable.",
  },
  {
    question: "Do I need to install anything?",
    answer:
      "No. Onera runs in your browser. There's also an iOS app if you want native access on your phone.",
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-[680px]">
        <h2 className="text-center font-landing text-3xl font-semibold leading-tight tracking-tight text-landing-foreground sm:text-4xl md:text-5xl">
          Frequently asked questions
        </h2>

        <Accordion type="single" collapsible className="mt-12 sm:mt-16">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={faq.question}
              value={`faq-${index}`}
              className="border-b border-landing-border/60 px-0"
            >
              <AccordionTrigger className="py-5 font-landing text-base font-semibold text-landing-foreground hover:no-underline sm:text-lg [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-landing-muted-foreground">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="pb-5 font-landing text-base leading-relaxed text-landing-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
