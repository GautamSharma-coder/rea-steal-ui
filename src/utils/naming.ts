/**
 * String & Naming Utilities
 *
 * Helpers for converting between naming conventions used
 * in component names, file names, and CSS tokens.
 */

/**
 * Convert a raw string to PascalCase (e.g. "command-menu" → "CommandMenu").
 */
export function toPascalCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c: string | undefined) =>
      c ? c.toUpperCase() : ""
    )
    .replace(/^(.)/, (_, c: string) => c.toUpperCase());
}

/**
 * Convert a raw string to camelCase (e.g. "command-menu" → "commandMenu").
 */
export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Convert a raw string to kebab-case (e.g. "CommandMenu" → "command-menu").
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

/**
 * Sanitize a string for use as a valid file name.
 */
export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
}

