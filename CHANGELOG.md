# Changelog

All notable changes to `rea-steal-ui` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Automated target detection for macOS `.app` bundles, Electron `.asar` files, and web dist directories.
- Perceptual color and token harvesting using CIELAB $\Delta E^*_{ab}$ clustering.
- SVG icon harvesting and normalization with SVGO and geometric hash vector naming.
- Babel AST React decompiler converting compiled `_jsx()` and `React.createElement()` into clean, idiomatic JSX.
- Automatic extraction for signature desktop UI patterns: Command Palette (`Cmd+K`), Modals, Dropdowns, Badges, and Buttons.
- Tailwind CSS v4 (`@theme`) and Tailwind CSS v3 theme generators.
- Zero-config Vite + React 19 project scaffolder with Storybook (CSF3) stories.
- Ethical and clean-room quarantine pipeline isolating proprietary corporate logos into `quarantine/logos/`.
- Interactive CLI terminal interface built with `@clack/prompts` and `picocolors`.
- Comprehensive developer documentation suite: PRD, Architecture, Development Guide, Agent System Instructions, Security Policy, and Contributing Guidelines.

---

## [1.0.0-beta.1] - 2026-10-30

### Added
- Initial public beta release of `rea-steal-ui`.
- Full CLI support for `npx rea-steal-ui <path> [options]`.
- Support for `--tokens-only`, `--icons-only`, and `--components` flags.
- Embedded Vite + React 19 + Tailwind CSS playground template.

