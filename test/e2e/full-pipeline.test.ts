/**
 * End-to-End Extraction Pipeline Integration Test
 *
 * Verifies that the entire pipeline runs without errors from
 * target resolution through extraction, filtering, and project emission.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { runPipeline } from "../../src/pipeline/orchestrator.js";
import type { TargetApp, CLIOptions } from "../../src/types/index.js";

describe("E2E: Full Pipeline Run", () => {
  let tempOutputDir: string;

  beforeEach(async () => {
    tempOutputDir = await fs.mkdtemp(path.join(os.tmpdir(), "rea-e2e-"));
  });

  afterEach(async () => {
    await fs.rm(tempOutputDir, { recursive: true, force: true });
  });

  it("successfully completes a synthetic pipeline run", async () => {
    const mockTarget: TargetApp = {
      name: "Linear Demo",
      format: "web-bundle",
      path: path.resolve("test/fixtures"),
      bundleChunks: [
        path.resolve("test/fixtures/minified-react-19.js"),
        path.resolve("test/fixtures/minified-react-18.js"),
      ],
      stylesheetPaths: [
        path.resolve("test/fixtures/raw-stylesheets.css"),
      ],
      assetPaths: [],
    };

    const options: CLIOptions = {
      out: tempOutputDir,
      tokensOnly: false,
      iconsOnly: false,
      preview: false,
      tailwindVersion: "4",
      typescript: true,
      cleanRoomStrict: true,
      verbose: false,
      dumpAst: false,
      keepTemp: false,
    };

    const manifest = await runPipeline(mockTarget, options);

    expect(manifest).toBeDefined();
    expect(manifest.targetName).toBe("Linear Demo");
    expect(manifest.tokens).toBeDefined();

    // Verify generated project structure on disk
    const packageJsonExists = await fs
      .access(path.join(tempOutputDir, "package.json"))
      .then(() => true)
      .catch(() => false);

    expect(packageJsonExists).toBe(true);
  });
});

