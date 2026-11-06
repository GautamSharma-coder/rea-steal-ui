# Codebase Directory Structure & Scalability Guide

This document explains the organization of `rea-steal-ui`, the purpose of each directory and file, and the architectural conventions contributors must follow when extending the codebase.

---

## 🌳 High-Level Tree

```text
rea-steal-ui/
├── .github/                         # GitHub Actions, issue templates, PR template
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   ├── workflows/
│   │   ├── ci.yml                   # Matrix testing across Linux, macOS, Windows
│   │   └── release.yml              # Automated publishing via Changesets
│   └── pull_request_template.md
├── bin/                             # Executable entry points
│   └── cli.ts                       # CLI argument parsing (@clack + commander)
├── src/                             # Core TypeScript library source
│   ├── core/                        # OS, archive & module graph ingestion
│   │   ├── asar.ts                  # ASAR unpacker with Zip-Slip path validation
│   │   ├── target.ts                # App format resolver (.app, .asar, web dist)
│   │   ├── rea-bridge.ts            # Static JS AST dependency graph analyzer
│   │   ├── scanner.ts               # File walker discovering chunks & stylesheets
│   │   ├── logger.ts                # Namespaced CLI logger (--verbose aware)
│   │   └── index.ts                 # Core barrel export
│   ├── extractors/                  # Specialized extraction engines
│   │   ├── tokens.ts                # CIELAB ΔE color clustering & typography
│   │   ├── icons.ts                 # Inline SVG detector, SVGO, vector hash namer
│   │   ├── ast-decompiler.ts        # Babel React _jsx to clean JSX transformer
│   │   ├── motion.ts                # @keyframes and spring curve extractor
│   │   ├── quarantine.ts            # Trademark & logo isolation filter
│   │   └── index.ts                 # Extractors barrel export
│   ├── generators/                  # Code & project scaffolding emitters
│   │   ├── project.ts               # Vite + React 19 project skeleton emitter
│   │   ├── tailwind.ts              # Tailwind CSS v4 (@theme) & v3 emitter
│   │   ├── storybook.ts             # CSF3 .stories.tsx story synthesizer
│   │   ├── component-scaffold.ts    # React component & barrel exporter
│   │   └── index.ts                 # Generators barrel export
│   ├── pipeline/                    # Orchestration layer
│   │   ├── orchestrator.ts          # Multi-stage extraction coordinator
│   │   └── index.ts                 # Pipeline barrel export
│   ├── types/                       # Shared TypeScript data contracts
│   │   └── index.ts                 # Central type definitions (single source of truth)
│   ├── utils/                       # Shared pure utility functions
│   │   ├── fs.ts                    # Safe path resolvers & file system helpers
│   │   ├── naming.ts                # PascalCase, camelCase, sanitize helpers
│   │   └── index.ts                 # Utils barrel export
│   └── index.ts                     # Main public library export
├── templates/                       # Base skeletons copied into generated kits
│   └── vite-react-tailwind/         # Minimal Vite + React 19 + Tailwind v4 + Storybook
│       ├── .storybook/
│       │   ├── main.ts
│       │   └── preview.ts
│       ├── src/
│       │   ├── styles/globals.css
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── index.html
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
├── test/                            # Automated test suites (Vitest)
│   ├── core/                        # Core module unit tests
│   │   └── target.test.ts
│   ├── extractors/                  # Extractor unit tests
│   │   ├── tokens.test.ts
│   │   ├── icons.test.ts
│   │   ├── ast-decompiler.test.ts
│   │   ├── motion.test.ts
│   │   └── quarantine.test.ts
│   ├── generators/                  # Generator unit tests
│   │   ├── tailwind.test.ts
│   │   └── storybook.test.ts
│   ├── utils/                       # Utility unit tests
│   │   └── naming.test.ts
│   ├── fixtures/                    # Test fixtures (synthetic bundles, CSS)
│   │   ├── minified-react-19.js
│   │   ├── minified-react-18.js
│   │   └── raw-stylesheets.css
│   └── e2e/                         # End-to-end integration tests
│       └── full-pipeline.test.ts
├── .editorconfig                    # Consistent indentation across IDEs
├── .gitignore                       # Ignored build outputs and cache
├── .prettierignore
├── .prettierrc                      # Prettier formatting config
├── AGENT.md                         # Instructions for AI agents (Cursor, Claude, Copilot)
├── ARCHITECTURE.md                  # Deep technical design & mathematical models
├── CHANGELOG.md                     # Semantic version history (Keep a Changelog)
├── CODE_OF_CONDUCT.md               # Contributor Covenant v2.1
├── CONTRIBUTING.md                  # Contribution rules, branch names, PR checks
├── DEVELOPMENT.md                   # Local development setup & testing guide
├── DIRECTORY_STRUCTURE.md           # This document
├── LICENSE                          # MIT License
├── package.json                     # Root npm package manifest
├── PRD.md                           # Product Requirements Document
├── README.md                        # Primary user-facing documentation
├── SECURITY.md                      # Vulnerability reporting & security boundaries
├── tsconfig.json                    # Strict TypeScript 5.6 configuration
├── tsup.config.ts                   # Fast ESM build bundler configuration
└── vitest.config.ts                 # Vitest runner and coverage configuration
```

