# Contributing to `rea-steal-ui`

First off, thank you for considering contributing to **`rea-steal-ui`**! 🎉

We are building the definitive open-source tool for reverse-engineering world-class desktop design systems into clean, modern React 19 + Tailwind code. Contributions from developers, designers, and reverse-engineers of all backgrounds are welcome.

---

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please report unacceptable behavior to `conduct@rea-steal-ui.dev`.

---

## Ways to Contribute

There are many ways you can help improve `rea-steal-ui`:

1. **Bug Reports:** Encountered a crash on an Electron app or broken JSX AST? Report it!
2. **Feature Requests:** Suggest new signature component isolators (e.g., Tabs, Tooltips, Split Panes).
3. **Component Decompilers:** Help improve AST transformation for new UI patterns (Radix UI, Headless UI, Ark UI).
4. **Target Framework Adapters:** Add support for unpacking Tauri (Rust webview), Flutter Web, or Qt WebEngine bundles.
5. **Documentation & Guides:** Improve setup guides, write tutorials, or add real-world demo cases.

---

## Reporting Bugs

Before creating a bug report, please check existing [Issues](https://github.com/rea-steal-ui/rea-steal-ui/issues) to ensure it hasn't already been reported.

When submitting a bug report:
- Use our [Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.md).
- Specify your OS, Node.js version, and `rea-steal-ui` version.
- Include the exact CLI command executed.
- Provide a minimal reproducible bundle fixture or error stack trace (run with `--verbose`).
- Ensure no proprietary API keys, secrets, or internal proprietary assets are exposed in the issue.

---

## Pull Request Guidelines

### 1. Branch Naming
Create a topic branch from `main`:
- `feat/feature-name` (e.g., `feat/add-tooltip-decompiler`)
- `fix/bug-description` (e.g., `fix/delta-e-clustering-edge-case`)
- `docs/doc-update` (e.g., `docs/update-architecture-spec`)

### 2. Local Verification Checklist
Before submitting your Pull Request, ensure all checks pass locally:

```bash
# 1. Typecheck TypeScript
pnpm typecheck

# 2. Run the test suite
pnpm test

# 3. Verify linting and formatting
pnpm lint
pnpm format
```

### 3. Add Tests
- Every bug fix should include a regression test in `test/`.
- Every new component decompiler or token extractor must include unit tests against synthetic fixtures.

### 4. Create a Changeset
If your PR introduces a fix or feature that impacts users, generate a changeset:
```bash
pnpm changeset
```
Follow the interactive prompt to document the change for the next release.

### 5. Submit Your PR
- Use our [Pull Request Template](.github/pull_request_template.md).
- Provide a clear summary of what changed and why.
- Link relevant issues using `Fixes #123` or `Closes #456`.

---

## Development Setup

For detailed instructions on setting up your local development environment, running tests, and debugging AST transforms, see the [Development Guide](DEVELOPMENT.md).

---

## Recognition & Thank You

All contributors are acknowledged in our release notes and on our README. Thank you for making `rea-steal-ui` better for developers everywhere!

