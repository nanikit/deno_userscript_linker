import browserslist from "npm:browserslist";
import * as esbuild from "npm:esbuild";
import { expandGlob, parse } from "./deps.ts";
import { bundleUserscript, getResourceKeys } from "./header_helpers.ts";
import { makeBundleHeader } from "./make_bundle_header.ts";
import { nonNullable } from "./utils.ts";

export function createPlugin(
  { isLib }: { isLib?: boolean } = {},
): esbuild.Plugin {
  let initialWrite: boolean;

  return {
    name: "userscript-link",
    async setup(build) {
      const { initialOptions } = build;
      const header = await makeBundleHeader(
        (initialOptions.entryPoints as string[])[0]!,
      );
      initialWrite = build.initialOptions.write ?? true;
      initialOptions.write = false;
      initialOptions.external = getResourceKeys(header);

      build.onEnd(async (result) => {
        const output = result.outputFiles![0];
        if (!output) {
          return;
        }

        const script = bundleUserscript(header, output.text, { isLib });
        if (initialWrite) {
          await Deno.writeTextFile(output.path, script);
          console.log(`[${new Date().toISOString()}] Wrote ${output.path}`);
        }
      });
    },
  };
}

export async function run(args: string[]) {
  const { globs, inject, watch, lib, output } = getCommandParameters(args);
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
    plugins: [createPlugin({ isLib: lib })],
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
  lib: boolean;
} {
  const { _: globs, ...rest } = parse(args, {
    boolean: ["watch", "lib"],
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
