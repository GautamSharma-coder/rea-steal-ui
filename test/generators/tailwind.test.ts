/**
 * Tailwind Generator Unit Tests
 */

import { describe, it, expect } from "vitest";
import { generateTailwindConfig } from "../../src/generators/tailwind.js";
import type { DesignTokens } from "../../src/types/index.js";

const mockTokens: DesignTokens = {
  colors: {
    background: { canvas: "hsl(220,15%,7%)", surface: "hsl(220,14%,11%)", elevated: "hsl(220,13%,16%)", overlay: "hsl(0,0%,0%,0.6)" },
    foreground: { primary: "hsl(0,0%,98%)", secondary: "hsl(0,0%,85%)", muted: "hsl(220,8%,60%)", inverse: "hsl(220,15%,7%)" },
    border: { subtle: "hsl(220,10%,20%)", strong: "hsl(220,10%,30%)", interactive: "hsl(245,82%,67%)" },
    accent: { primary: "hsl(245,82%,67%)", hover: "hsl(245,82%,60%)", focus: "hsl(245,82%,75%)" },
  },
  typography: { fontFamilies: {}, fontSizes: {} },
  radii: { sm: "4px", md: "8px", lg: "12px" },
  shadows: { sm: "0 1px 2px rgba(0,0,0,0.1)" },
  spacing: {},
  transitions: {},
};

describe("Tailwind Generator", () => {
  it("generates Tailwind v3 config with extend.colors", async () => {
    const { configContent } = await generateTailwindConfig(mockTokens, "3");
    expect(configContent).toContain("satisfies Config");
    expect(configContent).toContain("var(--color-bg-canvas)");
  });

  it("generates Tailwind v4 @theme config", async () => {
    const { configContent } = await generateTailwindConfig(mockTokens, "4");
    expect(configContent).toContain("@theme");
  });

  it("generates globals.css with CSS variables", async () => {
    const { globalsCss } = await generateTailwindConfig(mockTokens, "4");
    expect(globalsCss).toContain("--color-bg-canvas");
    expect(globalsCss).toContain("--color-accent-primary");
  });
});

