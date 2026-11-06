/**
 * Utility Unit Tests — Naming Helpers
 */

import { describe, it, expect } from "vitest";
import { toPascalCase, toCamelCase, toKebabCase, sanitizeFileName } from "../../src/utils/naming.js";

describe("Naming Utilities", () => {
  describe("toPascalCase", () => {
    it("converts kebab-case", () => expect(toPascalCase("command-menu")).toBe("CommandMenu"));
    it("converts snake_case", () => expect(toPascalCase("search_icon")).toBe("SearchIcon"));
    it("converts space-separated", () => expect(toPascalCase("modal dialog")).toBe("ModalDialog"));
  });

  describe("toCamelCase", () => {
    it("converts kebab-case", () => expect(toCamelCase("command-menu")).toBe("commandMenu"));
  });

  describe("toKebabCase", () => {
    it("converts PascalCase", () => expect(toKebabCase("CommandMenu")).toBe("command-menu"));
  });

  describe("sanitizeFileName", () => {
    it("strips invalid characters", () => {
      expect(sanitizeFileName("My Icon (v2).tsx")).toBe("My-Icon-v2-.tsx");
    });
  });
});

