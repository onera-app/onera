import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { OneraLogo } from "@/components/ui/onera-logo";
import { useAuth } from "@/hooks/useAuth";

type HeaderNav = "home" | "features" | "how-it-works" | "faq" | "pricing";

interface HeaderProps {
  variant?: "landing" | "pricing";
  activeNav?: HeaderNav;
}

export function Header({ variant = "landing", activeNav }: HeaderProps) {
  const { isAuthenticated } = useAuth();
  const activeItem = activeNav ?? (variant === "pricing" ? "pricing" : "home");
  const navClass = (item: HeaderNav): string =>
    item === activeItem
      ? "border-b-2 border-[#2f2d2d] pb-1 text-[#2f2d2d]"
      : "transition-colors hover:text-[#2f2d2d]";

  return (
    <header className="absolute inset-x-0 top-0 z-50">
      <div className="mx-auto flex h-16 w-full max-w-[1180px] items-center justify-between px-4 sm:h-20 sm:px-5 md:h-24 md:px-8">
        <Link to="/" className="flex items-center gap-3">
          <OneraLogo size={34} className="rounded-xl" />
          <span className="font-['Manrope','Avenir_Next','Inter','sans-serif'] text-xl font-semibold leading-none tracking-tight text-[#2f2d2d] sm:text-2xl md:text-3xl">
            Onera
          </span>
        </Link>

        {variant === "pricing" ? (
          <nav className="hidden items-center gap-10 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-lg text-[#6b6866] md:flex">
            <Link to="/" className={navClass("home")}>
              Home
            </Link>
            <Link to="/pricing" className={navClass("pricing")}>
              Pricing
            </Link>
          </nav>
        ) : (
          <nav className="hidden items-center gap-10 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-lg text-[#6b6866] md:flex">
            <a href="#home" className={navClass("home")}>
              Home
            </a>
            <a href="#features" className={navClass("features")}>
              Why Onera
            </a>
            <a href="#how-it-works" className={navClass("how-it-works")}>
              How it works
            </a>
            <a href="#faq" className={navClass("faq")}>
              FAQ
            </a>
            <Link to="/pricing" className={navClass("pricing")}>
              Pricing
            </Link>
          </nav>
        )}

        <Link to={isAuthenticated ? "/app" : "/auth"}>
          <Button className="h-10 rounded-full bg-[#2f2d2d] px-4 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-sm font-medium text-white hover:bg-[#1f1d1d] sm:h-11 sm:px-6 sm:text-base md:h-12 md:px-7 md:text-lg">
            {isAuthenticated ? "Open app" : "Get started"}
          </Button>
        </Link>
      </div>
    </header>
  );
}
