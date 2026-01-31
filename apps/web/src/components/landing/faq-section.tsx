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
    question: "What is a secure enclave?",
    answer:
      "A secure enclave is a hardware-isolated environment where code runs in complete isolation from the rest of the system. We use AMD SEV-SNP technology, which encrypts memory and prevents even the host operating system from accessing the enclave's contents. This means your prompts are processed in a 'vault' that even our engineers can't open.",
  },
  {
    question: "How is this different from other private AI tools?",
    answer:
      "Most 'private' AI tools rely on policies and promises — they say they won't read your data. Onera uses hardware-level isolation where we physically can't access your prompts. Your data is processed inside secure enclaves with encrypted memory. Combined with cryptographic attestation, you can verify exactly what code is running.",
  },
  {
    question: "How can I verify the enclave is genuine?",
    answer:
      "Every time you connect, your browser automatically performs attestation — a cryptographic verification that the enclave is running exactly the code we published. This happens transparently. For technical users, you can view attestation details in Settings to see the cryptographic proofs yourself.",
  },
  {
    question: "Do I need API keys to use Onera?",
    answer:
      "No! With our secure enclave inference, you can start chatting immediately without any API keys. Your prompts are processed privately inside our hardware-isolated infrastructure. If you prefer to use your own API keys from OpenAI, Anthropic, or others, that option is available in Settings as 'Power User Mode'.",
  },
  {
    question: "Why would I use my own API keys instead?",
    answer:
      "Some power users prefer direct access to specific models or have existing API credits they want to use. With BYOK (bring your own keys), your requests go directly from your browser to the AI provider. Your keys are encrypted and stored locally. Both options keep your chat history end-to-end encrypted.",
  },
  {
    question: "Does my data still go to OpenAI/Anthropic?",
    answer:
      "When using our secure enclave inference (the default), your prompts go to our hardware-isolated servers running open-source models — not to OpenAI or Anthropic. If you choose Power User Mode with your own API keys, requests go directly to your chosen provider. Either way, your chat history is end-to-end encrypted.",
  },
  {
    question: "What encryption do you use?",
    answer:
      "We use multiple layers of protection: AMD SEV-SNP for hardware-isolated inference, Noise Protocol for encrypted transport to enclaves, and AES-256-GCM with Argon2id key derivation for stored data. All encryption happens client-side using libsodium. We implement a zero-knowledge architecture.",
  },
  {
    question: "What if I lose my recovery key?",
    answer:
      "Your recovery key is the only way to restore access to your encrypted chat history on a new device. We cannot reset it or recover your data without it. This is intentional: it means nobody, including us, can access your stored conversations. Store it somewhere safe, like a password manager.",
  },
  {
    question: "Is it really free?",
    answer:
      "Onera is free during beta, including secure enclave inference. We plan to introduce optional paid tiers for power features like dedicated enclaves and larger models, but core private chat functionality will remain accessible. Beta users will receive special treatment when paid plans launch.",
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
