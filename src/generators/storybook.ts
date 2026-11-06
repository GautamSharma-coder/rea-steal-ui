/**
 * Storybook Story Synthesizer
 *
 * Generates Component Story Format (CSF3) .stories.tsx files
 * for decompiled components, design tokens overview, typography scales,
 * elevation shadows, border radii, and extracted icon sets.
 */

import type { DecompiledComponent, DesignTokens } from "../types/index.js";
import { createLogger } from "../core/logger.js";

const logger = createLogger("storybook");

/** Generated story file with path and content. */
export interface GeneratedStory {
  /** Relative file path (e.g. "src/components/Button/Button.stories.tsx") */
  filePath: string;
  /** Full story file source code */
  content: string;
}

/**
 * Generate Storybook CSF3 stories for all decompiled components,
 * design token swatches, typography scales, shadows, and harvested icons.
 *
 * @param components - Array of decompiled components.
 * @param hasIcons - Whether SVG icons were harvested.
 * @param tokens - Extracted design tokens.
 * @returns Array of generated story file descriptors.
 */
export async function generateStories(
  components: DecompiledComponent[],
  hasIcons: boolean = false,
  tokens?: DesignTokens
): Promise<GeneratedStory[]> {
  logger.info(`Generating Storybook stories for ${components.length} components...`);

  const stories: GeneratedStory[] = components.map((component) => ({
    filePath: `src/components/${component.name}/${component.name}.stories.tsx`,
    content: generateCSF3Story(component),
  }));

  // 1. Color Palette Tokens Story
  stories.push({
    filePath: `src/styles/Tokens.stories.tsx`,
    content: generateTokensStory(),
  });

  // 2. Typography & Font Family Story
  stories.push({
    filePath: `src/styles/Typography.stories.tsx`,
    content: generateTypographyStory(tokens),
  });

  // 3. Elevation & Shadows Story
  stories.push({
    filePath: `src/styles/Elevation.stories.tsx`,
    content: generateElevationStory(tokens),
  });

  // 4. Border Radii Scale Story
  stories.push({
    filePath: `src/styles/Radii.stories.tsx`,
    content: generateRadiiStory(tokens),
  });

  // 5. If icons exist, generate Icons showcase story
  if (hasIcons) {
    stories.push({
      filePath: `src/icons/Icons.stories.tsx`,
      content: generateIconsStory(),
    });
  }

  return stories;
}

/**
 * Generate a single CSF3 story file for a component.
 */
function generateCSF3Story(component: DecompiledComponent): string {
  const { name, category } = component;
  const defaultArgs = getDefaultArgs(category);

  return `import type { Meta, StoryObj } from "@storybook/react";
import { ${name} } from "./${name}";

const meta = {
  title: "Components/${name}",
  component: ${name},
  tags: ["autodocs"],
  parameters: {
    layout: "${category === "modal" ? "fullscreen" : "centered"}",
  },
} satisfies Meta<typeof ${name}>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: ${JSON.stringify(defaultArgs, null, 4)},
};

export const Interactive: Story = {
  args: {
    ...Default.args,
  },
};
`;
}

/**
 * Generate a visual design tokens story showing color swatches with explicit borders.
 */
export function generateTokensStory(): string {
  return `import type { Meta, StoryObj } from "@storybook/react";

const meta = {
  title: "Theme/Color Palette",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;

export const PaletteSwatches: StoryObj = {
  render: () => {
    const tokens = [
      { name: "--color-bg-canvas", desc: "Canvas / Root background" },
      { name: "--color-bg-surface", desc: "Card & surface containers" },
      { name: "--color-bg-elevated", desc: "Elevated dialogs & menus" },
      { name: "--color-fg-primary", desc: "Primary text & headings" },
      { name: "--color-fg-secondary", desc: "Secondary text & descriptions" },
      { name: "--color-fg-muted", desc: "Muted & disabled text" },
      { name: "--color-border-subtle", desc: "Dividers & card borders" },
      { name: "--color-border-strong", desc: "Active & interactive borders" },
      { name: "--color-accent-primary", desc: "Brand primary & button fills" },
      { name: "--color-accent-hover", desc: "Hover state accent" },
      { name: "--color-accent-focus", desc: "Focus ring accent" },
    ];

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "20px",
          padding: "32px",
          background: "#0c0d12",
          minHeight: "100vh",
        }}
      >
        {tokens.map((t) => (
          <div
            key={t.name}
            style={{
              display: "flex",
              flexDirection: "column",
              borderRadius: "14px",
              border: "1px solid rgba(255, 255, 255, 0.16)",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.35)",
              background: "#161821",
              overflow: "hidden",
            }}
          >
            {/* Color Swatch Preview with explicit border & transparency checkerboard */}
            <div style={{ padding: "14px", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
              <div
                style={{
                  height: "76px",
                  borderRadius: "10px",
                  border: "2px solid rgba(255, 255, 255, 0.35)",
                  position: "relative",
                  overflow: "hidden",
                  backgroundImage:
                    "linear-gradient(45deg, #282c37 25%, transparent 25%), linear-gradient(-45deg, #282c37 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #282c37 75%), linear-gradient(-45deg, transparent 75%, #282c37 75%)",
                  backgroundSize: "16px 16px",
                  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
                  backgroundColor: "#161821",
                  boxShadow: "inset 0 0 0 1px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2)",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    background: \`var(\${t.name}, #333)\`,
                  }}
                />
              </div>
            </div>

            {/* Token details and badge */}
            <div style={{ padding: "14px 16px" }}>
              <div
                style={{
                  display: "inline-block",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  fontFamily: "monospace",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#f3f4f6",
                }}
              >
                {t.name}
              </div>
              <div style={{ fontSize: "13px", color: "#9ca3af", marginTop: "8px", lineHeight: "1.4" }}>
                {t.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  },
};
`;
}

