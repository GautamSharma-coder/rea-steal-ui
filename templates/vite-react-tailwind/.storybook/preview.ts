import type { Preview } from "@storybook/react";
import "../src/styles/globals.css";

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "dark",
      values: [
        { name: "dark", value: "var(--color-bg-canvas, #0b0c10)" },
        { name: "light", value: "#ffffff" },
      ],
    },
  },
};

export default preview;

