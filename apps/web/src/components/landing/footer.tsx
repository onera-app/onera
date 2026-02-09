import { Link } from "@tanstack/react-router";
import { Github, Twitter } from "lucide-react";
import { OneraLogo } from "@/components/ui/onera-logo";

export function Footer() {
  return (
    <footer className="bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 py-10 sm:py-12 px-4">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 sm:gap-8">

        {/* Brand */}
        <div className="flex flex-col items-center md:items-start gap-3 sm:gap-4">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="size-8 rounded-xl overflow-hidden transition-transform duration-200 group-hover:scale-105">
              <OneraLogo size={32} />
            </div>
            <span className="font-bold text-xl text-neutral-900 dark:text-white">Onera</span>
          </Link>
          <p className="text-sm text-neutral-600 dark:text-neutral-300 max-w-xs text-center md:text-left">
            The AI assistant that actually keeps your conversations private.
          </p>
        </div>

        {/* Links */}
        <div className="flex items-center gap-6 sm:gap-8 text-sm font-medium text-neutral-600 dark:text-neutral-300">
          <Link to="/terms" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Terms</Link>
          <Link to="/privacy" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Privacy</Link>
          <a href="https://github.com/onera-app" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
            <Github className="size-5" />
          </a>
          <a href="https://x.com/onerachat" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
            <Twitter className="size-5" />
          </a>
          <a href="https://apps.apple.com/us/app/onera-private-ai-chat/id6758128954" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-900 dark:hover:text-white transition-colors" aria-label="Download on the App Store">
            <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 21.99 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 21.99C7.79 22.03 6.8 20.68 5.96 19.47C4.25 16.99 2.97 12.5 4.7 9.56C5.55 8.08 7.13 7.16 8.82 7.14C10.1 7.12 11.32 8.01 12.11 8.01C12.89 8.01 14.37 6.94 15.92 7.1C16.57 7.13 18.39 7.36 19.56 9.07C19.47 9.13 17.29 10.39 17.31 13.05C17.34 16.24 20.06 17.27 20.09 17.28C20.06 17.35 19.67 18.72 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.09 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
            </svg>
          </a>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-neutral-100 dark:border-neutral-800 text-center md:text-left">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          © {new Date().getFullYear()} Onera. Your privacy is our priority.
        </p>
      </div>
    </footer>
  );
}
