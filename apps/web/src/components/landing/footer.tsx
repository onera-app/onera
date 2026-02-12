import { Link } from "@tanstack/react-router";
import { OneraLogo } from "@/components/ui/onera-logo";

export function Footer() {
  return (
    <footer className="bg-white dark:bg-background border-t border-neutral-200 dark:border-neutral-700">
      <div className="max-w-[980px] mx-auto px-4 py-16 md:py-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-6">
              <OneraLogo size={32} />
              <span className="font-semibold text-lg tracking-tight text-neutral-900 dark:text-white">
                Onera
              </span>
            </Link>
            <p className="text-sm text-neutral-500 dark:text-neutral-300 leading-relaxed mb-4 max-w-xs">
              Private AI chat that actually keeps your secrets.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-neutral-900 dark:text-white mb-6">
              Product
            </h4>
            <ul className="space-y-4 text-sm text-neutral-500 dark:text-neutral-300">
              <li>
                <a
                  href="#features"
                  className="hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  className="hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  How it Works
                </a>
              </li>
              <li>
                <a
                  href="#pricing"
                  className="hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  Pricing
                </a>
              </li>
              <li>
                <a
                  href="#faq"
                  className="hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-neutral-900 dark:text-white mb-6">
              Company
            </h4>
            <ul className="space-y-4 text-sm text-neutral-500 dark:text-neutral-300">
              <li>
                <a
                  href="https://github.com/onera-app"
                  className="hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-neutral-900 dark:text-white mb-6">
              Platforms
            </h4>
            <ul className="space-y-4 text-sm text-neutral-500 dark:text-neutral-300">
              <li>
                <Link
                  to="/app"
                  className="hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  Web
                </Link>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  iOS App
                </a>
              </li>
              <li>
                <span className="opacity-50 cursor-not-allowed">
                  Android (Coming Soon)
                </span>
              </li>
              <li>
                <span className="opacity-50 cursor-not-allowed">
                  Desktop (Coming Soon)
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-neutral-100 dark:border-neutral-700 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-neutral-400 dark:text-neutral-400">
            © {new Date().getFullYear()} Onera Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-neutral-500 dark:text-neutral-300">
                All systems operational
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
