import {
  Header,
  isLibraryHeader,
  mainModuleKey,
  renderAppHeaderSnippet,
  renderBundleHeader,
  renderLibHeaderSnippet,
} from "./header_helpers/internal.ts";

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
  script: string,
  headers: Record<string, Header>,
): string {
  const { [mainModuleKey]: mainHeader, ...subHeaders } = headers;
  if (!mainHeader) {
    throw new Error("main heeder not found");
  }

  const isLib = isLibraryHeader(mainHeader);
  const mergedHeader = Object.values(subHeaders).reduce(
    mergeHeader,
    mainHeader,
  );
  const finalHeader = replaceDateVersion(
    isLib ? mergedHeader : insertRequireJsRequirements(mergedHeader),
  );

  return [
    renderBundleHeader(finalHeader),
    isLib
      ? renderLibHeaderSnippet(finalHeader)
      : renderAppHeaderSnippet(headers),
    removeComment(script),
    ...(isLib ? [] : [getRequireJsFooter(getResourceKeys(finalHeader) ?? [])]),
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
require(['${mainModuleKey}'], () => {}, console.error);
`;
}

function insertRequireJsRequirements(header: Header) {
  return mergeHeader(header, { "@grant": ["GM_getResourceText"] });
}

function removeComment(code: string) {
  // https://regex101.com/r/HpyogW/1
  const stripped = code.replace(
    /(`[\s\S]*?`|"(?<!\\")(?:[^"\n\\]|\\.)*?")|\/\*[\s\S]*?\*\/|^\s*?\/\/.*\n|\/(?<!\\\/)\/.*/gm,
    "$1",
  );
  return stripped;
}

function replaceDateVersion(header: Header) {
  const version = header["@version"]?.[0];
  if (!version?.includes("{date_version}")) {
    return header;
  }

  const dateVersion = new Date().toISOString().replace(/\D+/g, "").slice(
    2,
    14,
  );
  return {
    ...header,
    "@version": [version.replace("{date_version}", dateVersion)],
  };
}
