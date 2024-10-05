export type Header = Record<string, string[]>;
export const mainModuleKey = "main";
export const grantsModuleKey = "tampermonkey_grants";

export function renderBundleHeader(header: Header): string {
  return `// ==UserScript==
${[...headerToRows(header)].map((x) => `// ${x}\n`).join("")}// ==/UserScript==
"use strict";\n`;
}

export function renderHeaderScript(headers: Header) {
  if (isLibraryHeader(headers)) {
    return "";
  }

  if (!hasLinkResource(headers)) {
    return "";
  }
  return `define("${mainModuleKey}", (require, exports, module) => {`;
}

export function renderFooterScript(header: Header) {
  if (isLibraryHeader(header) || !hasLinkResource(header)) {
    return "";
  }

  return `});
${renderGrantModuleDefinition(header)}
load()

async function load() {
  const links = GM.info.script.resources.filter(x => x.name.startsWith("link:"));
  await Promise.all(links.map(async ({ name }) => {
    const script = await GM.getResourceText(name)
    define(name.replace("link:", ""), Function("require", "exports", "module", script))
  }));
  require(["${mainModuleKey}"], () => {}, console.error);
}`;
}

export function isLibraryHeader(mainHeader: Header) {
  const requireJs = /\/require.js\b/;
  return mainHeader["@require"]?.every((x) => !x.match(requireJs)) ?? true;
}

export function getLinkResourceKeys(header: Header) {
  return header["@resource"]?.flatMap((x) => {
    const key = x.split(/\s+/)?.[0];
    return key?.startsWith("link:") ? [key] : [];
  }) ?? [];
}

function renderGrantModuleDefinition(header: Header) {
  const grants = header["@grant"] ?? [];
  if (!grants.length) {
    return "";
  }

  const grantIds = grants.filter((x) => !x.includes("."));
  if (grants.some((x) => /^GM[_.]/.test(x))) {
    grantIds.unshift("GM");
  }
  return `\ndefine("${grantsModuleKey}", function() { Object.assign(this.window, { ${
    grantIds.join(", ")
  } }); });
requirejs.config({ deps: ["tampermonkey_grants"] });`;
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

function hasLinkResource(header: Header) {
  return header["@resource"]?.some((x) => x.startsWith("link:"));
}
