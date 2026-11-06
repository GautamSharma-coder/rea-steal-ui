/**
 * Bundle Scanner
 *
 * Recursively scans unpacked application directories to discover
 * JavaScript bundle chunks, CSS stylesheets, and static assets
 * (fonts, images). Populates the TargetApp descriptor arrays.
 */

import path from "node:path";
import fs from "node:fs/promises";
import type { TargetApp } from "../types/index.js";
import { createLogger } from "./logger.js";

const logger = createLogger("scanner");

/** File extensions categorized by asset type. */
const JS_EXTENSIONS = new Set([".js", ".mjs", ".cjs"]);
const CSS_EXTENSIONS = new Set([".css"]);
const FONT_EXTENSIONS = new Set([".woff", ".woff2", ".ttf", ".otf", ".eot"]);
const IMAGE_EXTENSIONS = new Set([".svg", ".png", ".jpg", ".jpeg", ".webp", ".ico"]);

/**
 * Scan the target directory tree and populate bundle/asset path arrays.
 *
 * @param target - Mutable TargetApp whose arrays will be populated.
 */
export async function scanBundles(target: TargetApp): Promise<void> {
  logger.info(`Scanning directory tree: ${target.path}`);

  const files = await walkDirectory(target.path);

  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase();

    if (JS_EXTENSIONS.has(ext)) {
      target.bundleChunks.push(filePath);
    } else if (CSS_EXTENSIONS.has(ext)) {
      target.stylesheetPaths.push(filePath);
    } else if (FONT_EXTENSIONS.has(ext) || IMAGE_EXTENSIONS.has(ext)) {
      target.assetPaths.push(filePath);
    }
  }

  logger.info(
    `Found ${target.bundleChunks.length} JS bundles, ` +
    `${target.stylesheetPaths.length} stylesheets, ` +
    `${target.assetPaths.length} assets`
  );
}

/**
 * Recursively walk a directory and return all file paths.
 */
async function walkDirectory(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules and hidden directories
      if (entry.name === "node_modules" || entry.name.startsWith(".")) {
        continue;
      }
      const nested = await walkDirectory(fullPath);
      results.push(...nested);
    } else {
      results.push(fullPath);
    }
  }

  return results;
}

