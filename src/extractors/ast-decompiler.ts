/**
 * React Component AST Decompiler
 *
 * Decompiles minified React production code — compiled _jsx(),
 * _jsxs(), React.createElement(), and minified alias calls (r(), I(), L())
 * — back into clean, idiomatic, typed JSX with Tailwind CSS utility classes.
 *
 * INVARIANT: Uses @babel/types builders exclusively.
 * Never string-concatenates AST nodes.
 */

import { parse } from "@babel/parser";
import _traverse, { type NodePath, type TraverseOptions } from "@babel/traverse";
import * as t from "@babel/types";
import _generator, { type GeneratorOptions, type GeneratorResult } from "@babel/generator";
import type { DecompiledComponent, ComponentCategory } from "../types/index.js";
import { createLogger } from "../core/logger.js";
import { toPascalCase } from "../utils/naming.js";

// Handle ESM/CJS interop
const traverse: (node: t.Node, opts: TraverseOptions) => void =
  typeof _traverse === "function"
    ? _traverse
    : (_traverse as unknown as { default: (node: t.Node, opts: TraverseOptions) => void }).default;

const generate: (ast: t.Node, opts?: GeneratorOptions) => GeneratorResult =
  typeof _generator === "function"
    ? _generator
    : (_generator as unknown as { default: (ast: t.Node, opts?: GeneratorOptions) => GeneratorResult }).default;

const logger = createLogger("decompiler");

/** Standard HTML tags used for DOM element verification */
const STANDARD_DOM_TAGS = new Set([
  "div", "span", "button", "input", "a", "form", "dialog", "nav",
  "table", "header", "footer", "section", "main", "aside", "label",
  "kbd", "select", "textarea", "ul", "ol", "li", "p", "h1", "h2",
  "h3", "h4", "h5", "h6", "article", "svg",
]);

/**
 * Decompile React components from minified JavaScript bundle sources.
 *
 * @param bundleSources - Array of [filePath, sourceCode] tuples.
 * @param componentFilter - Optional list of component categories to isolate.
 * @returns Array of decompiled, clean React components.
 */
