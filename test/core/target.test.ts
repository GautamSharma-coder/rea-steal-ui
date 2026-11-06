/**
 * Core Module Unit Tests — Target Resolver
 */

import { describe, it, expect } from "vitest";
import { resolveTarget } from "../../src/core/target.js";

describe("Target Resolver", () => {
  it("throws for non-existent paths", async () => {
    await expect(resolveTarget("/non/existent/path")).rejects.toThrow();
  });
});

