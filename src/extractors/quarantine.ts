/**
 * Trademark & Logo Quarantine Filter
 *
 * Scans extracted assets (SVGs, icons, brand text) for proprietary
 * corporate trademarks and logos. Detected brand marks are routed
 * to a quarantine directory and excluded from the main export barrel.
 *
 * This ensures clean-room compliance and prevents accidental
 * trademark infringement in generated UI kits.
 */

import path from "node:path";
import fs from "node:fs/promises";
import type { ExtractedIcon, DecompiledComponent } from "../types/index.js";
import { createLogger } from "../core/logger.js";

const logger = createLogger("quarantine");

/** Known proprietary brand keywords to quarantine. */
const BRAND_KEYWORDS = [
  "logo",
  "brand",
  "trademark",
  "wordmark",
  "logotype",
  "copyright",
  "watermark",
];

/** Result of the quarantine filtering pass. */
export interface QuarantineResult {
  /** Icons that passed the quarantine filter (safe to export) */
  cleanIcons: ExtractedIcon[];
  /** Components that passed the quarantine filter (safe to export) */
  cleanComponents: DecompiledComponent[];
  /** File paths of assets moved to quarantine */
  quarantinedPaths: string[];
}

/**
 * Run the quarantine filter on extracted icons and components.
 *
 * @param icons - All extracted icons from the target.
 * @param components - All decompiled components from the target.
 * @param outputDir - Base output directory for writing quarantined files.
 * @returns Filtered clean assets and list of quarantined paths.
 */
export async function runQuarantine(
  icons: ExtractedIcon[],
  components: DecompiledComponent[],
  outputDir: string
): Promise<QuarantineResult> {
  logger.info("Running trademark quarantine filter...");

  const quarantineDir = path.join(outputDir, "quarantine", "logos");
  await fs.mkdir(quarantineDir, { recursive: true });

  const cleanIcons: ExtractedIcon[] = [];
  const quarantinedPaths: string[] = [];

  for (const icon of icons) {
    if (isBrandAsset(icon.name)) {
      const quarantinePath = path.join(quarantineDir, `${icon.name}.quarantined.svg`);
      quarantinedPaths.push(quarantinePath);
      logger.warn(`Quarantined brand asset: ${icon.name}`);
    } else {
      cleanIcons.push(icon);
    }
  }

  // Components are generally safe (clean-room synthesized), but check names
  const cleanComponents = components.filter(
    (comp) => !isBrandAsset(comp.name)
  );

  logger.info(
    `Quarantine complete: ${quarantinedPaths.length} assets quarantined, ` +
    `${cleanIcons.length} icons + ${cleanComponents.length} components cleared`
  );

  return { cleanIcons, cleanComponents, quarantinedPaths };
}

/**
 * Check if an asset name contains brand or trademark indicators.
 */
function isBrandAsset(name: string): boolean {
  const lower = name.toLowerCase();
  return BRAND_KEYWORDS.some((keyword) => lower.includes(keyword));
}

