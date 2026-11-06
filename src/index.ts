/**
 * rea-steal-ui — Programmatic Node.js API
 *
 * Re-exports all public modules for programmatic use when
 * rea-steal-ui is consumed as a library rather than a CLI tool.
 *
 * @example
 *   import { resolveTarget, extractTokens, extractIcons } from "rea-steal-ui";
 */

// ─── Core ────────────────────────────────────────────────────────────────────
export { resolveTarget } from "./core/target.js";
export { unpackAsar } from "./core/asar.js";
export { createReaBridge } from "./core/rea-bridge.js";
export { createLogger } from "./core/logger.js";

// ─── Extractors ──────────────────────────────────────────────────────────────
export { extractTokens } from "./extractors/tokens.js";
export { extractIcons } from "./extractors/icons.js";
export { decompileComponents } from "./extractors/ast-decompiler.js";
export { extractMotion } from "./extractors/motion.js";
export { runQuarantine } from "./extractors/quarantine.js";

// ─── Generators ──────────────────────────────────────────────────────────────
export { generateTailwindConfig } from "./generators/tailwind.js";
export { generateStories } from "./generators/storybook.js";
export { scaffoldProject } from "./generators/project.js";
export { emitComponents } from "./generators/component-scaffold.js";

// ─── Pipeline ────────────────────────────────────────────────────────────────
export { runPipeline } from "./pipeline/orchestrator.js";

// ─── Types (re-exported for consumers) ───────────────────────────────────────
export type {
  CLIOptions,
  TargetApp,
  TargetFormat,
  DesignTokens,
  ColorTokens,
  TypographyTokens,
  ExtractedIcon,
  DecompiledComponent,
  MotionConfig,
  ExtractionManifest,
} from "./types/index.js";

