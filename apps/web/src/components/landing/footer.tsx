import { Link } from "@tanstack/react-router";
import { ShieldCheck, Github, Twitter } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 py-10 sm:py-12 px-4">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 sm:gap-8">

        {/* Brand */}
        <div className="flex flex-col items-center md:items-start gap-3 sm:gap-4">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="size-8 rounded-xl bg-neutral-900 dark:bg-white flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
              <ShieldCheck className="size-4 text-white dark:text-neutral-900" />
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
