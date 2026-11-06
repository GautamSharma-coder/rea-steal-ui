/**
 * AST Decompiler Unit Tests
 *
 * Tests the Babel AST transformation that converts minified
 * React _jsx() and React.createElement() calls into clean JSX.
 */

import { describe, it, expect } from "vitest";
import {
  decompileComponents,
  classifyComponent,
  synthesizePropsInterface,
} from "../../src/extractors/ast-decompiler.js";

describe("AST Decompiler", () => {
  describe("decompileComponents", () => {
    it("returns empty array for empty bundle input", async () => {
      const result = await decompileComponents([]);
      expect(result).toEqual([]);
    });

    it("gracefully handles invalid JavaScript without crashing", async () => {
      const result = await decompileComponents([
        ["broken.js", "this is not valid {{ javascript +++"],
      ]);
      // Should skip the broken bundle, not throw
      expect(result).toEqual([]);
    });
  });

  describe("classifyComponent", () => {
    it("returns 'generic' for unknown component patterns", () => {
      const category = classifyComponent("div", {}, 0);
      expect(category).toBe("generic");
    });
  });

  describe("synthesizePropsInterface", () => {
    it("generates a valid TypeScript interface", () => {
      const result = synthesizePropsInterface("Button", {
        variant: '"primary" | "secondary"',
        disabled: "boolean",
      });

      expect(result).toContain("export interface ButtonProps");
      expect(result).toContain("variant?:");
      expect(result).toContain("disabled?:");
    });
  });
});

