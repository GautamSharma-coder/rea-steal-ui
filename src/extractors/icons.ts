/**
 * SVG & Vector Asset Harvester
 *
 * Detects inline SVGs embedded in React component AST, normalizes
 * them using SVGO, and auto-names icons using semantic hints
 * and geometric shape heuristics.
 */

import { parse } from "@babel/parser";
import _traverse, { type NodePath, type TraverseOptions } from "@babel/traverse";
import * as t from "@babel/types";
import { optimize } from "svgo";
import * as cheerio from "cheerio";
import type { ExtractedIcon, SVGPathData } from "../types/index.js";
import { createLogger } from "../core/logger.js";
import { toPascalCase } from "../utils/naming.js";

// Handle ESM/CJS interop for @babel/traverse
const traverse: (node: t.Node, opts: TraverseOptions) => void =
  typeof _traverse === "function"
    ? _traverse
    : (_traverse as unknown as { default: (node: t.Node, opts: TraverseOptions) => void }).default;

const logger = createLogger("icons");

const STANDARD_VIEWBOX_24 = "0 0 24 24";
const STANDARD_VIEWBOX_16 = "0 0 16 16";

/**
 * Extract and normalize all SVG icons from JavaScript bundle sources.
 *
 * @param bundleSources - Array of raw JavaScript bundle source strings.
 * @returns Array of extracted and normalized SVG icons.
 */
export async function extractIcons(bundleSources: string[]): Promise<ExtractedIcon[]> {
  logger.info(`Scanning ${bundleSources.length} bundles for inline SVG elements...`);

  const rawSVGs = detectInlineSVGs(bundleSources);
  logger.info(`Detected ${rawSVGs.length} raw SVG elements`);

  const normalized = rawSVGs.map(normalizeSVG);
  const named = autoNameIcons(normalized);

  logger.info(`Harvested ${named.length} clean, named SVG icons`);
  return named;
}

interface RawSVGEntry {
  paths: SVGPathData[];
  viewBox: string;
  sourceFile: string;
  originalName?: string;
  rawXml?: string;
}

/**
 * Detect SVG elements in JavaScript AST (_jsx/createElement calls and string templates).
 */
function detectInlineSVGs(bundleSources: string[]): RawSVGEntry[] {
  const results: RawSVGEntry[] = [];

  bundleSources.forEach((code, index) => {
    if (!code || typeof code !== "string") return;
    const sourceFile = `bundle-${index}.js`;

    try {
      const ast = parse(code, {
        sourceType: "unambiguous",
        plugins: ["jsx", "typescript"],
        errorRecovery: true,
      });

      traverse(ast, {
        CallExpression(path: NodePath<t.CallExpression>) {
          const { arguments: args } = path.node;

          // Match _jsx("svg", props) or React.createElement("svg", props, ...)
          const firstArg = args[0];
          const isSvgTag =
            (t.isStringLiteral(firstArg) && firstArg.value.toLowerCase() === "svg") ||
            (t.isIdentifier(firstArg) && firstArg.name.toLowerCase() === "svg");

          if (!isSvgTag) return;

          // Attempt to find variable or component name in parent scope
          let detectedName: string | undefined;
          const varDeclarator = path.findParent((p: NodePath) => p.isVariableDeclarator());
          if (varDeclarator && t.isVariableDeclarator(varDeclarator.node) && t.isIdentifier(varDeclarator.node.id)) {
            detectedName = varDeclarator.node.id.name;
          }

          // Extract props from 2nd argument (ObjectExpression)
          let viewBox = STANDARD_VIEWBOX_24;
          const paths: SVGPathData[] = [];
          const propsNode = args[1];

          if (t.isObjectExpression(propsNode)) {
            for (const prop of propsNode.properties) {
              if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
                if (prop.key.name === "viewBox" && t.isStringLiteral(prop.value)) {
                  viewBox = prop.value.value;
                }
                if (prop.key.name === "aria-label" && t.isStringLiteral(prop.value)) {
                  detectedName = prop.value.value;
                }
              }
            }
          }

          // Extract any child paths or shapes embedded in arguments or AST children
          path.traverse({
            CallExpression(childPath: NodePath<t.CallExpression>) {
              const childArgs = childPath.node.arguments;
              if (t.isStringLiteral(childArgs[0]) && childArgs[0].value === "path") {
                const pathProps = childArgs[1];
                if (t.isObjectExpression(pathProps)) {
                  let d = "";
                  for (const p of pathProps.properties) {
                    if (t.isObjectProperty(p) && t.isIdentifier(p.key) && p.key.name === "d" && t.isStringLiteral(p.value)) {
                      d = p.value.value;
                    }
                  }
                  if (d) {
                    paths.push({ d });
                  }
                }
              }
            },
          });

          if (paths.length > 0) {
            results.push({
              paths,
              viewBox,
              sourceFile,
              originalName: detectedName,
            });
          }
        },
      });
    } catch {
      // Fallback: search with regex/cheerio for raw XML SVG strings in bundles
      extractSVGsFromStrings(code, sourceFile, results);
    }
  });

  return results;
}

