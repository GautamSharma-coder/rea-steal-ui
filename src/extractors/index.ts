/**
 * Extractors Module Barrel Export
 *
 * Re-exports all extraction subsystems.
 */

export { extractTokens, calculateDeltaE } from "./tokens.js";
export { extractIcons } from "./icons.js";
export { decompileComponents, classifyComponent, synthesizePropsInterface } from "./ast-decompiler.js";
export { extractMotion } from "./motion.js";
export { runQuarantine } from "./quarantine.js";
export type { QuarantineResult } from "./quarantine.js";

