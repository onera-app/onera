"use client";

import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/landing/theme-toggle";
import { ShieldCheck, ArrowRight, Menu } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const navLinks = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "Security", href: "#security" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-4 mt-4">
        <div className="max-w-6xl mx-auto bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl border border-neutral-200/60 dark:border-neutral-700/60 rounded-2xl shadow-sm shadow-neutral-200/50 dark:shadow-neutral-900/50">
          <div className="px-5 h-14 flex items-center justify-between">
            {/* Logo */}
            <Link 
              to="/"
              className="flex items-center gap-2.5 font-medium text-body tracking-tight group"
            >
              <div className="size-8 rounded-xl bg-neutral-900 dark:bg-white flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                <ShieldCheck className="size-4 text-white dark:text-neutral-900" />
              </div>
              <span className="text-neutral-900 dark:text-white">Onera</span>
            </Link>

            {/* Center Navigation */}
            <nav className="hidden md:flex items-center">
              <div className="flex items-center bg-neutral-100/80 dark:bg-neutral-800/80 rounded-xl p-1">
                {navLinks.map((link) => (
                  <button
                    key={link.label}
                    onClick={() => scrollToSection(link.href)}
                    className="px-4 py-1.5 text-secondary font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white dark:hover:bg-neutral-700 rounded-lg transition-all duration-200"
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-3">
              <ThemeToggle />
              
              {!isAuthenticated ? (
                <>
                  <Link to="/auth">
                    <button className="text-secondary font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors hidden sm:block">
                      Sign In
                    </button>
                  </Link>
                  <Link to="/auth">
                    <Button 
                      size="sm" 
                      className="h-8 px-4 text-secondary font-medium rounded-xl bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
                    >
                      Get Started
                      <ArrowRight className="ml-1.5 size-3.5" />
                    </Button>
                  </Link>
                </>
              ) : (
                <Link to="/app">
                  <Button 
                    size="sm" 
                    className="h-8 px-4 text-secondary font-medium rounded-xl bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    Dashboard
                    <ArrowRight className="ml-1.5 size-3.5" />
                  </Button>
                </Link>
              )}
              
              {/* Mobile Menu Button */}
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 -mr-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                <Menu className="size-5" />
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-neutral-200/60 dark:border-neutral-700/60 px-5 py-3">
              <nav className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <button
                    key={link.label}
                    onClick={() => scrollToSection(link.href)}
                    className="px-3 py-2 text-secondary font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors text-left"
                  >
                    {link.label}
                  </button>
                ))}
              </nav>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
