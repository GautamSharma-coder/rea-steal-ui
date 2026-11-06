/**
 * SVG Icon Harvester Unit Tests
 *
 * Tests SVG detection, SVGO normalization, viewBox standardization,
 * and the geometric auto-naming engine.
 */

import { describe, it, expect } from "vitest";
import { extractIcons } from "../../src/extractors/icons.js";

describe("Icon Harvester", () => {
  describe("extractIcons", () => {
    it("returns empty array for empty bundle input", async () => {
      const icons = await extractIcons([]);
      expect(icons).toEqual([]);
    });

    it("returns empty array for bundles with no SVG elements", async () => {
      const bundleSources = [
        'const a = document.createElement("div"); a.textContent = "hello";',
      ];
      const icons = await extractIcons(bundleSources);
      expect(icons).toEqual([]);
    });
  });

  // TODO: Add tests with synthetic minified SVG fixtures
  // describe("SVG viewBox normalization", () => { ... });
  // describe("Auto-naming with geometric hash matching", () => { ... });
});

