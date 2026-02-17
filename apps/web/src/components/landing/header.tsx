import { Link } from "@tanstack/react-router";
import { OneraLogo } from "@/components/ui/onera-logo";
import { useAuth } from "@/hooks/useAuth";

export function Header() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-landing/80 backdrop-blur-xl backdrop-saturate-150">
      <nav className="mx-auto flex h-14 max-w-[980px] items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <OneraLogo size={30} className="rounded-lg" />
          <span className="font-landing text-lg font-semibold text-landing-foreground">
            Onera
          </span>
        </Link>

        <Link
          to={isAuthenticated ? "/app" : "/auth"}
          className="inline-flex h-9 items-center rounded-full bg-landing-foreground px-5 font-landing text-sm font-medium text-landing transition-opacity hover:opacity-85"
        >
          {isAuthenticated ? "Open App" : "Get Started"}
        </Link>
      </nav>
    </header>
  );
}
