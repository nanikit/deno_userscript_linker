import { expect } from "jsr:@std/expect";
import { join } from "../lib/deps.ts";
import { run } from "../lib/esbuild_plugin.ts";
import { assertDirectoryEquals, mockKy, setup, snapshotDirectory } from "./commons.ts";
import { toFileUrl } from "./deps.ts";

Deno.test({
  name: "Given example user script",
  fn: async (test) => {
    const { paths, clear } = await complexSetup("complex");
    const { output, tmpInput, tmpOutput } = paths;

    await Promise.all([
      patchScriptFileUrl({
        example: join(tmpInput, "file/example.user.tsx"),
        library1: join(tmpInput, "file/library1.user.js"),
      }),
      clearBuildDirectory(tmpOutput),
    ]);

    await test.step("when build", async (test) => {
      await run([
        `${join(tmpInput, "file")}/*.user.{tsx,js}`,
        ...["--output", join(tmpOutput, "build")],
        ...["--output-sync", join(tmpOutput, "sync")],
      ]);

      await test.step({
        name: "build should match expectation",
        fn: async () => {
          const examplePath = join(tmpOutput, "build/example.user.js");
          const example = await Deno.readTextFile(examplePath);

          // Match with template
          await Deno.writeTextFile(
            examplePath,
            example.replace(/file:\/\/\S+/, "file://library1.user.js"),
          );

          await assertDirectoryEquals(join(tmpOutput, "build"), join(output, "build"));
        },
      });

      const actual = await snapshotDirectory(join(tmpOutput, "sync"));
      const expected = await snapshotDirectory(join(output, "sync"));

      const meta1 = "9e61de4e-18b0-46c6-8656-892faae3815b.meta.json";
      const meta2 = "40599f6c-6b7d-40a1-b899-7742ee692913.meta.json";

      await test.step("sync should match expectation", () => {
        const js1 = "9e61de4e-18b0-46c6-8656-892faae3815b.user.js";
        const js2 = "40599f6c-6b7d-40a1-b899-7742ee692913.user.js";

        expect(actual.get(js1)?.replace(/file:\/\/\S+/, "file://library1.user.js")).toEqual(
          expected.get(js1),
        );
        expect(actual.get(js2)).toEqual(expected.get(js2));

        // timestamp is irritating.
        expect(actual.get(meta1)?.replace(/"lastModified":\d+/, '"lastModified":0')).toEqual(
          expected.get(meta1),
        );
        expect(actual.get(meta2)?.replace(/"lastModified":\d+/, '"lastModified":0')).toEqual(
          expected.get(meta2),
        );
      });

      await test.step("timestamp should be changed", () => {
        // timestamp is irritating.
        expect(actual.get(meta1)?.match(/"lastModified":(\d+)/)?.[1]).toBeTruthy();
        expect(actual.get(meta1)?.match(/"lastModified":(\d+)/)?.[1]).not.toEqual("0");
        expect(actual.get(meta2)?.match(/"lastModified":(\d+)/)?.[1]).toBeTruthy();
        expect(actual.get(meta2)?.match(/"lastModified":(\d+)/)?.[1]).not.toEqual("0");
      });
    });

    await clear();
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

async function complexSetup(name: string) {
  const suite = await setup(name);
  const restoreKy = mockKy(join(suite.paths.input, "http"));

  return {
    paths: suite.paths,
    clear: async () => {
      restoreKy();
      await suite.clear();
    },
  };
}

async function patchScriptFileUrl(paths: { example: string; library1: string }) {
  const script1 = await Deno.readTextFile(paths.example);
  const patched = script1.replace("file://library1.user.js", `${toFileUrl(paths.library1)}`);
  await Deno.writeTextFile(paths.example, patched);
}

async function clearBuildDirectory(tmpOutput: string) {
  await Deno.remove(join(tmpOutput, "build"), { recursive: true });
  await Deno.mkdir(join(tmpOutput, "build"), { recursive: true });
}
