import { Link } from "@tanstack/react-router";

const footerLinks = [
  { label: "Privacy", to: "/privacy" },
  { label: "Terms", to: "/terms" },
  {
    label: "iOS",
    href: "https://apps.apple.com/us/app/onera-private-ai-chat/id6758128954",
  },
  { label: "GitHub", href: "https://github.com/onera-app/onera" },
  { label: "X", href: "https://x.com/onerachat" },
];

export function Footer() {
  return (
    <footer className="border-t border-landing-border/40 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto flex max-w-[980px] flex-col items-center gap-5 sm:flex-row sm:justify-between">
        <p className="font-landing text-xs text-landing-muted-foreground">
          &copy; {new Date().getFullYear()} Onera
        </p>

        <nav className="flex flex-wrap items-center justify-center gap-5">
          {footerLinks.map((item) =>
            "to" in item ? (
              <Link
                key={item.label}
                to={item.to}
                className="font-landing text-xs text-landing-muted-foreground transition-colors hover:text-landing-foreground"
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-landing text-xs text-landing-muted-foreground transition-colors hover:text-landing-foreground"
              >
                {item.label}
              </a>
            ),
          )}
        </nav>
      </div>

      <div className="mx-auto mt-6 max-w-[980px] border-t border-landing-border/20 pt-5">
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="font-landing text-[11px] font-medium text-landing-muted-foreground">
            Badgerauth Private Limited
          </p>
          <p className="font-landing text-[11px] text-landing-muted-foreground/70">
            Plot No-94, Sector A, Aurangabad N-1 CIDCO, Aurangabad, Aurangabad
            431003, India
          </p>
        </div>
      </div>
    </footer>
  );
}
