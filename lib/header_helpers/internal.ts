export type Header = Record<string, string[]>;
export const mainModuleKey = "main";
export const grantsModuleKey = "tampermonkey-grants";

export function renderBundleHeader(header: Header): string {
  return `// ==UserScript==
${[...headerToRows(header)].map((x) => `// ${x}\n`).join("")}// ==/UserScript==
// deno-fmt-ignore-file
// deno-lint-ignore-file
"use strict";\n`;
}

export function renderHeaderScript(headers: Header) {
  if (isLibraryHeader(headers)) {
    if (!headers["@grant"]?.length) {
      return "";
    }
    return `var { ${
      headers["@grant"]?.join(", ")
    } } = require("${grantsModuleKey}");\n`;
  }

  if (!headers["@resource"]?.length) {
    return "";
  }
  return `define("${mainModuleKey}", (require, exports, module) => {`;
}

export function renderFooterScript(header: Header) {
  if (isLibraryHeader(header) || !header["@resource"]?.length) {
    return "";
  }

  return `});
${renderGrantModuleDefinition(header)}
for (const name of ["${getResourceKeys(header).join('", "')}"]) {
  const body = GM_getResourceText(name);
  define(name, Function("require", "exports", "module", body));
}

require(["${mainModuleKey}"], () => {}, console.error);`;
}

export function isLibraryHeader(mainHeader: Header) {
  const requireJs = /\/require.js\b/;
  return mainHeader["@require"]?.every((x) => !x.match(requireJs)) ?? true;
}

export function getResourceKeys(header: Header) {
  return Object.keys(getResourceMap(header));
}

function renderGrantModuleDefinition(header: Header) {
  if (!header["@grant"]?.length) {
    return "";
  }
  return `\ndefine("${grantsModuleKey}", (_, exports) => { Object.assign(exports, { ${
    header["@grant"].join(", ")
  } }); });`;
}

function getResourceMap(header: Header): Record<string, string> {
  const resourceTable = header["@resource"]?.map((x) => x.split(/\s+/)) ??
    [];
  return Object.fromEntries(resourceTable);
}

function* headerToRows(header: Header) {
  const keys = Object.keys(header);
  const maxKeyLength = Math.max(...keys.map((x) => x.length));
  const entries = Object.entries(header);
  entries.sort(headerKeyComparer);

  for (const [key, values] of entries) {
    for (const value of values) {
      yield `${key.padEnd(maxKeyLength)} ${value}`;
    }
  }
}

function headerKeyComparer(a: [string, string[]], b: [string, string[]]) {
  const orderA = headerKeyOrder(a[0]);
  const orderB = headerKeyOrder(b[0]);
  return orderA - orderB;
}

function headerKeyOrder(name: string) {
  switch (name) {
    case "@grant":
      return 1;
    case "@require":
      return 2;
    case "@resource":
      return 3;
    default:
      return 0;
  }
}
