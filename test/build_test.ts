import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { userscriptOptions } from "../mod.ts";

Deno.test("Given example user script", async (test) => {
  await test.step("it should build", async () => {
    const context = await esbuild.context({
      ...userscriptOptions,
      entryPoints: ["test/example_script.ts"],
      outfile: "test/example_script.js",
    });
    await context.rebuild();
    const compiled = await Deno.readTextFile("test/example_script.js");
    await context.dispose();

    assertEquals(compiled, "");
  });
});
