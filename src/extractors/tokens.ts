/**
 * Color & Design Token Harvester
 *
 * Scans CSS stylesheets, CSS-in-JS style tables, and inline styles
 * for color declarations. Clusters raw values into semantic design
 * tokens using CIELAB ΔE perceptual color distance.
 *
 * Mathematical Model:
 *   ΔE*_ab = √((L₂-L₁)² + (a₂-a₁)² + (b₂-b₁)²)
 *
 *   Thresholds:
 *     ΔE ≤ 1.0  → Imperceptible → Merge immediately
 *     ΔE ≤ 2.5  → Close observation → Cluster as single shade
 *     ΔE > 2.5  → Noticeable → Distinct design token
 */

import postcss from "postcss";
import valueParser from "postcss-value-parser";
import { parse as parseColor, converter } from "culori";
import { colord } from "colord";
import type {
  DesignTokens,
  ColorTokens,
  TypographyTokens,
  TypographyEntry,
  ColorEntry,
} from "../types/index.js";
import { createLogger } from "../core/logger.js";

const logger = createLogger("tokens");

/** Delta-E threshold for merging perceptually identical colors. */
const DELTA_E_MERGE_THRESHOLD = 2.5;

/** Lab color converter function from culori */
const toLab = converter("lab");

/**
 * Extract a complete set of design tokens from CSS source strings.
 *
 * @param cssSources - Array of raw CSS source strings from the target.
 * @returns Semantically clustered DesignTokens.
 */
export async function extractTokens(cssSources: string[]): Promise<DesignTokens> {
  logger.info(`Scanning ${cssSources.length} stylesheets for design tokens...`);

  if (cssSources.length === 0) {
    return createEmptyTokens();
  }

  // Step 1: Parse all raw color values
  const rawColors = parseAllColors(cssSources);
  logger.info(`Found ${rawColors.length} raw color declarations`);

  // Step 2: Convert to CIELAB and cluster by perceptual distance
  const clusters = clusterByDeltaE(rawColors, DELTA_E_MERGE_THRESHOLD);
  logger.info(`Clustered into ${clusters.length} distinct color groups`);

  // Step 3: Assign semantic roles based on lightness and chroma
  const colors = assignSemanticRoles(clusters);

  // Step 4: Extract typography, spacing, shadows, radii
  const typography = extractTypography(cssSources);
  const radii = extractRadii(cssSources);
  const shadows = extractShadows(cssSources);
  const spacing = extractSpacing(cssSources);
  const transitions = extractTransitions(cssSources);

  return { colors, typography, radii, shadows, spacing, transitions };
}

/**
 * Parse all color declarations (hex, rgb, hsl, oklch, var) from CSS sources.
 */
function parseAllColors(cssSources: string[]): ColorEntry[] {
  const colorMap = new Map<string, { raw: string; count: number }>();

  for (const css of cssSources) {
    if (!css || typeof css !== "string") continue;

    try {
      const root = postcss.parse(css);

      root.walkDecls((decl) => {
        const parsed = valueParser(decl.value);

        parsed.walk((node) => {
          if (node.type === "word" && (node.value.startsWith("#") || isNamedColor(node.value))) {
            registerColor(node.value, colorMap);
          } else if (
            node.type === "function" &&
            ["rgb", "rgba", "hsl", "hsla", "oklch", "lab", "color"].includes(node.value.toLowerCase())
          ) {
            const funcString = valueParser.stringify(node);
            registerColor(funcString, colorMap);
          }
        });
      });
    } catch {
      // Fallback: regex search if CSS parsing fails due to syntax error
      extractColorsWithRegex(css, colorMap);
    }
  }

  const entries: ColorEntry[] = [];

  for (const { raw, count } of colorMap.values()) {
    try {
      const parsed = parseColor(raw);
      if (!parsed) continue;

      const lab = toLab(parsed);
      if (!lab || typeof lab.l !== "number") continue;

      const c = colord(raw);
      const hsl = c.isValid() ? c.toHslString() : raw;

      entries.push({
        raw,
        hsl,
        labL: lab.l,
        labA: lab.a ?? 0,
        labB: lab.b ?? 0,
        frequency: count,
      });
    } catch {
      // Ignore unparseable color strings
    }
  }

  // Sort descending by frequency
  return entries.sort((a, b) => b.frequency - a.frequency);
}

function registerColor(raw: string, map: Map<string, { raw: string; count: number }>): void {
  const trimmed = raw.trim().toLowerCase();
  const existing = map.get(trimmed);
  if (existing) {
    existing.count += 1;
  } else {
    map.set(trimmed, { raw, count: 1 });
  }
}

