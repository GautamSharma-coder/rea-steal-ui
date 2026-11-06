# AI Agent Guidelines & System Instructions

# `rea-steal-ui` — Autonomous Agent Protocol (`AGENT.md`)

This document serves as the primary system instruction manual and operational specification for AI coding agents (Antigravity, Cursor, Claude Code, GitHub Copilot, Windsurf, Roo Code, and Devin) operating within the `rea-steal-ui` repository.

Whenever an AI agent is tasked with building features, fixing bugs, or refactoring code in this repository, it **must** strictly adhere to the guidelines, architectural invariants, and verification procedures outlined below.

---

## 1. Project Mission & High-Level Context

**`rea-steal-ui`** is an open-source CLI and developer tool that extracts complete design systems, color tokens, icons, and clean React + Tailwind components from any packaged desktop app (.app, .asar, .exe) or web bundle in 60 seconds or less.

- **Primary Language:** TypeScript 5.6+ (Strict Mode)
- **Runtime Target:** Node.js 22+
- **Core Dependencies:**
  - AST Parsing & Transformation: `@babel/parser`, `@babel/traverse`, `@babel/types`, `@babel/generator`
  - Color & Token Math: `colord`, `culori`, `postcss`
  - Vector & SVG Processing: `svgo`, `cheerio`
  - CLI UI & Terminal UX: `@clack/prompts`, `picocolors`, `commander`
  - Testing Engine: `vitest`

---

## 2. Fundamental Architectural Invariants (Non-Negotiables)

Any AI agent generating code for this repository must obey these 6 non-negotiable invariants:

### Invariant 1: Static Analysis Only (Never Execute Target Binaries)
> **CRITICAL SECURITY RULE:** Under no circumstance should `rea-steal-ui` execute the target application's executable, binary, or JavaScript code.
- Target application files must only be ingested as raw buffers or strings for static AST parsing, ASAR unpacking, or CSS token analysis.
- Prevent Zip-slip vulnerability: When extracting ASAR archives, always validate that destination paths resolve strictly within the designated temporary scratch directory (`os.tmpdir()`).

### Invariant 2: Clean-Room Code Synthesis
> `rea-steal-ui` is not a source code pirate; it is an intelligent design system reconstructor.
- The decompiler must **never** copy proprietary business logic, state stores, or proprietary API calls verbatim.
- Decompiled output must be synthesized into fresh, idiomatic React 19 + TypeScript components with Tailwind CSS utility classes based on structural AST observations.

### Invariant 3: Mandatory Trademark Quarantine
- All corporate brand names, proprietary logos, and trademarked SVGs must be intercepted by the quarantine filter (`src/extractors/quarantine.ts`).
- Quarantined assets must be moved to `quarantine/logos/` and **excluded** from the generated library's primary export barrel (`src/index.ts`).

### Invariant 4: Perceptual Color Math (Never RGB Euclidean)
- Color clustering must **never** use naive Euclidean distance in RGB space ($\sqrt{\Delta R^2 + \Delta G^2 + \Delta B^2}$).
- Color similarity must always be calculated using **CIELAB $\Delta E$ (Delta-E)** or **OKLab** to ensure perceptual consistency with human vision.

### Invariant 5: AST Builder Purity (Never String-Concat ASTs)
- When generating or modifying Babel AST nodes, use `@babel/types` builder functions or `@babel/template`.
- Never concatenate raw code strings to produce component ASTs; doing so produces syntax errors and invalid token trees on complex edge cases.

### Invariant 6: Zero-Dependency Extracted Kits
- The generated UI kit output (`linear-ui-kit/`, etc.) must be completely standalone.
- It must only depend on standard React 19, standard Tailwind CSS, and standard Lucide React icons.

---

## 3. Codebase Directory Map

