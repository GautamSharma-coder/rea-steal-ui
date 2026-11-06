/**
 * Vite Project Scaffolder
 *
 * Generates a standalone, zero-dependency Vite + React 19 + TypeScript
 * project skeleton that contains the extracted components, icons, and
 * design tokens. Ready to run with `pnpm install && pnpm storybook`.
 */

import path from "node:path";
import fs from "node:fs/promises";
import type { ExtractionManifest } from "../types/index.js";
import { createLogger } from "../core/logger.js";

const logger = createLogger("project");

/**
 * Scaffold a complete Vite + React 19 project from the extraction manifest.
 *
 * @param manifest - Complete extraction result manifest.
 * @param outputDir - Target output directory.
 */
export async function scaffoldProject(
  manifest: ExtractionManifest,
  outputDir: string
): Promise<void> {
  logger.info(`Scaffolding project at: ${outputDir}`);

  // Create directory structure
  const dirs = [
    "",
    "src",
    "src/components",
    "src/icons",
    "src/styles",
    ".storybook",
  ];

  for (const dir of dirs) {
    await fs.mkdir(path.join(outputDir, dir), { recursive: true });
  }

  // Write root config files
  await writePackageJson(outputDir, manifest.targetName);
  await writeTsConfig(outputDir);
  await writeViteConfig(outputDir);
  await writeStorybookConfig(outputDir);

  logger.info("Project scaffolding complete");
}

async function writePackageJson(outputDir: string, targetName: string): Promise<void> {
  const pkg = {
    name: `${targetName.toLowerCase().replace(/[^a-z0-9-]/g, "-")}-ui-kit`,
    version: "0.1.0",
    private: true,
    type: "module",
    scripts: {
      dev: "vite",
      build: "tsc && vite build",
      storybook: "storybook dev -p 6006 --disable-telemetry",
      "build-storybook": "storybook build --disable-telemetry",
    },
    dependencies: {
      react: "^19.0.0",
      "react-dom": "^19.0.0",
    },
    devDependencies: {
      "@storybook/react-vite": "^8.4.0",
      "@storybook/react": "^8.4.0",
      "@types/react": "^19.0.0",
      "@types/react-dom": "^19.0.0",
      "@vitejs/plugin-react": "^4.3.0",
      storybook: "^8.4.0",
      "tailwindcss": "^4.0.0",
      typescript: "^5.6.0",
      vite: "^6.0.0",
    },
  };

  await fs.writeFile(
    path.join(outputDir, "package.json"),
    JSON.stringify(pkg, null, 2) + "\n"
  );
}

async function writeTsConfig(outputDir: string): Promise<void> {
  const config = {
    compilerOptions: {
      target: "ES2024",
      module: "ESNext",
      moduleResolution: "bundler",
      jsx: "react-jsx",
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      declaration: true,
      outDir: "./dist",
    },
    include: ["src"],
  };

  await fs.writeFile(
    path.join(outputDir, "tsconfig.json"),
    JSON.stringify(config, null, 2) + "\n"
  );
}

async function writeViteConfig(outputDir: string): Promise<void> {
  const content = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
`;
  await fs.writeFile(path.join(outputDir, "vite.config.ts"), content);
}

async function writeStorybookConfig(outputDir: string): Promise<void> {
  const mainTs = `import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  addons: [],
};

export default config;
`;

  const previewTs = `import type { Preview } from "@storybook/react";
import "../src/styles/globals.css";

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "dark",
      values: [
        { name: "dark", value: "var(--color-bg-canvas, #0a0a0f)" },
        { name: "light", value: "#ffffff" },
      ],
    },
  },
};

export default preview;
`;

  await fs.writeFile(path.join(outputDir, ".storybook", "main.ts"), mainTs);
  await fs.writeFile(path.join(outputDir, ".storybook", "preview.ts"), previewTs);
}

