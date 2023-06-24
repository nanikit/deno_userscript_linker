import type { Plugin } from "../deps.ts";

export const commentRemovalPlugin: Plugin = {
  name: "remove_comment",
  setup(build) {
    build.onEnd(async () => {
      const path = build.initialOptions.outfile;
      if (!path) {
        return;
      }

      const original = await Deno.readTextFile(path);
      const header = original.match(/^(\/\*[\s\S]*?\*\/|\/\/.*|\s+)*/)?.[0] ??
        "";
      // https://regex101.com/r/HpyogW/1
      const stripped = original.replace(
        /(`[\s\S]*?`|"(?<!\\")(?:[^"\n\\]|\\.)*?")|\/\*[\s\S]*?\*\/|^\s*?\/\/.*\n|\/(?<!\\\/)\/.*/gm,
        "$1",
      );
      await Deno.writeTextFile(path, header + stripped);
    });
  },
};
