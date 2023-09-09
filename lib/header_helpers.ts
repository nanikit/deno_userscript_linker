export type Header = Record<string, string[]>;

export function extractUserscriptHeader(
  code: string,
): Header | undefined {
  const header = code.match(
    /(?:^\s*\/\/.*?==UserScript==.*?\r?\n)(?:^\s*\/\/.*\r?\n)+/m,
  )?.[0];
  if (!header) {
    return;
  }

  const matches = header.matchAll(/^\s*\/\/\s*(@\S+)\s+(.+)/gm);
  const record: Record<string, string[]> = {};
  for (const [, key, value] of matches) {
    if (record[key!]) {
      record[key!]!.push(value!);
    } else {
      record[key!] = [value!];
    }
  }

  return record;
}

export function mergeHeader(main: Header, sub: Header): Header {
  const grantKey = "@grant";
  const grants = mergeAndSort(main[grantKey], sub[grantKey]);

  const requireKey = "@require";
  const requires = mergeAndSort(main[requireKey], sub[requireKey]);

  const resourceKey = "@resource";
  const resourceTable = [
    ...(main[resourceKey] ?? []).map((x) => x.split(/\s+/)),
    ...(sub[resourceKey] ?? []).map((x) => x.split(/\s+/)),
  ];
  const maxKeyLength = Math.max(
    ...resourceTable.map((x) => x[0]?.length ?? -Infinity),
  );
  const rows = resourceTable.map((x) =>
    `${x[0]?.padEnd(maxKeyLength)} ${x.slice(1)}`
  );
  const resources = mergeAndSort(rows, []);

  return {
    ...main,
    ...(requires.length ? { [requireKey]: requires } : {}),
    ...(grants.length ? { [grantKey]: grants } : {}),
    ...(resources.length ? { [resourceKey]: resources } : {}),
  };
}

export function getResourceKeys(header: Header) {
  return Object.keys(getResourceMap(header));
}

export function bundleUserscript(
  header: Header,
  code: string,
): string {
  const requireJs =
    /https:\/\/cdn\.jsdelivr\.net\/npm\/requirejs@2.3.6\/require.js/;
  const isLib = header["@require"]?.every((x) => !x.match(requireJs)) ?? true;
  const finalHeader = isLib ? header : insertRequireJsRequirments(header);
  const headerString = `// ==UserScript==
// ${[...headerToRows(finalHeader)].join("\n// ")}
// ==/UserScript==
// deno-fmt-ignore-file
// deno-lint-ignore-file
'use strict';
`;

  const requireJsHeader = `requirejs.config({
  enforceDefine: true,
});

define('main', (require, exports, module) => {`;

  return [
    headerString,
    ...(isLib ? [] : [requireJsHeader]),
    removeComment(code),
    ...(isLib ? [] : [getRequireJsFooter(getResourceKeys(header) ?? [])]),
  ].join("\n");
}

function getResourceMap(header: Header): Record<string, string> {
  const resourceTable = header["@resource"]?.map((x) => x.split(/\s+/)) ??
    [];
  return Object.fromEntries(resourceTable);
}

function mergeAndSort(a?: string[], b?: string[]) {
  return [...new Set([...a ?? [], ...b ?? []])].sort();
}

function getRequireJsFooter(dependencies: string[]) {
  return `});

for (const name of ${JSON.stringify(dependencies)}) {
  const body = GM_getResourceText(name);
  define(name, Function('require', 'exports', 'module', body));
}

unsafeWindow.process = { env: { NODE_ENV: 'production' } };
require(['main'], () => {}, console.error);
`;
}

function insertRequireJsRequirments(header: Header) {
  return mergeHeader(header, { "@grant": ["GM_getResourceText"] });
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

function removeComment(code: string) {
  // https://regex101.com/r/HpyogW/1
  const stripped = code.replace(
    /(`[\s\S]*?`|"(?<!\\")(?:[^"\n\\]|\\.)*?")|\/\*[\s\S]*?\*\/|^\s*?\/\/.*\n|\/(?<!\\\/)\/.*/gm,
    "$1",
  );
  return stripped;
}