function extractSVGsFromStrings(code: string, sourceFile: string, results: RawSVGEntry[]): void {
  const svgRegex = /<svg[^>]*>([\s\S]*?)<\/svg>/gi;
  let match: RegExpExecArray | null;

  while ((match = svgRegex.exec(code)) !== null) {
    try {
      const fullSvg = match[0];
      const $ = cheerio.load(fullSvg, { xmlMode: true });
      const svg = $("svg");
      const viewBox = svg.attr("viewBox") ?? STANDARD_VIEWBOX_24;
      const paths: SVGPathData[] = [];

      svg.find("path").each((_, el) => {
        const d = $(el).attr("d");
        if (d) {
          paths.push({
            d,
            fillRule: $(el).attr("fill-rule"),
            clipRule: $(el).attr("clip-rule"),
          });
        }
      });

      if (paths.length > 0) {
        results.push({
          paths,
          viewBox,
          sourceFile,
          rawXml: fullSvg,
        });
      }
    } catch {
      // Ignore parse errors on raw strings
    }
  }
}

/**
 * Normalize an SVG with SVGO and standardized attributes.
 */
function normalizeSVG(raw: RawSVGEntry): ExtractedIcon {
  const viewBox = normalizeViewBox(raw.viewBox);

  // If we have raw XML, run through SVGO
  let optimizedPaths = raw.paths;
  if (raw.rawXml) {
    try {
      const result = optimize(raw.rawXml, {
        multipass: true,
        plugins: [
          "preset-default",
          "removeDimensions",
          {
            name: "convertColors",
            params: {
              currentColor: true,
            },
          },
        ],
      });

      const $ = cheerio.load(result.data, { xmlMode: true });
      const parsedPaths: SVGPathData[] = [];
      $("path").each((_, el) => {
        const d = $(el).attr("d");
        if (d) parsedPaths.push({ d });
      });

      if (parsedPaths.length > 0) {
        optimizedPaths = parsedPaths;
      }
    } catch {
      // Fallback to unoptimized paths
    }
  }

  return {
    name: raw.originalName ? toPascalCase(raw.originalName) : "UnnamedIcon",
    viewBox,
    paths: optimizedPaths,
    originalName: raw.originalName,
    sourceFile: raw.sourceFile,
    namingConfidence: raw.originalName ? 0.9 : 0.0,
  };
}

function normalizeViewBox(viewBox: string): string {
  if (!viewBox) return STANDARD_VIEWBOX_24;
  const parts = viewBox.trim().split(/\s+/).map(Number);
  if (parts.length !== 4) return STANDARD_VIEWBOX_24;
  const width = parts[2]!;
  if (width <= 16) return STANDARD_VIEWBOX_16;
  return STANDARD_VIEWBOX_24;
}

/**
 * Auto-name icons based on geometric heuristics or sequence.
 */
function autoNameIcons(icons: ExtractedIcon[]): ExtractedIcon[] {
  const nameCounts = new Map<string, number>();

  return icons.map((icon, index) => {
    let baseName = icon.name;

    if (!baseName || baseName === "UnnamedIcon") {
      baseName = inferNameFromPaths(icon.paths) || `Icon${index + 1}`;
    }

    if (!baseName.endsWith("Icon")) {
      baseName = `${baseName}Icon`;
    }

    const count = nameCounts.get(baseName) ?? 0;
    nameCounts.set(baseName, count + 1);

    const uniqueName = count === 0 ? baseName : `${baseName}${count + 1}`;

    return {
      ...icon,
      name: toPascalCase(uniqueName),
    };
  });
}

function inferNameFromPaths(paths: SVGPathData[]): string | undefined {
  if (paths.length === 0) return undefined;
  const allD = paths.map((p) => p.d).join(" ");

  // Common geometric signatures
  if (/m21 21/i.test(allD) && /circle/i.test(allD)) return "Search";
  if (/m18 6l-12 12/i.test(allD) || /m6 6l12 12/i.test(allD)) return "Close";
  if (/m9 18l6-6-6-6/i.test(allD)) return "ChevronRight";
  if (/m15 18l-6-6 6-6/i.test(allD)) return "ChevronLeft";
  if (/m6 9l6 6 6-6/i.test(allD)) return "ChevronDown";
  if (/m5 13l4 4l10-10/i.test(allD)) return "Check";
  if (/m12 5v14/i.test(allD) && /m5 12h14/i.test(allD)) return "Plus";

  return undefined;
}