```text
rea-steal-ui/
├── bin/
│   └── cli.ts                     # CLI executable entry point & argument parsing
├── src/
│   ├── core/                      # Ingestion & system interfaces
│   │   ├── asar.ts                # ASAR archive unpacking & path containment
│   │   ├── target.ts              # Format & OS platform resolution (.app, .asar, web)
│   │   └── rea-bridge.ts          # Static module graph inspection
│   ├── extractors/                # Specialized domain extractors
│   │   ├── tokens.ts              # CIELAB Delta-E color & design token harvester
│   │   ├── icons.ts               # SVG detection, SVGO sanitization, and vector namer
│   │   ├── ast-decompiler.ts      # Babel React AST _jsx-to-JSX decompiler
│   │   ├── motion.ts              # Keyframe & spring animation extractor
│   │   └── quarantine.ts          # Trademark & logo quarantine filter
│   ├── generators/                # Code & project scaffolding emitters
│   │   ├── project.ts             # Vite + React 19 project skeleton generator
│   │   ├── tailwind.ts            # Tailwind v4 (@theme) & v3 (config) emitter
│   │   ├── storybook.ts           # Component Story Format (CSF3) generator
│   │   └── component-scaffold.ts  # Component file and export barrel generator
│   ├── types/
│   │   └── index.ts               # Core TypeScript data contracts
│   └── index.ts                   # Programmatic Node.js API
├── templates/
│   └── vite-react-tailwind/       # Base template skeleton
└── test/
    ├── fixtures/                  # Synthetic minified JS/CSS bundles
    ├── extractors/                # Unit tests for extractors
    └── e2e/                       # End-to-end extraction pipeline tests
```

---

## 4. Standard Implementation Recipes for Agents

### Recipe A: Adding a New Component Extractor
When tasked with supporting a new signature component (e.g. `Tooltip`, `Tabs`, `Slider`):
1. **Identify the Pattern:** Define the AST structural signature in `src/extractors/ast-decompiler.ts`:
   - What attributes does it use? (e.g., `role="tooltip"`, `aria-expanded`, `data-state`).
   - What child structure is standard?
2. **Implement the AST Matcher:** Create a dedicated detector function:
   ```typescript
   export function isTooltipComponent(node: t.JSXElement | t.CallExpression): boolean { ... }
   ```
3. **Synthesize TypeScript Props:** Provide default typed props extending HTML attributes.
4. **Generate Storybook Story:** In `src/generators/storybook.ts`, register default story args so the component renders interactively in Storybook.
5. **Add Fixture Test:** Add a synthetic fixture in `test/fixtures/` and verify the extractor reconstructs the component with 100% test coverage.

### Recipe B: Fixing an AST Decompiler Edge Case
If minified code uses an unusual pattern (e.g., ternary operator inside `_jsx` children or nested `React.Fragment` aliases):
1. Locate the Babel visitor method handling `CallExpression` in `src/extractors/ast-decompiler.ts`.
2. Inspect the node using `@babel/types` type guards (`t.isIdentifier()`, `t.isObjectExpression()`).
3. Add a fallback branch that safely handles the AST shape without throwing an exception.
4. Add a regression test in `test/extractors/ast-decompiler.test.ts`.

---

## 5. Verification Checklist for Agents

Before completing any task, an AI agent must run the following self-verification checklist:

- [ ] **Typecheck Passed:** `pnpm typecheck` exits with code 0 (no TypeScript errors).
- [ ] **Tests Passed:** `pnpm test` runs all unit tests with 0 failures.
- [ ] **Linting Clean:** `pnpm lint` reports zero errors.
- [ ] **No `any` Escapes:** All newly added functions have explicit TypeScript parameter and return types.
- [ ] **Defensive Exception Handling:** AST visitors and file parsers are guarded against unexpected tokens.
- [ ] **Security Checked:** No unsanitized paths, no arbitrary command execution, no proprietary asset leaks.
- [ ] **Documentation Maintained:** If CLI flags or options were added/changed, update `README.md`, `PRD.md`, and `ARCHITECTURE.md`.

