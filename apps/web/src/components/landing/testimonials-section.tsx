"use client";

const testimonials = [
  {
    quote:
      "Finally, an AI assistant I can trust with confidential client information. The end-to-end encryption means I can discuss case details without compromising attorney-client privilege.",
    author: "Sarah Chen",
    title: "Partner at Chen & Associates Law Firm",
    avatar: "SC",
  },
  {
    quote:
      "As a therapist, I needed an AI tool that respects patient confidentiality. Onera's encryption architecture gave me the confidence to use AI in my practice ethically.",
    author: "Dr. Michael Torres",
    title: "Clinical Psychologist",
    avatar: "MT",
  },
  {
    quote:
      "We evaluated every private AI solution for our fintech platform. Onera's verifiable encryption and infrastructure passed our security team's rigorous audit.",
    author: "Priya Sharma",
    title: "CTO at SecureFinance Inc",
    avatar: "PS",
  },
  {
    quote:
      "The peace of mind knowing my health questions aren't being stored or used to train models is invaluable. This is how AI should work.",
    author: "James Wilson",
    title: "Healthcare Professional",
    avatar: "JW",
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-16 md:py-32 bg-muted/20">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        {/* Header */}
        <div className="text-center mb-10 md:mb-16">
          <h2 className="text-3xl font-medium sm:text-4xl md:text-5xl text-neutral-900 dark:text-white">
            Trusted by Industry Leaders
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            From law firms to healthcare providers — professionals who can't
            compromise on confidentiality choose Onera.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {testimonials.map((testimonial, i) => (
            <div
              key={i}
              className="flex gap-5 rounded-xl bg-card p-6 border border-border"
            >
              {/* Avatar */}
              <span className="relative flex size-10 shrink-0 overflow-hidden rounded-full ring-1 ring-input items-center justify-center bg-muted text-sm font-medium">
                {testimonial.avatar}
              </span>

              {/* Content */}
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {testimonial.author}, {testimonial.title}
                </p>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  "{testimonial.quote}"
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
