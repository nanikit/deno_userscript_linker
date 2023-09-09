import {
  browserslist,
  esbuild,
  expandGlob,
  flow,
  parse,
  resolve,
} from "./deps.ts";
import { bundleUserscript, getResourceKeys } from "./header_helpers.ts";
import { makeBundleHeader } from "./make_bundle_header.ts";
import { nonNullable } from "./utils.ts";

export function createPlugin(): esbuild.Plugin {
  let initialWrite: boolean;

  return {
    name: "userscript-link",
    async setup(build) {
      const { initialOptions } = build;
      const inputs = initialOptions.entryPoints as string[];
      const headers = await Promise.all(inputs.map(makeBundleHeader));
      const external = [...new Set(headers.flatMap(getResourceKeys))];

      initialWrite = build.initialOptions.write ?? true;
      initialOptions.write = false;
      initialOptions.external = external;
      initialOptions.metafile = true;

      build.onEnd(async (result) => {
        const outputs = result.outputFiles;
        const outputsMeta = result.metafile?.outputs;
        if (!outputs || !outputsMeta) {
          return;
        }
        const resolvedOutputMetadata = flow(
          Object.entries,
          (x) => x.map(([file, output]) => [resolve(file), output]),
          Object.fromEntries,
        )(outputsMeta);

        await Promise.all(
          outputs.map((output) =>
            addHeader({
              metas: resolvedOutputMetadata,
              output,
              initialWrite,
            })
          ),
        );
      });
    },
  };
}

async function addHeader(
  { metas, output, initialWrite }: {
    metas: esbuild.Metafile["outputs"];
    output: esbuild.OutputFile;
    initialWrite: boolean;
  },
) {
  const entryPoint = metas[output.path]?.entryPoint;
  if (!entryPoint) {
    return;
  }

  const header = await makeBundleHeader(entryPoint);
  const script = bundleUserscript(header, output.text);
  if (initialWrite) {
    await Deno.writeTextFile(output.path, script);
    console.log(`[${new Date().toISOString()}] Wrote ${output.path}`);
  } else {
    output.contents = new TextEncoder().encode(script);
  }
}

export async function run(args: string[]) {
  const { globs, inject, watch, output } = getCommandParameters(args);
  const inputs = await expandGlobs(globs);
  const defaultTarget = browserslist();
  const target = convertBrowsersList(defaultTarget);

  const context = await esbuild.context({
    allowOverwrite: true,
    bundle: true,
    charset: "utf8",
    target,
    format: "cjs",
    treeShaking: true,
    entryPoints: inputs,
    ...getEsbuildOutputParameter(inputs, output),
    inject,
    plugins: [createPlugin()],
  });
  if (watch) {
    await context.watch();
  } else {
    await context.rebuild();
    await context.dispose();
  }
}

async function expandGlobs(patterns: string[]) {
  const inputs = [];
  for (const pattern of patterns) {
    for await (const walk of expandGlob(pattern)) {
      inputs.push(walk.path);
    }
  }
  return inputs;
}

function getCommandParameters(args: string[]): {
  globs: string[];
  inject: string[];
  output?: string;
  watch: boolean;
} {
  const { _: globs, ...rest } = parse(args, {
    boolean: ["watch"],
    string: ["output", "inject"],
    alias: { "w": "watch", "o": "output" },
    default: { watch: false, lib: false },
    collect: ["inject"],
  });
  return { ...rest, globs: globs.map((x) => `${x}`) };
}

function getEsbuildOutputParameter(
  inputs: string[],
  output: string | undefined,
) {
  const doesEndsWithSeparator = output?.endsWith("/") || output?.endsWith("\\");
  if (!output || inputs.length !== 1 || doesEndsWithSeparator) {
    return { outdir: output ?? Deno.cwd() };
  }
  return { outfile: output };
}

function convertBrowsersList(target: string[]): string[] {
  return [
    ...new Set(target.map(convertBrowsersListTarget).filter(nonNullable)),
  ];
}

function convertBrowsersListTarget(target: string): string | undefined {
  const [browser, version] = target.split(" ");
  const esBrowser = getEsbuildBrowser(browser!);
  return esBrowser ? `${esBrowser}${version}` : undefined;
}

function getEsbuildBrowser(browser: string): string | undefined {
  switch (browser) {
    case "chrome":
    case "android":
    case "and_chr":
      return "chrome";
    case "edge":
      return "edge";
    case "safari":
    case "ios_saf":
      return "safari";
    case "firefox":
    case "and_ff":
      return "firefox";
    case "opera":
      return "opera";
  }
}
