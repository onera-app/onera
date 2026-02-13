import { Link } from "@tanstack/react-router";
import { OneraLogo } from "@/components/ui/onera-logo";

const productLinks = [
  { label: "Home", href: "#home" },
  { label: "Why Onera", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "FAQ", href: "#faq" },
];

const companyLinks = [
  { label: "Privacy", to: "/privacy" },
  { label: "Terms", to: "/terms" },
  { label: "GitHub", href: "https://github.com/onera-app/onera" },
];

const platformLinks = [
  { label: "Web app", href: "/app" },
  {
    label: "iOS app",
    href: "https://apps.apple.com/us/app/onera-private-ai-chat/id6758128954",
  },
  { label: "X", href: "https://x.com" },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#141414] px-5 pb-16 pt-20 text-[#eceae7] md:px-8 md:pt-24">
      <div
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.07) 1px, transparent 0)",
          backgroundSize: "3px 3px",
        }}
      />

      <div className="relative mx-auto max-w-[1180px]">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="inline-flex items-center gap-3 rounded-xl bg-white p-2 pr-3 text-[#141414]">
              <OneraLogo size={28} />
              <span className="font-['Manrope','Avenir_Next','Inter','sans-serif'] text-sm font-semibold tracking-tight text-[#1f1f20]">
                Onera
              </span>
            </div>
          </div>

          <div>
            <h3 className="font-['Manrope','Avenir_Next','Inter','sans-serif'] text-xl font-semibold text-white">
              Product
            </h3>
            <ul className="mt-6 space-y-3 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-2xl text-[#a6a3a1]">
              {productLinks.map((item) => (
                <li key={item.label}>
                  <a href={item.href} className="transition-colors hover:text-white">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-['Manrope','Avenir_Next','Inter','sans-serif'] text-xl font-semibold text-white">
              Company
            </h3>
            <ul className="mt-6 space-y-3 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-2xl text-[#a6a3a1]">
              {companyLinks.map((item) => (
                <li key={item.label}>
                  {"to" in item ? (
                    <Link to={item.to} className="transition-colors hover:text-white">
                      {item.label}
                    </Link>
                  ) : (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-colors hover:text-white"
                    >
                      {item.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-['Manrope','Avenir_Next','Inter','sans-serif'] text-xl font-semibold text-white">
              Platforms
            </h3>
            <ul className="mt-6 space-y-3 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-2xl text-[#a6a3a1]">
              {platformLinks.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    target={item.href.startsWith("http") ? "_blank" : undefined}
                    rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="transition-colors hover:text-white"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-20 border-t border-white/10 pt-8 font-['Manrope','Avenir_Next','Inter','sans-serif'] text-base text-[#8f8a87]">
          © {new Date().getFullYear()} Onera. Privacy-first AI chat.
        </div>

      </div>
    </footer>
  );
}