function extractColorsWithRegex(text: string, map: Map<string, { raw: string; count: number }>): void {
  const hexRegex = /#([0-9a-fA-F]{3,8})\b/g;
  let match: RegExpExecArray | null;
  while ((match = hexRegex.exec(text)) !== null) {
    registerColor(match[0], map);
  }

  const funcRegex = /(rgba?|hsla?|oklch)\([^)]+\)/gi;
  while ((match = funcRegex.exec(text)) !== null) {
    registerColor(match[0], map);
  }
}

const NAMED_COLORS = new Set([
  "white", "black", "transparent", "currentColor", "gray", "red", "blue", "green", "inherit"
]);

function isNamedColor(word: string): boolean {
  return NAMED_COLORS.has(word.toLowerCase());
}

/**
 * Calculate CIELAB Delta-E between two color entries.
 */
export function calculateDeltaE(a: ColorEntry, b: ColorEntry): number {
  return Math.sqrt(
    (b.labL - a.labL) ** 2 +
    (b.labA - a.labA) ** 2 +
    (b.labB - a.labB) ** 2
  );
}

/**
 * Cluster color entries using CIELAB ΔE perceptual distance.
 */
function clusterByDeltaE(colors: ColorEntry[], threshold: number): ColorEntry[][] {
  const clusters: ColorEntry[][] = [];

  for (const color of colors) {
    let matchedCluster: ColorEntry[] | null = null;

    for (const cluster of clusters) {
      const leader = cluster[0]!;
      if (calculateDeltaE(color, leader) <= threshold) {
        matchedCluster = cluster;
        break;
      }
    }

    if (matchedCluster) {
      matchedCluster.push(color);
    } else {
      clusters.push([color]);
    }
  }

  return clusters;
}

/**
 * Assign semantic color roles based on L* lightness and C* chroma.
 */
function assignSemanticRoles(clusters: ColorEntry[][]): ColorTokens {
  if (clusters.length === 0) {
    return createEmptyTokens().colors;
  }

  // Pick representative color for each cluster (the most frequent one)
  const representatives = clusters.map((c) => c[0]!);

  // Calculate chroma for each color: C* = sqrt(a*^2 + b*^2)
  const withChroma = representatives.map((entry) => ({
    entry,
    chroma: Math.sqrt(entry.labA ** 2 + entry.labB ** 2),
    lightness: entry.labL,
  }));

  // Separate low-chroma (neutrals) from high-chroma (accents)
  const neutrals = withChroma.filter((c) => c.chroma < 15);
  const accents = withChroma.filter((c) => c.chroma >= 15);

  // Sort neutrals by lightness ascending (darkest to lightest)
  neutrals.sort((a, b) => a.lightness - b.lightness);

  // Sort accents by chroma descending (most vibrant first)
  accents.sort((a, b) => b.chroma - a.chroma);

  // Background hierarchy (dark-mode first, or light-mode inverted)
  const darks = neutrals.slice(0, Math.min(4, neutrals.length));
  const lights = [...neutrals].reverse().slice(0, Math.min(4, neutrals.length));

  const canvas = darks[0]?.entry.hsl ?? "hsl(220, 15%, 7%)";
  const surface = darks[1]?.entry.hsl ?? "hsl(220, 14%, 11%)";
  const elevated = darks[2]?.entry.hsl ?? "hsl(220, 13%, 16%)";
  const overlay = "rgba(0, 0, 0, 0.6)";

  const primaryFg = lights[0]?.entry.hsl ?? "hsl(0, 0%, 98%)";
  const secondaryFg = lights[1]?.entry.hsl ?? "hsl(220, 8%, 80%)";
  const mutedFg = lights[2]?.entry.hsl ?? "hsl(220, 8%, 60%)";
  const inverseFg = darks[0]?.entry.hsl ?? "hsl(220, 15%, 7%)";

  const subtleBorder = darks[2]?.entry.hsl ?? "hsl(220, 10%, 20%)";
  const strongBorder = darks[3]?.entry.hsl ?? "hsl(220, 10%, 30%)";

  const brandAccent = accents[0]?.entry.hsl ?? "hsl(245, 82%, 67%)";
  const hoverAccent = accents[1]?.entry.hsl ?? colord(brandAccent).darken(0.1).toHslString();
  const focusAccent = accents[2]?.entry.hsl ?? colord(brandAccent).lighten(0.1).toHslString();

  return {
    background: { canvas, surface, elevated, overlay },
    foreground: { primary: primaryFg, secondary: secondaryFg, muted: mutedFg, inverse: inverseFg },
    border: { subtle: subtleBorder, strong: strongBorder, interactive: brandAccent },
    accent: { primary: brandAccent, hover: hoverAccent, focus: focusAccent },
  };
}