/**
 * Generate Typography and Font Family showcase story.
 */
export function generateTypographyStory(tokens?: DesignTokens): string {
  const fontFamilies = tokens?.typography?.fontFamilies ?? {
    sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
    mono: ["ui-monospace", "SFMono-Regular", "monospace"],
  };

  const sizes = tokens?.typography?.fontSizes ?? {
    sm: { fontSize: "0.875rem", lineHeight: "1.25rem" },
    base: { fontSize: "1rem", lineHeight: "1.5rem" },
    lg: { fontSize: "1.125rem", lineHeight: "1.75rem" },
    xl: { fontSize: "1.25rem", lineHeight: "1.75rem" },
    "2xl": { fontSize: "1.5rem", lineHeight: "2rem" },
    "3xl": { fontSize: "1.875rem", lineHeight: "2.25rem" },
  };

  return `import type { Meta, StoryObj } from "@storybook/react";

const meta = {
  title: "Theme/Typography & Fonts",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;

export const TypographyShowcase: StoryObj = {
  render: () => {
    const families = ${JSON.stringify(fontFamilies, null, 2)};
    const sizes = ${JSON.stringify(sizes, null, 2)};

    return (
      <div style={{ padding: "36px", background: "#0c0d12", minHeight: "100vh", color: "#f3f4f6", fontFamily: "var(--font-sans, sans-serif)" }}>
        {/* Section 1: Font Families */}
        <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "8px" }}>
          Extracted Font Families
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px", marginBottom: "40px" }}>
          {Object.entries(families).map(([role, fonts]) => (
            <div key={role} style={{ border: "1px solid rgba(255,255,255,0.16)", borderRadius: "12px", background: "#161821", padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ textTransform: "uppercase", fontSize: "11px", fontWeight: "700", letterSpacing: "0.05em", color: "var(--color-accent-primary, #6366f1)" }}>
                  {role} font
                </span>
                <code style={{ fontSize: "12px", color: "#9ca3af" }}>--font-{role}</code>
              </div>
              <div style={{ fontSize: "16px", fontWeight: "600", marginTop: "12px", fontFamily: \`var(--font-\${role}, sans-serif)\` }}>
                {Array.isArray(fonts) ? fonts.join(", ") : fonts}
              </div>
              <div style={{ marginTop: "16px", padding: "12px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <p style={{ margin: "0", fontSize: "14px", fontFamily: \`var(--font-\${role}, sans-serif)\`, lineHeight: "1.5" }}>
                  The quick brown fox jumps over the lazy dog. 0123456789
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Section 2: Type Scale Hierarchy */}
        <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "8px" }}>
          Type Scale & Hierarchy
        </h2>

        <div style={{ border: "1px solid rgba(255,255,255,0.16)", borderRadius: "12px", background: "#161821", padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
          {Object.entries(sizes).map(([name, entry]) => (
            <div key={name} style={{ display: "flex", alignItems: "baseline", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "16px" }}>
              <div style={{ width: "120px", flexShrink: 0 }}>
                <code style={{ fontSize: "12px", color: "var(--color-accent-primary, #6366f1)", fontWeight: "bold" }}>text-{name}</code>
                <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>{entry.fontSize}</div>
              </div>
              <div style={{ fontSize: entry.fontSize, lineHeight: entry.lineHeight, fontWeight: "500" }}>
                Headline preview ({name})
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  },
};
`;
}

/**
 * Generate Elevation and Box Shadows showcase story.
 */
