import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { OneraLogo } from "@/components/ui/onera-logo";
import { useAuth } from "@/hooks/useAuth";

type HeaderNav = "home" | "features" | "how-it-works" | "faq" | "pricing";

interface HeaderProps {
  variant?: "landing" | "pricing";
  activeNav?: HeaderNav;
}

const landingLinks: { label: string; href: string; id: HeaderNav }[] = [
  { label: "Why Onera", href: "#features", id: "features" },
  { label: "How it works", href: "#how-it-works", id: "how-it-works" },
  { label: "FAQ", href: "#faq", id: "faq" },
  { label: "Pricing", href: "#pricing", id: "pricing" },
];

export function Header({ variant = "landing", activeNav }: HeaderProps) {
  const { isAuthenticated } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeItem = activeNav ?? (variant === "pricing" ? "pricing" : "home");

  const navClass = (item: HeaderNav): string =>
    item === activeItem
      ? "text-landing-foreground"
      : "text-landing-muted-foreground transition-colors hover:text-landing-foreground";

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 bg-landing/80 backdrop-blur-xl backdrop-saturate-150">
        <nav className="mx-auto flex h-12 max-w-[980px] items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <OneraLogo size={24} className="rounded-lg" />
            <span className="font-landing text-base font-semibold text-landing-foreground">
              Onera
            </span>
          </Link>

          <div className="hidden items-center gap-7 md:flex">
            {variant === "pricing" ? (
              <>
                <Link to="/" className={`font-landing text-xs ${navClass("home")}`}>
                  Home
                </Link>
                <Link to="/pricing" className={`font-landing text-xs ${navClass("pricing")}`}>
                  Pricing
                </Link>
              </>
            ) : (
              landingLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.href}
                  className={`font-landing text-xs ${navClass(link.id)}`}
                >
                  {link.label}
                </a>
              ))
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={isAuthenticated ? "/app" : "/auth"}
              className="font-landing text-xs font-normal text-landing-pricing-blue transition-colors hover:text-landing-pricing-blue/70"
            >
              {isAuthenticated ? "Open app" : "Get started"}
            </Link>

            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-landing-foreground md:hidden"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </nav>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-landing/60 backdrop-blur-xl"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <nav
            aria-label="Mobile navigation"
            className="absolute inset-x-0 top-12 bg-landing/95 px-4 py-5 backdrop-blur-xl"
          >
            <div className="flex flex-col gap-4">
              {variant === "pricing" ? (
                <>
                  <Link
                    to="/"
                    className="font-landing text-sm text-landing-foreground"
                    onClick={() => setMobileOpen(false)}
                  >
                    Home
                  </Link>
                  <Link
                    to="/pricing"
                    className="font-landing text-sm text-landing-foreground"
                    onClick={() => setMobileOpen(false)}
                  >
                    Pricing
                  </Link>
                </>
              ) : (
                landingLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.href}
                    className="font-landing text-sm text-landing-foreground"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </a>
                ))
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
