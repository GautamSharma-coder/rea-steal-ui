import React from "react";

export function App() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="max-w-xl rounded-2xl border border-[var(--color-border-subtle,rgba(255,255,255,0.1))] bg-[var(--color-bg-surface,#12141a)] p-8 shadow-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-fg-primary,#fff)]">
          Extracted UI Kit Playground
        </h1>
        <p className="mt-3 text-sm text-[var(--color-fg-muted,#9ca3af)]">
          Explore your harvested design tokens, icons, and components interactively.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a
            href="http://localhost:6006"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-lg bg-[var(--color-accent-primary,#3b82f6)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Open Storybook ↗
          </a>
        </div>
      </div>
    </div>
  );
}

