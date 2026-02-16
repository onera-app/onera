import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OneraLogo } from "@/components/ui/onera-logo";
import { useAuth } from "@/hooks/useAuth";

type HeaderNav = "home" | "features" | "how-it-works" | "faq" | "pricing";

interface HeaderProps {
  variant?: "landing" | "pricing";
  activeNav?: HeaderNav;
}

const landingLinks: { label: string; href: string; id: HeaderNav }[] = [
  { label: "Home", href: "#home", id: "home" },
  { label: "Why Onera", href: "#features", id: "features" },
  { label: "How it works", href: "#how-it-works", id: "how-it-works" },
  { label: "FAQ", href: "#faq", id: "faq" },
];

export function Header({ variant = "landing", activeNav }: HeaderProps) {
  const { isAuthenticated } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeItem = activeNav ?? (variant === "pricing" ? "pricing" : "home");

  const navClass = (item: HeaderNav): string =>
    item === activeItem
      ? "border-b-2 border-landing-accent pb-1 text-landing-foreground"
      : "transition-colors hover:text-landing-foreground";

  const mobileNavClass = (item: HeaderNav): string =>
    item === activeItem
      ? "text-landing-foreground font-semibold"
      : "text-landing-muted-foreground hover:text-landing-foreground transition-colors";

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-landing-border/50 bg-landing/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1180px] items-center justify-between px-4 sm:h-20 sm:px-5 md:h-24 md:px-8">
          <Link to="/" className="flex items-center gap-3">
            <OneraLogo size={34} className="rounded-xl" />
            <span className="font-landing text-xl font-semibold leading-none tracking-tight text-landing-foreground sm:text-2xl md:text-3xl">
              Onera
            </span>
          </Link>

          {/* Desktop nav */}
          {variant === "pricing" ? (
            <nav
              aria-label="Main navigation"
              className="hidden items-center gap-10 font-landing text-lg text-landing-muted-foreground md:flex"
            >
              <Link to="/" className={navClass("home")}>
                Home
              </Link>
              <Link to="/pricing" className={navClass("pricing")}>
                Pricing
              </Link>
            </nav>
          ) : (
            <nav
              aria-label="Main navigation"
              className="hidden items-center gap-10 font-landing text-lg text-landing-muted-foreground md:flex"
            >
              {landingLinks.map((link) => (
                <a key={link.id} href={link.href} className={navClass(link.id)}>
                  {link.label}
                </a>
              ))}
              <Link to="/pricing" className={navClass("pricing")}>
                Pricing
              </Link>
            </nav>
          )}

          <div className="flex items-center gap-3">
            <Link to={isAuthenticated ? "/app" : "/auth"}>
              <Button className="h-10 rounded-full bg-landing-accent px-4 font-landing text-sm font-medium text-landing-accent-foreground hover:bg-landing-accent/90 sm:h-11 sm:px-6 sm:text-base md:h-12 md:px-7 md:text-lg">
                {isAuthenticated ? "Open app" : "Get started"}
              </Button>
            </Link>

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-landing-foreground transition-colors hover:bg-landing-muted md:hidden"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <nav
            aria-label="Mobile navigation"
            className="absolute inset-x-0 top-16 border-b border-landing-border bg-landing/95 px-4 py-6 shadow-lg backdrop-blur-xl sm:top-20"
          >
            <div className="flex flex-col gap-4">
              {variant === "pricing" ? (
                <>
                  <Link
                    to="/"
                    className={`font-landing text-lg ${mobileNavClass("home")}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    Home
                  </Link>
                  <Link
                    to="/pricing"
                    className={`font-landing text-lg ${mobileNavClass("pricing")}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    Pricing
                  </Link>
                </>
              ) : (
                <>
                  {landingLinks.map((link) => (
                    <a
                      key={link.id}
                      href={link.href}
                      className={`font-landing text-lg ${mobileNavClass(link.id)}`}
                      onClick={() => setMobileOpen(false)}
                    >
                      {link.label}
                    </a>
                  ))}
                  <Link
                    to="/pricing"
                    className={`font-landing text-lg ${mobileNavClass("pricing")}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    Pricing
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
