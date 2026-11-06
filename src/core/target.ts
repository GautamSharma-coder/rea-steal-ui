/**
 * Target Resolver
 *
 * Detects the input format (macOS .app, Electron .asar, Windows .exe dir,
 * or web dist bundle) and normalizes it into a TargetApp descriptor used
 * by all downstream pipeline stages.
 */

import path from "node:path";
import fs from "node:fs/promises";
import type { TargetApp, TargetFormat } from "../types/index.js";

/**
 * Resolve and classify the given target path into a structured TargetApp.
 *
 * @param targetPath - Absolute or relative path to the target application.
 * @returns Resolved TargetApp metadata.
 * @throws If the path does not exist or cannot be classified.
 */
export async function resolveTarget(targetPath: string): Promise<TargetApp> {
  const absolutePath = path.resolve(targetPath);
  const stat = await fs.stat(absolutePath);
  const format = await detectFormat(absolutePath, stat);

  return {
    name: deriveAppName(absolutePath, format),
    format,
    path: absolutePath,
    bundleChunks: [],
    stylesheetPaths: [],
    assetPaths: [],
  };
}

/**
 * Detect the target format from the path and file system metadata.
 */
async function detectFormat(
  absolutePath: string,
  stat: Awaited<ReturnType<typeof fs.stat>>
): Promise<TargetFormat> {
  if (absolutePath.endsWith(".asar")) {
    return "asar-archive";
  }

  if (absolutePath.endsWith(".app") && stat.isDirectory()) {
    return "electron-app";
  }

  if (stat.isDirectory()) {
    // Check for Electron markers
    const asarPath = path.join(absolutePath, "resources", "app.asar");
    try {
      await fs.access(asarPath);
      return "electron-app";
    } catch {
      // Not an Electron app — check for web bundle markers
    }

    // Check for web bundle dist markers
    const indexHtml = path.join(absolutePath, "index.html");
    try {
      await fs.access(indexHtml);
      return "web-bundle";
    } catch {
      // Could not identify format
    }
  }

  return "unknown";
}

/**
 * Derive a human-readable application name from the file path.
 */
function deriveAppName(absolutePath: string, format: TargetFormat): string {
  const basename = path.basename(absolutePath, path.extname(absolutePath));

  switch (format) {
    case "electron-app":
      return `${basename} (Electron App)`;
    case "asar-archive":
      return `${basename} (ASAR Archive)`;
    case "web-bundle":
      return `${basename} (Web Bundle)`;
    default:
      return basename;
  }
}

