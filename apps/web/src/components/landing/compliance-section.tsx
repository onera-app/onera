"use client";

import { Shield, Lock, Globe, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

const certifications = [
  {
    name: "SOC 2 Type II Certified",
    description:
      "Annual audits verify our security controls for data protection, availability, and confidentiality meet enterprise standards.",
    badge: "SOC2",
  },
  {
    name: "HIPAA Compliant",
    description:
      "Healthcare organizations can safely use Onera with protected health information. BAAs available for enterprise customers.",
    badge: "HIPAA",
  },
  {
    name: "GDPR & Privacy Ready",
    description:
      "Full compliance with EU data protection regulations and internationally recognized privacy requirements.",
    badge: "GDPR",
  },
  {
    name: "End-to-End Encryption",
    description:
      "AES-256-GCM encryption with keys that only you control. Mathematically impossible for us to read your data.",
    badge: "E2EE",
  },
];

export function ComplianceSection() {
  return (
    <section className="py-16 md:py-32">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        {/* Header */}
        <div className="text-center mb-10 md:mb-16">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-300/20 mb-6">
            <Shield className="size-4" />
            Enterprise Ready
          </span>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl text-neutral-900 dark:text-white">
            Complete Compliance & Security
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Onera meets the highest security and compliance standards for
            regulated industries.
          </p>
        </div>

        {/* Certifications Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {certifications.map((cert, i) => (
            <div
              key={i}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="relative p-6 lg:px-8 lg:py-8">
                <h3 className="text-xl font-medium lg:text-2xl text-foreground">
                  {cert.name}
                </h3>
                <p className="text-muted-foreground mt-2 w-3/4 pr-10 text-sm md:text-base">
                  {cert.description}
                </p>

                {/* Badge */}
                <div className="absolute -bottom-2 right-4 lg:right-8">
                  <div className="flex size-20 items-center justify-center rounded-xl bg-muted text-2xl font-bold text-muted-foreground/50 lg:size-24">
                    {cert.badge}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-12 rounded-2xl border border-border bg-gradient-to-br from-background to-muted/30 p-8 md:p-12">
          <div className="grid gap-8 lg:grid-cols-2 items-center">
            <div>
              <h3 className="text-2xl font-semibold text-foreground md:text-3xl">
                Ready to experience private AI?
              </h3>
              <p className="text-muted-foreground mt-3 text-base md:text-lg">
                Try Onera free — no signup needed. Your conversations stay
                encrypted and completely private.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/auth">
                  <Button className="h-10 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">
                    Try Onera Free
                  </Button>
                </Link>
                <a
                  href="https://github.com/onera-app"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="outline"
                    className="h-10 rounded-md px-6 text-sm font-medium"
                  >
                    View Source Code
                  </Button>
                </a>
              </div>
            </div>

            {/* Security Features */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Lock, label: "Zero-knowledge architecture" },
                { icon: Shield, label: "Hardware security modules" },
                { icon: CheckCircle, label: "Regular security audits" },
                { icon: Globe, label: "Data residency options" },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3"
                >
                  <feature.icon className="size-4 text-emerald-500 shrink-0" />
                  <span className="text-sm text-foreground">
                    {feature.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
