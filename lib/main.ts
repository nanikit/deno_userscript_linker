import { expandGlob } from "https://deno.land/std@0.201.0/fs/expand_glob.ts";
import {
  parse,
  rollup,
  RollupOptions,
  RollupWatcherEvent,
  watch,
} from "./deps.ts";
import createPlugin from "./rollup_plugin_userscript_link.ts";

export async function main() {
  const { watch: isWatch, output, _: patterns } = parse(Deno.args, {
    boolean: ["watch"],
    string: ["output"],
    alias: { "w": "watch", "o": "output" },
    default: { watch: false },
  });

  try {
    const inputs = [];
    for (const pattern of patterns) {
      for await (const walk of expandGlob(`${pattern}`)) {
        inputs.push(walk.path);
      }
    }

    const options = {
      input: inputs,
      output: {
        format: "cjs",
        ...getRollupOutputParameter(inputs, output),
      },
      plugins: [createPlugin()],
    } satisfies RollupOptions;
    if (isWatch) {
      const watcher = watch(options);
      watcher.on("event", (event: RollupWatcherEvent) => {
        switch (event.code) {
          case "BUNDLE_START":
            console.log("Changes detected. start bundling.");
            break;
          case "ERROR":
            console.error(event.error);
            break;
          case "BUNDLE_END":
            event.result.close();
            console.log(`Wrote bundles to ${event.output.join()}`);
            break;
          case "END":
            break;
        }
      });
      await waitInterrupt();
    } else {
      const bundle = await rollup(options);
      await bundle.write(options.output);
      await bundle.close();
    }
  } catch (error) {
    console.error(error);
    Deno.exit(1);
  }
}

function getRollupOutputParameter(
  inputs: string[],
  output: string | undefined,
) {
  const doesEndsWithSeparator = output?.endsWith("/") || output?.endsWith("\\");
  if (!output || inputs.length !== 1 || doesEndsWithSeparator) {
    return { dir: output ?? Deno.cwd() };
  }
  return { file: output };
}

function waitInterrupt() {
  return new Promise<void>((resolve) => {
    const removeSelf = () => {
      Deno.removeSignalListener("SIGINT", removeSelf);
      resolve();
    };

    Deno.addSignalListener("SIGINT", removeSelf);
  });
}
