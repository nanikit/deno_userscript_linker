import { run } from "../lib/esbuild_plugin.ts";
import { assertEquals, toFileUrl } from "./deps.ts";
import { scriptPaths, setupExampleScript } from "./test_helpers.ts";

Deno.test({
  name: "Given example user script",
  fn: async (test) => {
    const { dispose, patchedPath } = await setupExampleScript();

    await test.step("when build", async (test) => {
      await run([patchedPath, scriptPaths.library1]);

      await test.step({
        name: "main script should match expectation",
        fn: async (_test) => {
          const [actual, template] = await Promise.all([
            Deno.readTextFile("example.user.js"),
            Deno.readTextFile(scriptPaths.expectedExample),
          ]);
          const expectation = template.replace(
            "{{library1}}",
            `${toFileUrl(scriptPaths.library1)}`,
          );
          assertEquals(actual, expectation);
        },
      });

      await test.step({
        name: "script 1 should match expectation",
        fn: async (_test) => {
          const [actual, template] = await Promise.all([
            Deno.readTextFile("library1.user.js"),
            Deno.readTextFile(scriptPaths.expectedLibrary1),
          ]);
          const expectation = template.replace(
            "{{library1}}",
            `${toFileUrl(scriptPaths.library1)}`,
          );
          assertEquals(actual, expectation);
        },
      });
    });

    await dispose();
  },
  sanitizeOps: false,
  sanitizeResources: false,
});
