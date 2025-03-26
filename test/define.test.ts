import { join } from "../lib/deps.ts";
import { run } from "../lib/esbuild_plugin.ts";
import { assertDirectoryEquals, setup } from "./commons.ts";

Deno.test({
  name: "Given data/define/input/main.user.ts",
  fn: async (test) => {
    const { paths, clear } = await setup("define");
    const { output, tmpInput, tmpOutput } = paths;

    await test.step("when build", async (test) => {
      await Deno.remove(join(tmpOutput, "main.user.js"));
      await run([
        `${tmpInput}/main.user.ts`,
        ...["--define", `${tmpInput}/.env.defaults`],
        ...["--output", `${tmpOutput}/main.user.js`],
      ]);

      await test.step({
        name: "it should match expectation",
        fn: async () => {
          await assertDirectoryEquals(tmpOutput, output);
        },
      });
    });

    await clear();
  },
  sanitizeOps: false,
  sanitizeResources: false,
});