export async function decompileComponents(
  bundleSources: Array<[string, string]>,
  componentFilter?: ComponentCategory[]
): Promise<DecompiledComponent[]> {
  logger.info(`Decompiling components from ${bundleSources.length} bundles...`);

  const components: DecompiledComponent[] = [];

  for (const [filePath, source] of bundleSources) {
    if (!source || typeof source !== "string") continue;

    try {
      const discovered = decompileBundle(filePath, source);
      components.push(...discovered);
    } catch (error) {
      logger.warn(
        `Skipping bundle ${filePath}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  // Deduplicate by component name
  const seen = new Set<string>();
  const unique = components.filter((c) => {
    if (seen.has(c.name)) return false;
    seen.add(c.name);
    return true;
  });

  // Apply component filter if specified
  const filtered = componentFilter
    ? unique.filter((c) => componentFilter.includes(c.category))
    : unique;

  logger.info(`Decompiled ${filtered.length} components`);
  return filtered;
}

/**
 * Decompile a single bundle source into discovered component definitions.
 */
export function decompileBundle(filePath: string, source: string): DecompiledComponent[] {
  const discovered: DecompiledComponent[] = [];

  let ast: t.File;
  try {
    ast = parse(source, {
      sourceType: "unambiguous",
      plugins: ["jsx", "typescript"],
      errorRecovery: true,
    });
  } catch {
    return [];
  }

  // Pass 1: Discover minified JSX runtime aliases (e.g. I = iq.jsx, r = BE.jsx)
  // and explicit displayName assignments (e.g. Comp.displayName = "Shortcut")
  const jsxCallees = new Set(["jsx", "jsxs", "_jsx", "_jsxs", "createElement"]);
  const displayNames = new Map<string, string>();

  traverse(ast, {
    AssignmentExpression(path: NodePath<t.AssignmentExpression>) {
      // 1. Unwrap chained assignments for JSX runtime aliases: I = __c.I = iq.jsx
      let right: t.Expression = path.node.right;
      const targets: Array<t.LVal | t.OptionalMemberExpression> = [path.node.left];
      while (t.isAssignmentExpression(right)) {
        targets.push(right.left);
        right = right.right;
      }

      if (t.isMemberExpression(right) && t.isIdentifier(right.property)) {
        if (["jsx", "jsxs", "createElement"].includes(right.property.name)) {
          for (const target of targets) {
            if (t.isIdentifier(target)) jsxCallees.add(target.name);
            else if (t.isMemberExpression(target) && t.isIdentifier(target.property)) {
              jsxCallees.add(target.property.name);
            }
          }
        }
      }

      // 2. Discover displayName assignments: Foo.displayName = "Button"
      const left = path.node.left;
      if (
        t.isMemberExpression(left) &&
        t.isIdentifier(left.property) &&
        left.property.name === "displayName" &&
        t.isStringLiteral(path.node.right)
      ) {
        if (t.isIdentifier(left.object)) {
          displayNames.set(left.object.name, path.node.right.value);
        }
      }
    },
    VariableDeclarator(path: NodePath<t.VariableDeclarator>) {
      const init = path.node.init;
      if (init && t.isMemberExpression(init) && t.isIdentifier(init.property)) {
        if (["jsx", "jsxs", "createElement"].includes(init.property.name)) {
          if (t.isIdentifier(path.node.id)) {
            jsxCallees.add(path.node.id.name);
          }
        }
      }
    },
  });

  // Pass 2: Fast linear scan for functions returning React element calls
  const nameCounters: Record<string, number> = {};

  traverse(ast, {
    Function(path: NodePath<t.Function>) {
      const returnCall = findReturnElementCall(path.node, jsxCallees);
      if (!returnCall) return;

      // Extract raw identifier name if declared
      const parent = path.parent;
      let rawName: string | undefined;

      if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
        rawName = parent.id.name;
      } else if (t.isFunctionDeclaration(path.node) && path.node.id) {
        rawName = path.node.id.name;
      } else if (
        t.isAssignmentExpression(parent) &&
        t.isMemberExpression(parent.left) &&
        t.isIdentifier(parent.left.property)
      ) {
        rawName = parent.left.property.name;
      }

      try {
        const jsxTree = transformCallToJSX(returnCall, jsxCallees);
        if (!jsxTree) return;

        // Skip standalone SVG elements (handled by the icon harvester)
        if (
          t.isJSXIdentifier(jsxTree.openingElement.name) &&
          jsxTree.openingElement.name.name.toLowerCase() === "svg" &&
          !rawName?.toLowerCase().includes("button")
        ) {
          return;
        }

        const observedProps: Record<string, string> = {};
        collectObservedProps(jsxTree, observedProps);

        const componentName = inferComponentName(rawName, jsxTree, displayNames, nameCounters);
        const category = classifyComponent(componentName, observedProps, 1);
        const pascalName = toPascalCase(componentName);
        const propsInterface = synthesizePropsInterface(pascalName, observedProps);

        // Generate JSX code
        const jsxCode = generate(jsxTree, { concise: false }).code;
        const componentCode = `import React from "react";
import type { ${pascalName}Props } from "./${pascalName}";

${propsInterface}

export const ${pascalName}: React.FC<${pascalName}Props> = (props) => {
  return (
    ${jsxCode}
  );
};
`;

        const storyCode = generateDefaultStory(pascalName, category);

        discovered.push({
          name: pascalName,
          category,
          propsInterface,
          componentCode,
          dependencies: [],
          storyCode,
          sourceFile: filePath,
        });
      } catch {
        // Skip components that fail transformation
      }
    },
  });

  return discovered;
}

/**
 * Fast inspection of a function node for returned React element calls without deep subtree traversal.
 */
function findReturnElementCall(
  fn: t.Function,
  knownCallees: Set<string>
): t.CallExpression | null {
  const body = fn.body;

  // Arrow function with concise body: () => (0, r.jsx)(...)
  if (t.isCallExpression(body) && isReactElementCall(body, knownCallees)) {
    return body;
  }

  // Block body function: inspect statements
  if (t.isBlockStatement(body)) {
    for (const stmt of body.body) {
      if (t.isReturnStatement(stmt) && stmt.argument && isReactElementCall(stmt.argument, knownCallees)) {
        return stmt.argument;
      }
      // Check inside simple if-statements or try-catch blocks
      if (t.isIfStatement(stmt)) {
        if (t.isReturnStatement(stmt.consequent) && stmt.consequent.argument && isReactElementCall(stmt.consequent.argument, knownCallees)) {
          return stmt.consequent.argument;
        }
        if (t.isBlockStatement(stmt.consequent)) {
          for (const inner of stmt.consequent.body) {
            if (t.isReturnStatement(inner) && inner.argument && isReactElementCall(inner.argument, knownCallees)) {
              return inner.argument;
            }
          }
        }
      }
    }
  }

  return null;
}

/**
 * Infer a meaningful, professional PascalCase component name from code symbols,
 * display names, ARIA roles, CSS class tokens, or DOM elements.
 */
function inferComponentName(
  rawName: string | undefined,
  jsxTree: t.JSXElement,
  displayNames: Map<string, string>,
  counters: Record<string, number>
): string {
  // 1. Check displayName assignment
  if (rawName && displayNames.has(rawName)) {
    return getUniqueName(toPascalCase(displayNames.get(rawName)!), counters);
  }

  // 2. Check explicit non-minified PascalCase name (length >= 3 and not common minified prefix)
  if (rawName && /^[A-Z][a-zA-Z0-9]{2,}$/.test(rawName)) {
    return getUniqueName(toPascalCase(rawName), counters);
  }

  // 3. Inspect JSX root element tag and attributes
  const opening = jsxTree.openingElement;
  let rootTag = "div";
  if (t.isJSXIdentifier(opening.name)) {
    rootTag = opening.name.name.toLowerCase();
  }

  let role: string | undefined;
  let className: string | undefined;

  for (const attr of opening.attributes) {
    if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name)) {
      if (attr.name.name === "role" && t.isStringLiteral(attr.value)) {
        role = attr.value.value.toLowerCase();
      } else if (attr.name.name === "className" && t.isStringLiteral(attr.value)) {
        className = attr.value.value.toLowerCase();
      }
    }
  }

  // Infer by ARIA role
  if (role === "button") return getUniqueName("Button", counters);
  if (role === "dialog") return getUniqueName("ModalDialog", counters);
  if (role === "combobox" || role === "searchbox") return getUniqueName("Combobox", counters);
  if (role === "navigation") return getUniqueName("Navigation", counters);
  if (role === "tooltip") return getUniqueName("Tooltip", counters);
  if (role === "tab") return getUniqueName("TabItem", counters);

  // Infer by CSS class names
  if (className) {
    if (className.includes("btn") || className.includes("button")) return getUniqueName("Button", counters);
    if (className.includes("modal") || className.includes("dialog")) return getUniqueName("ModalDialog", counters);
    if (className.includes("card")) return getUniqueName("Card", counters);
    if (className.includes("input") || className.includes("search")) return getUniqueName("InputField", counters);
    if (className.includes("badge") || className.includes("pill")) return getUniqueName("Badge", counters);
    if (className.includes("menu") || className.includes("dropdown")) return getUniqueName("DropdownMenu", counters);
    if (className.includes("banner")) return getUniqueName("Banner", counters);
    if (className.includes("shortcut") || className.includes("kbd")) return getUniqueName("ShortcutKey", counters);
  }

  // Infer by root HTML tag
  if (rootTag === "button") return getUniqueName("Button", counters);
  if (rootTag === "input") return getUniqueName("InputField", counters);
  if (rootTag === "form") return getUniqueName("FormContainer", counters);
  if (rootTag === "dialog") return getUniqueName("ModalDialog", counters);
  if (rootTag === "nav") return getUniqueName("NavBar", counters);
  if (rootTag === "table") return getUniqueName("DataTable", counters);
  if (rootTag === "header") return getUniqueName("HeaderBar", counters);
  if (rootTag === "footer") return getUniqueName("FooterBar", counters);
  if (rootTag === "kbd") return getUniqueName("ShortcutKey", counters);

  return getUniqueName("SurfaceCard", counters);
}

function getUniqueName(baseName: string, counters: Record<string, number>): string {
  counters[baseName] = (counters[baseName] ?? 0) + 1;
  const count = counters[baseName];
  return count === 1 ? baseName : `${baseName}${count}`;
}

/**
 * Check if an expression is a React element call (_jsx, _jsxs, createElement, or dynamic alias).
 */
export function isReactElementCall(
  node: t.Node,
  knownCallees?: Set<string>
): node is t.CallExpression {
  if (!t.isCallExpression(node)) return false;

  const callee = node.callee;
  const callees = knownCallees ?? new Set(["jsx", "jsxs", "_jsx", "_jsxs", "createElement"]);

  // Pattern 1: Sequence expression: (0, r.jsx)(...) or (0, I)(...)
  if (t.isSequenceExpression(callee)) {
    const lastExpr = callee.expressions[callee.expressions.length - 1];
    if (t.isMemberExpression(lastExpr) && t.isIdentifier(lastExpr.property)) {
      if (callees.has(lastExpr.property.name)) return true;
    }
    if (t.isIdentifier(lastExpr) && callees.has(lastExpr.name)) {
      return true;
    }
  }

  // Pattern 2: Member expression: r.jsx(...) or React.createElement(...)
  if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
    if (callees.has(callee.property.name)) return true;
  }

  // Pattern 3: Direct call: _jsx(...), I(...), r(...)
  if (t.isIdentifier(callee) && callees.has(callee.name)) {
    return true;
  }

  // Pattern 4: Generic element factory call with DOM tag string and props object
  if (node.arguments.length >= 1) {
    const firstArg = node.arguments[0];
    if (
      t.isStringLiteral(firstArg) &&
      STANDARD_DOM_TAGS.has(firstArg.value.toLowerCase()) &&
      (node.arguments.length === 1 || t.isObjectExpression(node.arguments[1]) || t.isSpreadElement(node.arguments[1]))
    ) {
      return true;
    }
  }

  return false;
}

/** Void HTML elements that cannot have children */
const VOID_DOM_TAGS = new Set([
  "input", "img", "br", "hr", "area", "base", "col", "embed", "source", "track", "wbr",
]);

/**
 * Infer a safe HTML tag name from props when the callee tag is an undefined minified identifier.
 */
function inferTagFromProps(propsArg: t.Node | undefined): string {
  if (!propsArg || !t.isObjectExpression(propsArg)) return "div";

  let role: string | undefined;
  let hasHref = false;
  let hasOnClick = false;

  for (const prop of propsArg.properties) {
    if (t.isObjectProperty(prop)) {
      const key = t.isIdentifier(prop.key)
        ? prop.key.name
        : t.isStringLiteral(prop.key)
          ? prop.key.value
          : "";

      if (key === "role" && t.isStringLiteral(prop.value)) {
        role = prop.value.value.toLowerCase();
      } else if (key === "href") {
        hasHref = true;
      } else if (key === "onClick") {
        hasOnClick = true;
      }
    }
  }

  if (role === "button" || hasOnClick) return "button";
  if (role === "link" || hasHref) return "a";
  if (role === "dialog") return "dialog";
  if (role === "navigation") return "nav";
  if (role === "form") return "form";

  return "div";
}

/**
 * Check if an expression has free variables that are not available in component scope.
 */
function hasFreeVariables(node: t.Node): boolean {
  let hasFree = false;
  const allowed = new Set(["props", "React", "window", "document", "Math", "JSON", "undefined"]);

  function walk(n: t.Node | null | undefined, isPropertyKey: boolean = false) {
    if (!n || hasFree) return;
    if (t.isIdentifier(n) && !isPropertyKey) {
      if (!allowed.has(n.name)) {
        hasFree = true;
        return;
      }
    }
    if (t.isMemberExpression(n)) {
      walk(n.object);
      if (n.computed) walk(n.property);
      return;
    }
    if (t.isObjectProperty(n)) {
      walk(n.value);
      return;
    }
    for (const key of Object.keys(n)) {
      const val = (n as any)[key];
      if (val && typeof val === "object" && typeof val.type === "string") {
        walk(val);
      } else if (Array.isArray(val)) {
        for (const item of val) {
          if (item && typeof item === "object" && typeof item.type === "string") {
            walk(item);
          }
        }
      }
    }
  }

  walk(node);
  return hasFree;
}

/**
 * Safely create a props member access expression handling hyphens and special characters.
 */
function makePropsMember(keyName: string): t.MemberExpression {
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(keyName)) {
    return t.memberExpression(t.identifier("props"), t.identifier(keyName));
  }
  return t.memberExpression(t.identifier("props"), t.stringLiteral(keyName), true);
}

/**
 * Transform a compiled _jsx / createElement CallExpression into a clean Babel JSXElement.
 */
export function transformCallToJSX(
  call: t.CallExpression,
  knownCallees?: Set<string>,
  fallbackLabel?: string
): t.JSXElement | null {
  const args = call.arguments;
  if (args.length === 0) return null;

  // 1. Tag Name: guarantee valid standard HTML tag, never undeclared identifier like 'Dt'
  const tagArg = args[0];
  let tagName = "div";

  if (t.isStringLiteral(tagArg)) {
    const val = tagArg.value.toLowerCase();
    if (STANDARD_DOM_TAGS.has(val)) {
      tagName = val;
    }
  } else {
    tagName = inferTagFromProps(args[1]);
  }

  const openingTagName = t.jsxIdentifier(tagName);
  const closingTagName = t.jsxIdentifier(tagName);

  // 2. Attributes and Children
  const attributes: Array<t.JSXAttribute | t.JSXSpreadAttribute> = [];
  const children: Array<t.JSXText | t.JSXExpressionContainer | t.JSXSpreadChild | t.JSXElement | t.JSXFragment> = [];

  const propsArg = args[1];

  if (t.isObjectExpression(propsArg)) {
    for (const prop of propsArg.properties) {
      // Normalize spreads to {...props} so undeclared local variables don't leak
      if (t.isSpreadElement(prop)) {
        attributes.push(t.jsxSpreadAttribute(t.identifier("props")));
        continue;
      }

      if (t.isObjectProperty(prop)) {
        let keyName = "";
        if (t.isIdentifier(prop.key)) {
          keyName = prop.key.name;
        } else if (t.isStringLiteral(prop.key)) {
          keyName = prop.key.value;
        }

        if (!keyName) continue;

        // "children" property in automatic runtime
        if (keyName === "children") {
          addJSXChildren(prop.value, children, knownCallees, fallbackLabel);
          continue;
        }

        // Event handlers always bind safely to props
        if (keyName.startsWith("on")) {
          attributes.push(
            t.jsxAttribute(
              t.jsxIdentifier(keyName),
              t.jsxExpressionContainer(makePropsMember(keyName))
            )
          );
          continue;
        }

        // Skip internal testing identifiers or minified single-letter internal flags
        if (keyName.startsWith("data-test") || (keyName.length === 1 && keyName === keyName.toUpperCase())) {
          continue;
        }

        // Convert attribute
        if (t.isStringLiteral(prop.value)) {
          attributes.push(t.jsxAttribute(t.jsxIdentifier(keyName), prop.value));
        } else if (t.isBooleanLiteral(prop.value)) {
          if (prop.value.value === true) {
            attributes.push(t.jsxAttribute(t.jsxIdentifier(keyName)));
          } else {
            attributes.push(t.jsxAttribute(t.jsxIdentifier(keyName), t.jsxExpressionContainer(prop.value)));
          }
        } else if (t.isNumericLiteral(prop.value)) {
          attributes.push(t.jsxAttribute(t.jsxIdentifier(keyName), t.jsxExpressionContainer(prop.value)));
        } else if (t.isExpression(prop.value)) {
          // If the expression references undeclared minified variables, bind to props
          if (hasFreeVariables(prop.value)) {
            attributes.push(
              t.jsxAttribute(
                t.jsxIdentifier(keyName),
                t.jsxExpressionContainer(makePropsMember(keyName))
              )
            );
          } else {
            attributes.push(t.jsxAttribute(t.jsxIdentifier(keyName), t.jsxExpressionContainer(prop.value)));
          }
        }
      }
    }
  }

  // Handle createElement 3rd+ arguments as children
  if (args.length > 2) {
    for (let i = 2; i < args.length; i++) {
      const childArg = args[i];
      if (childArg && t.isExpression(childArg)) {
        addJSXChildren(childArg, children, knownCallees, fallbackLabel);
      }
    }
  }

  // If non-void element has no children, provide fallback {props.children}
  const isVoid = VOID_DOM_TAGS.has(tagName);
  if (!isVoid && children.length === 0) {
    children.push(
      t.jsxExpressionContainer(
        t.logicalExpression(
          "??",
          t.memberExpression(t.identifier("props"), t.identifier("children")),
          t.stringLiteral(fallbackLabel || toPascalCase(tagName))
        )
      )
    );
  }

  const isSelfClosing = isVoid && children.length === 0;
  const openingElement = t.jsxOpeningElement(openingTagName, attributes, isSelfClosing);
  const closingElement = isSelfClosing ? null : t.jsxClosingElement(closingTagName);

  return t.jsxElement(openingElement, closingElement, children, isSelfClosing);
}

function addJSXChildren(
  childNode: t.Node,
  children: Array<t.JSXText | t.JSXExpressionContainer | t.JSXSpreadChild | t.JSXElement | t.JSXFragment>,
  knownCallees?: Set<string>,
  fallbackLabel?: string
): void {
  if (t.isArrayExpression(childNode)) {
    for (const el of childNode.elements) {
      if (el && t.isExpression(el)) {
        addJSXChildren(el, children, knownCallees, fallbackLabel);
      }
    }
  } else if (isReactElementCall(childNode, knownCallees)) {
    const element = transformCallToJSX(childNode, knownCallees, fallbackLabel);
    if (element) children.push(element);
  } else if (t.isStringLiteral(childNode)) {
    children.push(t.jsxText(childNode.value));
  } else if (t.isExpression(childNode)) {
    // If it references an undeclared minified variable, safely map to props.children
    if (t.isIdentifier(childNode) && childNode.name !== "props") {
      children.push(
        t.jsxExpressionContainer(t.memberExpression(t.identifier("props"), t.identifier("children")))
      );
    } else if (hasFreeVariables(childNode)) {
      children.push(
        t.jsxExpressionContainer(t.memberExpression(t.identifier("props"), t.identifier("children")))
      );
    } else {
      children.push(t.jsxExpressionContainer(childNode));
    }
  }
}

function collectObservedProps(node: t.JSXElement, props: Record<string, string>): void {
  for (const attr of node.openingElement.attributes) {
    if (t.isJSXAttribute(attr) && attr.name && t.isJSXIdentifier(attr.name)) {
      const name = attr.name.name;
      if (name.startsWith("on")) {
        props[name] = "() => void";
      } else if (name === "className") {
        props[name] = "string";
      } else if (name === "disabled") {
        props[name] = "boolean";
      } else {
        props[name] = "unknown";
      }
    }
  }
}

/**
 * Classify a component into a signature UI category using heuristic patterns.
 */
export function classifyComponent(
  componentName: string,
  observedProps: Record<string, unknown>,
  _childCount: number
): ComponentCategory {
  const name = componentName.toLowerCase();

  if (name.includes("button") || name.includes("btn")) return "button";
  if (name.includes("command") || name.includes("palette") || name.includes("cmdk")) return "command-palette";
  if (name.includes("modal") || name.includes("dialog")) return "modal";
  if (name.includes("dropdown") || name.includes("menu")) return "dropdown";
  if (name.includes("badge") || name.includes("tag") || name.includes("pill") || name.includes("shortcut")) return "badge";
  if (name.includes("tab")) return "tabs";
  if (name.includes("tooltip")) return "tooltip";
  if (name.includes("input") || name.includes("search")) return "input";

  if (observedProps["onClick"]) return "button";

  return "generic";
}

/**
 * Synthesize a TypeScript props interface for a decompiled component.
 */
export function synthesizePropsInterface(
  componentName: string,
  observedProps: Record<string, string>
): string {
  const propsName = `${componentName}Props`;
  const customEntries = Object.entries(observedProps)
    .filter(([key]) => {
      if (["className", "children"].includes(key)) return false;
      if (key.length === 1 && key === key.toUpperCase()) return false;
      if (key.startsWith("data-test")) return false;
      return true;
    })
    .map(([key, type]) => {
      const formattedKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
      return `  ${formattedKey}?: ${type};`;
    })
    .join("\n");

  const body = customEntries ? `\n${customEntries}\n` : " ";
  return `export interface ${propsName} extends React.HTMLAttributes<HTMLElement> {${body}}`;
}

function generateDefaultStory(name: string, category: ComponentCategory): string {
  return `import type { Meta, StoryObj } from "@storybook/react";
import { ${name} } from "./${name}";

const meta = {
  title: "Components/${name}",
  component: ${name},
  tags: ["autodocs"],
  parameters: {
    layout: "${category === "modal" ? "fullscreen" : "centered"}",
  },
} satisfies Meta<typeof ${name}>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "${name} Content",
  },
};
`;
}
