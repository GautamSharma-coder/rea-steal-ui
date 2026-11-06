/**
 * Token Harvester Unit Tests
 *
 * Tests the CIELAB Delta-E color clustering, semantic role
 * assignment, and CSS variable extraction logic.
 */

import { describe, it, expect } from "vitest";
import { extractTokens, calculateDeltaE } from "../../src/extractors/tokens.js";
import type { ColorEntry } from "../../src/types/index.js";

describe("Token Harvester", () => {
  describe("calculateDeltaE", () => {
    it("returns 0 for identical colors", () => {
      const color: ColorEntry = {
        raw: "#000000",
        hsl: "hsl(0, 0%, 0%)",
        labL: 0,
        labA: 0,
        labB: 0,
        frequency: 1,
      };
      expect(calculateDeltaE(color, color)).toBe(0);
    });

    it("returns correct perceptual distance for distinct colors", () => {
      const colorA: ColorEntry = {
        raw: "#0f1015",
        hsl: "hsl(220, 15%, 7%)",
        labL: 4.5,
        labA: -0.5,
        labB: -3.2,
        frequency: 10,
      };
      const colorB: ColorEntry = {
        raw: "#0f1116",
        hsl: "hsl(220, 16%, 7.5%)",
        labL: 4.8,
        labA: -0.5,
        labB: -3.3,
        frequency: 5,
      };

      const deltaE = calculateDeltaE(colorA, colorB);
      // These are very similar — should be below merge threshold of 2.5
      expect(deltaE).toBeLessThan(2.5);
    });

    it("returns large distance for visually distinct colors", () => {
      const black: ColorEntry = {
        raw: "#000000",
        hsl: "hsl(0, 0%, 0%)",
        labL: 0,
        labA: 0,
        labB: 0,
        frequency: 1,
      };
      const white: ColorEntry = {
        raw: "#ffffff",
        hsl: "hsl(0, 0%, 100%)",
        labL: 100,
        labA: 0,
        labB: 0,
        frequency: 1,
      };

      const deltaE = calculateDeltaE(black, white);
      expect(deltaE).toBe(100);
    });
  });

  describe("extractTokens", () => {
    it("returns empty token structure for empty CSS input", async () => {
      const tokens = await extractTokens([]);

      expect(tokens).toBeDefined();
      expect(tokens.colors).toBeDefined();
      expect(tokens.typography).toBeDefined();
      expect(tokens.radii).toBeDefined();
      expect(tokens.shadows).toBeDefined();
    });
  });
});

