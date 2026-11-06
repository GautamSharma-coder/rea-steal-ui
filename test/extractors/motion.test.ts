/**
 * Motion Extractor Unit Tests
 */

import { describe, it, expect } from "vitest";
import { extractMotion } from "../../src/extractors/motion.js";

describe("Motion Extractor", () => {
  it("returns empty config for empty input", async () => {
    const result = await extractMotion([], []);
    expect(result.keyframes).toEqual([]);
    expect(result.cubicBeziers).toEqual([]);
    expect(result.springs).toEqual([]);
  });
});

