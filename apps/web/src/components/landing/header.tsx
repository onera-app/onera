"use client";

import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowRight, Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    // Always keep navbar visible
    setHidden(false);

    if (latest > 50) {
      setScrolled(true);
    } else {
      setScrolled(false);
    }
  });

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setMobileMenuOpen(false);
  };

  return (
    <>
      <motion.header
        variants={{
          visible: { y: 0 },
          hidden: { y: "-110%" },
        }}
        animate={hidden ? "hidden" : "visible"}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4"
      >
        <div
          className={cn(
            "w-full max-w-5xl transition-all duration-300 rounded-full border px-2 py-2 flex items-center justify-between",
            scrolled
              ? "bg-white/80 dark:bg-black/60 backdrop-blur-xl border-neutral-200/60 dark:border-white/10 shadow-lg"
              : "bg-transparent border-transparent"
          )}
        >
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 font-medium tracking-tight group ml-2"
          >
            <div className="size-9 rounded-full bg-neutral-900 dark:bg-white flex items-center justify-center transition-transform duration-200 group-hover:scale-105 shadow-sm">
              <ShieldCheck className="size-4 text-white dark:text-black" />
            </div>
            <span className="font-bold transition-colors text-neutral-900 dark:text-white">
              Onera
            </span>
          </Link>

          {/* Center Navigation - Desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => scrollToSection(link.href)}
                className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-white/80 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 rounded-full transition-all"
              >
                {link.label}
              </button>
            ))}
            <a
              href="https://docs.onera.chat"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-white/80 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 rounded-full transition-all"
            >
              Docs
            </a>
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-2 mr-1">
            {!isAuthenticated ? (
              <>
                <Link to="/auth" className="hidden sm:block">
                  <Button variant="ghost" size="sm" className="rounded-full text-neutral-600 dark:text-white/80 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10">
                    Sign In
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button
                    size="sm"
                    className="rounded-full px-5 bg-neutral-900 dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-white/90 transition-colors shadow-lg font-medium"
                  >
                    Get Started
                  </Button>
                </Link>
              </>
            ) : (
              <Link to="/app">
                <Button
                  size="sm"
                  className="rounded-full px-5 bg-neutral-900 dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-white/90 transition-colors shadow-lg font-medium"
                >
                  Dashboard
                  <ArrowRight className="ml-1.5 size-3.5" />
                </Button>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-neutral-700 dark:text-white hover:bg-neutral-100 dark:hover:bg-white/10 rounded-full transition-colors"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-[80%] max-w-sm bg-white dark:bg-neutral-950 border-l border-neutral-200 dark:border-white/10 p-6 flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-8">
                <span className="font-bold text-xl text-neutral-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="size-6" />
                  Onera
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors text-neutral-700 dark:text-white"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {navLinks.map((link) => (
                  <button
                    key={link.label}
                    onClick={() => scrollToSection(link.href)}
                    className="flex items-center justify-between w-full p-3 text-lg font-medium text-neutral-600 dark:text-white/80 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-white/5 rounded-xl transition-all"
                  >
                    {link.label}
                    <ArrowRight className="size-4 opacity-70" />
                  </button>
                ))}
                <a
                  href="https://docs.onera.chat"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full p-3 text-lg font-medium text-neutral-600 dark:text-white/80 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-white/5 rounded-xl transition-all"
                >
                  Docs
                  <ArrowRight className="size-4 opacity-70" />
                </a>
              </div>

              <div className="mt-auto pt-8 border-t border-neutral-200 dark:border-white/10 flex flex-col gap-3">
                {!isAuthenticated ? (
                  <>
                    <Link to="/auth" className="w-full">
                      <Button variant="outline" className="w-full justify-center rounded-xl h-11 text-base">
                        Sign In
                      </Button>
                    </Link>
                    <Link to="/auth" className="w-full">
                      <Button className="w-full justify-center rounded-xl h-11 text-base">
                        Get Started
                      </Button>
                    </Link>
                  </>
                ) : (
                  <Link to="/app" className="w-full">
                    <Button className="w-full justify-center rounded-xl h-11 text-base">
                      Go to Dashboard
                    </Button>
                  </Link>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
