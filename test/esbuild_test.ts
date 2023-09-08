import { run } from "../lib/esbuild_plugin.ts";
import { assertEquals, toFileUrl } from "./deps.ts";
import { scriptPaths, setupExampleScript } from "./test_helpers.ts";

Deno.test({
  name: "Given example user script",
  fn: async (test) => {
    const { dispose, patchedPath } = await setupExampleScript();

    await test.step("when build", async (test) => {
      await run([patchedPath]);

      await test.step("it should match expectation", async (_test) => {
        const [actual, template] = await Promise.all([
          Deno.readTextFile("example.user.js"),
          Deno.readTextFile("test/data/output_expected.user.js"),
        ]);
        const expectation = template.replace(
          "{{library1}}",
          `${toFileUrl(scriptPaths.library1)}`,
        );
        assertEquals(actual, expectation);
        await dispose();
      });
    });
  },
  sanitizeOps: false,
  sanitizeResources: false,
});
