#!/usr/bin/env node

/**
 * rea-steal-ui CLI — Main Executable Entry Point
 *
 * Parses command-line arguments, resolves the target application,
 * orchestrates the extraction pipeline, and emits the generated UI kit.
 *
 * @example
 *   npx rea-steal-ui /Applications/Linear.app --out ./linear-ui-kit
 *   npx rea-steal-ui ./app.asar --components command-menu,button
 *   npx rea-steal-ui ./dist --tokens-only --icons-only
 *   npx rea-steal-ui /Applications/Raycast.app --preview
 */

import { Command } from "commander";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { resolveTarget } from "../src/core/target.js";
import { runPipeline } from "../src/pipeline/orchestrator.js";
import type { CLIOptions } from "../src/types/index.js";

const program = new Command();

program
  .name("rea-steal-ui")
  .description(
    "Extract complete design systems, color tokens, icons, and clean React + Tailwind components from any packaged desktop app or web bundle."
  )
  .version("1.0.0-beta.1")
  .argument("<target-path>", "Path to .app bundle, .asar file, .exe directory, or web dist folder")
  .option("-o, --out <path>", "Output directory for generated UI kit")
  .option("-c, --components <list>", "Comma-separated list of components to isolate")
  .option("--tokens-only", "Extract only design tokens and tailwind.config.ts", false)
  .option("--icons-only", "Extract only SVG vector icons as React components", false)
  .option("--preview", "Launch Storybook preview without writing to disk", false)
  .option("--tailwind-version <version>", "Target Tailwind version: '3' or '4'", "4")
  .option("--typescript", "Generate TypeScript components", true)
  .option("--clean-room-strict", "Quarantine detected brand logos and trademarks", true)
  .option("-v, --verbose", "Enable verbose logging for AST debugging", false)
  .option("--dump-ast", "Dump parsed AST as JSON for debugging", false)
  .option("--keep-temp", "Keep temporary unpacked ASAR files for inspection", false)
  .action(async (targetPath: string, opts: CLIOptions) => {
    p.intro(pc.bgCyan(pc.black(" rea-steal-ui v1.0.0 — Design System Extractor ")));

    try {
      const target = await resolveTarget(targetPath);

      p.log.info(`Target identified: ${pc.bold(target.name)} (${target.format})`);

      await runPipeline(target, opts);

      p.outro(pc.green("🎉 Extraction complete!"));
    } catch (error) {
      p.log.error(
        pc.red(error instanceof Error ? error.message : "An unexpected error occurred.")
      );
      process.exit(1);
    }
  });

program.parse();

