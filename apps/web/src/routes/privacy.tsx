import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { OneraLogo } from "@/components/ui/onera-logo";
import { Footer } from "@/components/landing";

export function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-900">
      {/* Simple Header */}
      <header className="border-b border-gray-100 dark:border-gray-850">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="size-8 rounded-xl overflow-hidden transition-transform duration-200 group-hover:scale-105">
              <OneraLogo size={32} />
            </div>
            <span className="font-bold text-xl text-gray-900 dark:text-gray-100">Onera</span>
          </Link>
          <Link 
            to="/" 
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Privacy Policy
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Last updated: February 19, 2026
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              1. Introduction
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              At Onera, privacy is not just a feature—it's the foundation of our product. This Privacy Policy explains how we collect, use, and protect your information when you use our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              2. End-to-End Encryption
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              All your conversations, notes, and data stored in Onera are protected with end-to-end encryption (E2EE). This means:
            </p>
            <ul className="list-disc list-inside text-gray-500 dark:text-gray-400 space-y-2 mb-4">
              <li>Your data is encrypted on your device before being transmitted</li>
              <li>Only you hold the encryption keys</li>
              <li>We cannot read your conversations or notes—even if we wanted to</li>
              <li>Your data remains private and secure at all times</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              3. Information We Collect
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              We collect minimal information necessary to provide our services:
            </p>
            <ul className="list-disc list-inside text-gray-500 dark:text-gray-400 space-y-2 mb-4">
              <li><strong>Account Information:</strong> Email address and authentication credentials</li>
              <li><strong>Encrypted Data:</strong> Your conversations, notes, and API keys (encrypted, we cannot access)</li>
              <li><strong>Usage Data:</strong> Basic analytics to improve our service (no content data)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              4. How We Use Your Information
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              We use the limited information we collect to:
            </p>
            <ul className="list-disc list-inside text-gray-500 dark:text-gray-400 space-y-2 mb-4">
              <li>Provide and maintain our services</li>
              <li>Authenticate your account</li>
              <li>Send important service updates</li>
              <li>Improve and optimize our platform</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              5. Data Sharing
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              We do not sell, trade, or rent your personal information. Your encrypted data stored on Onera's servers is never shared with third parties. We may share minimal account data only when required by law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              6. Third-Party AI Services
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Onera is a "Bring Your Own Key" (BYOK) AI client. When you connect a third-party AI provider (such as OpenAI, Anthropic, Google, xAI, Groq, Mistral, DeepSeek, or others), the following applies:
            </p>
            <ul className="list-disc list-inside text-gray-500 dark:text-gray-400 space-y-2 mb-4">
              <li><strong>What data is sent:</strong> Your chat messages, prompts, and any attachments you include in a conversation are sent to the AI provider you select</li>
              <li><strong>Who receives the data:</strong> Data is sent directly from your device to the third-party AI provider's servers using your own API key. Onera does not route, intercept, store, or process this data on our servers</li>
              <li><strong>Your consent:</strong> Before connecting your first AI provider, the app asks for your explicit permission and explains the data sharing involved</li>
              <li><strong>Provider policies:</strong> Your use of third-party AI services is governed by each provider's own privacy policy and terms of service. We encourage you to review these before connecting a provider</li>
              <li><strong>Local providers:</strong> If you use a local AI provider (such as Ollama or LM Studio), your data stays entirely on your device and is not sent to any third party</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              7. Your API Provider Keys
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              When you store your AI provider API keys with Onera:
            </p>
            <ul className="list-disc list-inside text-gray-500 dark:text-gray-400 space-y-2 mb-4">
              <li>Your keys are encrypted with your personal encryption key before being stored</li>
              <li>We never store or access your API keys in plain text</li>
              <li>API keys are decrypted only on your device when making requests to AI providers</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              8. Data Security
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              We implement industry-standard security measures including:
            </p>
            <ul className="list-disc list-inside text-gray-500 dark:text-gray-400 space-y-2 mb-4">
              <li>End-to-end encryption using modern cryptographic algorithms</li>
              <li>Secure key derivation and management</li>
              <li>Regular security audits and updates</li>
              <li>Secure infrastructure with encrypted data at rest</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              9. Your Rights
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              You have the right to:
            </p>
            <ul className="list-disc list-inside text-gray-500 dark:text-gray-400 space-y-2 mb-4">
              <li>Access your personal data</li>
              <li>Delete your account and all associated data</li>
              <li>Export your data</li>
              <li>Opt out of non-essential communications</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              10. Changes to This Policy
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              11. Contact Us
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              If you have any questions about this Privacy Policy, please contact us through our GitHub repository.
            </p>
          </section>
        </div>
      </div>

      <Footer />
    </main>
  );
}
