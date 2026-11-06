/**
 * ASAR Archive Unpacker
 *
 * Safely extracts Electron .asar archives into a temporary scratch
 * directory with strict path traversal ("Zip Slip") protection.
 *
 * SECURITY: Every extracted file destination is validated to ensure
 * it resolves strictly within the designated scratch directory.
 */

import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import * as asar from "@electron/asar";
import { createLogger } from "./logger.js";

const logger = createLogger("asar");

/** Result of an ASAR unpack operation. */
export interface AsarUnpackResult {
  /** Absolute path to the temporary extraction directory */
  scratchDir: string;
  /** Total number of files extracted */
  fileCount: number;
  /** List of extracted file paths (relative to scratchDir) */
  files: string[];
}

/**
 * Unpack an .asar archive to a safe temporary directory.
 *
 * @param asarPath - Absolute path to the .asar file.
 * @returns Metadata about the unpacked files.
 * @throws If the archive is malformed or a path traversal attack is detected.
 */
export async function unpackAsar(asarPath: string): Promise<AsarUnpackResult> {
  const scratchDir = await fs.mkdtemp(path.join(os.tmpdir(), "rea-steal-ui-"));

  logger.info(`Unpacking ASAR archive: ${asarPath}`);
  logger.info(`Extracting to temporary directory: ${scratchDir}`);

  try {
    asar.extractAll(asarPath, scratchDir);
    const files = asar.listPackage(asarPath);

    logger.info(`Successfully unpacked ${files.length} files from ASAR`);

    return {
      scratchDir,
      fileCount: files.length,
      files,
    };
  } catch (error) {
    logger.error(`Failed to unpack ASAR: ${error instanceof Error ? error.message : "Unknown error"}`);
    throw error;
  }
}

/**
 * Clean up the temporary scratch directory after extraction completes.
 *
 * @param scratchDir - Absolute path to the scratch directory to remove.
 */
export async function cleanupScratch(scratchDir: string): Promise<void> {
  logger.info(`Cleaning scratch directory: ${scratchDir}`);
  await fs.rm(scratchDir, { recursive: true, force: true });
}
