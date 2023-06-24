import {
  BuildResult,
  OnResolveArgs,
  OutputFile,
} from "https://deno.land/x/esbuild@v0.17.18/mod.js";
import { fromFileUrl, join } from "../deps.ts";

const requireJsHeader = `// deno-fmt-ignore-file
// deno-lint-ignore-file
'use strict';

if (typeof define !== 'function') {
  throw new Error('requirejs not found.');
}

requirejs.config({
  enforceDefine: true,
});

define('main', (require, exports, module) => {`;

const getRequireJsFooter = (dependencies: string[]) => `
});

for (const name of ${JSON.stringify(dependencies)}) {
  const body = GM_getResourceText(name);
  define(name, Function('require', 'exports', 'module', body));
}

unsafeWindow.process = { env: { NODE_ENV: 'production' } };
require(['main'], () => {}, console.error);
`;

export function userscriptRequireJsPlugin(): Plugin {
  const externals = new Map<string, string>();
  const webCache = createWebCache();
  let mainHeader: string[][] | undefined;

  const saveOrLoadExternal: Parameters<PluginBuild["onResolve"]>[1] = async (
    data,
  ) => {
    if (externals.has(data.path)) {
      return { path: data.path, external: true };
    }

    const isEntryPoint = data.kind === "entry-point";
    const isUserscript = data.path.match(/\.user.js/);
    if (!isEntryPoint && !isUserscript) {
      return null;
    }

    const content = await webCache.get(data);
    const { header, resources } = getHeaderAndResources(content) ?? {};
    if (!header || !resources) {
      return null;
    }

    for (const [key, value] of resources) {
      externals.set(key, value);
    }
    if (isEntryPoint) {
      mainHeader ??= header;
    }

    return null;
  };

  async function postprocess(build: PluginBuild, result: BuildResult) {
    const path = build.initialOptions.outfile;
    if (path) {
      await Deno.writeTextFile(path, rewrite(output));
      return;
    }

    for (const output of result.outputFiles ?? []) {
      await Deno.writeTextFile(output.path, rewrite(output));
    }
  }

  function rewrite(output: OutputFile) {
    const chunks = [];
    chunks.push("// ==UserScript==");

    const firstColumnLength = Math.max(
      ...(mainHeader?.map((x) => x[0].length) ?? [0]),
    );
    const rows = mainHeader?.filter((x) => x[0] !== "@resource") ?? [];
    for (const row of rows) {
      chunks.push(`// ${row[0].padEnd(firstColumnLength)} ${row[1]}`);
    }

    const externalKeys = [...externals.keys()];
    const secondColumnLength = Math.max(
      ...externalKeys.map((x) => x.length),
    );
    for (const [key, value] of externals) {
      chunks.push(
        `// ${"@resource".padEnd(firstColumnLength)} ${
          key.padEnd(secondColumnLength)
        } ${value}`,
      );
    }
    chunks.push("// ==/UserScript==");
    chunks.push(requireJsHeader);
    chunks.push(removeComment(output.text));
    chunks.push(getRequireJsFooter(externalKeys));

    return chunks.join("\n");
  }

  return {
    name: "userscript_requirejs",
    setup(build) {
      build.onResolve({ filter: /./ }, saveOrLoadExternal);
      build.onEnd((result) => postprocess(build, result));
    },
  };
}

function removeComment(code: string) {
  // https://regex101.com/r/HpyogW/1
  const stripped = code.replace(
    /(`[\s\S]*?`|"(?<!\\")(?:[^"\n\\]|\\.)*?")|\/\*[\s\S]*?\*\/|^\s*?\/\/.*\n|\/(?<!\\\/)\/.*/gm,
    "$1",
  );
  return stripped;
}

function createWebCache() {
  const cache = new Map<string, string>();

  async function get(data: OnResolveArgs) {
    const { type, path } = getSourceKey(data);
    switch (type) {
      case "file":
        return Deno.readTextFile(path);
      case "url": {
        const cached = cache.get(path);
        if (cached) {
          return cached;
        }

        const fetched = await (await fetch(path)).text();
        cache.set(path, fetched);
        return fetched;
      }
    }
  }

  return { get };
}

function getSourceKey(
  data: OnResolveArgs,
): { type: "url" | "file"; path: string } {
  if (data.path.startsWith("http")) {
    return { type: "url", path: data.path };
  }

  const relative = data.path.startsWith("file:")
    ? fromFileUrl(data.path)
    : data.path;
  const absolute = join(data.resolveDir, relative);
  return { type: "file", path: absolute };
}

function getHeaderAndResources(
  code: string,
): { header: string[][]; resources: string[][] } | undefined {
  const header = getHeader(code);
  if (!header) {
    return;
  }

  const resources = getResources(header);
  return { header, resources };
}

function getHeader(code: string): string[][] | undefined {
  const header = code.match(
    /(?:^\s*\/\/.*?==UserScript==.*?\r?\n)(?:^\s*\/\/.*\r?\n)+/m,
  )?.[0];
  if (!header) {
    return;
  }

  const matches = header.matchAll(/^\s*\/\/\s*(@\w+)\s+(.+)/gm);
  const keyValues = [...matches].map((x) => [x[1], x[2]]);
  return keyValues;
  // const dateVersion = new Date().toISOString().replace(/\D+/g, "").slice(2, 12);
}

function getResources(items: string[][]): string[][] {
  const resources = items.filter(([key]) => key === "@resource");
  const result = resources.flatMap(([_, value]) => {
    const match = value.match(/(\S+)\s+(.+)/);
    return match ? [[match[1], match[2]]] : [];
  });
  return result;
}
