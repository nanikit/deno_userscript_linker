import { browserslist, esbuild, expandGlob, flow, loadDotEnv, parse, resolve } from "./deps.ts";
import { bundleUserscript, getResourceKeys } from "./header_helpers.ts";
import { mainModuleKey } from "./header_helpers/internal.ts";
import { collectUserscriptHeaders } from "./make_bundle_header.ts";
import { SyncMap, writeMetaJson } from "./sync_map.ts";
import { nonNullable } from "./utils.ts";

export function createPlugin({ syncDirectory }: { syncDirectory?: string } = {}): esbuild.Plugin {
  return {
    name: "userscript-link",
    async setup(build) {
      const { initialOptions } = build;

      const initialWrite = build.initialOptions.write ?? true;
      initialOptions.write = false;
      initialOptions.metafile = true;

      const inputs = initialOptions.entryPoints as string[];
      const imports = await Promise.all(
        inputs.map((url) => collectUserscriptHeaders(mainModuleKey, url)),
      );
      initialOptions.external = imports.flatMap(Object.values).flatMap(getResourceKeys);

      const syncMap = syncDirectory ? await new SyncMap(syncDirectory).load() : null;

      build.onEnd(async (result) => {
        await amendUserscripts(result, { initialWrite, syncMap });
      });
    },
  };
}

async function amendUserscripts(
  result: esbuild.BuildResult<esbuild.BuildOptions>,
  { initialWrite, syncMap }: { initialWrite: boolean; syncMap?: SyncMap | null },
) {
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
        metadata: resolvedOutputMetadata,
        output,
        initialWrite,
        syncMap,
      })
    ),
  );
}

async function addHeader(
  { metadata, output, initialWrite, syncMap }: {
    metadata: esbuild.Metafile["outputs"];
    output: esbuild.OutputFile;
    initialWrite: boolean;
    syncMap?: SyncMap | null;
  },
) {
  const entryPoint = metadata[output.path]?.entryPoint;
  if (!entryPoint) {
    return;
  }

  const headers = await collectUserscriptHeaders(mainModuleKey, entryPoint);
  const script = bundleUserscript(output.text, headers);
  output.contents = new TextEncoder().encode(script);

  const header = headers[mainModuleKey]!;
  const name = header["@name"]![0]!;
  const sync = syncMap?.getOrCreate(header);
  await Promise.all([
    ...(initialWrite ? [writeFileAndLog(output.path, output)] : []),
    ...(sync ? [writeFileAndLog(sync.path, output), writeMetaJson(sync?.metaPath, name)] : []),
  ]);
}

async function writeFileAndLog(
  path: string,
  output: esbuild.OutputFile,
) {
  await Deno.writeFile(path, output.contents);
  console.log(`[${new Date().toISOString()}] Wrote ${path}`);
}

export async function run(args: string[]) {
  const { globs, inject, watch, output, outputSync, help } = await getCommandParameters(args);
  if (help) {
    printHelp();
    return;
  }

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
    plugins: [createPlugin({ syncDirectory: outputSync })],
  });
  if (watch) {
    await context.watch();
  } else {
    await context.rebuild();
    await context.dispose();
  }
}

function printHelp() {
  const { mainModule } = Deno;
  console.log(`Usage: deno run -A ${mainModule} [options] [files...]

Options:
  -w, --watch            Watch mode
  -o, --output           Output directory or file name
  -s, --output-sync      TamperDAV sync directory
  -i, --inject           Inject code, see https://esbuild.github.io/api/#inject
  -h, --help             Show help

Environment variables (supports .env):
  OUTPUT_SYNC            Default value for --output-sync

Examples:
  deno run -A ${mainModule} --output ./dist --output-sync ./sync --inject "console.log('Hello, world!')" ./src/*.user.ts
  deno run -A ${mainModule} --watch --output ./dist --output-sync ./sync ./a.user.ts ./b.user.ts`);
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

async function getCommandParameters(args: string[]) {
  const env = {
    ...await loadDotEnv(),
    ...Deno.env.toObject(),
  };

  const { _: globs, "output-sync": outputSync, ...rest } = parse(args, {
    boolean: ["watch", "help"],
    string: ["inject", "output", "output-sync"],
    alias: { "w": "watch", "o": "output", "s": "output-sync", "h": "help" },
    default: { watch: false, lib: false },
    collect: ["inject"],
  });
  return {
    ...rest,
    outputSync: outputSync ?? env.OUTPUT_SYNC,
    globs: globs.map((x) => `${x}`),
  };
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

/** `ios_saf 15.6-15.7` -> `safari15.6` */
function convertBrowsersListTarget(target: string): string | undefined {
  const [browser, version] = target.split(" ");
  const esBrowser = getEsbuildBrowser(browser!);
  const esVersion = version?.split("-")?.[0];
  return esBrowser && esVersion ? `${esBrowser}${esVersion}` : undefined;
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
