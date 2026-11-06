/**
 * Pipeline Orchestrator
 *
 * The main controller that sequences all extraction subsystems
 * and code generators into a single coherent pipeline run.
 * Coordinates CLI progress reporting via @clack/prompts.
 */

import path from "node:path";
import fs from "node:fs/promises";
import * as p from "@clack/prompts";
import pc from "picocolors";
import type { TargetApp, CLIOptions, ExtractionManifest } from "../types/index.js";
import { scanBundles } from "../core/scanner.js";
import { unpackAsar, cleanupScratch } from "../core/asar.js";
import { createReaBridge } from "../core/rea-bridge.js";
import { setVerbose } from "../core/logger.js";
import { extractTokens } from "../extractors/tokens.js";
import { extractIcons } from "../extractors/icons.js";
import { decompileComponents } from "../extractors/ast-decompiler.js";
import { extractMotion } from "../extractors/motion.js";
import { runQuarantine } from "../extractors/quarantine.js";
import { generateTailwindConfig } from "../generators/tailwind.js";
import { scaffoldProject } from "../generators/project.js";
import { emitComponents } from "../generators/component-scaffold.js";
import { generateStories } from "../generators/storybook.js";

/**
 * Run the complete rea-steal-ui extraction and generation pipeline.
 *
 * @param target - Resolved target application metadata.
 * @param options - Parsed CLI options.
 */
