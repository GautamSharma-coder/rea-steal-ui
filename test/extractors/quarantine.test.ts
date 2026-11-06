/**
 * Quarantine Filter Unit Tests
 */

import { describe, it, expect } from "vitest";
import { runQuarantine } from "../../src/extractors/quarantine.js";
import type { ExtractedIcon } from "../../src/types/index.js";
import os from "node:os";
import path from "node:path";

describe("Quarantine Filter", () => {
  it("quarantines icons with brand-related names", async () => {
    const icons: ExtractedIcon[] = [
      {
        name: "SearchIcon",
        viewBox: "0 0 24 24",
        paths: [{ d: "M10 10L20 20" }],
        sourceFile: "bundle.js",
        namingConfidence: 0.9,
      },
      {
        name: "CompanyLogoIcon",
        viewBox: "0 0 24 24",
        paths: [{ d: "M0 0H24V24H0Z" }],
        sourceFile: "bundle.js",
        namingConfidence: 0.8,
      },
    ];

    const result = await runQuarantine(icons, [], path.join(os.tmpdir(), "test-quarantine"));

    expect(result.cleanIcons).toHaveLength(1);
    expect(result.cleanIcons[0]!.name).toBe("SearchIcon");
    expect(result.quarantinedPaths).toHaveLength(1);
  });

  it("passes through all icons when none are branded", async () => {
    const icons: ExtractedIcon[] = [
      {
        name: "SearchIcon",
        viewBox: "0 0 24 24",
        paths: [{ d: "M10 10L20 20" }],
        sourceFile: "bundle.js",
        namingConfidence: 0.9,
      },
    ];

    const result = await runQuarantine(icons, [], path.join(os.tmpdir(), "test-quarantine"));
    expect(result.cleanIcons).toHaveLength(1);
    expect(result.quarantinedPaths).toHaveLength(0);
  });
});