---

## 🧩 Architectural Separation of Concerns

To keep `rea-steal-ui` modular and maintainable as it scales to support new bundlers, UI frameworks, and design systems:

### 1. `src/core/` (Ingestion & System Boundaries)
- **Role:** Handles platform-specific file extraction, ASAR unpacking, file scanning, and OS detection.
- **Rule:** Core modules must **never** depend on `extractors/` or `generators/`.
- **Security:** Must enforce path traversal validation before writing any unpacked files.

### 2. `src/extractors/` (Analysis & Transformation Subsystems)
- **Role:** Pure static analysis. Inspects ASTs, styles, and vectors to extract structured representations.
- **Rule:** Extractors must take raw inputs (strings, AST nodes, buffers) and return typed data contracts defined in `src/types/index.ts`. They do not interact with the CLI or write project files.

### 3. `src/generators/` (Code & Template Emitters)
- **Role:** Transforms extracted data contracts into production-ready TypeScript, CSS, and Storybook stories.
- **Rule:** Generators are deterministic functions: given identical data contracts, they must produce identical source files.

### 4. `src/pipeline/` (Orchestration & UX)
- **Role:** Coordinates the stages in sequence and controls terminal user interface elements (spinners, step progress via `@clack/prompts`).
- **Rule:** Downstream modules do not call `@clack/prompts` directly; all user communication is controlled at the pipeline level.

### 5. `src/types/` (Data Contracts)
- **Role:** Single source of truth. All domain entities (`DesignTokens`, `ExtractedIcon`, `DecompiledComponent`, `TargetApp`) are typed here.

---

## 🚀 Scaling Guidelines for Contributors

| What You Want to Add | Where to Place It | Corresponding Test |
| :--- | :--- | :--- |
| **New Component Pattern** (e.g., `Tabs`, `Slider`) | Add classifier & decompiler logic in `src/extractors/ast-decompiler.ts` | `test/extractors/ast-decompiler.test.ts` |
| **New Bundler Support** (e.g., Turbopack, Parcel) | Add detection pattern in `src/core/rea-bridge.ts` | `test/core/rea-bridge.test.ts` |
| **New Icon Classifier** (e.g., Heroicons hash set) | Add shape dictionary to `src/extractors/icons.ts` | `test/extractors/icons.test.ts` |
| **New Style Output** (e.g., Style Dictionary JSON) | Add emitter in `src/generators/tokens-json.ts` | `test/generators/tokens-json.test.ts` |
| **New Synthetic Test Bundle** | Place in `test/fixtures/` | Referenced across `test/` |

