export type Header = Record<string, string[]>;
export const mainModuleKey = "main";

export function renderBundleHeader(header: Header): string {
  return `// ==UserScript==
${[...headerToRows(header)].map((x) => `// ${x}\n`).join("")}// ==/UserScript==
// deno-fmt-ignore-file
// deno-lint-ignore-file
'use strict';\n`;
}

export function renderLibHeaderSnippet(header: Header): string {
  const grants = header["@grant"] ?? [];
  if (grants.length === 0) {
    return "";
  }
  return `var { ${grants.join(", ")} } = module.config();`;
}

export function renderAppHeaderSnippet(headers: Record<string, Header>) {
  return `requirejs.config({
${getAppConfigSnippet(headers)}  skipDataMain: true,
});

define('${mainModuleKey}', (require, exports, module) => {`;
}

export function getAppConfigSnippet(headers: Record<string, Header>) {
  const grants = getGrants(headers);
  const rows = Object.entries(grants).map(([name, grants]) => {
    return `    "${name}": { ${grants.join(", ")} },\n`;
  });
  return rows.length ? `  config: {\n${rows.join("")}  },\n` : "";
}

function getGrants(headers: Record<string, Header>): Record<string, string[]> {
  const nonEmptyGrants = Object.entries(headers).map(([name, header]) =>
    [name, header["@grant"] ?? []] as const
  ).filter((x) => x[1].length > 0);
  return Object.fromEntries(nonEmptyGrants);
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
