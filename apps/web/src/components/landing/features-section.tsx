import { Check, X } from "lucide-react";

type CellValue = "yes" | "no" | "low" | "high";

type ComparisonColumn = {
  name: string;
  sub: string;
  highlight?: boolean;
};

type ComparisonRow = {
  section?: string;
  label: string;
  values: [CellValue, CellValue, CellValue];
};

const columns: ComparisonColumn[] = [
  {
    name: "Typical AI",
    sub: "Hosted models",
  },
  {
    name: "Self-hosted",
    sub: "On-prem deployment",
  },
  {
    name: "Onera",
    sub: "Private AI workspace",
    highlight: true,
  },
] as const;

const rows: ComparisonRow[] = [
  {
    section: "Data privacy",
    label: "Zero data retention controls",
    values: ["no", "yes", "yes"],
  },
  {
    section: "Features",
    label: "Cloud convenience",
    values: ["yes", "no", "yes"],
  },
  {
    label: "Setup cost",
    values: ["low", "high", "low"],
  },
  {
    label: "Operational complexity",
    values: ["low", "high", "low"],
  },
] as const;

function ValueCell({
  value,
}: {
  value: CellValue;
}) {
  if (value === "yes") {
    return <Check className="mx-auto h-5 w-5 text-landing-success" />;
  }

  if (value === "no") {
    return <X className="mx-auto h-5 w-5 text-landing-error" />;
  }

  return (
    <span
      className={`font-landing text-base font-medium ${value === "low" ? "text-landing-success" : "text-landing-error"
        }`}
    >
      {value === "low" ? "Low" : "High"}
    </span>
  );
}

export function FeaturesSection() {
  return (
    <section id="features" className="px-4 py-16 sm:px-5 sm:py-20 md:px-8 md:py-30">
      <div className="mx-auto max-w-[1180px]">
        <div className="mx-auto max-w-[860px] text-center">
          <p className="mx-auto inline-flex rounded-full border border-landing-pill-border bg-landing-pill px-4 py-1.5 font-landing text-sm text-landing-muted-foreground sm:px-5 sm:py-2 sm:text-lg">
            Why teams switch
          </p>
          <h2 className="mt-6 font-landing text-3xl font-semibold leading-[1.08] tracking-tight text-landing-foreground sm:mt-7 sm:text-4xl md:text-6xl">
            Privacy of on-prem.
            <br />
            Speed of cloud.
          </h2>
          <p className="mx-auto mt-4 max-w-[700px] font-landing text-base leading-relaxed text-landing-muted-foreground sm:mt-6 sm:text-xl">
            Onera gives teams strong privacy controls without the cost and
            complexity of self-hosting.
          </p>
        </div>

        <div className="mt-10 overflow-x-auto rounded-[24px] border border-landing-border bg-landing-card sm:mt-14 sm:rounded-[30px]">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[1.4fr_repeat(3,1fr)] border-b border-landing-border">
              <div className="p-6 md:p-7" />
              {columns.map((col) => (
                <div
                  key={col.name}
                  className={`border-l border-landing-border p-6 text-center md:p-7 ${col.highlight ? "bg-landing-green-bg" : ""
                    }`}
                >
                  <p className="font-landing text-xl font-semibold text-landing-foreground md:text-2xl">
                    {col.name}
                  </p>
                  <p className="mt-1 font-landing text-sm text-landing-muted-foreground">
                    {col.sub}
                  </p>
                </div>
              ))}
            </div>

            <div>
              {rows.map((row, rowIndex) => (
                <div key={`${row.section ?? "row"}-${row.label}`}>
                  {row.section ? (
                    <div className="grid grid-cols-[1.4fr_repeat(3,1fr)] border-b border-landing-border">
                      <div className="px-6 py-5 md:px-7">
                        <p className="font-landing text-base font-semibold uppercase tracking-[0.05em] text-landing-foreground md:text-lg">
                          {row.section}
                        </p>
                      </div>
                      <div className="border-l border-landing-border" />
                      <div className="border-l border-landing-border" />
                      <div className="border-l border-landing-border bg-landing-green-bg" />
                    </div>
                  ) : null}

                  <div
                    className={`grid grid-cols-[1.4fr_repeat(3,1fr)] ${rowIndex === rows.length - 1 ? "" : "border-b border-landing-border"
                      }`}
                  >
                    <div className="px-6 py-6 md:px-7">
                      <p className="font-landing text-xl text-landing-foreground md:text-2xl">
                        {row.label}
                      </p>
                    </div>

                    {row.values.map((value, idx) => (
                      <div
                        key={`${row.label}-${idx}`}
                        className={`flex items-center justify-center border-l border-landing-border px-4 py-6 ${idx === 2 ? "bg-landing-green-bg" : ""
                          }`}
                      >
                        <ValueCell value={value} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
