import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Geist_Mono: ({ variable }: { variable: string }) => ({
    variable: `geist-mono(${variable})`,
  }),
  Inter: ({ variable }: { variable: string }) => ({
    variable: `inter(${variable})`,
  }),
}));

import RootLayout from "../../app/layout";

const globalsCss = readFileSync(
  resolve(process.cwd(), "app/globals.css"),
  "utf8",
);

describe("museum typography", () => {
  it("exposes the landing typography variables from the root layout", () => {
    const layout = RootLayout({ children: <main>Museum</main> });

    expect(layout.props.className?.split(/\s+/)).toEqual([
      "inter(--font-inter)",
      "geist-mono(--font-geist-mono)",
    ]);
  });

  it("maps the existing CSS and Tailwind aliases to bundled font variables", () => {
    const expectedMappings = [
      '--font-display: var(--font-inter), "Helvetica Neue", Helvetica, Arial, sans-serif;',
      '--font-sans: var(--font-inter), "Helvetica Neue", Helvetica, Arial, sans-serif;',
      '--font-mono: var(--font-geist-mono), "SFMono-Regular", Consolas, "Liberation Mono", monospace;',
    ];
    const themeStart = globalsCss.indexOf("@theme inline");
    const themeEnd = globalsCss.indexOf("\n}", themeStart);
    const theme = globalsCss.slice(themeStart, themeEnd);

    for (const mapping of expectedMappings) {
      expect(globalsCss.indexOf(mapping)).toBeLessThan(themeStart);
      expect(theme).toContain(mapping);
    }
  });
});
