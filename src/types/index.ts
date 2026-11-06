/**
 * Unified TypeScript Data Contracts
 *
 * Central type definitions shared across the entire rea-steal-ui pipeline.
 * Every module in core/, extractors/, generators/, and pipeline/ imports
 * from this single source of truth.
 */

// ─── CLI & Configuration ─────────────────────────────────────────────────────

/** Parsed CLI flags passed through the commander action handler. */
export interface CLIOptions {
  out?: string;
  components?: string;
  tokensOnly: boolean;
  iconsOnly: boolean;
  preview: boolean;
  tailwindVersion: "3" | "4";
  typescript: boolean;
  cleanRoomStrict: boolean;
  verbose: boolean;
  dumpAst: boolean;
  keepTemp: boolean;
}

// ─── Target Resolution ───────────────────────────────────────────────────────

/** Supported input application formats. */
export type TargetFormat =
  | "electron-app"     // macOS .app or Windows Electron directory
  | "asar-archive"     // Raw .asar file
  | "web-bundle"       // Vite / Webpack / Rollup production dist
  | "unknown";

/** Resolved target application metadata. */
export interface TargetApp {
  /** Human-readable display name (e.g. "Linear for macOS") */
  name: string;
  /** Detected input format */
  format: TargetFormat;
  /** Absolute path to the resolved root directory or file */
  path: string;
  /** Electron version if detected (e.g. "30.1.2") */
  electronVersion?: string;
  /** List of discovered JavaScript bundle chunk paths */
  bundleChunks: string[];
  /** List of discovered CSS / stylesheet paths */
  stylesheetPaths: string[];
  /** List of discovered static asset paths (images, fonts) */
  assetPaths: string[];
}

// ─── Design Tokens ───────────────────────────────────────────────────────────

/** A single extracted color with its raw and normalized representations. */
export interface ColorEntry {
  /** Original raw value from source (e.g. "#0f1015", "rgb(15,16,21)") */
  raw: string;
  /** Normalized HSL string (e.g. "hsl(220, 15%, 7%)") */
  hsl: string;
  /** CIELAB L* lightness value (0–100) */
  labL: number;
  /** CIELAB a* green-red axis */
  labA: number;
  /** CIELAB b* blue-yellow axis */
  labB: number;
  /** Number of occurrences in the source stylesheets */
  frequency: number;
}

/** Semantically clustered color palette. */
export interface ColorTokens {
  background: {
    canvas: string;
    surface: string;
    elevated: string;
    overlay: string;
  };
  foreground: {
    primary: string;
    secondary: string;
    muted: string;
    inverse: string;
  };
  border: {
    subtle: string;
    strong: string;
    interactive: string;
  };
  accent: {
    primary: string;
    hover: string;
    focus: string;
  };
}

/** Typography scale entry. */
export interface TypographyEntry {
  fontSize: string;
  lineHeight: string;
  fontWeight?: string;
  letterSpacing?: string;
}

/** Font face rule description. */
export interface FontFaceRule {
  fontFamily: string;
  src: string;
  fontWeight?: string;
  fontStyle?: string;
  fontDisplay?: string;
}

/** Extracted typography tokens. */
export interface TypographyTokens {
  fontFamilies: Record<string, string[]>;
  fontSizes: Record<string, TypographyEntry>;
  fontWeights?: Record<string, string>;
  fontFaces?: FontFaceRule[];
}

/** Complete design token set extracted from the target. */
export interface DesignTokens {
  colors: ColorTokens;
  typography: TypographyTokens;
  radii: Record<string, string>;
  shadows: Record<string, string>;
  spacing: Record<string, string>;
  transitions: Record<string, string>;
}

// ─── Icons ───────────────────────────────────────────────────────────────────

/** A single SVG path element within an icon. */
export interface SVGPathData {
  d: string;
  fillRule?: string;
  clipRule?: string;
  strokeWidth?: string;
  strokeLinecap?: string;
  strokeLinejoin?: string;
}

/** A fully extracted and normalized SVG icon. */
export interface ExtractedIcon {
  /** Auto-assigned or detected icon name (e.g. "SearchIcon") */
  name: string;
  /** Normalized viewBox (e.g. "0 0 24 24") */
  viewBox: string;
  /** SVG path elements */
  paths: SVGPathData[];
  /** Original variable/export name from the minified source */
  originalName?: string;
  /** Source bundle chunk file where the icon was found */
  sourceFile: string;
  /** Confidence score of auto-naming (0.0 – 1.0) */
  namingConfidence: number;
}

// ─── Component Decompilation ─────────────────────────────────────────────────

/** Detected signature UI component category. */
export type ComponentCategory =
  | "button"
  | "command-palette"
  | "modal"
  | "dropdown"
  | "context-menu"
  | "badge"
  | "tabs"
  | "tooltip"
  | "input"
  | "shortcut-badge"
  | "generic";

/** A decompiled and reconstructed React component. */
export interface DecompiledComponent {
  /** Clean PascalCase component name (e.g. "CommandPalette") */
  name: string;
  /** Detected UI pattern category */
  category: ComponentCategory;
  /** Generated TypeScript interface code string */
  propsInterface: string;
  /** Formatted React component code string */
  componentCode: string;
  /** List of import dependencies (icons, utilities) */
  dependencies: string[];
  /** Generated Storybook CSF3 story code */
  storyCode: string;
  /** Source bundle chunk where the component was discovered */
  sourceFile: string;
}

// ─── Motion & Animation ──────────────────────────────────────────────────────

/** A single CSS keyframe definition. */
export interface KeyframeDefinition {
  name: string;
  steps: Record<string, Record<string, string>>;
}

/** Spring physics configuration (e.g. framer-motion spring). */
export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
}

/** Cubic-bezier timing function. */
export interface CubicBezierConfig {
  name: string;
  values: [number, number, number, number];
}

/** Extracted animation and motion configuration. */
export interface MotionConfig {
  keyframes: KeyframeDefinition[];
  springs: SpringConfig[];
  cubicBeziers: CubicBezierConfig[];
  transitions: Record<string, string>;
}

// ─── Pipeline & Manifest ─────────────────────────────────────────────────────

/** Complete extraction manifest capturing all outputs. */
export interface ExtractionManifest {
  /** Target application display name */
  targetName: string;
  /** Target application version (if detectable) */
  targetVersion: string;
  /** ISO 8601 timestamp of extraction */
  timestamp: string;
  /** Extracted design tokens */
  tokens: DesignTokens;
  /** Extracted icon components */
  icons: ExtractedIcon[];
  /** Decompiled React components */
  components: DecompiledComponent[];
  /** Motion and animation configurations */
  motion: MotionConfig;
  /** List of assets quarantined as proprietary trademarks */
  quarantinedAssets: string[];
}

/** Pipeline stage progress for CLI reporting. */
export interface PipelineProgress {
  stage: string;
  current: number;
  total: number;
  message: string;
}

