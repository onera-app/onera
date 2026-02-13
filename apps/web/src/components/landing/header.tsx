import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { OneraLogo } from "@/components/ui/onera-logo";
import { useAuth } from "@/hooks/useAuth";

export function Header() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="absolute inset-x-0 top-0 z-50">
      <div className="mx-auto flex h-24 w-full max-w-[1180px] items-center justify-between px-5 md:px-8">
        <Link to="/" className="flex items-center gap-3">
          <OneraLogo size={34} className="rounded-xl" />
          <span className="font-['Manrope','Avenir_Next','Inter','sans-serif'] text-[2rem] font-semibold leading-none tracking-tight text-[#2f2d2d]">
            Onera
          </span>
        </Link>

        <nav className="hidden items-center gap-10 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-lg text-[#6b6866] md:flex">
          <a href="#home" className="border-b-2 border-[#2f2d2d] pb-1 text-[#2f2d2d]">
            Home
          </a>
          <a href="#features" className="transition-colors hover:text-[#2f2d2d]">
            Why Onera
          </a>
          <a href="#how-it-works" className="transition-colors hover:text-[#2f2d2d]">
            How it works
          </a>
          <a href="#faq" className="transition-colors hover:text-[#2f2d2d]">
            FAQ
          </a>
        </nav>

        <Link to={isAuthenticated ? "/app" : "/auth"}>
          <Button className="h-12 rounded-full bg-[#2f2d2d] px-7 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-lg font-medium text-white hover:bg-[#1f1d1d]">
            {isAuthenticated ? "Open app" : "Get started"}
          </Button>
        </Link>
      </div>
    </header>
  );
}
