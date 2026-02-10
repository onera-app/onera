import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { OneraLogo } from "@/components/ui/onera-logo";
import { useAuth } from "@/hooks/useAuth";

export function Header() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="absolute top-0 left-0 right-0 z-50 py-5 bg-transparent">
      <div className="max-w-[980px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-12">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <OneraLogo size={24} />
            <span className="font-semibold text-neutral-900 dark:text-white">
              Onera
            </span>
          </Link>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {!isAuthenticated ? (
              <Link to="/auth">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-sm font-normal text-neutral-900 dark:text-white"
                >
                  Get Started
                </Button>
              </Link>
            ) : (
              <Link to="/app">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-sm font-normal text-neutral-900 dark:text-white"
                >
                  Open App
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
