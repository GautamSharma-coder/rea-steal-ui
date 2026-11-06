# Security Policy

# `rea-steal-ui` — Security, Static Analysis & Responsible Disclosure

The `rea-steal-ui` team takes security, software safety, and intellectual property compliance very seriously. This document outlines our security measures, threat model, and vulnerability reporting procedures.

---

## 1. Supported Versions

We provide security updates and patches for the following versions:

| Version | Supported | Status |
| :--- | :---: | :--- |
| `1.x.x` | ✅ Yes | Active Development / Supported |
| `< 1.0.0` | ❌ No | Deprecated / Unsupported |

---

## 2. Threat Model & Security Guarantees

Because `rea-steal-ui` ingests and inspects third-party software bundles, binaries, and archive files, we enforce strict defensive security guarantees:

### 2.1 Pure Static Analysis (No Code Execution)
- **Zero Binary Execution:** `rea-steal-ui` **never** runs or executes target application binaries, Node.js scripts, or Electron executables.
- **Static AST Parsing:** JavaScript files are parsed purely as text into Abstract Syntax Trees using `@babel/parser` within a secure, sandboxed AST visitor environment.
- **No Remote Code Execution:** Malicious code contained within a target bundle cannot execute during extraction.

### 2.2 ASAR Archive Extraction & Path Traversal ("Zip Slip") Protection
- When unpacking Electron `.asar` files or archives, all entry file paths are strictly sanitized against directory traversal attacks (`../`).
- Every extracted file destination is validated to ensure it resides strictly within the designated temporary scratch directory (`os.tmpdir()/rea-steal-ui-*`). Any entry attempting to write outside this boundary triggers an immediate fatal error and aborts extraction.

### 2.3 Trademark & Intellectual Property Quarantine
- `rea-steal-ui` automatically quarantines detected corporate brand marks, proprietary company logos, and trademarked SVG vectors into `quarantine/logos/`.
- Quarantined files are explicitly isolated from the main component barrel export to prevent accidental copyright or trademark infringement.

---

## 3. Reporting a Vulnerability

If you discover a security vulnerability in `rea-steal-ui`, please **do not open a public GitHub issue**. Instead, follow our responsible disclosure process:

1. **Email Disclosure:**
   Send an encrypted or plain email to:
   **`security@rea-steal-ui.dev`**
2. **Include in Report:**
   - A clear description of the vulnerability.
   - Step-by-step reproduction instructions or a minimal reproducible bundle fixture.
   - Potential impact of the vulnerability.
   - Any proposed fixes or mitigations.
3. **Response Timeline:**
   - **Acknowledgment:** Within 48 hours.
   - **Triage & Status Update:** Within 5 business days.
   - **Patch Release:** Coordinated with the reporter before public disclosure.

We appreciate your cooperation in responsibly disclosing issues and helping keep the open-source community safe.

