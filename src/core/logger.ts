/**
 * Logger Utility
 *
 * Structured, namespaced logger for all rea-steal-ui modules.
 * Respects the --verbose flag for debug-level output.
 */

import pc from "picocolors";

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
  verbose(message: string): void;
}

/** Global verbose flag toggled by CLI --verbose option. */
let isVerbose = false;

/** Enable or disable verbose logging globally. */
export function setVerbose(enabled: boolean): void {
  isVerbose = enabled;
}

/**
 * Create a namespaced logger instance.
 *
 * @param namespace - Module namespace for log prefix (e.g. "tokens", "asar").
 * @returns Logger with info, warn, error, debug, and verbose methods.
 */
export function createLogger(namespace: string): Logger {
  const prefix = pc.dim(`[${namespace}]`);

  return {
    info(message: string) {
      console.log(`${prefix} ${message}`);
    },
    warn(message: string) {
      console.warn(`${prefix} ${pc.yellow("⚠")} ${pc.yellow(message)}`);
    },
    error(message: string) {
      console.error(`${prefix} ${pc.red("✖")} ${pc.red(message)}`);
    },
    debug(message: string) {
      if (isVerbose) {
        console.log(`${prefix} ${pc.dim(message)}`);
      }
    },
    verbose(message: string) {
      if (isVerbose) {
        console.log(`${prefix} ${pc.cyan("→")} ${message}`);
      }
    },
  };
}

