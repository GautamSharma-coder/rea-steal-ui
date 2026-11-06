import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "bin/cli": "bin/cli.ts",
    "src/index": "src/index.ts",
  },
  format: ["esm"],
  target: "node22",
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: true,
  outDir: "dist",
});

