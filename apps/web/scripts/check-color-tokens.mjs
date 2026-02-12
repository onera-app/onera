import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const TARGET_FILES = [
  "src/components/layout/Sidebar.tsx",
  "src/components/layout/ChatItem.tsx",
  "src/components/layout/FolderItem.tsx",
  "src/components/chat/MessageInput.tsx",
  "src/components/chat/SearchToggle.tsx",
  "src/components/chat/ToolInvocation.tsx",
  "src/components/chat/elements/tool.tsx",
  "src/components/ui/card.tsx",
  "src/components/ui/dropdown-menu.tsx",
  "src/components/billing/InvoiceTable.tsx",
  "src/routes/billing.tsx",
  "src/routes/admin/users.tsx",
  "src/routes/admin/subscriptions.tsx",
  "src/routes/admin/invoices.tsx",
];

const BLOCKED_PATTERNS = [
  {
    label: "hex-based utility color",
    regex: /\b(?:bg|text|border|ring)-\[#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6,8})\]/g,
  },
  {
    label: "raw palette utility color",
    regex:
      /\b(?:bg|text|border|ring)-(?:white|black|red|green|blue|amber|yellow|purple|violet|fuchsia|emerald|orange|indigo|rose|neutral|zinc|cyan)-\d{2,3}(?:\/\d{1,3})?\b/g,
  },
];

function collectViolations(filePath) {
  const content = readFileSync(resolve(filePath), "utf8");
  const lines = content.split("\n");
  const violations = [];

  lines.forEach((line, index) => {
    for (const pattern of BLOCKED_PATTERNS) {
      const matches = line.match(pattern.regex);
      if (matches) {
        violations.push({
          filePath,
          line: index + 1,
          label: pattern.label,
          matches: [...new Set(matches)].join(", "),
        });
      }
    }
  });

  return violations;
}

const violations = TARGET_FILES.flatMap(collectViolations);

if (violations.length > 0) {
  console.error("Color token lint failed. Replace raw palette classes with semantic tokens.");
  for (const violation of violations) {
    console.error(
      `- ${violation.filePath}:${violation.line} [${violation.label}] ${violation.matches}`,
    );
  }
  process.exit(1);
}

console.log("Color token lint passed.");
