import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function Hero() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
      <div className="relative z-10 max-w-[980px] mx-auto px-4 flex flex-col items-center text-center">
        <h1
          className="text-5xl md:text-7xl lg:text-8xl font-semibold tracking-tight text-neutral-900 dark:text-white leading-[1.05] md:leading-[1.05] animate-slide-up-fade max-w-4xl"
          style={{ animationDelay: "100ms" }}
        >
          Chat with AI.
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-br from-neutral-500 to-neutral-800 dark:from-neutral-200 dark:to-neutral-500">
            Keep your privacy.
          </span>
        </h1>

        <p
          className="mt-8 text-xl md:text-2xl text-neutral-500 dark:text-neutral-300 max-w-2xl leading-relaxed text-balance animate-slide-up-fade"
          style={{ animationDelay: "200ms" }}
        >
          Have conversations you'd never type into ChatGPT. Onera processes your
          chats in a secure enclave where no one—not even us—can see them.
        </p>

        <div
          className="mt-10 flex flex-col sm:flex-row items-center gap-4 animate-slide-up-fade"
          style={{ animationDelay: "300ms" }}
        >
          {!isAuthenticated ? (
            <Link to="/auth">
              <Button
                size="lg"
                className="h-12 px-8 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 text-lg transition-all hover:scale-105"
              >
                Get Started
              </Button>
            </Link>
          ) : (
            <Link to="/app">
              <Button
                size="lg"
                className="h-12 px-8 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 text-lg transition-all hover:scale-105"
              >
                Open App
              </Button>
            </Link>
          )}
        </div>

        {/* Secondary actions */}
        <div
          className="mt-8 flex items-center gap-6 animate-slide-up-fade"
          style={{ animationDelay: "400ms" }}
        >
          <a
            href="https://github.com/onera-app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.463 2 11.97c0 4.404 2.865 8.14 6.839 9.458.5.092.682-.216.682-.48 0-.236-.008-.864-.013-1.695-2.782.602-3.369-1.337-3.369-1.337-.454-1.151-1.11-1.458-1.11-1.458-.908-.618.069-.606.069-.606 1.003.07 1.531 1.027 1.531 1.027.892 1.524 2.341 1.084 2.91.828.092-.643.35-1.083.636-1.332-2.22-.251-4.555-1.107-4.555-4.927 0-1.088.39-1.979 1.029-2.675-.103-.252-.446-1.266.098-2.638 0 0 .84-.268 2.75 1.022A9.606 9.606 0 0112 6.82c.85.004 1.705.114 2.504.336 1.909-1.29 2.747-1.022 2.747-1.022.546 1.372.202 2.386.1 2.638.64.696 1.028 1.587 1.028 2.675 0 3.83-2.339 4.673-4.566 4.92.359.307.678.915.678 1.846 0 1.332-.012 2.407-.012 2.734 0 .267.18.577.688.48C19.137 20.107 22 16.373 22 11.969 22 6.463 17.522 2 12 2z"
              />
            </svg>
            GitHub
          </a>
          <span className="text-neutral-200 dark:text-neutral-500">·</span>
          <a
            href="https://apps.apple.com/us/app/onera-private-ai-chat/id6758128954"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 21.99 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 21.99C7.79 22.03 6.8 20.68 5.96 19.47C4.25 16.99 2.97 12.5 4.7 9.56C5.55 8.08 7.13 7.16 8.82 7.14C10.1 7.12 11.32 8.01 12.11 8.01C12.89 8.01 14.37 6.94 15.92 7.1C16.57 7.13 18.39 7.36 19.56 9.07C19.47 9.13 17.29 10.39 17.31 13.05C17.34 16.24 20.06 17.27 20.09 17.28C20.06 17.35 19.67 18.72 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.09 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
            </svg>
            App Store
          </a>
        </div>
      </div>
    </section>
  );
}
