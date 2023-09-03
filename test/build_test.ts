import { resolve, rollup, RollupOptions } from "../lib/deps.ts";
import createPlugin from "../lib/rollup_plugin_userscript_link.ts";
import { assertEquals, toFileUrl } from "./deps.ts";
import { scriptPaths, setupExampleScript } from "./test_helpers.ts";

Deno.test("Given example user script", async (test) => {
  const { dispose, patchedPath, temporaryDirectory } =
    await setupExampleScript();

  await test.step("when build", async (test) => {
    const outputPath = resolve(temporaryDirectory, "test_output.user.js");

    const options = {
      input: patchedPath,
      output: { file: outputPath, format: "cjs" },
      plugins: [createPlugin()],
    } satisfies RollupOptions;
    const bundle = await rollup(options);
    await bundle.write(options.output);
    await bundle.close();

    await test.step("it should match expectation", async (_test) => {
      const [actual, template] = await Promise.all([
        Deno.readTextFile(outputPath),
        Deno.readTextFile("test/data/output_expected.user.js"),
      ]);
      const expectation = template.replace(
        "{{library1}}",
        `${toFileUrl(scriptPaths.script1)}`,
      );
      assertEquals(actual, expectation, `scriptPath: ${outputPath}`);
    });
  });

  await dispose();
});
