import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(path) {
  return readFileSync(resolve(path), "utf8");
}

function assertContains(content, pattern, message) {
  if (!pattern.test(content)) {
    throw new Error(message);
  }
}

function assertNotContains(content, pattern, message) {
  if (pattern.test(content)) {
    throw new Error(message);
  }
}

try {
  const globals = read("src/styles/globals.css");
  assertContains(
    globals,
    /--color-status-success-text:/,
    "Missing --color-status-success-text token in globals.css",
  );
  assertContains(
    globals,
    /--color-status-warning-text:/,
    "Missing --color-status-warning-text token in globals.css",
  );
  assertContains(
    globals,
    /--color-status-error-text:/,
    "Missing --color-status-error-text token in globals.css",
  );
  assertContains(
    globals,
    /\.light\s*{[\s\S]*--color-sidebar-ring:/,
    "Missing --color-sidebar-ring in .light theme block",
  );

  const dropdown = read("src/components/ui/dropdown-menu.tsx");
  assertNotContains(
    dropdown,
    /focus:bg-white\/10|focus:text-white/,
    "Dropdown uses hard-coded white focus state; use accent tokens instead.",
  );

  const sidebar = read("src/components/layout/Sidebar.tsx");
  assertNotContains(
    sidebar,
    /\btext-white\/\d+\b|\bbg-white(?:\/\[[^\]]+\]|\/\d+)\b|\bborder-white(?:\/\[[^\]]+\]|\/\d+)\b/,
    "Sidebar still contains hard-coded white alpha utility classes.",
  );

  const messageInput = read("src/components/chat/MessageInput.tsx");
  assertNotContains(
    messageInput,
    /focus-visible:ring-0/,
    "MessageInput suppresses keyboard focus ring with focus-visible:ring-0.",
  );

  const hoverOnlyFiles = [
    "src/components/layout/ChatItem.tsx",
    "src/components/layout/FolderItem.tsx",
    "src/features/settings-modal/tabs/ConnectionsTab.tsx",
  ];
  for (const file of hoverOnlyFiles) {
    const content = read(file);
    assertNotContains(
      content,
      /opacity-0\s+group-hover:opacity-100/,
      `${file} still contains hover-only reveal without keyboard/touch fallback.`,
    );
  }

  console.log("UI accessibility regression checks passed.");
} catch (error) {
  console.error("UI accessibility regression checks failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
