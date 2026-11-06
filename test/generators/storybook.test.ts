/**
 * Storybook Generator Unit Tests
 */

import { describe, it, expect } from "vitest";
import { generateStories } from "../../src/generators/storybook.js";
import type { DecompiledComponent } from "../../src/types/index.js";

describe("Storybook Generator", () => {
  it("includes tokens story when no components are provided", async () => {
    const stories = await generateStories([]);
    expect(stories.length).toBeGreaterThanOrEqual(1);
    expect(stories[0]!.filePath).toContain("Tokens.stories.tsx");
  });

  it("generates a valid CSF3 story for a button component", async () => {
    const components: DecompiledComponent[] = [
      {
        name: "Button",
        category: "button",
        propsInterface: 'export interface ButtonProps {}',
        componentCode: 'export const Button = () => <button>Click</button>;',
        dependencies: [],
        storyCode: "",
        sourceFile: "bundle.js",
      },
    ];

    const stories = await generateStories(components);
    const buttonStory = stories.find((s) => s.filePath.includes("Button.stories.tsx"));
    expect(buttonStory).toBeDefined();
    expect(buttonStory!.content).toContain('title: "Components/Button"');
    expect(buttonStory!.content).toContain("satisfies Meta");
  });
});

