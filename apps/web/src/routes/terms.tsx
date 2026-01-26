import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { OneraLogo } from "@/components/ui/onera-logo";
import { Footer } from "@/components/landing";

export function TermsPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-neutral-950">
      {/* Simple Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="size-8 rounded-xl overflow-hidden transition-transform duration-200 group-hover:scale-105">
              <OneraLogo size={32} />
            </div>
            <span className="font-bold text-xl text-neutral-900 dark:text-white">Onera</span>
          </Link>
          <Link 
            to="/" 
            className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
          Terms of Service
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-8">
          Last updated: January 21, 2026
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="text-neutral-600 dark:text-neutral-300 mb-4">
              By accessing or using Onera, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
              2. Description of Service
            </h2>
            <p className="text-neutral-600 dark:text-neutral-300 mb-4">
              Onera is a privacy-focused AI assistant platform that provides:
            </p>
            <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-300 space-y-2 mb-4">
              <li>End-to-end encrypted conversations with AI models</li>
              <li>Secure storage for notes and prompts</li>
              <li>Integration with various AI providers using your own API keys</li>
              <li>Cross-device synchronization with E2EE</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
              3. User Accounts
            </h2>
            <p className="text-neutral-600 dark:text-neutral-300 mb-4">
              To use Onera, you must:
            </p>
            <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-300 space-y-2 mb-4">
              <li>Create an account with accurate information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Be responsible for all activities under your account</li>
              <li>Notify us immediately of any unauthorized access</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
              4. Your API Keys
            </h2>
            <p className="text-neutral-600 dark:text-neutral-300 mb-4">
              When using your own AI provider API keys:
            </p>
            <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-300 space-y-2 mb-4">
              <li>You are responsible for obtaining and managing your API keys</li>
              <li>You must comply with the terms of service of your AI providers</li>
              <li>Any costs incurred through your API keys are your responsibility</li>
              <li>We are not liable for any issues arising from AI provider services</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
              5. Acceptable Use
            </h2>
            <p className="text-neutral-600 dark:text-neutral-300 mb-4">
              You agree not to use Onera to:
            </p>
            <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-300 space-y-2 mb-4">
              <li>Violate any applicable laws or regulations</li>
              <li>Generate or distribute harmful, illegal, or malicious content</li>
              <li>Attempt to circumvent security measures</li>
              <li>Interfere with the operation of our services</li>
              <li>Engage in any activity that could harm other users</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
              6. Encryption and Data Access
            </h2>
            <p className="text-neutral-600 dark:text-neutral-300 mb-4">
              You understand and acknowledge that:
            </p>
            <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-300 space-y-2 mb-4">
              <li>Your data is end-to-end encrypted and only accessible with your encryption keys</li>
              <li>If you lose access to your encryption keys and recovery phrase, we cannot recover your data</li>
              <li>You are solely responsible for backing up your recovery phrase</li>
              <li>We cannot access, read, or recover your encrypted data</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
              7. Intellectual Property
            </h2>
            <p className="text-neutral-600 dark:text-neutral-300 mb-4">
              The Onera platform, including its software, design, and branding, is owned by us and protected by intellectual property laws. You retain ownership of any content you create using our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
              8. Disclaimer of Warranties
            </h2>
            <p className="text-neutral-600 dark:text-neutral-300 mb-4">
              Onera is provided "as is" without warranties of any kind. We do not guarantee that:
            </p>
            <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-300 space-y-2 mb-4">
              <li>The service will be uninterrupted or error-free</li>
              <li>AI-generated content will be accurate or suitable for your purposes</li>
              <li>The service will meet all your requirements</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
              9. Limitation of Liability
            </h2>
            <p className="text-neutral-600 dark:text-neutral-300 mb-4">
              To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of Onera, including but not limited to loss of data, loss of profits, or business interruption.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
              10. Termination
            </h2>
            <p className="text-neutral-600 dark:text-neutral-300 mb-4">
              We reserve the right to suspend or terminate your account if you violate these terms. You may also delete your account at any time. Upon termination, your encrypted data will be permanently deleted from our servers.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
              11. Changes to Terms
            </h2>
            <p className="text-neutral-600 dark:text-neutral-300 mb-4">
              We may update these Terms of Service from time to time. We will notify you of any material changes by posting the updated terms on this page. Your continued use of Onera after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
              12. Contact
            </h2>
            <p className="text-neutral-600 dark:text-neutral-300 mb-4">
              If you have any questions about these Terms of Service, please contact us through our GitHub repository.
            </p>
          </section>
        </div>
      </div>

      <Footer />
    </main>
  );
}