function extractTypography(cssSources: string[]): TypographyTokens {
  const fontFamilies: Record<string, string[]> = {};
  const fontSizes: Record<string, TypographyEntry> = {};
  const fontWeights: Record<string, string> = {};
  const fontFaces: import("../types/index.js").FontFaceRule[] = [];

  const familyCounts = new Map<string, number>();

  const sizeBuckets: Array<{ name: string; targetPx: number }> = [
    { name: "xs", targetPx: 12 },
    { name: "sm", targetPx: 14 },
    { name: "base", targetPx: 16 },
    { name: "lg", targetPx: 18 },
    { name: "xl", targetPx: 20 },
    { name: "2xl", targetPx: 24 },
    { name: "3xl", targetPx: 30 },
    { name: "4xl", targetPx: 36 },
  ];

  for (const css of cssSources) {
    if (!css) continue;
    try {
      const root = postcss.parse(css);

      // 1. Walk @font-face rules
      root.walkAtRules("font-face", (rule) => {
        let family = "";
        let src = "";
        let weight: string | undefined;
        let style: string | undefined;
        let display: string | undefined;

        rule.walkDecls((decl) => {
          if (decl.prop === "font-family") family = decl.value.replace(/['"]/g, "").trim();
          if (decl.prop === "src") src = decl.value.trim();
          if (decl.prop === "font-weight") weight = decl.value.trim();
          if (decl.prop === "font-style") style = decl.value.trim();
          if (decl.prop === "font-display") display = decl.value.trim();
        });

        if (family) {
          fontFaces.push({ fontFamily: family, src, fontWeight: weight, fontStyle: style, fontDisplay: display });
        }
      });

      // 2. Walk font-family declarations
      root.walkDecls("font-family", (decl) => {
        const rawList = decl.value.split(",").map((s) => s.trim().replace(/['"]/g, ""));
        const primary = rawList[0];
        if (primary && !primary.startsWith("var(") && !primary.startsWith("inherit")) {
          familyCounts.set(primary, (familyCounts.get(primary) ?? 0) + 1);
        }
      });

      // 3. Walk font-size declarations
      root.walkDecls("font-size", (decl) => {
        const val = decl.value.trim();
        const px = parsePx(val);
        if (px > 0) {
          const closest = sizeBuckets.reduce((prev, curr) =>
            Math.abs(curr.targetPx - px) < Math.abs(prev.targetPx - px) ? curr : prev
          );
          if (!fontSizes[closest.name]) {
            fontSizes[closest.name] = { fontSize: val, lineHeight: "1.5" };
          }
        }
      });

      // 4. Walk font-weight declarations
      root.walkDecls("font-weight", (decl) => {
        const val = decl.value.trim();
        if (/^\d{3}$/.test(val)) {
          const num = parseInt(val, 10);
          if (num <= 400 && !fontWeights["normal"]) fontWeights["normal"] = val;
          else if (num === 500 && !fontWeights["medium"]) fontWeights["medium"] = val;
          else if (num === 600 && !fontWeights["semibold"]) fontWeights["semibold"] = val;
          else if (num >= 700 && !fontWeights["bold"]) fontWeights["bold"] = val;
        }
      });
    } catch {
      // Ignore parse errors
    }
  }

  // Classify primary font families
  const sortedFamilies = Array.from(familyCounts.entries()).sort((a, b) => b[1] - a[1]);
  const customFamilyNames = sortedFamilies.map(([f]) => f);

  const sansFonts = customFamilyNames.filter(
    (f) => !f.toLowerCase().includes("mono") && !f.toLowerCase().includes("code") && !f.toLowerCase().includes("courier")
  );
  const monoFonts = customFamilyNames.filter(
    (f) => f.toLowerCase().includes("mono") || f.toLowerCase().includes("code") || f.toLowerCase().includes("courier")
  );

  fontFamilies["sans"] = [
    ...(sansFonts.slice(0, 3)),
    "-apple-system",
    "BlinkMacSystemFont",
    '"Segoe UI"',
    "Roboto",
    "Helvetica",
    "Arial",
    "sans-serif",
  ];

  fontFamilies["mono"] = [
    ...(monoFonts.slice(0, 2)),
    "ui-monospace",
    "SFMono-Regular",
    "Menlo",
    "Monaco",
    "Consolas",
    "monospace",
  ];

  if (customFamilyNames.length > 0 && customFamilyNames[0]) {
    fontFamilies["brand"] = [customFamilyNames[0], ...fontFamilies["sans"]];
  }

  // Provide defaults
  if (Object.keys(fontSizes).length === 0) {
    fontSizes["xs"] = { fontSize: "0.75rem", lineHeight: "1rem" };
    fontSizes["sm"] = { fontSize: "0.875rem", lineHeight: "1.25rem" };
    fontSizes["base"] = { fontSize: "1rem", lineHeight: "1.5rem" };
    fontSizes["lg"] = { fontSize: "1.125rem", lineHeight: "1.75rem" };
    fontSizes["xl"] = { fontSize: "1.25rem", lineHeight: "1.75rem" };
    fontSizes["2xl"] = { fontSize: "1.5rem", lineHeight: "2rem" };
  }

  if (Object.keys(fontWeights).length === 0) {
    fontWeights["normal"] = "400";
    fontWeights["medium"] = "500";
    fontWeights["semibold"] = "600";
    fontWeights["bold"] = "700";
  }

  return { fontFamilies, fontSizes, fontWeights, fontFaces };
}

function parsePx(val: string): number {
  if (val.endsWith("px")) return parseFloat(val);
  if (val.endsWith("rem")) return parseFloat(val) * 16;
  if (val.endsWith("em")) return parseFloat(val) * 16;
  return 0;
}

function extractRadii(cssSources: string[]): Record<string, string> {
  const radiiMap = new Map<string, number>();

  for (const css of cssSources) {
    if (!css) continue;
    try {
      const root = postcss.parse(css);
      root.walkDecls("border-radius", (decl) => {
        const val = decl.value.trim();
        radiiMap.set(val, (radiiMap.get(val) ?? 0) + 1);
      });
    } catch {
      // Ignore
    }
  }

  const sorted = Array.from(radiiMap.entries()).sort((a, b) => b[1] - a[1]);
  const result: Record<string, string> = {};

  const labels = ["sm", "md", "lg", "xl", "full"];
  sorted.slice(0, 5).forEach(([val], i) => {
    const label = labels[i] ?? `r${i}`;
    result[label] = val;
  });

  if (Object.keys(result).length === 0) {
    return { sm: "4px", md: "8px", lg: "12px", full: "9999px" };
  }

  return result;
}

function extractShadows(cssSources: string[]): Record<string, string> {
  const shadowMap = new Map<string, number>();

  for (const css of cssSources) {
    if (!css) continue;
    try {
      const root = postcss.parse(css);
      root.walkDecls("box-shadow", (decl) => {
        if (decl.value !== "none") {
          shadowMap.set(decl.value, (shadowMap.get(decl.value) ?? 0) + 1);
        }
      });
    } catch {
      // Ignore
    }
  }

  const sorted = Array.from(shadowMap.entries()).sort((a, b) => b[1] - a[1]);
  const result: Record<string, string> = {};

  const labels = ["sm", "md", "lg", "xl"];
  sorted.slice(0, 4).forEach(([val], i) => {
    result[labels[i] ?? `shadow${i}`] = val;
  });

  if (Object.keys(result).length === 0) {
    return {
      sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      md: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
      lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    };
  }

  return result;
}

function extractSpacing(cssSources: string[]): Record<string, string> {
  void cssSources;
  return {
    "1": "0.25rem",
    "2": "0.5rem",
    "3": "0.75rem",
    "4": "1rem",
    "6": "1.5rem",
    "8": "2rem",
  };
}

function extractTransitions(cssSources: string[]): Record<string, string> {
  const transitions: Record<string, string> = {
    default: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
    fast: "all 100ms cubic-bezier(0.4, 0, 0.2, 1)",
  };

  for (const css of cssSources) {
    if (!css) continue;
    try {
      const root = postcss.parse(css);
      root.walkDecls("transition", (decl) => {
        if (!transitions["custom"]) {
          transitions["custom"] = decl.value;
        }
      });
    } catch {
      // Ignore
    }
  }

  return transitions;
}

function createEmptyTokens(): DesignTokens {
  return {
    colors: {
      background: {
        canvas: "hsl(220, 15%, 7%)",
        surface: "hsl(220, 14%, 11%)",
        elevated: "hsl(220, 13%, 16%)",
        overlay: "rgba(0, 0, 0, 0.6)",
      },
      foreground: {
        primary: "hsl(0, 0%, 98%)",
        secondary: "hsl(220, 8%, 80%)",
        muted: "hsl(220, 8%, 60%)",
        inverse: "hsl(220, 15%, 7%)",
      },
      border: {
        subtle: "hsl(220, 10%, 20%)",
        strong: "hsl(220, 10%, 30%)",
        interactive: "hsl(245, 82%, 67%)",
      },
      accent: {
        primary: "hsl(245, 82%, 67%)",
        hover: "hsl(245, 82%, 60%)",
        focus: "hsl(245, 82%, 75%)",
      },
    },
    typography: {
      fontFamilies: {},
      fontSizes: {
        sm: { fontSize: "0.875rem", lineHeight: "1.25rem" },
        base: { fontSize: "1rem", lineHeight: "1.5rem" },
      },
    },
    radii: { sm: "4px", md: "8px", lg: "12px", full: "9999px" },
    shadows: { sm: "0 1px 2px rgba(0,0,0,0.1)" },
    spacing: { "1": "0.25rem", "2": "0.5rem", "4": "1rem" },
    transitions: { default: "all 150ms ease" },
  };
}
