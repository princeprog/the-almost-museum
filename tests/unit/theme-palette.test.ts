import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");
const rootBlock = globalsCss.slice(globalsCss.indexOf(":root {"), globalsCss.indexOf("\n}", globalsCss.indexOf(":root {")));

function customProperty(name: string): string | undefined {
  return rootBlock.match(new RegExp(`\\s${name}:\\s*([^;]+);`))?.[1]?.trim();
}

describe("application theme palette", () => {
  it("binds app surfaces and shadcn semantics to the landing palette", () => {
    expect({
      background: customProperty("--background"),
      border: customProperty("--border"),
      card: customProperty("--card"),
      foreground: customProperty("--foreground"),
      primary: customProperty("--primary"),
      ring: customProperty("--ring"),
    }).toEqual({
      background: "var(--landing-canvas)",
      border: "var(--landing-border)",
      card: "var(--landing-card)",
      foreground: "var(--landing-ink)",
      primary: "var(--landing-dark)",
      ring: "var(--landing-accent)",
    });
  });

  it("keeps legacy page selectors on the same landing palette", () => {
    expect({
      brass: customProperty("--brass"),
      charcoal: customProperty("--charcoal"),
      ivory: customProperty("--ivory"),
      paper: customProperty("--paper"),
      rust: customProperty("--rust"),
    }).toEqual({
      brass: "var(--landing-accent)",
      charcoal: "var(--landing-ink)",
      ivory: "var(--landing-canvas)",
      paper: "var(--landing-card)",
      rust: "var(--landing-accent)",
    });
  });
});
