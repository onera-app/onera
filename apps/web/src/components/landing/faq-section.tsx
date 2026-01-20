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
    question: "Why do I need to bring my own API keys?",
    answer:
      "This is core to our privacy model. By using your own API keys, your requests go directly from your browser to the AI provider (OpenAI, Anthropic, etc.). We never proxy your traffic or see your prompts. Your keys are encrypted client-side and stored locally. We couldn't access them even if compelled to.",
  },
  {
    question: "Does my data still go to OpenAI/Anthropic?",
    answer:
      "Yes, when using cloud providers, your prompts are sent to their inference servers. We encrypt your chat history and API keys, but the AI provider processes your requests in plaintext to generate responses. For complete local privacy, you can connect a local Ollama server. Your prompts never leave your machine, and all inference happens on your own hardware.",
  },
  {
    question: "What is Ollama and how do I use it?",
    answer:
      "Ollama lets you run open-source AI models (Llama, Mistral, etc.) locally on your own computer. When configured with Onera, your prompts never leave your device. Combined with our E2EE storage, this gives you fully air-gapped AI conversations. Install Ollama, pull a model, and add your local endpoint in Onera settings.",
  },
  {
    question: "How is this different from ChatGPT or Claude directly?",
    answer:
      "When you use ChatGPT or Claude directly, your conversations are stored on their servers and may be used for training. With Onera, your chat history is end-to-end encrypted. We store only ciphertext. Additionally, you get a unified interface across multiple AI providers with organized conversations, prompt templates, and cross-device sync.",
  },
  {
    question: "Why not just self-host?",
    answer:
      "You could run Open WebUI or LibreChat on your own server, but then you're responsible for infrastructure, updates, security patches, backups, and uptime. Onera gives you the same privacy guarantees with zero DevOps: E2EE sync across devices, automatic encrypted backups, a polished mobile-friendly UI, and multi-provider support out of the box. Your data is still yours (export anytime), but we handle the infrastructure.",
  },
  {
    question: "What encryption do you use?",
    answer:
      "We use AES-256-GCM for symmetric encryption and X25519 for key exchange. Your master key is derived from your password using Argon2id with secure parameters. All encryption happens client-side in your browser using libsodium. We implement a zero-knowledge architecture where your plaintext data never touches our servers.",
  },
  {
    question: "Where do I get API keys?",
    answer:
      "You can get API keys from OpenAI (platform.openai.com), Anthropic (console.anthropic.com), or other supported providers. Most offer free credits to start. You pay the provider directly based on your usage, often at lower rates than subscription plans. For fully local inference, use Ollama instead.",
  },
  {
    question: "Is it really free?",
    answer:
      "Onera is free during beta. You only pay your AI provider for API usage (or nothing if using local Ollama). We plan to introduce optional paid tiers for power features, but the core private chat functionality will remain accessible. Beta users will receive special treatment when paid plans launch.",
  },
  {
    question: "What if I lose my recovery key?",
    answer:
      "Your recovery key is the only way to restore access to your encrypted data on a new device. We cannot reset it or recover your data without it. This is intentional: it means nobody, including us, can access your data. Store it somewhere safe, like a password manager.",
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