export async function runPipeline(
  target: TargetApp,
  options: CLIOptions
): Promise<ExtractionManifest> {
  if (options.verbose) {
    setVerbose(true);
  }

  const outputDir = options.out ?? `${target.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}-ui-kit`;
  let scratchDir: string | null = null;

  try {
    // ── Stage 0: Unpack ASAR if target is an archive or Electron app ─────
    if (target.format === "asar-archive") {
      const asarSpinner = p.spinner();
      asarSpinner.start("Unpacking application ASAR archive...");
      const result = await unpackAsar(target.path);
      scratchDir = result.scratchDir;
      target.path = scratchDir;
      asarSpinner.stop(`Unpacked ${result.fileCount} files from ASAR archive`);
    } else if (target.format === "electron-app") {
      // Check for resources/app.asar (Windows/Linux) or Contents/Resources/app.asar (macOS)
      const possibleAsar = [
        path.join(target.path, "resources", "app.asar"),
        path.join(target.path, "Contents", "Resources", "app.asar"),
      ];

      for (const asarPath of possibleAsar) {
        try {
          await fs.access(asarPath);
          const asarSpinner = p.spinner();
          asarSpinner.start("Unpacking Electron app.asar bundle...");
          const result = await unpackAsar(asarPath);
          scratchDir = result.scratchDir;
          target.path = scratchDir;
          asarSpinner.stop(`Unpacked ${result.fileCount} files from Electron ASAR`);
          break;
        } catch {
          // Check next candidate
        }
      }
    }

    // ── Stage 1: Scan & Ingest ─────────────────────────────────────────────
    const scanSpinner = p.spinner();
    scanSpinner.start("Scanning bundle chunks and stylesheets...");
    await scanBundles(target);
    const bridge = await createReaBridge(target);
    scanSpinner.stop(`Scanned ${target.bundleChunks.length} bundles (${bridge.framework})`);

    // Read stylesheets from disk
    const cssSources: string[] = [];
    for (const stylePath of target.stylesheetPaths) {
      try {
        const content = await fs.readFile(stylePath, "utf-8");
        cssSources.push(content);
      } catch {
        // Skip unreadable files
      }
    }

    // Read JS bundles from disk
    const jsSources: string[] = [];
    const bundleTuples: Array<[string, string]> = [];
    for (const chunkPath of target.bundleChunks) {
      try {
        const content = await fs.readFile(chunkPath, "utf-8");
        jsSources.push(content);
        bundleTuples.push([chunkPath, content]);
      } catch {
        // Skip unreadable files
      }
    }

    // ── Stage 2: Extract Tokens ────────────────────────────────────────────
    const tokenSpinner = p.spinner();
    tokenSpinner.start("Extracting color tokens and design system...");
    const tokens = await extractTokens(cssSources);
    tokenSpinner.stop(
      `${pc.green("🎨")} Extracted color tokens and design system`
    );

    if (options.tokensOnly) {
      const { configContent, globalsCss } = await generateTailwindConfig(
        tokens,
        options.tailwindVersion
      );

      await fs.mkdir(path.join(outputDir, "src", "styles"), { recursive: true });
      await fs.writeFile(path.join(outputDir, "src", "styles", "globals.css"), globalsCss);
      const configFileName = options.tailwindVersion === "4" ? "src/styles/theme.css" : "tailwind.config.ts";
      await fs.writeFile(path.join(outputDir, configFileName), configContent);

      return buildManifest(target, tokens, [], [], { keyframes: [], springs: [], cubicBeziers: [], transitions: {} }, []);
    }

    // ── Stage 3: Extract Icons ─────────────────────────────────────────────
    const iconSpinner = p.spinner();
    iconSpinner.start("Harvesting SVG icons...");
    const icons = await extractIcons(jsSources);
    iconSpinner.stop(
      `${pc.green("⚡")} Harvested ${icons.length} SVG icons`
    );

    if (options.iconsOnly) {
      return buildManifest(target, tokens, icons, [], { keyframes: [], springs: [], cubicBeziers: [], transitions: {} }, []);
    }

    // ── Stage 4: Decompile Components ──────────────────────────────────────
    const decompileSpinner = p.spinner();
    decompileSpinner.start("Decompiling React components...");
    const componentFilter = options.components
      ? (options.components.split(",") as import("../types/index.js").ComponentCategory[])
      : undefined;
    const components = await decompileComponents(bundleTuples, componentFilter);
    decompileSpinner.stop(
      `${pc.green("🧩")} Reconstructed ${components.length} components`
    );

    // ── Stage 5: Extract Motion ────────────────────────────────────────────
    const motion = await extractMotion(cssSources, jsSources);

    // ── Stage 6: Quarantine ────────────────────────────────────────────────
    const { cleanIcons, cleanComponents, quarantinedPaths } = await runQuarantine(
      icons,
      components,
      outputDir
    );

    // ── Stage 7: Generate Project ──────────────────────────────────────────
    const genSpinner = p.spinner();
    genSpinner.start("Generating Vite + Storybook playground...");

    const manifest = buildManifest(target, tokens, cleanIcons, cleanComponents, motion, quarantinedPaths);
    await scaffoldProject(manifest, outputDir);
    await emitComponents(cleanComponents, cleanIcons, outputDir);

    // Copy extracted physical font files (.woff2, .woff, .ttf)
    const fontExtensions = new Set([".woff", ".woff2", ".ttf", ".otf", ".eot"]);
    const fontFiles = target.assetPaths.filter((filePath) => fontExtensions.has(path.extname(filePath).toLowerCase()));
    if (fontFiles.length > 0) {
      const fontsDir = path.join(outputDir, "src", "fonts");
      await fs.mkdir(fontsDir, { recursive: true });
      for (const fontPath of fontFiles) {
        try {
          await fs.copyFile(fontPath, path.join(fontsDir, path.basename(fontPath)));
        } catch {
          // Skip if locked
        }
      }
    }

    const stories = await generateStories(cleanComponents, cleanIcons.length > 0, tokens);
    for (const story of stories) {
      const fullPath = path.join(outputDir, story.filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, story.content);
    }

    const { configContent, globalsCss } = await generateTailwindConfig(tokens, options.tailwindVersion);
    await fs.mkdir(path.join(outputDir, "src", "styles"), { recursive: true });
    await fs.writeFile(path.join(outputDir, "src", "styles", "globals.css"), globalsCss);
    const configFileName = options.tailwindVersion === "4" ? "src/styles/theme.css" : "tailwind.config.ts";
    await fs.writeFile(path.join(outputDir, configFileName), configContent);

    genSpinner.stop(`${pc.green("🚀")} Project generated at ${pc.bold(outputDir)}`);

    // ── Summary ────────────────────────────────────────────────────────────
    p.note(
      [
        `${pc.bold("Extraction Summary")}`,
        `  🎨  ${Object.keys(tokens.colors.background).length + Object.keys(tokens.colors.foreground).length + Object.keys(tokens.colors.accent).length} color token properties`,
        `  🔤  ${Object.keys(tokens.typography.fontFamilies).length} font families (${fontFiles.length} font files)`,
        `  📐  ${Object.keys(tokens.radii).length} border-radii & ${Object.keys(tokens.shadows).length} shadow levels`,
        `  ⚡  ${cleanIcons.length} SVG icons`,
        `  🧩  ${cleanComponents.length} React components`,
        `  🎬  ${motion.keyframes.length} keyframe animations`,
        `  🔒  ${quarantinedPaths.length} quarantined assets`,
      ].join("\n"),
      `Output: ${outputDir}`
    );

    return manifest;
  } finally {
    if (scratchDir && !options.keepTemp) {
      await cleanupScratch(scratchDir).catch(() => {});
    }
  }
}

function buildManifest(
  target: TargetApp,
  tokens: import("../types/index.js").DesignTokens,
  icons: import("../types/index.js").ExtractedIcon[],
  components: import("../types/index.js").DecompiledComponent[],
  motion: import("../types/index.js").MotionConfig,
  quarantinedAssets: string[]
): ExtractionManifest {
  return {
    targetName: target.name,
    targetVersion: target.electronVersion ?? "unknown",
    timestamp: new Date().toISOString(),
    tokens,
    icons,
    components,
    motion,
    quarantinedAssets,
  };
}
