import { parse } from "https://deno.land/std@0.183.0/flags/mod.ts";
import { esbuild, expandGlob } from "./deps.ts";
import { commentRemovalPlugin } from "./lib/comment_removal_plugin.ts";
import { userscriptRequireJsPlugin } from "./lib/userscript_requirejs_plugin.ts";

export async function watchOrBuild(options: esbuild.BuildOptions) {
  const { watch } = parse(Deno.args, { boolean: ["watch"] });
  try {
    const context = await esbuild.context({
      allowOverwrite: true,
      bundle: true,
      charset: "utf8",
      target: ["es2020", "chrome80", "firefox70"],
      format: "cjs",
      treeShaking: true,
      ...options,
    });
    if (watch) {
      await context.watch({});
    } else {
      await context.rebuild();
      esbuild.stop();
    }
  } catch (error) {
    console.error(error);
    Deno.exit(1);
  }
}

export const userscriptOptions: esbuild.BuildOptions = {
  allowOverwrite: true,
  bundle: true,
  charset: "utf8",
  target: ["es2020", "chrome80", "firefox70"],
  plugins: [userscriptRequireJsPlugin()],
  format: "cjs",
  treeShaking: true,
};

const build = async (
  { entryPoints, watch }: { entryPoints: string[]; watch?: boolean },
  options?: esbuild.BuildOptions,
): Promise<void> => {
  // const code = await Deno.readTextFile(entryPoint);
  // const header = `${getHeader(code)}${requireJs}`;
  // const dependencies = getDependencies(header);
  // const footer = getFooter(dependencies);

  const context = await esbuild.context({
    allowOverwrite: true,
    // banner: { js: `${header}\n` },
    // footer: { js: footer },
    bundle: true,
    charset: "utf8",
    target: ["chrome80", "firefox70"],
    entryPoints: entryPoints,
    plugins: [commentRemovalPlugin, userscriptRequireJsPlugin()],
    // external: Object.keys(importMap.imports),
    format: "cjs",
    // outfile: `dist/${fileName.replace(".ts", ".js")}`,
    treeShaking: true,
    ...options,
  });
  if (watch) {
    await context.watch();
  } else {
    const result = await context.rebuild();
    // console.log(`${entryPoint}: ${JSON.stringify(result)}`);
  }
};

if (import.meta.main) {
  main();
}

async function main() {
  const { watch, _: patterns } = parse(Deno.args, { boolean: ["watch"] });
  try {
    try {
      const builds = [];
      for (const pattern of patterns) {
        for await (const walk of expandGlob(`${pattern}`)) {
          builds.push(
            build({ entryPoints: [walk.path], watch: watch ?? false }),
          );
        }
      }
      await Promise.all(builds);
    } finally {
      if (!watch) {
        esbuild.stop();
      }
    }
  } catch (error) {
    console.error(error);
    Deno.exit(1);
  }
}
