/**
 * Filesystem Utilities
 *
 * Helper functions for safe file system operations used across
 * the ingestion, extraction, and generation stages.
 */

import path from "node:path";
import fs from "node:fs/promises";

/**
 * Safely resolve a file path, ensuring it stays within the given root.
 * Prevents directory traversal attacks.
 *
 * @param root - Allowed root directory.
 * @param relativePath - Relative file path to resolve.
 * @returns Absolute resolved path.
 * @throws If the resolved path escapes the root boundary.
 */
export function safeResolve(root: string, relativePath: string): string {
  const resolved = path.resolve(root, relativePath);
  if (!resolved.startsWith(root)) {
    throw new Error(
      `Path traversal detected: "${relativePath}" resolves outside root "${root}"`
    );
  }
  return resolved;
}

/**
 * Read a text file and return its contents as a string.
 * Returns undefined if the file does not exist.
 */
export async function readFileOptional(filePath: string): Promise<string | undefined> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return undefined;
  }
}

/**
 * Write a file, creating parent directories as needed.
 */
export async function writeFileSafe(
  filePath: string,
  content: string
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf-8");
}

/**
 * Check if a file or directory exists.
 */
export async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