export function generateElevationStory(tokens?: DesignTokens): string {
  const shadows = tokens?.shadows ?? {
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
  };

  return `import type { Meta, StoryObj } from "@storybook/react";

const meta = {
  title: "Theme/Elevation & Shadows",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;

export const ElevationShowcase: StoryObj = {
  render: () => {
    const shadows = ${JSON.stringify(shadows, null, 2)};

    return (
      <div style={{ padding: "36px", background: "#0c0d12", minHeight: "100vh", color: "#f3f4f6" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "8px" }}>Elevation & Shadows</h2>
        <p style={{ fontSize: "13px", color: "#9ca3af", marginBottom: "28px" }}>Multi-layered depth box shadows extracted from target stylesheets.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
          {Object.entries(shadows).map(([level, val]) => (
            <div
              key={level}
              style={{
                borderRadius: "14px",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                background: "#161821",
                boxShadow: val,
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: "140px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "14px", fontWeight: "700", textTransform: "uppercase" }}>Level {level}</span>
                <code style={{ fontSize: "12px", color: "#9ca3af" }}>--shadow-{level}</code>
              </div>
              <div style={{ fontSize: "11px", fontFamily: "monospace", color: "#6b7280", wordBreak: "break-all", marginTop: "12px" }}>
                {val}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  },
};
`;
}

/**
 * Generate Border Radii Scale showcase story.
 */
export function generateRadiiStory(tokens?: DesignTokens): string {
  const radii = tokens?.radii ?? {
    sm: "4px",
    md: "8px",
    lg: "12px",
    full: "9999px",
  };

  return `import type { Meta, StoryObj } from "@storybook/react";

const meta = {
  title: "Theme/Border Radii",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;

export const RadiiShowcase: StoryObj = {
  render: () => {
    const radii = ${JSON.stringify(radii, null, 2)};

    return (
      <div style={{ padding: "36px", background: "#0c0d12", minHeight: "100vh", color: "#f3f4f6" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "8px" }}>Border Radii Scale</h2>
        <p style={{ fontSize: "13px", color: "#9ca3af", marginBottom: "28px" }}>Curvature corner radii tokens extracted from containers and buttons.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "20px" }}>
          {Object.entries(radii).map(([name, val]) => (
            <div
              key={name}
              style={{
                borderRadius: val,
                border: "2px solid rgba(255, 255, 255, 0.25)",
                background: "#161821",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "120px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
              }}
            >
              <div style={{ fontSize: "14px", fontWeight: "700" }}>rounded-{name}</div>
              <code style={{ fontSize: "12px", color: "var(--color-accent-primary, #6366f1)", marginTop: "4px" }}>{val}</code>
            </div>
          ))}
        </div>
      </div>
    );
  },
};
`;
}

/**
 * Generate a visual icon set story showing all harvested icons.
 */
export function generateIconsStory(): string {
  return `import type { Meta, StoryObj } from "@storybook/react";
import * as Icons from "./index";

const meta = {
  title: "Icons/Extracted Icons",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;

export const AllIcons: StoryObj = {
  render: () => {
    const iconEntries = Object.entries(Icons).filter(([name]) => name !== "default");

    return (
      <div style={{ padding: "36px", background: "#0c0d12", minHeight: "100vh", color: "#f3f4f6" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "8px" }}>Harvested Vector Icons</h2>
        <p style={{ fontSize: "13px", color: "#9ca3af", marginBottom: "28px" }}>Inline SVG icons decompiled from React AST with normalized currentColor.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "16px" }}>
          {iconEntries.map(([name, IconComponent]) => {
            const Icon = IconComponent as React.FC<React.SVGProps<SVGSVGElement>>;
            return (
              <div
                key={name}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "18px 12px",
                  border: "1px solid rgba(255, 255, 255, 0.16)",
                  borderRadius: "12px",
                  background: "#161821",
                  boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
                }}
              >
                <Icon style={{ width: "32px", height: "32px", color: "var(--color-fg-primary, #fff)" }} />
                <span style={{ marginTop: "12px", fontSize: "12px", fontFamily: "monospace", color: "#9ca3af", textAlign: "center", wordBreak: "break-all" }}>
                  {name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
};
`;
}

/**
 * Generate sensible default args based on component category.
 */
function getDefaultArgs(category: string): Record<string, unknown> {
  switch (category) {
    case "button":
      return { children: "Click Me", variant: "primary" };
    case "command-palette":
      return { placeholder: "Type a command...", items: [] };
    case "modal":
      return { open: true, title: "Modal Title" };
    case "dropdown":
      return { items: ["Option 1", "Option 2", "Option 3"] };
    case "badge":
      return { children: "Status", variant: "default" };
    default:
      return {};
  }
}
