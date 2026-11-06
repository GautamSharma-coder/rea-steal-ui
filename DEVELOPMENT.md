# Development Guide

# `rea-steal-ui` — Local Development & Engineering Guide

This guide provides everything you need to set up your local development environment, build the project, run test suites, debug AST decompilation, and submit contributions to `rea-steal-ui`.

---

## 1. Prerequisites

Before developing on `rea-steal-ui`, ensure you have the following installed:

- **Node.js:** `v22.0.0` or higher (Node 22 LTS recommended)
- **Package Manager:** `pnpm` `v9.0.0` or higher (recommended), `npm`, or `yarn`
- **TypeScript:** `v5.6.0` or higher
- **Git:** Modern git with SSH/HTTPS configured

Check your versions:
```bash
node -v   # >= v22.0.0
pnpm -v   # >= v9.0.0
```

---

## 2. Quick Setup

```bash
# 1. Clone the repository
git clone https://github.com/rea-steal-ui/rea-steal-ui.git
cd rea-steal-ui

# 2. Install dependencies
pnpm install

# 3. Build the TypeScript CLI and modules
pnpm build

# 4. Run tests
pnpm test
```

---

## 3. Available Scripts

The project uses `package.json` scripts managed via `pnpm`:

| Command | Description |
| :--- | :--- |
| `pnpm build` | Compiles TypeScript source to `./dist` using `tsup`. |
| `pnpm dev` | Starts `tsup` in watch mode for live CLI development. |
| `pnpm test` | Runs the full Vitest unit test suite. |
| `pnpm test:watch` | Runs Vitest in interactive watch mode. |
| `pnpm test:coverage`| Runs Vitest with c8/v8 code coverage reporting. |
| `pnpm lint` | Runs ESLint across all TypeScript files. |
| `pnpm lint:fix` | Runs ESLint with automatic fixes applied. |
| `pnpm format` | Formats all code with Prettier. |
| `pnpm typecheck` | Runs `tsc --noEmit` to verify type safety. |

---

## 4. Local CLI Linking & Manual Testing

To run the local development build of `rea-steal-ui` directly in your terminal:

```bash
# In the rea-steal-ui directory:
pnpm link --global

# Now execute your local build anywhere:
rea-steal-ui --help
```

To test extracting a real desktop app or test fixture:
```bash
# Test against a synthetic fixture
pnpm dev -- test/fixtures/synthetic-linear-bundle --out ./scratch/test-output

# Test with verbose AST debugging output
pnpm dev -- test/fixtures/synthetic-linear-bundle --verbose --dump-ast
```

---

## 5. Testing Architecture & Fixtures

`rea-steal-ui` relies on rigorous automated testing to prevent regressions across AST transformations, color math, and SVG sanitization.

### 5.1 Test Structure

```text
test/
├── fixtures/
│   ├── minified-react-18.js       # Synthetic minified React 18 production bundle
│   ├── minified-react-19.js       # Synthetic minified React 19 production bundle
│   ├── sample-app.asar            # Mock ASAR archive for extraction testing
│   ├── raw-stylesheets.css        # CSS samples with 500+ ad-hoc colors
│   └── inline-icons.js            # Minified JSX containing inline SVGs
├── extractors/
│   ├── tokens.test.ts             # CIELAB Delta-E clustering tests
│   ├── icons.test.ts              # SVGO cleaning and vector hash tests
│   ├── ast-decompiler.test.ts     # Babel JSX reconstruction tests
│   └── motion.test.ts             # Spring physics & keyframe tests
├── generators/
│   ├── tailwind.test.ts           # Tailwind v3 / v4 output tests
│   └── storybook.test.ts          # CSF3 story synthesizer tests
└── e2e/
    └── full-pipeline.test.ts      # End-to-end ingestion-to-Storybook test
```

### 5.2 Writing an AST Decompiler Test

When testing Babel AST decompilation, write a minimal input fixture and verify that the transformed output matches the expected clean React JSX:

```typescript
import { describe, it, expect } from 'vitest';
import { decompileComponent } from '../src/extractors/ast-decompiler';

describe('AST Decompiler: Button Reconstruction', () => {
  it('decompiles minified _jsx button call to clean JSX', () => {
    const minifiedInput = `
      (0, r.jsx)("button", {
        className: "px-4 py-2 bg-blue-600 text-white rounded-md",
        onClick: handleAction,
        children: "Click Me"
      })
    `;

    const result = decompileComponent(minifiedInput);

    expect(result.componentCode).toContain('<button');
    expect(result.componentCode).toContain('className="px-4 py-2 bg-blue-600 text-white rounded-md"');
    expect(result.propsInterface).toContain('interface ButtonProps');
  });
});
```

---

## 6. Debugging AST & Decompilation

When adding or fixing component decompilation rules, debugging the Abstract Syntax Tree (AST) is essential:

1. **Online AST Explorer:**
   Use [AST Explorer](https://astexplorer.net/) with the `@babel/parser` parser and `JSX` / `TypeScript` plugins enabled to inspect node types (`CallExpression`, `JSXElement`, `ObjectExpression`).
2. **CLI Debug Flags:**
   - `--dump-ast`: Emits the parsed AST as formatted JSON into `.rea-debug/ast.json`.
   - `--verbose`: Logs each AST visitor step, token clustering iteration, and SVGO transform.
   - `--keep-temp`: Prevents deletion of the temporary unpacked ASAR scratch folder for inspection.

---

## 7. Code Style & Commit Conventions

### 7.1 TypeScript Standards
- **Strict Mode:** Always adhere to strict TypeScript settings. No `any` without an explicit comment explaining why static typing is impossible.
- **Pure Functions:** Extractors and normalizers should be pure, deterministic functions without hidden side effects.
- **Error Handling:** Never let an unhandled rejection crash the CLI. Always wrap AST visitor steps in try-catch blocks and log descriptive error diagnostics.

### 7.2 Commit Message Convention (Conventional Commits)
All commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```text
<type>(<scope>): <short description>

[optional body]

[optional footer(s)]
```

**Allowed Types:**
- `feat`: A new feature (e.g. `feat(icons): add Lucide geometric vector hash matcher`)
- `fix`: A bug fix (e.g. `fix(tokens): prevent division by zero in Delta-E calculation`)
- `docs`: Documentation changes
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding or correcting tests
- `chore`: Build process or tooling changes

---

## 8. Release & Publishing Workflow

Releases are managed automatically using Changesets:

```bash
# 1. Create a changeset when your PR includes user-facing changes
pnpm changeset

# 2. Follow prompts to select semver bump (patch, minor, major) and enter release notes

# 3. Commit the generated .changeset/*.md file with your PR
```

Once merged to `main`, the GitHub Actions release workflow automatically:
1. Bumps package versions according to changesets.
2. Updates `CHANGELOG.md`.
3. Publishes the updated package to npm.
4. Creates a GitHub Release tag.

