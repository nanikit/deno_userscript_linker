import { OutputAsset, OutputBundle, OutputChunk, Plugin } from "./deps.ts";
import { Header, mergeHeader } from "./header_helpers.ts";
import { makeBundleHeader } from "./make_bundle_header.ts";

export default function createPlugin(
  { isLib = false }: { isLib?: boolean } = {},
): Plugin {
  let headerPromise: Promise<Header>;

  return {
    name: "rollup-plugin-userscript-link",
    resolveId(id, _importer, _options) {
      headerPromise ??= makeBundleHeader(id);
      return null;
    },
    async generateBundle(_options, bundle: OutputBundle, _isWrite) {
      const chunks = Object.values(bundle).filter(isChunk);
      if (chunks.length !== 1) {
        throw new Error("not know");
      }

      const header = await headerPromise;
      chunks[0]!.code = bundleUserscript(header, chunks[0]!.code, { isLib });
    },
  };
}

const requireJsHeader = `if (typeof define !== 'function') {
  throw new Error('requirejs not found.');
}

requirejs.config({
  enforceDefine: true,
});

define('main', (require, exports, module) => {`;

const getRequireJsFooter = (dependencies: string[]) =>
  `});

for (const name of ${JSON.stringify(dependencies)}) {
  const body = GM_getResourceText(name);
  define(name, Function('require', 'exports', 'module', body));
}

unsafeWindow.process = { env: { NODE_ENV: 'production' } };
require(['main'], () => {}, console.error);
`;

function bundleUserscript(
  header: Header,
  code: string,
  { isLib }: { isLib?: boolean } = {},
) {
  const finalHeader = isLib ? header : insertRequireJsRequirments(header);
  const headerString = `// ==UserScript==
// ${[...headerToRows(finalHeader)].join("\n// ")}
// ==/UserScript==
// deno-fmt-ignore-file
// deno-lint-ignore-file
'use strict';
`;

  return [
    headerString,
    ...(isLib ? [] : [requireJsHeader]),
    removeComment(code),
    ...(isLib ? [] : [getRequireJsFooter(getDependencyKeys(header) ?? [])]),
  ].join("\n");
}

function insertRequireJsRequirments(header: Header) {
  return mergeHeader(header, {
    "@grant": ["GM_getResourceText"],
    "@require": ["https://cdn.jsdelivr.net/npm/requirejs@2.3.6/require.js"],
  });
}

function isChunk(bundle: OutputAsset | OutputChunk): bundle is OutputChunk {
  return bundle.type === "chunk";
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

function getDependencyKeys(header: Header) {
  const resource = header["@resource"];
  return resource?.map((x) => x.split(/\s+/)[0]!);
}

function removeComment(code: string) {
  // https://regex101.com/r/HpyogW/1
  const stripped = code.replace(
    /(`[\s\S]*?`|"(?<!\\")(?:[^"\n\\]|\\.)*?")|\/\*[\s\S]*?\*\/|^\s*?\/\/.*\n|\/(?<!\\\/)\/.*/gm,
    "$1",
  );
  return stripped;
}
